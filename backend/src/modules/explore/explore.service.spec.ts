import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExploreService } from './explore.service';
import { PrismaService } from '../../database/prisma.service';

describe('ExploreService (Sanitized Public Campus Feed & Leak Prevention)', () => {
  let service: ExploreService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      incident: {
        findMany: vi.fn(),
      },
    };
    service = new ExploreService(mockPrisma as PrismaService);
  });

  describe('Public Campus Feed Sanitization (PRD §15, API §14)', () => {
    it('should strictly exclude restricted categories and sensitive cases in explore queries', async () => {
      mockPrisma.incident.findMany.mockResolvedValue([
        {
          id: 'inc-pub-1',
          publicId: 'INC-2026-000001',
          workflow: 'STANDARD_REPORT',
          finalCategory: 'BLOCKED_ROUTE',
          status: 'RESOLVED',
          createdAt: new Date(),
          resolvedAt: new Date(),
          description: 'Fallen tree blocking the pathway near science block',
          location: {
            locationText: 'Pathway near Science Block',
            pinX: 0.35,
            pinY: 0.72,
            predefinedLocation: { name: 'Science Block Path', kind: 'GROUND' },
          },
        },
      ]);

      const result = await service.getExploreIncidents({});

      expect(mockPrisma.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            exploreVisible: true,
            isRestricted: false,
            status: { notIn: ['DRAFT', 'CANCELLED'] },
          }),
        }),
      );

      // Verify that where clause explicitly filters out restricted categories
      const whereArg = mockPrisma.incident.findMany.mock.calls[0][0].where;
      expect(whereArg.finalCategory.notIn).toContain('HARASSMENT_WOMEN');
      expect(whereArg.finalCategory.notIn).toContain('TEACHER_MISCONDUCT');
      expect(whereArg.finalCategory.notIn).toContain('MEDICAL_EMERGENCY');

      // Verify returned feed has NO reporter information
      expect(result.incidents.length).toBe(1);
      const item = result.incidents[0];
      expect(item.public_id).toBe('INC-2026-000001');
      expect((item as any).reporter).toBeUndefined();
      expect((item as any).reporterId).toBeUndefined();
      expect((item as any).phone).toBeUndefined();
    });

    it('should truncate description preview to 200 characters to prevent PII exposure', async () => {
      const longText = 'A'.repeat(300);
      mockPrisma.incident.findMany.mockResolvedValue([
        {
          id: 'inc-long-1',
          publicId: 'INC-2026-000002',
          workflow: 'STANDARD_REPORT',
          finalCategory: 'INFRASTRUCTURE_HAZARD',
          status: 'CREATED',
          createdAt: new Date(),
          resolvedAt: null,
          description: longText,
          location: null,
        },
      ]);

      const result = await service.getExploreIncidents({});
      expect(result.incidents[0].description_preview?.length).toBe(201); // 200 + '…'
      expect(result.incidents[0].description_preview?.endsWith('…')).toBe(true);
    });
  });
});
