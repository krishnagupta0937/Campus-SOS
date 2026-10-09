import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RESTRICTED_CATEGORIES } from '../../common/utils/constants';

/**
 * Explore service providing the sanitized public campus feed.
 * PRD §15, API §14, UI §7.5, ARCHITECTURE.md §10.4
 *
 * Key rules:
 * - Only incidents with explore_visible = true are shown
 * - Restricted/sensitive incidents are NEVER included
 * - No urgency filter UI/API (static check in tests)
 * - Status filter only (no category/severity filter for students)
 * - Reporter identity is never exposed in explore data
 */
@Injectable()
export class ExploreService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /explore/incidents — Sanitized incident list for campus feed.
   */
  async getExploreIncidents(filters: {
    status?: string;
    limit?: number;
    cursor?: string;
  }) {
    const take = Math.min(filters.limit || 20, 50);

    const where: any = {
      exploreVisible: true,
      isRestricted: false,
      // Exclude any restricted category as a safety net
      finalCategory: { notIn: Array.from(RESTRICTED_CATEGORIES) },
      status: { notIn: ['DRAFT', 'CANCELLED'] },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.cursor) {
      where.createdAt = { lt: new Date(filters.cursor) };
    }

    const incidents = await this.prisma.incident.findMany({
      where,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        publicId: true,
        workflow: true,
        finalCategory: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        // Sanitized description (first 200 chars, no PII)
        description: true,
        location: {
          select: {
            locationText: true,
            pinX: true,
            pinY: true,
            predefinedLocation: {
              select: { name: true, kind: true },
            },
          },
        },
      },
    });

    return {
      incidents: incidents.map(inc => ({
        id: inc.id,
        public_id: inc.publicId,
        workflow: inc.workflow,
        category: inc.finalCategory,
        status: inc.status,
        // Truncate description for privacy
        description_preview: inc.description
          ? inc.description.substring(0, 200) + (inc.description.length > 200 ? '…' : '')
          : null,
        location: inc.location ? {
          text: inc.location.locationText,
          pin_x: inc.location.pinX ? Number(inc.location.pinX) : null,
          pin_y: inc.location.pinY ? Number(inc.location.pinY) : null,
          predefined_name: inc.location.predefinedLocation?.name || null,
          predefined_kind: inc.location.predefinedLocation?.kind || null,
        } : null,
        created_at: inc.createdAt,
        resolved_at: inc.resolvedAt,
      })),
      next_cursor: incidents.length === take
        ? incidents[incidents.length - 1].createdAt.toISOString()
        : null,
    };
  }

  /**
   * GET /explore/map-pins — Active incident pins for the explore map view.
   */
  async getMapPins() {
    const incidents = await this.prisma.incident.findMany({
      where: {
        exploreVisible: true,
        isRestricted: false,
        finalCategory: { notIn: Array.from(RESTRICTED_CATEGORIES) },
        status: { notIn: ['DRAFT', 'CANCELLED', 'RESOLVED'] },
      },
      select: {
        id: true,
        publicId: true,
        finalCategory: true,
        status: true,
        workflow: true,
        location: {
          select: {
            pinX: true,
            pinY: true,
            locationText: true,
          },
        },
      },
    });

    return incidents
      .filter(inc => inc.location?.pinX && inc.location?.pinY)
      .map(inc => ({
        incident_id: inc.id,
        public_id: inc.publicId,
        category: inc.finalCategory,
        status: inc.status,
        workflow: inc.workflow,
        pin_x: Number(inc.location!.pinX),
        pin_y: Number(inc.location!.pinY),
        location_text: inc.location!.locationText,
      }));
  }

  /**
   * GET /explore/activity — Recent campus activity summary.
   */
  async getRecentActivity() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [activeCount, resolvedToday, totalWeek] = await Promise.all([
      this.prisma.incident.count({
        where: {
          exploreVisible: true,
          isRestricted: false,
          status: { notIn: ['DRAFT', 'CANCELLED', 'RESOLVED'] },
        },
      }),
      this.prisma.incident.count({
        where: {
          exploreVisible: true,
          isRestricted: false,
          resolvedAt: { gte: last24h },
        },
      }),
      this.prisma.incident.count({
        where: {
          exploreVisible: true,
          isRestricted: false,
          createdAt: { gte: last7d },
        },
      }),
    ]);

    return {
      active_incidents: activeCount,
      resolved_today: resolvedToday,
      total_this_week: totalWeek,
    };
  }
}
