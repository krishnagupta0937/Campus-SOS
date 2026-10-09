import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Optional,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../../common/guards/jwt-auth.guard';
import {
  BreakGlassScope,
  BreakGlassStatus,
  BreakGlassType,
  SupervisorReviewStatus,
} from '@prisma/client';
import {
  BREAK_GLASS_DEFAULT_DURATION_MINUTES,
  BREAK_GLASS_CRITICAL_DURATION_MINUTES,
  BREAK_GLASS_MAX_DURATION_MINUTES,
  BREAK_GLASS_MIN_DURATION_MINUTES,
  ALL_BREAK_GLASS_SCOPES,
  SUPERVISOR_ROLES,
} from './break-glass.constants';
import {
  RequestBreakGlassDto,
  ApproveBreakGlassDto,
  RejectBreakGlassDto,
  RevokeBreakGlassDto,
  ReviewBreakGlassDto,
  BreakGlassResponseDto,
} from './break-glass.dto';

@Injectable()
export class AccessPolicyService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(AuditService) private readonly auditService?: AuditService,
  ) {}

  // =========================================================================
  // Authorization Evaluation (RBAC + Team + Incident + Break-Glass Grants)
  // =========================================================================

  /**
   * Determine if a user can view a specific incident.
   * ARCHITECTURE.md §7.2: RBAC + Team + Incident-level access + Break-Glass.
   * Returns false (service caller translates to 404/403) for inaccessible incidents.
   */
  async canViewIncident(user: AuthUser, incidentId: string): Promise<boolean> {
    // 1. Campus Administration has visibility into all incidents
    if (user.role === 'CAMPUS_ADMIN') {
      return true;
    }

    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      select: {
        reporterId: true,
        isRestricted: true,
        incidentTeams: {
          where: { revokedAt: null },
          select: { teamId: true },
        },
        assignments: {
          where: {
            status: { in: ['OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ON_SCENE'] },
          },
          select: { memberId: true },
        },
      },
    });

    if (!incident) return false;

    // 2. Incident reporter can view their own submission
    if (incident.reporterId === user.id) {
      return true;
    }

    // 3. Team-level access: Check active grant in incident_teams
    const userTeamIds = user.teamMemberships ? user.teamMemberships.map(tm => tm.teamId) : [];
    const hasTeamGrant = incident.incidentTeams.some(it =>
      userTeamIds.includes(it.teamId),
    );

    if (hasTeamGrant) {
      // If incident is restricted, member must have can_view_restricted flag
      if (incident.isRestricted) {
        return user.teamMemberships ? user.teamMemberships.some(tm => tm.canViewRestricted) : false;
      }
      return true;
    }

    // 4. Assigned responder has direct access
    const userMemberIds = user.teamMemberships ? user.teamMemberships.map(tm => tm.memberId) : [];
    const hasAssignment = incident.assignments.some(a =>
      userMemberIds.includes(a.memberId),
    );

    if (hasAssignment) {
      return true;
    }

    // 5. Emergency Break-Glass temporary grant with INCIDENT_VIEW
    const activeGrant = await this.getActiveGrant(user.id, incidentId);
    if (activeGrant?.approvedScopes?.includes('INCIDENT_VIEW')) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can view photos/evidence for an incident.
   * Reporter and assigned team/admin can view photos.
   * Cross-team responders require an active EVIDENCE_VIEW break-glass grant.
   */
  async canViewPhotos(user: AuthUser, incidentId: string): Promise<boolean> {
    if (user.role === 'CAMPUS_ADMIN') return true;

    // First check base visibility
    const canViewBase = await this.canViewIncident(user, incidentId);
    if (canViewBase) {
      // If user has standard team or reporter access, they can view photos
      const incident = await this.prisma.incident.findUnique({
        where: { id: incidentId },
        select: {
          reporterId: true,
          incidentTeams: {
            where: { revokedAt: null },
            select: { teamId: true },
          },
          assignments: {
            where: {
              status: { in: ['OFFERED', 'ACCEPTED', 'EN_ROUTE', 'ON_SCENE'] },
            },
            select: { memberId: true },
          },
        },
      });

      if (incident) {
        if (incident.reporterId === user.id) return true;
        const userTeamIds = user.teamMemberships ? user.teamMemberships.map(tm => tm.teamId) : [];
        if (incident.incidentTeams.some(it => userTeamIds.includes(it.teamId))) return true;
        const userMemberIds = user.teamMemberships ? user.teamMemberships.map(tm => tm.memberId) : [];
        if (incident.assignments.some(a => userMemberIds.includes(a.memberId))) return true;
      }
    }

    // If accessing solely via Break-Glass, must have explicit EVIDENCE_VIEW scope
    const activeGrant = await this.getActiveGrant(user.id, incidentId);
    if (activeGrant?.approvedScopes?.includes('EVIDENCE_VIEW')) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can view reporter contact details for an incident.
   * Independent scope: REPORTER_CONTACT_VIEW.
   */
  async canViewReporterContact(user: AuthUser, incidentId: string): Promise<boolean> {
    if (user.role === 'CAMPUS_ADMIN') return true;

    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      select: { reporterId: true },
    });

    if (!incident) return false;

    // Reporter can always view their own contact
    if (incident.reporterId === user.id) return true;

    // Break-glass grant must explicitly include REPORTER_CONTACT_VIEW
    const activeGrant = await this.getActiveGrant(user.id, incidentId);
    if (activeGrant?.approvedScopes?.includes('REPORTER_CONTACT_VIEW')) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can modify an incident status or details.
   * Independent scope: INCIDENT_UPDATE.
   */
  async canModifyIncident(user: AuthUser, incidentId: string): Promise<boolean> {
    if (user.role === 'CAMPUS_ADMIN') return true;

    // Check if user's team is an ACT team for this incident
    const userTeamIds = user.teamMemberships ? user.teamMemberships.map(tm => tm.teamId) : [];
    if (userTeamIds.length > 0) {
      const actTeam = await this.prisma.incidentTeam.findFirst({
        where: {
          incidentId,
          teamId: { in: userTeamIds },
          role: 'ACT',
          revokedAt: null,
        },
      });

      if (actTeam) return true;
    }

    // Check break-glass grant for INCIDENT_UPDATE
    const activeGrant = await this.getActiveGrant(user.id, incidentId);
    if (activeGrant?.approvedScopes?.includes('INCIDENT_UPDATE')) {
      return true;
    }

    return false;
  }

  /**
   * Check if user has realtime access to live socket updates for an incident.
   * Independent scope: REALTIME_ACCESS.
   */
  async hasRealtimeAccess(user: AuthUser, incidentId: string): Promise<boolean> {
    if (user.role === 'CAMPUS_ADMIN') return true;

    // Regular incident viewers have realtime access
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      select: {
        reporterId: true,
        incidentTeams: {
          where: { revokedAt: null },
          select: { teamId: true },
        },
      },
    });

    if (incident) {
      if (incident.reporterId === user.id) return true;
      const userTeamIds = user.teamMemberships ? user.teamMemberships.map(tm => tm.teamId) : [];
      if (incident.incidentTeams.some(it => userTeamIds.includes(it.teamId))) return true;
    }

    // Check break-glass grant for REALTIME_ACCESS
    const activeGrant = await this.getActiveGrant(user.id, incidentId);
    if (activeGrant?.approvedScopes?.includes('REALTIME_ACCESS')) {
      return true;
    }

    return false;
  }

  /**
   * Filter incident fields based on viewer role.
   * Students get sanitized views; teams get operational views; admin gets full.
   */
  getFieldFilter(user: AuthUser, isRestricted: boolean): 'full' | 'team' | 'reporter' | 'public' {
    if (user.role === 'CAMPUS_ADMIN') return 'full';
    if (user.teamMemberships && user.teamMemberships.length > 0) return 'team';
    if (user.role === 'STUDENT') return 'reporter';
    return 'public';
  }

  // =========================================================================
  // Emergency Access / Break-Glass Workflow Implementation
  // =========================================================================

  /**
   * Query the active, non-expired break-glass grant for a user and incident.
   * Backend independently enforces expiry timestamp.
   */
  async getActiveGrant(userId: string, incidentId: string) {
    if (!this.prisma?.breakGlassRequest?.findFirst) {
      return null;
    }
    const grant = await this.prisma.breakGlassRequest.findFirst({
      where: {
        incidentId,
        requesterUserId: userId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
    });
    return grant;
  }

  /**
   * Request temporary emergency access / break-glass for an incident.
   * POST /access-policy/break-glass/request
   */
  async requestEmergencyAccess(
    user: AuthUser,
    dto: RequestBreakGlassDto,
    ipAddress?: string,
  ): Promise<BreakGlassResponseDto> {
    // 1. Authenticated user authorization: Students cannot request break glass
    if (user.role === 'STUDENT' && !user.isPersonnel) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only campus emergency personnel can request break-glass access',
      });
    }

    // 2. Incident validation
    const incident = await this.prisma.incident.findUnique({
      where: { id: dto.incident_id },
      select: { id: true, status: true, workflow: true },
    });

    if (!incident) {
      throw new NotFoundException({
        code: 'INCIDENT_NOT_FOUND',
        message: 'Incident not found',
      });
    }

    if (['CANCELLED', 'RESOLVED', 'DRAFT'].includes(incident.status)) {
      throw new BadRequestException({
        code: 'INELIGIBLE_INCIDENT',
        message: `Incident in status ${incident.status} is not eligible for emergency access`,
      });
    }

    // 3. Scopes validation
    if (!dto.requested_scopes || !Array.isArray(dto.requested_scopes) || dto.requested_scopes.length === 0) {
      throw new BadRequestException({
        code: 'INVALID_SCOPES',
        message: 'At least one valid emergency scope must be requested',
      });
    }

    const invalidScopes = dto.requested_scopes.filter(
      s => !ALL_BREAK_GLASS_SCOPES.includes(s),
    );
    if (invalidScopes.length > 0) {
      throw new BadRequestException({
        code: 'INVALID_SCOPES',
        message: `Invalid scope(s): ${invalidScopes.join(', ')}`,
      });
    }

    // 4. Reason validation
    const trimmedReason = (dto.reason || '').trim();
    if (trimmedReason.length < 5) {
      throw new BadRequestException({
        code: 'REASON_REQUIRED',
        message: 'A substantive emergency rationale (at least 5 characters) is required',
      });
    }

    // 5. Least privilege validation: Check if user already possesses requested permission
    if (user.role === 'CAMPUS_ADMIN') {
      throw new BadRequestException({
        code: 'UNNECESSARY_REQUEST',
        message: 'User already holds global campus administrator privileges',
      });
    }

    const alreadyCanView = await this.canViewIncident(user, dto.incident_id);
    if (
      dto.requested_scopes.length === 1 &&
      dto.requested_scopes[0] === 'INCIDENT_VIEW' &&
      alreadyCanView
    ) {
      throw new BadRequestException({
        code: 'UNNECESSARY_REQUEST',
        message: 'User already possesses incident view permissions for this incident',
      });
    }

    // 6. Check for conflicting active grant
    const existingActive = await this.getActiveGrant(user.id, dto.incident_id);
    if (existingActive) {
      throw new ConflictException({
        code: 'ACTIVE_GRANT_EXISTS',
        message: 'An active emergency access grant already exists for this incident',
      });
    }

    // 7. Determine request type
    const isCritical = dto.type === 'CRITICAL_BREAK_GLASS';
    const primaryTeam = user.teams && user.teams.length > 0 ? user.teams[0] : user.role;

    const now = new Date();

    if (isCritical) {
      // Critical break-glass path:
      // Activates immediately with short expiry and mandatory supervisor review
      const expiresAt = new Date(now.getTime() + BREAK_GLASS_CRITICAL_DURATION_MINUTES * 60 * 1000);

      const record = await this.prisma.breakGlassRequest.create({
        data: {
          incidentId: dto.incident_id,
          requesterUserId: user.id,
          requesterTeamContext: primaryTeam,
          type: 'CRITICAL_BREAK_GLASS',
          status: 'ACTIVE',
          requestedScopes: dto.requested_scopes,
          approvedScopes: dto.requested_scopes,
          reason: trimmedReason,
          requestedAt: now,
          activatedAt: now,
          expiresAt,
          supervisorReviewStatus: 'REVIEW_REQUIRED',
        },
        include: {
          requester: { select: { id: true, fullName: true, role: true } },
        },
      });

      // Audit: Log BREAK_GLASS_REQUESTED, ACTIVATED, REVIEW_REQUIRED
      await this.logAudit({
        eventType: 'BREAK_GLASS_REQUESTED',
        incidentId: dto.incident_id,
        actorUserId: user.id,
        actorKind: 'USER',
        targetType: 'break_glass_request',
        targetId: record.id,
        details: { type: 'CRITICAL_BREAK_GLASS', scopes: dto.requested_scopes, reason: trimmedReason },
        ipAddress,
      });

      await this.logAudit({
        eventType: 'BREAK_GLASS_ACTIVATED',
        incidentId: dto.incident_id,
        actorUserId: user.id,
        actorKind: 'SYSTEM',
        targetType: 'break_glass_request',
        targetId: record.id,
        details: { scopes: dto.requested_scopes, expiresAt },
        ipAddress,
      });

      await this.logAudit({
        eventType: 'BREAK_GLASS_REVIEW_REQUIRED',
        incidentId: dto.incident_id,
        actorUserId: user.id,
        actorKind: 'SYSTEM',
        targetType: 'break_glass_request',
        targetId: record.id,
        details: { requestId: record.id, reason: trimmedReason },
        ipAddress,
      });

      return this.toResponseDto(record);
    }

    // Normal override path: Requires supervisor / coordinator approval
    const record = await this.prisma.breakGlassRequest.create({
      data: {
        incidentId: dto.incident_id,
        requesterUserId: user.id,
        requesterTeamContext: primaryTeam,
        type: 'NORMAL_OVERRIDE',
        status: 'REQUESTED',
        requestedScopes: dto.requested_scopes,
        approvedScopes: [],
        reason: trimmedReason,
        requestedAt: now,
        supervisorReviewStatus: 'NOT_REQUIRED',
      },
      include: {
        requester: { select: { id: true, fullName: true, role: true } },
      },
    });

    await this.logAudit({
      eventType: 'BREAK_GLASS_REQUESTED',
      incidentId: dto.incident_id,
      actorUserId: user.id,
      actorKind: 'USER',
      targetType: 'break_glass_request',
      targetId: record.id,
      details: { type: 'NORMAL_OVERRIDE', scopes: dto.requested_scopes, reason: trimmedReason },
      ipAddress,
    });

    return this.toResponseDto(record);
  }

  /**
   * Approve an emergency access request.
   * POST /access-policy/break-glass/approve
   */
  async approveEmergencyAccess(
    approver: AuthUser,
    dto: ApproveBreakGlassDto,
    ipAddress?: string,
  ): Promise<BreakGlassResponseDto> {
    // 1. Approver authorization check
    const isSupervisor = SUPERVISOR_ROLES.includes(approver.role);
    const isCoordinator = approver.teamMemberships
      ? approver.teamMemberships.some(tm => tm.isCoordinator)
      : false;

    if (!isSupervisor && !isCoordinator) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only incident supervisors or team coordinators can approve emergency access',
      });
    }

    // 2. Fetch request
    const req = await this.prisma.breakGlassRequest.findUnique({
      where: { id: dto.request_id },
      include: {
        incident: {
          select: {
            id: true,
            status: true,
            incidentTeams: { where: { revokedAt: null }, select: { teamId: true } },
          },
        },
        requester: { select: { id: true, fullName: true, role: true } },
      },
    });

    if (!req) {
      throw new NotFoundException({
        code: 'REQUEST_NOT_FOUND',
        message: 'Emergency access request not found',
      });
    }

    if (req.status !== 'REQUESTED') {
      throw new BadRequestException({
        code: 'INVALID_STATUS',
        message: `Request is in ${req.status} status and cannot be approved`,
      });
    }

    // 3. Prohibit self-approval
    if (req.requesterUserId === approver.id) {
      throw new ForbiddenException({
        code: 'SELF_APPROVAL_PROHIBITED',
        message: 'Requesters cannot approve their own emergency access requests',
      });
    }

    // 4. Coordinator domain validation: If not global supervisor, coordinator must be on an assigned team
    if (!isSupervisor && isCoordinator) {
      const coordinatorTeamIds = approver.teamMemberships
        ? approver.teamMemberships.filter(tm => tm.isCoordinator).map(tm => tm.teamId)
        : [];
      const incidentTeamIds = req.incident.incidentTeams.map(it => it.teamId);
      const isIncidentCoordinator = coordinatorTeamIds.some(id => incidentTeamIds.includes(id));

      if (!isIncidentCoordinator) {
        throw new ForbiddenException({
          code: 'UNAUTHORIZED_COORDINATOR',
          message: 'Coordinator does not coordinate a team assigned to this incident',
        });
      }
    }

    // 5. Approved scopes validation: cannot exceed requested scopes
    const approvedScopes = dto.approved_scopes && dto.approved_scopes.length > 0
      ? dto.approved_scopes
      : req.requestedScopes;

    const excessScopes = approvedScopes.filter(s => !req.requestedScopes.includes(s));
    if (excessScopes.length > 0) {
      throw new BadRequestException({
        code: 'EXCESSIVE_SCOPES',
        message: `Cannot approve unrequested scope(s): ${excessScopes.join(', ')}`,
      });
    }

    // 6. Calculate duration & expiry
    const durationMinutes = Math.min(
      Math.max(
        dto.duration_minutes || BREAK_GLASS_DEFAULT_DURATION_MINUTES,
        BREAK_GLASS_MIN_DURATION_MINUTES,
      ),
      BREAK_GLASS_MAX_DURATION_MINUTES,
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    // 7. Atomic race-safe transition: Only approve if status is still REQUESTED
    const updated = await this.prisma.breakGlassRequest.updateMany({
      where: {
        id: dto.request_id,
        status: 'REQUESTED',
      },
      data: {
        status: 'ACTIVE',
        approverUserId: approver.id,
        approvedAt: now,
        activatedAt: now,
        expiresAt,
        approvedScopes,
      },
    });

    if (updated.count === 0) {
      throw new ConflictException({
        code: 'RACE_CONFLICT',
        message: 'Emergency access request was already processed concurrently',
      });
    }

    const result = await this.prisma.breakGlassRequest.findUnique({
      where: { id: dto.request_id },
      include: {
        requester: { select: { id: true, fullName: true, role: true } },
        approver: { select: { id: true, fullName: true, role: true } },
      },
    });

    // 8. Tamper-evident Audit logging
    await this.logAudit({
      eventType: 'BREAK_GLASS_APPROVED',
      incidentId: req.incidentId,
      actorUserId: approver.id,
      actorKind: 'USER',
      targetType: 'break_glass_request',
      targetId: req.id,
      details: { approverId: approver.id, approvedScopes, durationMinutes },
      ipAddress,
    });

    await this.logAudit({
      eventType: 'BREAK_GLASS_ACTIVATED',
      incidentId: req.incidentId,
      actorUserId: approver.id,
      actorKind: 'SYSTEM',
      targetType: 'break_glass_request',
      targetId: req.id,
      details: { approvedScopes, expiresAt },
      ipAddress,
    });

    return this.toResponseDto(result);
  }

  /**
   * Reject an emergency access request.
   * POST /access-policy/break-glass/reject
   */
  async rejectEmergencyAccess(
    approver: AuthUser,
    dto: RejectBreakGlassDto,
    ipAddress?: string,
  ): Promise<BreakGlassResponseDto> {
    const isSupervisor = SUPERVISOR_ROLES.includes(approver.role);
    const isCoordinator = approver.teamMemberships
      ? approver.teamMemberships.some(tm => tm.isCoordinator)
      : false;

    if (!isSupervisor && !isCoordinator) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only supervisors or coordinators can reject emergency access requests',
      });
    }

    const req = await this.prisma.breakGlassRequest.findUnique({
      where: { id: dto.request_id },
    });

    if (!req) {
      throw new NotFoundException({
        code: 'REQUEST_NOT_FOUND',
        message: 'Emergency access request not found',
      });
    }

    if (req.status !== 'REQUESTED') {
      throw new BadRequestException({
        code: 'INVALID_STATUS',
        message: `Request is in ${req.status} status and cannot be rejected`,
      });
    }

    const reason = (dto.reason || 'Rejected by authorized supervisor').trim();
    const now = new Date();

    const updated = await this.prisma.breakGlassRequest.updateMany({
      where: {
        id: dto.request_id,
        status: 'REQUESTED',
      },
      data: {
        status: 'REJECTED',
        rejectedAt: now,
        rejectionReason: reason,
        approverUserId: approver.id,
      },
    });

    if (updated.count === 0) {
      throw new ConflictException({
        code: 'RACE_CONFLICT',
        message: 'Request was already processed concurrently',
      });
    }

    const result = await this.prisma.breakGlassRequest.findUnique({
      where: { id: dto.request_id },
      include: {
        requester: { select: { id: true, fullName: true, role: true } },
        approver: { select: { id: true, fullName: true, role: true } },
      },
    });

    await this.logAudit({
      eventType: 'BREAK_GLASS_REJECTED',
      incidentId: req.incidentId,
      actorUserId: approver.id,
      actorKind: 'USER',
      targetType: 'break_glass_request',
      targetId: req.id,
      details: { rejectedBy: approver.id, reason },
      ipAddress,
    });

    return this.toResponseDto(result);
  }

  /**
   * Revoke an active emergency access grant.
   * POST /access-policy/break-glass/revoke
   */
  async revokeEmergencyAccess(
    revoker: AuthUser,
    dto: RevokeBreakGlassDto,
    ipAddress?: string,
  ): Promise<BreakGlassResponseDto> {
    const isSupervisor = SUPERVISOR_ROLES.includes(revoker.role);
    const req = await this.prisma.breakGlassRequest.findUnique({
      where: { id: dto.request_id },
    });

    if (!req) {
      throw new NotFoundException({
        code: 'REQUEST_NOT_FOUND',
        message: 'Emergency access request not found',
      });
    }

    // Requester can voluntarily revoke/end their own active grant, or supervisor/coordinator can revoke
    const isRequester = req.requesterUserId === revoker.id;
    if (!isSupervisor && !isRequester) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only supervisors or the original requester can revoke active emergency access',
      });
    }

    if (req.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'NOT_ACTIVE',
        message: `Grant is in ${req.status} status and cannot be revoked`,
      });
    }

    const reason = (dto.reason || 'Emergency access revoked').trim();
    const now = new Date();

    const updated = await this.prisma.breakGlassRequest.updateMany({
      where: {
        id: dto.request_id,
        status: 'ACTIVE',
      },
      data: {
        status: 'REVOKED',
        revokedAt: now,
        revokerUserId: revoker.id,
        revocationReason: reason,
      },
    });

    if (updated.count === 0) {
      throw new ConflictException({
        code: 'RACE_CONFLICT',
        message: 'Grant was already revoked or expired',
      });
    }

    const result = await this.prisma.breakGlassRequest.findUnique({
      where: { id: dto.request_id },
      include: {
        requester: { select: { id: true, fullName: true, role: true } },
        revoker: { select: { id: true, fullName: true } },
      },
    });

    await this.logAudit({
      eventType: 'BREAK_GLASS_REVOKED',
      incidentId: req.incidentId,
      actorUserId: revoker.id,
      actorKind: 'USER',
      targetType: 'break_glass_request',
      targetId: req.id,
      details: { revokerId: revoker.id, reason },
      ipAddress,
    });

    return this.toResponseDto(result);
  }

  /**
   * Conduct supervisor review on a critical break-glass action.
   * POST /access-policy/break-glass/review
   */
  async reviewEmergencyAccess(
    reviewer: AuthUser,
    dto: ReviewBreakGlassDto,
    ipAddress?: string,
  ): Promise<BreakGlassResponseDto> {
    const isSupervisor = SUPERVISOR_ROLES.includes(reviewer.role);
    if (!isSupervisor) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only campus supervisors (CAMPUS_ADMIN or CHIEF_PROCTOR) can conduct supervisor reviews',
      });
    }

    const req = await this.prisma.breakGlassRequest.findUnique({
      where: { id: dto.request_id },
    });

    if (!req) {
      throw new NotFoundException({
        code: 'REQUEST_NOT_FOUND',
        message: 'Emergency access record not found',
      });
    }

    if (req.supervisorReviewStatus !== 'REVIEW_REQUIRED') {
      throw new BadRequestException({
        code: 'REVIEW_NOT_PENDING',
        message: `Supervisor review status is currently ${req.supervisorReviewStatus}`,
      });
    }

    const now = new Date();
    const result = await this.prisma.breakGlassRequest.update({
      where: { id: dto.request_id },
      data: {
        supervisorReviewStatus: dto.status,
        reviewerUserId: reviewer.id,
        reviewedAt: now,
        reviewNotes: dto.notes,
      },
      include: {
        requester: { select: { id: true, fullName: true, role: true } },
        reviewer: { select: { id: true, fullName: true } },
      },
    });

    await this.logAudit({
      eventType: 'BREAK_GLASS_REVIEWED',
      incidentId: req.incidentId,
      actorUserId: reviewer.id,
      actorKind: 'USER',
      targetType: 'break_glass_request',
      targetId: req.id,
      details: { reviewerId: reviewer.id, reviewStatus: dto.status, notes: dto.notes },
      ipAddress,
    });

    return this.toResponseDto(result);
  }

  /**
   * Get emergency access status for the current user or a specific incident.
   * GET /access-policy/break-glass/status
   */
  async getEmergencyAccessStatus(
    user: AuthUser,
    incidentId: string,
  ): Promise<BreakGlassResponseDto | null> {
    const grant = await this.prisma.breakGlassRequest.findFirst({
      where: {
        incidentId,
        requesterUserId: user.id,
      },
      orderBy: { requestedAt: 'desc' },
      include: {
        requester: { select: { id: true, fullName: true, role: true } },
        approver: { select: { id: true, fullName: true, role: true } },
        revoker: { select: { id: true, fullName: true } },
        reviewer: { select: { id: true, fullName: true } },
      },
    });

    if (!grant) return null;

    // Check dynamic expiry: If marked ACTIVE but expiresAt <= now(), return dynamic EXPIRED
    if (grant.status === 'ACTIVE' && grant.expiresAt && grant.expiresAt <= new Date()) {
      return this.toResponseDto({ ...grant, status: 'EXPIRED' as BreakGlassStatus });
    }

    return this.toResponseDto(grant);
  }

  /**
   * List emergency access requests (for supervisors / coordinators / audit).
   * GET /access-policy/break-glass/requests
   */
  async listEmergencyAccessRequests(
    user: AuthUser,
    filters: { incident_id?: string; status?: string; limit?: number },
  ): Promise<BreakGlassResponseDto[]> {
    const isSupervisor = SUPERVISOR_ROLES.includes(user.role);
    const where: any = {};

    if (filters.incident_id) {
      where.incidentId = filters.incident_id;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // Non-supervisors only see their own requests
    if (!isSupervisor) {
      where.requesterUserId = user.id;
    }

    const take = Math.min(filters.limit || 50, 100);

    const requests = await this.prisma.breakGlassRequest.findMany({
      where,
      take,
      orderBy: { requestedAt: 'desc' },
      include: {
        requester: { select: { id: true, fullName: true, role: true } },
        approver: { select: { id: true, fullName: true, role: true } },
        revoker: { select: { id: true, fullName: true } },
        reviewer: { select: { id: true, fullName: true } },
      },
    });

    return requests.map(r => {
      // Dynamic expiry check
      if (r.status === 'ACTIVE' && r.expiresAt && r.expiresAt <= new Date()) {
        return this.toResponseDto({ ...r, status: 'EXPIRED' as BreakGlassStatus });
      }
      return this.toResponseDto(r);
    });
  }

  /**
   * Retrieve reporter contact details under explicit REPORTER_CONTACT_VIEW scope.
   * Access is strictly audited.
   */
  async getReporterContact(
    user: AuthUser,
    incidentId: string,
    ipAddress?: string,
  ) {
    const canView = await this.canViewReporterContact(user, incidentId);
    if (!canView) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Access to reporter contact information requires the REPORTER_CONTACT_VIEW scope',
      });
    }

    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        reporter: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException({
        code: 'INCIDENT_NOT_FOUND',
        message: 'Incident not found',
      });
    }

    // Audit sensitive reporter contact access
    const activeGrant = await this.getActiveGrant(user.id, incidentId);
    await this.logAudit({
      eventType: 'ACCESS_RESTRICTED_CASE',
      incidentId,
      actorUserId: user.id,
      actorKind: 'USER',
      targetType: 'reporter_contact',
      targetId: incident.reporterId,
      details: {
        scope: 'REPORTER_CONTACT_VIEW',
        breakGlass: !!activeGrant,
        grantId: activeGrant?.id || null,
      },
      ipAddress,
    });

    return {
      incident_id: incidentId,
      reporter: incident.reporter,
    };
  }

  /**
   * Audit sensitive resource access performed using break-glass privileges.
   */
  async auditSensitiveAccess(
    user: AuthUser,
    incidentId: string,
    scope: 'EVIDENCE_VIEW' | 'REPORTER_CONTACT_VIEW',
    details?: any,
    ipAddress?: string,
  ) {
    await this.logAudit({
      eventType: 'ACCESS_EVENT',
      incidentId,
      actorUserId: user.id,
      actorKind: 'USER',
      targetType: scope === 'EVIDENCE_VIEW' ? 'evidence' : 'reporter_contact',
      details: {
        scope,
        breakGlass: true,
        ...details,
      },
      ipAddress,
    });
  }

  /**
   * Background sweep for expired break-glass grants.
   * Updates state in DB and writes tamper-evident BREAK_GLASS_EXPIRED audit event.
   */
  async cleanupExpiredGrants(): Promise<number> {
    const expired = await this.prisma.breakGlassRequest.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: new Date() },
      },
    });

    for (const grant of expired) {
      await this.prisma.breakGlassRequest.update({
        where: { id: grant.id },
        data: { status: 'EXPIRED' },
      });

      await this.logAudit({
        eventType: 'BREAK_GLASS_EXPIRED',
        incidentId: grant.incidentId,
        actorUserId: grant.requesterUserId,
        actorKind: 'SYSTEM',
        targetType: 'break_glass_request',
        targetId: grant.id,
        details: { grantId: grant.id, expiredAt: grant.expiresAt },
      });
    }

    return expired.length;
  }

  // =========================================================================
  // Internal Helpers
  // =========================================================================

  private async logAudit(params: {
    eventType: string;
    incidentId?: string;
    actorUserId?: string;
    actorKind: string;
    targetType?: string;
    targetId?: string;
    details?: any;
    ipAddress?: string;
  }) {
    if (this.auditService) {
      try {
        await this.auditService.log(params);
      } catch (err) {
        // Fallback or log error without halting emergency operations if audit service fails
        console.error('Failed to log audit event in AccessPolicyService:', err);
      }
    }
  }

  private toResponseDto(req: any): BreakGlassResponseDto {
    return {
      id: req.id,
      incident_id: req.incidentId,
      requester: {
        id: req.requesterUserId,
        full_name: req.requester?.fullName,
        role: req.requester?.role,
      },
      type: req.type,
      status: req.status,
      requested_scopes: req.requestedScopes,
      approved_scopes: req.approvedScopes || [],
      reason: req.reason,
      requested_at: req.requestedAt instanceof Date ? req.requestedAt.toISOString() : req.requestedAt,
      approver: req.approverUserId
        ? {
            id: req.approverUserId,
            full_name: req.approver?.fullName,
            role: req.approver?.role,
          }
        : null,
      approved_at: req.approvedAt
        ? (req.approvedAt instanceof Date ? req.approvedAt.toISOString() : req.approvedAt)
        : null,
      activated_at: req.activatedAt
        ? (req.activatedAt instanceof Date ? req.activatedAt.toISOString() : req.activatedAt)
        : null,
      expires_at: req.expiresAt
        ? (req.expiresAt instanceof Date ? req.expiresAt.toISOString() : req.expiresAt)
        : null,
      revoker: req.revokerUserId
        ? {
            id: req.revokerUserId,
            full_name: req.revoker?.fullName,
          }
        : null,
      revoked_at: req.revokedAt
        ? (req.revokedAt instanceof Date ? req.revokedAt.toISOString() : req.revokedAt)
        : null,
      revocation_reason: req.revocationReason || null,
      rejected_at: req.rejectedAt
        ? (req.rejectedAt instanceof Date ? req.rejectedAt.toISOString() : req.rejectedAt)
        : null,
      rejection_reason: req.rejectionReason || null,
      supervisor_review_status: req.supervisorReviewStatus,
      reviewed_at: req.reviewedAt
        ? (req.reviewedAt instanceof Date ? req.reviewedAt.toISOString() : req.reviewedAt)
        : null,
      reviewer: req.reviewerUserId
        ? {
            id: req.reviewerUserId,
            full_name: req.reviewer?.fullName,
          }
        : null,
      review_notes: req.reviewNotes || null,
    };
  }
}
