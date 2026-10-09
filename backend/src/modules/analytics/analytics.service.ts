import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Analytics service for T1-T4 response metrics and category aggregations.
 * API §13, PRD A-07, UI §8.9
 *
 * T1: Time from incident creation → first team notified
 * T2: Time from creation → first responder accepted
 * T3: Time from creation → responder arrived at location (the "Average Response Time")
 * T4: Time from creation → resolved
 *
 * All computed from real incident timestamps. No fake data.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /admin/analytics/overview — High-level dashboard metrics.
   */
  async getOverview(period: { from?: Date; to?: Date }) {
    const where: any = {};
    if (period.from) where.createdAt = { ...where.createdAt, gte: period.from };
    if (period.to) where.createdAt = { ...where.createdAt, lte: period.to };

    const [total, resolved, active, sosCount, standardCount] = await Promise.all([
      this.prisma.incident.count({ where }),
      this.prisma.incident.count({ where: { ...where, status: 'RESOLVED' } }),
      this.prisma.incident.count({
        where: { ...where, status: { notIn: ['RESOLVED', 'CANCELLED', 'DRAFT'] } },
      }),
      this.prisma.incident.count({ where: { ...where, workflow: 'EMERGENCY_SOS' } }),
      this.prisma.incident.count({ where: { ...where, workflow: 'STANDARD_REPORT' } }),
    ]);

    return {
      total_incidents: total,
      resolved_incidents: resolved,
      active_incidents: active,
      sos_count: sosCount,
      standard_count: standardCount,
      resolution_rate: total > 0 ? Math.round((resolved / total) * 100) : 0,
    };
  }

  /**
   * GET /admin/analytics/response-times — T1-T4 average response metrics.
   * A-07: "Average Response Time" = T3
   */
  async getResponseTimes(period: { from?: Date; to?: Date }) {
    const where: any = { status: 'RESOLVED' };
    if (period.from) where.createdAt = { ...where.createdAt, gte: period.from };
    if (period.to) where.createdAt = { ...where.createdAt, lte: period.to };

    const incidents = await this.prisma.incident.findMany({
      where,
      select: {
        workflow: true,
        createdAt: true,
        firstTeamNotifiedAt: true,
        firstAcceptedAt: true,
        responderArrivedAt: true,
        resolvedAt: true,
      },
    });

    const metrics = {
      all: this.computeTimeMetrics(incidents),
      sos: this.computeTimeMetrics(incidents.filter(i => i.workflow === 'EMERGENCY_SOS')),
      standard: this.computeTimeMetrics(incidents.filter(i => i.workflow === 'STANDARD_REPORT')),
    };

    return metrics;
  }

  /**
   * GET /admin/analytics/categories — Incident breakdown by category.
   */
  async getCategoryBreakdown(period: { from?: Date; to?: Date }) {
    const where: any = {};
    if (period.from) where.createdAt = { ...where.createdAt, gte: period.from };
    if (period.to) where.createdAt = { ...where.createdAt, lte: period.to };

    const incidents = await this.prisma.incident.groupBy({
      by: ['finalCategory'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return incidents.map(g => ({
      category: g.finalCategory,
      count: g._count.id,
    }));
  }

  /**
   * GET /admin/analytics/team-performance — Per-team response metrics.
   */
  async getTeamPerformance(period: { from?: Date; to?: Date }) {
    const where: any = { revokedAt: null };

    const teamAssignments = await this.prisma.incidentTeam.findMany({
      where,
      include: {
        team: { select: { code: true, name: true } },
        incident: {
          select: {
            workflow: true,
            createdAt: true,
            firstTeamNotifiedAt: true,
            firstAcceptedAt: true,
            responderArrivedAt: true,
            resolvedAt: true,
            status: true,
          },
        },
      },
    });

    // Group by team
    const teamMap = new Map<string, { code: string; name: string; incidents: any[] }>();
    for (const ta of teamAssignments) {
      const key = ta.team.code;
      if (!teamMap.has(key)) {
        teamMap.set(key, { code: ta.team.code, name: ta.team.name, incidents: [] });
      }
      teamMap.get(key)!.incidents.push(ta.incident);
    }

    return Array.from(teamMap.values()).map(team => ({
      team_code: team.code,
      team_name: team.name,
      total_incidents: team.incidents.length,
      resolved: team.incidents.filter(i => i.status === 'RESOLVED').length,
      avg_response_time_seconds: this.computeAverageT3(team.incidents),
    }));
  }

  /**
   * GET /admin/analytics/timeline — Incidents over time (daily buckets).
   */
  async getTimeline(period: { from: Date; to: Date }) {
    const incidents = await this.prisma.incident.findMany({
      where: {
        createdAt: { gte: period.from, lte: period.to },
        status: { not: 'DRAFT' },
      },
      select: {
        createdAt: true,
        workflow: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Bucket by day
    const buckets = new Map<string, { sos: number; standard: number; total: number }>();
    for (const inc of incidents) {
      const day = inc.createdAt.toISOString().split('T')[0];
      if (!buckets.has(day)) buckets.set(day, { sos: 0, standard: 0, total: 0 });
      const bucket = buckets.get(day)!;
      bucket.total++;
      if (inc.workflow === 'EMERGENCY_SOS') bucket.sos++;
      else bucket.standard++;
    }

    return Array.from(buckets.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));
  }

  // ── Private Helpers ──────────────────────────────────────────────────

  private computeTimeMetrics(incidents: any[]) {
    const t1Values: number[] = [];
    const t2Values: number[] = [];
    const t3Values: number[] = [];
    const t4Values: number[] = [];

    for (const inc of incidents) {
      const created = inc.createdAt.getTime();

      if (inc.firstTeamNotifiedAt) {
        t1Values.push((inc.firstTeamNotifiedAt.getTime() - created) / 1000);
      }
      if (inc.firstAcceptedAt) {
        t2Values.push((inc.firstAcceptedAt.getTime() - created) / 1000);
      }
      if (inc.responderArrivedAt) {
        t3Values.push((inc.responderArrivedAt.getTime() - created) / 1000);
      }
      if (inc.resolvedAt) {
        t4Values.push((inc.resolvedAt.getTime() - created) / 1000);
      }
    }

    return {
      sample_size: incidents.length,
      t1_avg_seconds: this.avg(t1Values),
      t2_avg_seconds: this.avg(t2Values),
      t3_avg_seconds: this.avg(t3Values), // This is the "Average Response Time"
      t4_avg_seconds: this.avg(t4Values),
      t1_median_seconds: this.median(t1Values),
      t2_median_seconds: this.median(t2Values),
      t3_median_seconds: this.median(t3Values),
      t4_median_seconds: this.median(t4Values),
    };
  }

  private computeAverageT3(incidents: any[]): number | null {
    const values = incidents
      .filter(i => i.responderArrivedAt)
      .map(i => (i.responderArrivedAt.getTime() - i.createdAt.getTime()) / 1000);
    return this.avg(values);
  }

  private avg(values: number[]): number | null {
    if (values.length === 0) return null;
    return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  }

  private median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? Math.round(sorted[mid])
      : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
}
