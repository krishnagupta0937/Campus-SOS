import { Injectable, ConflictException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Dispatch service implementing the responder assignment algorithm.
 * ARCHITECTURE.md §9.1, CLAUDE_BACKEND_HANDOFF.md §14.
 */
@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @InjectQueue('dispatch') private readonly dispatchQueue: Queue,
  ) {}

  /**
   * Initiate dispatch for an incident.
   * For each ACT team in the routing decision, select and offer to responders.
   */
  async initiateDispatch(
    incidentId: string,
    teams: Array<{ team_code: string; role: string; responders_required: number }>,
    workflow: 'EMERGENCY_SOS' | 'STANDARD_REPORT',
  ) {
    const actTeams = teams.filter(t => t.role === 'ACT');

    for (const teamDef of actTeams) {
      const team = await this.prisma.team.findUnique({
        where: { code: teamDef.team_code },
      });

      if (!team) continue;

      // Get eligible responders
      const candidates = await this.getEligibleCandidates(
        team.id,
        incidentId,
        workflow === 'EMERGENCY_SOS' && team.allowBusyOverrideForSos,
      );

      if (candidates.length === 0) {
        // Escalate immediately
        await this.escalate(incidentId, team.id, teamDef.team_code);
        continue;
      }

      const slotsNeeded = teamDef.responders_required || 1;
      const timeout = workflow === 'EMERGENCY_SOS'
        ? team.offerTimeoutSosSeconds
        : team.offerTimeoutStandardSeconds;

      // SOS parallel offering
      if (workflow === 'EMERGENCY_SOS' && team.sosParallelOffer) {
        const parallelCount = Math.min(2, candidates.length);
        for (let i = 0; i < parallelCount; i++) {
          await this.offerToResponder(
            incidentId,
            team.id,
            candidates[i].id,
            timeout,
            1,
            1,
          );
        }
      } else {
        // Sequential offering
        await this.offerToResponder(
          incidentId,
          team.id,
          candidates[0].id,
          timeout,
          1,
          1,
        );
      }

      // Schedule timeout check
      await this.dispatchQueue.add('check-offer-timeout', {
        incident_id: incidentId,
        team_id: team.id,
      }, {
        delay: timeout * 1000,
        attempts: 1,
      });
    }
  }

  /**
   * Get eligible responders for a team, ordered by dispatch algorithm.
   * ARCHITECTURE.md §9.1: skill match → fewest assignments → least recent assignment.
   */
  private async getEligibleCandidates(
    teamId: string,
    incidentId: string,
    allowBusy: boolean,
  ) {
    const dutyStates = allowBusy ? ['AVAILABLE', 'BUSY'] : ['AVAILABLE'];

    // Get members with AVAILABLE (or BUSY if override) state, excluding those who rejected this incident
    const rejectedMemberIds = await this.prisma.assignment.findMany({
      where: { incidentId, teamId, status: 'REJECTED' },
      select: { memberId: true },
    });
    const excludeIds = rejectedMemberIds.map(r => r.memberId);

    const candidates = await this.prisma.teamMember.findMany({
      where: {
        teamId,
        leftAt: null,
        id: { notIn: excludeIds },
        responderProfile: {
          dutyState: { in: dutyStates as any },
        },
      },
      include: {
        responderProfile: true,
        user: { select: { fullName: true } },
      },
      orderBy: [
        { responderProfile: { currentAssignmentCount: 'asc' } },
        { responderProfile: { lastAssignedAt: 'asc' } },
      ],
    });

    // Filter for restricted incidents
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      select: { isRestricted: true },
    });

    if (incident?.isRestricted) {
      return candidates.filter(c => c.canViewRestricted);
    }

    return candidates;
  }

  /**
   * Create an assignment offer to a responder.
   */
  async offerToResponder(
    incidentId: string,
    teamId: string,
    memberId: string,
    timeoutSeconds: number,
    attemptNo: number,
    slotNo: number,
  ) {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + timeoutSeconds);

    const assignment = await this.prisma.assignment.create({
      data: {
        incidentId,
        teamId,
        memberId,
        status: 'OFFERED',
        expiresAt,
        attemptNo,
        slotNo,
        assignedBy: 'AUTO',
      },
    });

    await this.auditService.log({
      eventType: 'RESPONDER_ASSIGNED',
      incidentId,
      actorKind: 'SYSTEM',
      targetType: 'assignment',
      targetId: assignment.id,
      details: { member_id: memberId, team_id: teamId, timeout: timeoutSeconds },
    });

    return assignment;
  }

  /**
   * Accept an assignment offer.
   * First accept wins; other pending offers are cancelled.
   */
  async acceptOffer(assignmentId: string, responderId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { member: true },
    });

    if (!assignment || assignment.status !== 'OFFERED') {
      throw new ConflictException({
        code: 'OFFER_NOT_AVAILABLE',
        message: 'This offer is no longer in OFFERED state',
      });
    }

    // Accept and cancel others
    await this.prisma.$transaction(async (tx: any) => {
      // Check if slot has already been claimed by another responder concurrently
      const existingAccepted = await tx.assignment.findFirst({
        where: {
          incidentId: assignment.incidentId,
          slotNo: assignment.slotNo,
          status: { in: ['ACCEPTED', 'EN_ROUTE', 'ON_SCENE', 'COMPLETED'] },
        },
      });

      if (existingAccepted) {
        // Mark this offer cancelled as another responder won the race
        await tx.assignment.update({
          where: { id: assignmentId },
          data: { status: 'CANCELLED' },
        });
        throw new ConflictException({
          code: 'SLOT_ALREADY_FILLED',
          message: 'Another responder has already accepted this assignment.',
        });
      }

      // Accept this one
      await tx.assignment.update({
        where: { id: assignmentId },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
          acceptedAt: new Date(),
        },
      });

      // Cancel other pending offers for same incident+slot
      await tx.assignment.updateMany({
        where: {
          incidentId: assignment.incidentId,
          slotNo: assignment.slotNo,
          id: { not: assignmentId },
          status: 'OFFERED',
        },
        data: { status: 'CANCELLED' },
      });

      // Set responder to BUSY
      await tx.responderProfile.update({
        where: { memberId: assignment.memberId },
        data: {
          dutyState: 'BUSY',
          dutyStateChangedAt: new Date(),
          changeReason: 'ASSIGNMENT',
          currentAssignmentCount: { increment: 1 },
          lastAssignedAt: new Date(),
        },
      });

      // Update incident milestone
      await tx.incident.update({
        where: { id: assignment.incidentId },
        data: {
          firstAcceptedAt: new Date(),
          status: 'RESPONDER_ASSIGNED',
        },
      });
    });

    await this.auditService.log({
      eventType: 'RESPONDER_ACCEPTED',
      incidentId: assignment.incidentId,
      actorUserId: responderId,
      actorKind: 'USER',
      targetType: 'assignment',
      targetId: assignmentId,
    });

    return assignment;
  }

  /**
   * Reject an assignment offer.
   */
  async rejectOffer(assignmentId: string, responderId: string, reason?: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.status !== 'OFFERED') return null;

    await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        status: 'REJECTED',
        respondedAt: new Date(),
        rejectReason: reason,
      },
    });

    await this.auditService.log({
      eventType: 'RESPONDER_REJECTED',
      incidentId: assignment.incidentId,
      actorUserId: responderId,
      actorKind: 'USER',
      targetType: 'assignment',
      targetId: assignmentId,
      details: { reason },
    });

    // Try next candidate
    await this.dispatchQueue.add('retry-dispatch', {
      incident_id: assignment.incidentId,
      team_id: assignment.teamId,
      slot_no: assignment.slotNo,
      attempt_no: assignment.attemptNo + 1,
    });
  }

  /**
   * Escalate when no responders are available.
   */
  private async escalate(incidentId: string, teamId: string, teamCode: string) {
    await this.auditService.log({
      eventType: 'ESCALATED',
      incidentId,
      actorKind: 'SYSTEM',
      details: {
        team_id: teamId,
        team_code: teamCode,
        reason: 'No available responders',
      },
    });

    // Notify coordinator and admin (handled by notification system)
  }
}
