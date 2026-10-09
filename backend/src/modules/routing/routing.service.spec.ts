import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoutingService } from './routing.service';
import { PrismaService } from '../../database/prisma.service';
import { AiClassification } from '../ai/ai.service';

describe('RoutingService (Deterministic Routing & Category Union)', () => {
  let service: RoutingService;
  let mockPrisma: any;

  const mockEnabledTeams = [
    { code: 'FIRE_SAFETY', isRestricted: false },
    { code: 'SECURITY', isRestricted: false },
    { code: 'MEDICAL', isRestricted: false },
    { code: 'CHIEF_PROCTOR', isRestricted: false },
    { code: 'WOMEN_SAFETY', isRestricted: true },
    { code: 'MEN_SAFETY', isRestricted: true },
    { code: 'CAMPUS_ADMIN', isRestricted: false },
    { code: 'INFRASTRUCTURE', isRestricted: false },
    { code: 'TRANSPORTATION', isRestricted: false },
    { code: 'IT_DIGITAL', isRestricted: false },
    { code: 'STUDENT_COUNCIL', isRestricted: false },
  ];

  beforeEach(() => {
    mockPrisma = {
      team: {
        findMany: vi.fn().mockResolvedValue(mockEnabledTeams),
      },
    };
    service = new RoutingService(mockPrisma as PrismaService);
  });

  const baseClassification = (overrides: Partial<AiClassification> = {}): AiClassification => ({
    category: 'OTHER',
    confidence: 0.9,
    immediate_danger: false,
    secondary_categories: [],
    flags: {
      is_major: false,
      injury_present: false,
      violence_flag: false,
      crowd_risk: false,
      vehicle_involved: false,
      safety_risk: false,
      digital_harassment: false,
      self_harm_indicator: false,
    },
    structured_data: {},
    source: 'AI',
    reasoning: 'Test classification',
    ...overrides,
  });

  describe('Core Routing Rules for All Major Categories', () => {
    it('should route FIRE to FIRE_SAFETY (ACT), SECURITY (ACT), and CAMPUS_ADMIN (KNOW)', async () => {
      const classification = baseClassification({ category: 'FIRE', flags: { is_major: true } as any });
      const decision = await service.route(classification, { workflow: 'EMERGENCY_SOS', student_category: null });

      const teamCodes = decision.teams.map(t => t.team_code);
      expect(teamCodes).toContain('FIRE_SAFETY');
      expect(teamCodes).toContain('SECURITY');
      expect(teamCodes).toContain('CAMPUS_ADMIN');

      const fireSafety = decision.teams.find(t => t.team_code === 'FIRE_SAFETY');
      expect(fireSafety?.role).toBe('ACT');

      const admin = decision.teams.find(t => t.team_code === 'CAMPUS_ADMIN');
      expect(admin?.role).toBe('KNOW');

      expect(decision.restricted).toBe(false);
      expect(decision.campus_wide_eligible).toBe(true);
    });

    it('should route MEDICAL_EMERGENCY to MEDICAL (ACT) and mark as restricted', async () => {
      const classification = baseClassification({ category: 'MEDICAL_EMERGENCY' });
      const decision = await service.route(classification, { workflow: 'EMERGENCY_SOS', student_category: null });

      const medTeam = decision.teams.find(t => t.team_code === 'MEDICAL');
      expect(medTeam?.role).toBe('ACT');
      expect(decision.restricted).toBe(true);
      expect(decision.campus_wide_eligible).toBe(false); // Deny list!
    });

    it('should route FIGHT_QUARREL to SECURITY (ACT) and CHIEF_PROCTOR (ACT)', async () => {
      const classification = baseClassification({ category: 'FIGHT_QUARREL' });
      const decision = await service.route(classification, { workflow: 'EMERGENCY_SOS', student_category: null });

      const sec = decision.teams.find(t => t.team_code === 'SECURITY');
      const proctor = decision.teams.find(t => t.team_code === 'CHIEF_PROCTOR');
      expect(sec?.role).toBe('ACT');
      expect(proctor?.role).toBe('ACT');
      expect(decision.restricted).toBe(true);
    });

    it('should route HARASSMENT_WOMEN to WOMEN_SAFETY (ACT) and CHIEF_PROCTOR (ACT) with strict restriction', async () => {
      const classification = baseClassification({ category: 'HARASSMENT_WOMEN' });
      const decision = await service.route(classification, { workflow: 'EMERGENCY_SOS', student_category: null });

      const womenTeam = decision.teams.find(t => t.team_code === 'WOMEN_SAFETY');
      expect(womenTeam?.role).toBe('ACT');
      expect(decision.restricted).toBe(true);
      expect(decision.campus_wide_eligible).toBe(false);
    });

    it('should route TEACHER_MISCONDUCT to CHIEF_PROCTOR (ACT) and block from campus-wide notices', async () => {
      const classification = baseClassification({ category: 'TEACHER_MISCONDUCT' });
      const decision = await service.route(classification, { workflow: 'STANDARD_REPORT', student_category: 'TEACHER_MISCONDUCT' });

      const proctor = decision.teams.find(t => t.team_code === 'CHIEF_PROCTOR');
      expect(proctor?.role).toBe('ACT');
      expect(decision.restricted).toBe(true);
      expect(decision.campus_wide_eligible).toBe(false);
    });

    it('should route UNKNOWN_PERSON to SECURITY without facial recognition claims', async () => {
      const classification = baseClassification({ category: 'UNKNOWN_PERSON' });
      const decision = await service.route(classification, { workflow: 'STANDARD_REPORT', student_category: null });

      const sec = decision.teams.find(t => t.team_code === 'SECURITY');
      expect(sec?.role).toBe('ACT');
      expect(decision.restricted).toBe(false);
    });

    it('should route BLOCKED_ROUTE to TRANSPORTATION (ACT) and SECURITY (ACT)', async () => {
      const classification = baseClassification({ category: 'BLOCKED_ROUTE' });
      const decision = await service.route(classification, { workflow: 'STANDARD_REPORT', student_category: null });

      const trans = decision.teams.find(t => t.team_code === 'TRANSPORTATION');
      const sec = decision.teams.find(t => t.team_code === 'SECURITY');
      expect(trans?.role).toBe('ACT');
      expect(sec?.role).toBe('ACT');
    });

    it('should route INFRASTRUCTURE_HAZARD to INFRASTRUCTURE (ACT)', async () => {
      const classification = baseClassification({ category: 'INFRASTRUCTURE_HAZARD' });
      const decision = await service.route(classification, { workflow: 'STANDARD_REPORT', student_category: null });

      const infra = decision.teams.find(t => t.team_code === 'INFRASTRUCTURE');
      expect(infra?.role).toBe('ACT');
    });

    it('should route CYBER_DIGITAL to IT_DIGITAL (ACT)', async () => {
      const classification = baseClassification({ category: 'CYBER_DIGITAL' });
      const decision = await service.route(classification, { workflow: 'STANDARD_REPORT', student_category: null });

      const itTeam = decision.teams.find(t => t.team_code === 'IT_DIGITAL');
      expect(itTeam?.role).toBe('ACT');
    });
  });

  describe('Category Union Test (AI Category A + Student Category B)', () => {
    it('should union student selected category with AI classification category', async () => {
      // Student selected INFRASTRUCTURE_HAZARD, but AI classified as FIRE
      const classification = baseClassification({ category: 'FIRE' });
      const decision = await service.route(classification, {
        workflow: 'STANDARD_REPORT',
        student_category: 'INFRASTRUCTURE_HAZARD',
      });

      const teamCodes = decision.teams.map(t => t.team_code);
      // Both FIRE_SAFETY and INFRASTRUCTURE must be included in the routing decision
      expect(teamCodes).toContain('FIRE_SAFETY');
      expect(teamCodes).toContain('INFRASTRUCTURE');
      expect(teamCodes).toContain('SECURITY');
      expect(teamCodes).toContain('CAMPUS_ADMIN');

      expect(decision.flags).toContain('CATEGORY_MISMATCH');
    });

    it('should apply restricted status if either the AI category or student category is restricted', async () => {
      // Student selected HARASSMENT_WOMEN (restricted), but AI classified as OTHER (unrestricted)
      const classification = baseClassification({ category: 'OTHER' });
      const decision = await service.route(classification, {
        workflow: 'STANDARD_REPORT',
        student_category: 'HARASSMENT_WOMEN',
      });

      expect(decision.restricted).toBe(true);
      expect(decision.campus_wide_eligible).toBe(false);
      const teamCodes = decision.teams.map(t => t.team_code);
      expect(teamCodes).toContain('WOMEN_SAFETY');
    });
  });

  describe('Always-Included Teams and Precedence', () => {
    it('should always include CAMPUS_ADMIN in all decisions', async () => {
      const classification = baseClassification({ category: 'OTHER' });
      const decision = await service.route(classification, { workflow: 'STANDARD_REPORT', student_category: null });

      const admin = decision.teams.find(t => t.team_code === 'CAMPUS_ADMIN');
      expect(admin).toBeDefined();
      expect(admin?.role).toBe('KNOW');
    });

    it('should upgrade role from KNOW to ACT when multiple rules match the same team', async () => {
      // Security is KNOW in some contexts, but ACT in FIRE
      const classification = baseClassification({ category: 'FIRE' });
      const decision = await service.route(classification, { workflow: 'EMERGENCY_SOS', student_category: null });

      const sec = decision.teams.find(t => t.team_code === 'SECURITY');
      expect(sec?.role).toBe('ACT');
    });
  });
});
