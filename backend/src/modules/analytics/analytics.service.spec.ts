import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../database/prisma.service';

describe('AnalyticsService (Real Metric Computation & Aggregations)', () => {
  let service: AnalyticsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      incident: {
        count: vi.fn(),
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
    };
    service = new AnalyticsService(mockPrisma as PrismaService);
  });

  describe('Overview Metrics (PRD A-07, API §13)', () => {
    it('should compute real counts and resolution rate accurately', async () => {
      // Mock counts: total=100, resolved=80, active=15, sos=30, standard=70
      mockPrisma.incident.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // resolved
        .mockResolvedValueOnce(15)  // active
        .mockResolvedValueOnce(30)  // sos
        .mockResolvedValueOnce(70); // standard

      const overview = await service.getOverview({});

      expect(overview.total_incidents).toBe(100);
      expect(overview.resolved_incidents).toBe(80);
      expect(overview.active_incidents).toBe(15);
      expect(overview.sos_count).toBe(30);
      expect(overview.standard_count).toBe(70);
      expect(overview.resolution_rate).toBe(80); // 80 / 100 = 80%
    });
  });

  describe('T1-T4 Response Times Metrics', () => {
    it('should compute real T1-T4 response times from incident timestamp differences', async () => {
      const createdAt = new Date('2026-10-04T10:00:00.000Z');
      const firstTeamNotifiedAt = new Date('2026-10-04T10:00:30.000Z'); // T1 = 30s
      const firstAcceptedAt = new Date('2026-10-04T10:01:15.000Z');     // T2 = 75s
      const responderArrivedAt = new Date('2026-10-04T10:05:00.000Z');  // T3 = 300s
      const resolvedAt = new Date('2026-10-04T10:20:00.000Z');          // T4 = 1200s

      mockPrisma.incident.findMany.mockResolvedValue([
        {
          workflow: 'EMERGENCY_SOS',
          createdAt,
          firstTeamNotifiedAt,
          firstAcceptedAt,
          responderArrivedAt,
          resolvedAt,
        },
      ]);

      const responseTimes = await service.getResponseTimes({});

      expect(responseTimes.sos.t1_avg_seconds).toBe(30);
      expect(responseTimes.sos.t2_avg_seconds).toBe(75);
      expect(responseTimes.sos.t3_avg_seconds).toBe(300);
      expect(responseTimes.sos.t4_avg_seconds).toBe(1200);
    });
  });

  describe('Category Groupings', () => {
    it('should aggregate incidents by category using database groupBy', async () => {
      mockPrisma.incident.groupBy.mockResolvedValue([
        { finalCategory: 'FIRE', _count: { id: 12 } },
        { finalCategory: 'MEDICAL_EMERGENCY', _count: { id: 8 } },
        { finalCategory: 'BLOCKED_ROUTE', _count: { id: 5 } },
      ]);

      const categories = await service.getCategoryBreakdown({});

      expect(categories).toEqual([
        { category: 'FIRE', count: 12 },
        { category: 'MEDICAL_EMERGENCY', count: 8 },
        { category: 'BLOCKED_ROUTE', count: 5 },
      ]);
    });
  });
});
