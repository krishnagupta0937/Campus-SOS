import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccessPolicyService } from './access-policy.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../../common/guards/jwt-auth.guard';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

describe('Emergency Access / Break-Glass Workflow (Phase 4 Hardened Spec)', () => {
  let service: AccessPolicyService;
  let mockPrisma: any;
  let mockAudit: any;

  const createAuthUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
    id: 'user-sec-1',
    role: 'SECURITY',
    teams: ['SECURITY'],
    teamMemberships: [
      {
        teamId: 'team-sec',
        teamCode: 'SECURITY',
        memberId: 'mem-sec-1',
        isCoordinator: false,
        canViewRestricted: false,
      },
    ],
    isPersonnel: true,
    email: 'sec1@campus.edu',
    fullName: 'Officer Security',
    ...overrides,
  });

  beforeEach(() => {
    mockAudit = {
      log: vi.fn().mockResolvedValue({ id: 1 }),
    };

    mockPrisma = {
      incident: {
        findUnique: vi.fn(),
      },
      incidentTeam: {
        findFirst: vi.fn(),
      },
      breakGlassRequest: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    service = new AccessPolicyService(mockPrisma as PrismaService, mockAudit as AuditService);
  });

  // =========================================================================
  // 1. Request Workflow & Validation
  // =========================================================================
  describe('Break-Glass Request Scenarios', () => {
    it('1. should reject unauthorized regular student from requesting break-glass', async () => {
      const student = createAuthUser({
        id: 'student-1',
        role: 'STUDENT',
        isPersonnel: false,
        teams: [],
        teamMemberships: [],
      });

      await expect(
        service.requestEmergencyAccess(student, {
          incident_id: 'inc-1',
          requested_scopes: ['INCIDENT_VIEW'],
          reason: 'I want to see what happened',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('2. should permit authorized personnel to submit a NORMAL_OVERRIDE request', async () => {
      const responder = createAuthUser();
      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-1',
        status: 'RESPONDER_ASSIGNED',
        workflow: 'EMERGENCY_SOS',
        reporterId: 'other-user',
        isRestricted: false,
        incidentTeams: [],
        assignments: [],
      });
      mockPrisma.breakGlassRequest.findFirst.mockResolvedValue(null);
      mockPrisma.breakGlassRequest.create.mockResolvedValue({
        id: 'bg-req-1',
        incidentId: 'inc-1',
        requesterUserId: responder.id,
        requesterTeamContext: 'SECURITY',
        type: 'NORMAL_OVERRIDE',
        status: 'REQUESTED',
        requestedScopes: ['INCIDENT_VIEW'],
        approvedScopes: [],
        reason: 'Cross-team assistance requested by medical unit',
        requestedAt: new Date(),
        supervisorReviewStatus: 'NOT_REQUIRED',
        requester: { id: responder.id, fullName: 'Officer Security', role: 'SECURITY' },
      });

      const res = await service.requestEmergencyAccess(responder, {
        incident_id: 'inc-1',
        type: 'NORMAL_OVERRIDE',
        requested_scopes: ['INCIDENT_VIEW'],
        reason: 'Cross-team assistance requested by medical unit',
      });

      expect(res.status).toBe('REQUESTED');
      expect(res.requested_scopes).toContain('INCIDENT_VIEW');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'BREAK_GLASS_REQUESTED',
          actorUserId: responder.id,
        }),
      );
    });

    it('3. should reject request with missing or trivial reason', async () => {
      const responder = createAuthUser();
      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-1',
        status: 'RESPONDER_ASSIGNED',
      });

      await expect(
        service.requestEmergencyAccess(responder, {
          incident_id: 'inc-1',
          requested_scopes: ['INCIDENT_VIEW'],
          reason: '  hi ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('4. should reject non-existent incident', async () => {
      const responder = createAuthUser();
      mockPrisma.incident.findUnique.mockResolvedValue(null);

      await expect(
        service.requestEmergencyAccess(responder, {
          incident_id: 'inc-non-existent',
          requested_scopes: ['INCIDENT_VIEW'],
          reason: 'Urgent assistance needed',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('5. should reject request for resolved or cancelled incident', async () => {
      const responder = createAuthUser();
      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-closed',
        status: 'RESOLVED',
      });

      await expect(
        service.requestEmergencyAccess(responder, {
          incident_id: 'inc-closed',
          requested_scopes: ['INCIDENT_VIEW'],
          reason: 'Need to review past logs',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('6. should reject invalid or unrecognized scopes', async () => {
      const responder = createAuthUser();
      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-1',
        status: 'RESPONDER_ASSIGNED',
      });

      await expect(
        service.requestEmergencyAccess(responder, {
          incident_id: 'inc-1',
          requested_scopes: ['SUPER_ADMIN_ALL' as any],
          reason: 'Need unrestricted access',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('7. should reject request if user already possesses the requested permission', async () => {
      const responder = createAuthUser({
        teamMemberships: [
          { teamId: 't-sec', teamCode: 'SECURITY', memberId: 'm1', isCoordinator: false, canViewRestricted: false },
        ],
      });
      // Incident is already routed to SECURITY team
      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-1',
        status: 'RESPONDER_ASSIGNED',
        reporterId: 'student-99',
        isRestricted: false,
        incidentTeams: [{ teamId: 't-sec' }],
        assignments: [],
      });

      await expect(
        service.requestEmergencyAccess(responder, {
          incident_id: 'inc-1',
          requested_scopes: ['INCIDENT_VIEW'],
          reason: 'Assisting on scene',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('8. should reject request when user already has active grant on this incident', async () => {
      const responder = createAuthUser();
      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-1',
        status: 'RESPONDER_ASSIGNED',
        reporterId: 'other',
        isRestricted: false,
        incidentTeams: [],
        assignments: [],
      });
      // Existing active grant
      mockPrisma.breakGlassRequest.findFirst.mockResolvedValue({
        id: 'existing-grant',
        status: 'ACTIVE',
        approvedScopes: ['EVIDENCE_VIEW'],
        expiresAt: new Date(Date.now() + 600000),
      });

      await expect(
        service.requestEmergencyAccess(responder, {
          incident_id: 'inc-1',
          requested_scopes: ['EVIDENCE_VIEW'],
          reason: 'Additional scope needed',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // =========================================================================
  // 2. Critical Break-Glass Path
  // =========================================================================
  describe('Critical Break-Glass Immediate Path (PRD §9)', () => {
    it('20 & 21. should immediately activate CRITICAL_BREAK_GLASS and mark REVIEW_REQUIRED', async () => {
      const responder = createAuthUser();
      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-crit-1',
        status: 'RESPONDER_ASSIGNED',
        workflow: 'EMERGENCY_SOS',
        reporterId: 'other',
        isRestricted: false,
        incidentTeams: [],
        assignments: [],
      });
      mockPrisma.breakGlassRequest.findFirst.mockResolvedValue(null);
      mockPrisma.breakGlassRequest.create.mockImplementation((args: any) => ({
        id: 'crit-bg-1',
        ...args.data,
        requester: { id: responder.id, fullName: 'Officer Security', role: 'SECURITY' },
      }));

      const res = await service.requestEmergencyAccess(responder, {
        incident_id: 'inc-crit-1',
        type: 'CRITICAL_BREAK_GLASS',
        requested_scopes: ['INCIDENT_VIEW', 'LOCATION_VIEW'],
        reason: 'Immediate life-safety hazard, delayed approval creates extreme risk',
      });

      expect(res.status).toBe('ACTIVE');
      expect(res.type).toBe('CRITICAL_BREAK_GLASS');
      expect(res.supervisor_review_status).toBe('REVIEW_REQUIRED');
      expect(res.approved_scopes).toEqual(['INCIDENT_VIEW', 'LOCATION_VIEW']);

      // Audits generated: REQUESTED, ACTIVATED, REVIEW_REQUIRED
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'BREAK_GLASS_REQUESTED' }),
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'BREAK_GLASS_ACTIVATED' }),
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'BREAK_GLASS_REVIEW_REQUIRED' }),
      );
    });

    it('28. should permit authorized supervisor to review and close critical review', async () => {
      const supervisor = createAuthUser({
        id: 'chief-1',
        role: 'CHIEF_PROCTOR',
      });

      mockPrisma.breakGlassRequest.findUnique.mockResolvedValue({
        id: 'crit-bg-1',
        incidentId: 'inc-crit-1',
        supervisorReviewStatus: 'REVIEW_REQUIRED',
        requesterUserId: 'user-sec-1',
      });

      mockPrisma.breakGlassRequest.update.mockResolvedValue({
        id: 'crit-bg-1',
        incidentId: 'inc-crit-1',
        requesterUserId: 'user-sec-1',
        supervisorReviewStatus: 'REVIEWED',
        reviewerUserId: supervisor.id,
        reviewedAt: new Date(),
        reviewNotes: 'Reviewed incident logs; emergency override justified.',
        requestedScopes: ['INCIDENT_VIEW'],
        approvedScopes: ['INCIDENT_VIEW'],
        reason: 'Life safety',
        status: 'ACTIVE',
        requester: { id: 'user-sec-1', fullName: 'Officer', role: 'SECURITY' },
        reviewer: { id: supervisor.id, fullName: 'Chief Proctor' },
      });

      const res = await service.reviewEmergencyAccess(supervisor, {
        request_id: 'crit-bg-1',
        status: 'REVIEWED',
        notes: 'Reviewed incident logs; emergency override justified.',
      });

      expect(res.supervisor_review_status).toBe('REVIEWED');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'BREAK_GLASS_REVIEWED',
          actorUserId: supervisor.id,
        }),
      );
    });
  });

  // =========================================================================
  // 3. Approval Workflow & Authorization Boundaries
  // =========================================================================
  describe('Approval Workflow Scenarios', () => {
    it('8. should reject unauthorized personnel from approving break-glass', async () => {
      const regularResponder = createAuthUser({
        id: 'med-1',
        role: 'MEDICAL',
        teamMemberships: [{ teamId: 't-med', teamCode: 'MEDICAL', memberId: 'm1', isCoordinator: false, canViewRestricted: false }],
      });

      await expect(
        service.approveEmergencyAccess(regularResponder, {
          request_id: 'bg-req-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('13. should PROHIBIT requester from approving their own request', async () => {
      const coordinator = createAuthUser({
        id: 'sec-coord-1',
        role: 'SECURITY',
        teamMemberships: [{ teamId: 't-sec', teamCode: 'SECURITY', memberId: 'm1', isCoordinator: true, canViewRestricted: true }],
      });

      mockPrisma.breakGlassRequest.findUnique.mockResolvedValue({
        id: 'bg-req-1',
        incidentId: 'inc-1',
        requesterUserId: 'sec-coord-1', // Same user!
        status: 'REQUESTED',
        requestedScopes: ['INCIDENT_VIEW'],
        incident: { incidentTeams: [{ teamId: 't-sec' }] },
      });

      await expect(
        service.approveEmergencyAccess(coordinator, {
          request_id: 'bg-req-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('14. should reject approver attempting to grant excessive scopes beyond requested', async () => {
      const supervisor = createAuthUser({ id: 'admin-supervisor-1', role: 'CAMPUS_ADMIN' });

      mockPrisma.breakGlassRequest.findUnique.mockResolvedValue({
        id: 'bg-req-1',
        incidentId: 'inc-1',
        requesterUserId: 'user-sec-1',
        status: 'REQUESTED',
        requestedScopes: ['INCIDENT_VIEW'], // Only INCIDENT_VIEW requested
        incident: { incidentTeams: [] },
      });

      await expect(
        service.approveEmergencyAccess(supervisor, {
          request_id: 'bg-req-1',
          approved_scopes: ['INCIDENT_VIEW', 'EVIDENCE_VIEW', 'INCIDENT_UPDATE'], // Excessive!
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('9 & 10. should allow authorized administrator to approve and activate access', async () => {
      const admin = createAuthUser({ id: 'admin-1', role: 'CAMPUS_ADMIN' });

      mockPrisma.breakGlassRequest.findUnique
        .mockResolvedValueOnce({
          id: 'bg-req-1',
          incidentId: 'inc-1',
          requesterUserId: 'user-sec-1',
          status: 'REQUESTED',
          requestedScopes: ['INCIDENT_VIEW', 'LOCATION_VIEW'],
          incident: { incidentTeams: [] },
        })
        .mockResolvedValueOnce({
          id: 'bg-req-1',
          incidentId: 'inc-1',
          requesterUserId: 'user-sec-1',
          status: 'ACTIVE',
          requestedScopes: ['INCIDENT_VIEW', 'LOCATION_VIEW'],
          approvedScopes: ['INCIDENT_VIEW', 'LOCATION_VIEW'],
          approverUserId: admin.id,
          reason: 'Cross team assist',
          requester: { id: 'user-sec-1', fullName: 'Officer', role: 'SECURITY' },
          approver: { id: admin.id, fullName: 'Admin', role: 'CAMPUS_ADMIN' },
        });

      mockPrisma.breakGlassRequest.updateMany.mockResolvedValue({ count: 1 });

      const res = await service.approveEmergencyAccess(admin, {
        request_id: 'bg-req-1',
        duration_minutes: 60,
      });

      expect(res.status).toBe('ACTIVE');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'BREAK_GLASS_APPROVED' }),
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'BREAK_GLASS_ACTIVATED' }),
      );
    });

    it('25 & 26. should ensure concurrent approval attempts are race-safe (atomic count check)', async () => {
      const admin = createAuthUser({ id: 'admin-1', role: 'CAMPUS_ADMIN' });

      mockPrisma.breakGlassRequest.findUnique.mockResolvedValue({
        id: 'bg-req-1',
        incidentId: 'inc-1',
        requesterUserId: 'user-sec-1',
        status: 'REQUESTED',
        requestedScopes: ['INCIDENT_VIEW'],
        incident: { incidentTeams: [] },
      });

      // Another transaction updated status concurrently!
      mockPrisma.breakGlassRequest.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.approveEmergencyAccess(admin, { request_id: 'bg-req-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // =========================================================================
  // 4. Revocation & Expiry
  // =========================================================================
  describe('Revocation and Expiry Enforcement', () => {
    it('13 & 14. should permit authorized revocation and immediately terminate active grant', async () => {
      const supervisor = createAuthUser({ id: 'admin-1', role: 'CAMPUS_ADMIN' });

      mockPrisma.breakGlassRequest.findUnique
        .mockResolvedValueOnce({
          id: 'bg-req-1',
          status: 'ACTIVE',
          incidentId: 'inc-1',
          requesterUserId: 'user-sec-1',
        })
        .mockResolvedValueOnce({
          id: 'bg-req-1',
          status: 'REVOKED',
          incidentId: 'inc-1',
          requesterUserId: 'user-sec-1',
          revokerUserId: supervisor.id,
          revocationReason: 'Operation concluded',
          requester: { id: 'user-sec-1', fullName: 'Officer', role: 'SECURITY' },
          revoker: { id: supervisor.id, fullName: 'Admin' },
        });

      mockPrisma.breakGlassRequest.updateMany.mockResolvedValue({ count: 1 });

      const res = await service.revokeEmergencyAccess(supervisor, {
        request_id: 'bg-req-1',
        reason: 'Operation concluded',
      });

      expect(res.status).toBe('REVOKED');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'BREAK_GLASS_REVOKED',
          actorUserId: supervisor.id,
        }),
      );
    });

    it('11 & 12. should reject authorization when active grant has reached expiresAt timestamp', async () => {
      const responder = createAuthUser({ id: 'user-sec-1' });

      // Grant in DB is marked ACTIVE, but expiresAt was 5 minutes ago!
      mockPrisma.breakGlassRequest.findFirst.mockResolvedValue(null); // Backend query enforces gt: now()

      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-1',
        reporterId: 'other-user',
        isRestricted: false,
        incidentTeams: [],
        assignments: [],
      });

      const canView = await service.canViewIncident(responder, 'inc-1');
      expect(canView).toBe(false);
    });

    it('24. background cleanupExpiredGrants sweeps expired grants and logs audit chain event', async () => {
      const past = new Date(Date.now() - 3600000);
      mockPrisma.breakGlassRequest.findMany.mockResolvedValue([
        {
          id: 'expired-1',
          incidentId: 'inc-1',
          requesterUserId: 'user-sec-1',
          expiresAt: past,
        },
      ]);
      mockPrisma.breakGlassRequest.update.mockResolvedValue({});

      const count = await service.cleanupExpiredGrants();
      expect(count).toBe(1);
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'BREAK_GLASS_EXPIRED',
          actorKind: 'SYSTEM',
          targetId: 'expired-1',
        }),
      );
    });
  });

  // =========================================================================
  // 5. Granular Scopes Isolation (Least Privilege)
  // =========================================================================
  describe('Granular Scope Isolation & Incident Boundary', () => {
    it('15 & 19. should protect reporter contact when grant lacks REPORTER_CONTACT_VIEW', async () => {
      const responder = createAuthUser({ id: 'user-sec-1' });

      // Active grant only has INCIDENT_VIEW
      mockPrisma.breakGlassRequest.findFirst.mockResolvedValue({
        id: 'bg-view-only',
        approvedScopes: ['INCIDENT_VIEW'],
        expiresAt: new Date(Date.now() + 600000),
      });

      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-1',
        reporterId: 'student-victim-1',
      });

      const canViewContact = await service.canViewReporterContact(responder, 'inc-1');
      expect(canViewContact).toBe(false);

      await expect(
        service.getReporterContact(responder, 'inc-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('20. should allow reporter contact when grant includes REPORTER_CONTACT_VIEW and log audit', async () => {
      const responder = createAuthUser({ id: 'user-sec-1' });

      mockPrisma.breakGlassRequest.findFirst.mockResolvedValue({
        id: 'bg-contact-grant',
        approvedScopes: ['INCIDENT_VIEW', 'REPORTER_CONTACT_VIEW'],
        expiresAt: new Date(Date.now() + 600000),
      });

      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-1',
        reporterId: 'student-victim-1',
        reporter: {
          id: 'student-victim-1',
          fullName: 'Victim Student',
          phone: '+919876543210',
          email: 'victim@campus.edu',
        },
      });

      const contact = await service.getReporterContact(responder, 'inc-1');
      expect(contact.reporter.phone).toBe('+919876543210');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'ACCESS_RESTRICTED_CASE',
          actorUserId: responder.id,
          targetType: 'reporter_contact',
        }),
      );
    });

    it('16 & 21. should protect photos/evidence when grant lacks EVIDENCE_VIEW', async () => {
      const responder = createAuthUser({ id: 'user-sec-1' });

      // Active grant has INCIDENT_VIEW and LOCATION_VIEW, but NOT EVIDENCE_VIEW
      mockPrisma.breakGlassRequest.findFirst.mockResolvedValue({
        id: 'bg-no-photo',
        approvedScopes: ['INCIDENT_VIEW', 'LOCATION_VIEW'],
        expiresAt: new Date(Date.now() + 600000),
      });

      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-1',
        reporterId: 'student-victim-1',
        incidentTeams: [],
        assignments: [],
      });

      const canViewPhotos = await service.canViewPhotos(responder, 'inc-1');
      expect(canViewPhotos).toBe(false);
    });

    it('22. should allow photos/evidence when grant explicitly includes EVIDENCE_VIEW', async () => {
      const responder = createAuthUser({ id: 'user-sec-1' });

      mockPrisma.breakGlassRequest.findFirst.mockResolvedValue({
        id: 'bg-photo-grant',
        approvedScopes: ['INCIDENT_VIEW', 'EVIDENCE_VIEW'],
        expiresAt: new Date(Date.now() + 600000),
      });

      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-1',
        reporterId: 'student-victim-1',
        incidentTeams: [],
        assignments: [],
      });

      const canViewPhotos = await service.canViewPhotos(responder, 'inc-1');
      expect(canViewPhotos).toBe(true);
    });

    it('17 & 23. should ensure INCIDENT_VIEW does not grant INCIDENT_UPDATE', async () => {
      const responder = createAuthUser({ id: 'user-sec-1' });

      mockPrisma.breakGlassRequest.findFirst.mockResolvedValue({
        id: 'bg-view-grant',
        approvedScopes: ['INCIDENT_VIEW'],
        expiresAt: new Date(Date.now() + 600000),
      });

      mockPrisma.incidentTeam.findFirst.mockResolvedValue(null);

      const canModify = await service.canModifyIncident(responder, 'inc-1');
      expect(canModify).toBe(false);
    });

    it('24. should permit INCIDENT_UPDATE when grant explicitly contains INCIDENT_UPDATE', async () => {
      const responder = createAuthUser({ id: 'user-sec-1' });

      mockPrisma.breakGlassRequest.findFirst.mockResolvedValue({
        id: 'bg-update-grant',
        approvedScopes: ['INCIDENT_VIEW', 'INCIDENT_UPDATE'],
        expiresAt: new Date(Date.now() + 600000),
      });

      const canModify = await service.canModifyIncident(responder, 'inc-1');
      expect(canModify).toBe(true);
    });

    it('25. should enforce REALTIME_ACCESS scope for socket gateway validation', async () => {
      const responder = createAuthUser({ id: 'user-sec-1' });

      // No grant
      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-1',
        reporterId: 'other',
        incidentTeams: [],
      });
      mockPrisma.breakGlassRequest.findFirst.mockResolvedValue(null);

      expect(await service.hasRealtimeAccess(responder, 'inc-1')).toBe(false);

      // Grant with REALTIME_ACCESS
      mockPrisma.breakGlassRequest.findFirst.mockResolvedValue({
        id: 'bg-rt-grant',
        approvedScopes: ['REALTIME_ACCESS'],
        expiresAt: new Date(Date.now() + 600000),
      });

      expect(await service.hasRealtimeAccess(responder, 'inc-1')).toBe(true);
    });

    it('6. should enforce incident boundary: grant for Incident A does not grant access to Incident B', async () => {
      const responder = createAuthUser({ id: 'user-sec-1' });

      // Grant is specifically for Incident A
      mockPrisma.breakGlassRequest.findFirst.mockImplementation((args: any) => {
        if (args.where.incidentId === 'incident-A') {
          return {
            id: 'grant-A',
            incidentId: 'incident-A',
            approvedScopes: ['INCIDENT_VIEW'],
            expiresAt: new Date(Date.now() + 600000),
          };
        }
        return null;
      });

      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'incident-B',
        reporterId: 'other-reporter',
        incidentTeams: [],
        assignments: [],
      });

      const canViewA = await service.canViewIncident(responder, 'incident-A');
      const canViewB = await service.canViewIncident(responder, 'incident-B');

      expect(canViewA).toBe(true);
      expect(canViewB).toBe(false);
    });
  });
});
