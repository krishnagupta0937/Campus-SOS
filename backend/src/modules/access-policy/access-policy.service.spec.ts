import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccessPolicyService } from './access-policy.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../../common/guards/jwt-auth.guard';

describe('AccessPolicyService (Authorization & Privacy Isolation)', () => {
  let service: AccessPolicyService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      incident: {
        findUnique: vi.fn(),
      },
      incidentTeam: {
        findFirst: vi.fn(),
      },
    };
    service = new AccessPolicyService(mockPrisma as PrismaService);
  });

  const createAuthUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
    id: 'user-student-1',
    role: 'STUDENT',
    teams: [],
    teamMemberships: [],
    isPersonnel: false,
    email: 'student1@campus.edu',
    fullName: 'Student One',
    ...overrides,
  });

  describe('Incident Visibility Rules (PRD §14, ARCHITECTURE.md §7.2)', () => {
    it('should grant CAMPUS_ADMIN access to all incidents unconditionally', async () => {
      const adminUser = createAuthUser({
        id: 'admin-1',
        role: 'CAMPUS_ADMIN',
        isPersonnel: true,
      });

      const canView = await service.canViewIncident(adminUser, 'any-incident-id');
      expect(canView).toBe(true);
      // No DB query needed for admin
      expect(mockPrisma.incident.findUnique).not.toHaveBeenCalled();
    });

    it('should allow the student reporter to view their own submitted incident', async () => {
      const studentUser = createAuthUser({ id: 'student-reporter-1' });

      mockPrisma.incident.findUnique.mockResolvedValue({
        reporterId: 'student-reporter-1',
        isRestricted: false,
        incidentTeams: [],
        assignments: [],
      });

      const canView = await service.canViewIncident(studentUser, 'inc-1');
      expect(canView).toBe(true);
    });

    it('should DENY an unrelated student from viewing an incident', async () => {
      const studentUser = createAuthUser({ id: 'student-unrelated' });

      mockPrisma.incident.findUnique.mockResolvedValue({
        reporterId: 'student-reporter-1',
        isRestricted: false,
        incidentTeams: [],
        assignments: [],
      });

      const canView = await service.canViewIncident(studentUser, 'inc-1');
      expect(canView).toBe(false);
    });

    it('should allow routed team members to view standard (non-restricted) incidents', async () => {
      const securityUser = createAuthUser({
        id: 'sec-user-1',
        role: 'SECURITY',
        isPersonnel: true,
        teams: ['SECURITY'],
        teamMemberships: [
          { teamId: 'team-sec-id', teamCode: 'SECURITY', memberId: 'mem-sec-1', isCoordinator: false, canViewRestricted: false },
        ],
      });

      mockPrisma.incident.findUnique.mockResolvedValue({
        reporterId: 'student-reporter-1',
        isRestricted: false,
        incidentTeams: [{ teamId: 'team-sec-id' }],
        assignments: [],
      });

      const canView = await service.canViewIncident(securityUser, 'inc-fire-1');
      expect(canView).toBe(true);
    });

    it('should DENY routed team member from viewing a RESTRICTED incident if canViewRestricted is false', async () => {
      const responderUser = createAuthUser({
        id: 'resp-user-1',
        role: 'SECURITY',
        isPersonnel: true,
        teams: ['SECURITY'],
        teamMemberships: [
          { teamId: 'team-sec-id', teamCode: 'SECURITY', memberId: 'mem-sec-1', isCoordinator: false, canViewRestricted: false },
        ],
      });

      mockPrisma.incident.findUnique.mockResolvedValue({
        reporterId: 'student-reporter-1',
        isRestricted: true, // Restricted case (e.g. Harassment / Misconduct)
        incidentTeams: [{ teamId: 'team-sec-id' }],
        assignments: [],
      });

      const canView = await service.canViewIncident(responderUser, 'inc-harassment-1');
      expect(canView).toBe(false);
    });

    it('should ALLOW routed team member to view a RESTRICTED incident if canViewRestricted is true', async () => {
      const authorizedUser = createAuthUser({
        id: 'chief-proctor-1',
        role: 'CHIEF_PROCTOR',
        isPersonnel: true,
        teams: ['CHIEF_PROCTOR'],
        teamMemberships: [
          { teamId: 'team-proctor-id', teamCode: 'CHIEF_PROCTOR', memberId: 'mem-proctor-1', isCoordinator: true, canViewRestricted: true },
        ],
      });

      mockPrisma.incident.findUnique.mockResolvedValue({
        reporterId: 'student-reporter-1',
        isRestricted: true,
        incidentTeams: [{ teamId: 'team-proctor-id' }],
        assignments: [],
      });

      const canView = await service.canViewIncident(authorizedUser, 'inc-harassment-1');
      expect(canView).toBe(true);
    });
  });

  describe('Field-Level Visibility Filtering', () => {
    it('should return "full" for CAMPUS_ADMIN', () => {
      const user = createAuthUser({ role: 'CAMPUS_ADMIN', isPersonnel: true });
      expect(service.getFieldFilter(user, true)).toBe('full');
      expect(service.getFieldFilter(user, false)).toBe('full');
    });

    it('should return "team" for personnel with team memberships', () => {
      const user = createAuthUser({
        role: 'SECURITY',
        isPersonnel: true,
        teamMemberships: [{ teamId: 't1', teamCode: 'SECURITY', memberId: 'm1', isCoordinator: false, canViewRestricted: false }],
      });
      expect(service.getFieldFilter(user, false)).toBe('team');
    });

    it('should return "reporter" for students', () => {
      const user = createAuthUser({ role: 'STUDENT', isPersonnel: false });
      expect(service.getFieldFilter(user, false)).toBe('reporter');
    });
  });
});
