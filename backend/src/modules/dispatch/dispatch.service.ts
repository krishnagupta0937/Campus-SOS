import { Injectable, ConflictException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(DispatchService.name);

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
      const teamCode = teamDef.team_code || (teamDef as any).code || (teamDef as any).teamCode;
      if (!teamCode) continue;

      const team = await this.prisma.team.findUnique({
        where: { code: teamCode },
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
        await this.escalate(incidentId, team.id, teamCode);
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

    const updated = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    return updated || { ...assignment, status: 'ACCEPTED' };
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

    return { ...assignment, status: 'REJECTED' };
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

    // Notify coordinator and admin
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { isCoordinator: true, leftAt: null },
          select: { userId: true },
        },
      },
    });

    if (team?.members) {
      for (const m of team.members) {
        try {
          const notif = await this.prisma.notification.create({
            data: {
              recipientUserId: m.userId,
              recipientId: m.userId,
              incidentId,
              audienceType: 'ACT',
              channel: 'IN_APP',
              deliveryStatus: 'SENT',
              title: `Dispatch Escalation Alert: ${team.code}`,
              body: `Incident requires coordinator review — all automated dispatch attempts exhausted.`,
            },
          });
          if (notif?.id && this.prisma.notificationDelivery?.create) {
            await this.prisma.notificationDelivery.create({
              data: {
                notificationId: notif.id,
                channel: 'IN_APP',
                status: 'SENT',
                sentAt: new Date(),
              },
            });
          }
        } catch (err: any) {
          this.logger.error(`Failed to deliver dispatch escalation notification to user ${m.userId}: ${err.message}`, err.stack);
        }
      }
    }
  }

  /**
   * Process offer timeout for an incident and team.
   */
  async processOfferTimeout(incidentId: string, teamId: string) {
    const expiredOffers = await this.prisma.assignment.findMany({
      where: {
        incidentId,
        teamId,
        status: 'OFFERED',
        expiresAt: { lte: new Date() },
      },
    });

    for (const offer of expiredOffers) {
      await this.prisma.assignment.update({
        where: { id: offer.id },
        data: { status: 'TIMED_OUT' },
      });

      await this.auditService.log({
        eventType: 'STATUS_CHANGED',
        incidentId,
        actorKind: 'SYSTEM',
        targetType: 'assignment',
        targetId: offer.id,
        details: { status: 'TIMED_OUT', slotNo: offer.slotNo, attemptNo: offer.attemptNo },
      });

      // Trigger retry for this slot
      await this.retryDispatch(incidentId, teamId, offer.slotNo, offer.attemptNo + 1);
    }
  }

  /**
   * Retry dispatch for a slot after rejection or timeout.
   */
  async retryDispatch(incidentId: string, teamId: string, slotNo: number, attemptNo: number) {
    // 1. Check if slot is already filled
    const existingAccepted = await this.prisma.assignment.findFirst({
      where: {
        incidentId,
        slotNo,
        status: { in: ['ACCEPTED', 'EN_ROUTE', 'ON_SCENE', 'COMPLETED'] },
      },
    });
    if (existingAccepted) {
      return { filled: true };
    }

    // 2. Max attempts check (3 attempts)
    if (attemptNo > 3) {
      const team = await this.prisma.team.findUnique({ where: { id: teamId } });
      await this.escalate(incidentId, teamId, team?.code || 'UNKNOWN');
      return { escalated: true, reason: 'MAX_ATTEMPTS_EXCEEDED' };
    }

    // 3. Find candidates who have not been offered this incident yet
    const priorAssignments = await this.prisma.assignment.findMany({
      where: { incidentId, teamId },
      select: { memberId: true },
    });
    const priorMemberIds = new Set(priorAssignments.map((a: any) => a.memberId));

    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      select: { workflow: true, isRestricted: true },
    });
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return { error: 'TEAM_NOT_FOUND' };

    const allowBusy = incident?.workflow === 'EMERGENCY_SOS' && team.allowBusyOverrideForSos;
    const candidates = await this.getEligibleCandidates(teamId, incidentId, allowBusy);
    const nextCandidate = candidates.find((c: any) => !priorMemberIds.has(c.id));

    if (!nextCandidate) {
      await this.escalate(incidentId, teamId, team.code);
      return { escalated: true, reason: 'NO_REMAINING_CANDIDATES' };
    }

    const timeout = incident?.workflow === 'EMERGENCY_SOS'
      ? team.offerTimeoutSosSeconds
      : team.offerTimeoutStandardSeconds;

    await this.offerToResponder(incidentId, teamId, nextCandidate.id, timeout, attemptNo, slotNo);

    await this.dispatchQueue.add('check-offer-timeout', {
      incident_id: incidentId,
      team_id: teamId,
    }, {
      delay: timeout * 1000,
      attempts: 1,
    });

    return { offered: true, candidateId: nextCandidate.id };
  }

  /**
   * Query active offers for a given responder user.
   */
  async getOffersForUser(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId, leftAt: null },
      select: { id: true, teamId: true },
    });
    const memberIds = memberships.map((m: any) => m.id);
    if (memberIds.length === 0) return [];

    return this.prisma.assignment.findMany({
      where: {
        memberId: { in: memberIds },
        status: 'OFFERED',
      },
      include: {
        incident: {
          select: {
            id: true,
            publicId: true,
            workflow: true,
            description: true,
            status: true,
            finalCategory: true,
            confirmedAt: true,
          },
        },
        team: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { offeredAt: 'desc' },
    });
  }

  /**
   * Mark assignment en-route.
   */
  async markEnRoute(assignmentId: string, responderUserId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { member: true },
    });
    if (!assignment) {
      throw new ConflictException({ code: 'NOT_FOUND', message: 'Assignment not found' });
    }
    if (assignment.member && assignment.member.userId !== responderUserId) {
      throw new ConflictException({ code: 'FORBIDDEN', message: 'Not authorized for this assignment' });
    }
    if (assignment.status !== 'ACCEPTED') {
      throw new ConflictException({
        code: 'INVALID_STATUS',
        message: `Cannot transition assignment from ${assignment.status} to EN_ROUTE`,
      });
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.assignment.update({
        where: { id: assignmentId },
        data: { status: 'EN_ROUTE' },
      });
      await tx.incident.update({
        where: { id: assignment.incidentId },
        data: { status: 'RESPONDER_ON_THE_WAY' },
      });
      await tx.incidentStatusHistory.create({
        data: {
          incidentId: assignment.incidentId,
          fromStatus: 'RESPONDER_ASSIGNED',
          toStatus: 'RESPONDER_ON_THE_WAY',
          changedBy: responderUserId,
          note: 'Responder marked EN_ROUTE',
        },
      });
    });

    await this.auditService.log({
      eventType: 'STATUS_CHANGED',
      incidentId: assignment.incidentId,
      actorUserId: responderUserId,
      actorKind: 'USER',
      targetType: 'assignment',
      targetId: assignmentId,
      details: { status: 'EN_ROUTE' },
    });

    return { status: 'EN_ROUTE', assignment_id: assignmentId };
  }

  /**
   * Mark assignment on-scene.
   */
  async markOnScene(assignmentId: string, responderUserId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { member: true },
    });
    if (!assignment) {
      throw new ConflictException({ code: 'NOT_FOUND', message: 'Assignment not found' });
    }
    if (assignment.member && assignment.member.userId !== responderUserId) {
      throw new ConflictException({ code: 'FORBIDDEN', message: 'Not authorized for this assignment' });
    }
    if (assignment.status !== 'EN_ROUTE' && assignment.status !== 'ACCEPTED') {
      throw new ConflictException({
        code: 'INVALID_STATUS',
        message: `Cannot transition assignment from ${assignment.status} to ON_SCENE`,
      });
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx: any) => {
      await tx.assignment.update({
        where: { id: assignmentId },
        data: { status: 'ON_SCENE' },
      });
      await tx.incident.update({
        where: { id: assignment.incidentId },
        data: {
          status: 'RESPONDER_AT_LOCATION',
          responderArrivedAt: now,
        },
      });
      await tx.incidentStatusHistory.create({
        data: {
          incidentId: assignment.incidentId,
          fromStatus: 'RESPONDER_ON_THE_WAY',
          toStatus: 'RESPONDER_AT_LOCATION',
          changedBy: responderUserId,
          note: 'Responder marked ON_SCENE',
        },
      });
    });

    await this.auditService.log({
      eventType: 'STATUS_CHANGED',
      incidentId: assignment.incidentId,
      actorUserId: responderUserId,
      actorKind: 'USER',
      targetType: 'assignment',
      targetId: assignmentId,
      details: { status: 'ON_SCENE' },
    });

    return { status: 'ON_SCENE', assignment_id: assignmentId };
  }

  /**
   * Mark assignment completed and resolve incident.
   */
  async completeAssignment(
    assignmentId: string,
    responderUserId: string,
    resolutionSummary: string,
    resolutionCode: string = 'RESOLVED',
  ) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { member: true },
    });
    if (!assignment) {
      throw new ConflictException({ code: 'NOT_FOUND', message: 'Assignment not found' });
    }
    if (assignment.member && assignment.member.userId !== responderUserId) {
      throw new ConflictException({ code: 'FORBIDDEN', message: 'Not authorized for this assignment' });
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx: any) => {
      await tx.assignment.update({
        where: { id: assignmentId },
        data: { status: 'COMPLETED' },
      });
      await tx.responderProfile.update({
        where: { memberId: assignment.memberId },
        data: {
          dutyState: 'AVAILABLE',
          dutyStateChangedAt: now,
          changeReason: 'COMPLETION',
          currentAssignmentCount: { decrement: 1 },
        },
      });
      await tx.incident.update({
        where: { id: assignment.incidentId },
        data: {
          status: 'RESOLVED',
          resolvedAt: now,
          resolutionSummary,
          resolutionCode,
        },
      });
      await tx.incidentStatusHistory.create({
        data: {
          incidentId: assignment.incidentId,
          fromStatus: 'RESPONDER_AT_LOCATION',
          toStatus: 'RESOLVED',
          changedBy: responderUserId,
          note: resolutionSummary,
        },
      });
    });

    await this.auditService.log({
      eventType: 'RESOLVED',
      incidentId: assignment.incidentId,
      actorUserId: responderUserId,
      actorKind: 'USER',
      targetType: 'assignment',
      targetId: assignmentId,
      details: { resolution_summary: resolutionSummary, resolution_code: resolutionCode },
    });

    return { status: 'COMPLETED', incident_id: assignment.incidentId };
  }
}
