import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { computeAuditHash, verifyAuditChain } from '../../common/utils/crypto.utils';
import { PrismaClient } from '@prisma/client';
import { AuthUser } from '../../common/guards/jwt-auth.guard';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit event with tamper-evident hash chain.
   * Append-only: UPDATE, DELETE, TRUNCATE are revoked at DB level.
   */
  async log(params: {
    eventType: string;
    incidentId?: string;
    actorUserId?: string;
    actorKind: string;
    targetType?: string;
    targetId?: string;
    details?: any;
    ipAddress?: string;
  }) {
    return this.logWithClient(this.prisma, params);
  }

  /**
   * Log within a transaction (for atomic operations).
   */
  async logWithTransaction(tx: any, params: {
    eventType: string;
    incidentId?: string;
    actorUserId?: string;
    actorKind: string;
    targetType?: string;
    targetId?: string;
    details?: any;
    ipAddress?: string;
  }) {
    return this.logWithClient(tx, params);
  }

  private async logWithClient(client: any, params: {
    eventType: string;
    incidentId?: string;
    actorUserId?: string;
    actorKind: string;
    targetType?: string;
    targetId?: string;
    details?: any;
    ipAddress?: string;
  }) {
    // Get previous hash for chain
    const lastEvent = await client.auditEvent.findFirst({
      orderBy: { id: 'desc' },
      select: { hash: true },
    });

    const prevHash = lastEvent?.hash || null;
    const occurredAt = new Date();
    const detailsJson = JSON.stringify(params.details || {});

    // Create a temporary ID for hash computation
    const tempId = Date.now().toString();

    const hash = computeAuditHash({
      prevHash,
      id: tempId,
      occurredAt: occurredAt.toISOString(),
      eventType: params.eventType,
      actorUserId: params.actorUserId || null,
      detailsJson,
    });

    return client.auditEvent.create({
      data: {
        occurredAt,
        eventType: params.eventType as any,
        incidentId: params.incidentId || null,
        actorUserId: params.actorUserId || null,
        actorKind: params.actorKind,
        targetType: params.targetType || null,
        targetId: params.targetId || null,
        details: params.details || null,
        ipAddress: params.ipAddress || null,
        prevHash,
        hash,
      },
    });
  }

  /**
   * Get audit events for an incident.
   */
  async getIncidentAudit(incidentId: string, user?: AuthUser) {
    if (user && user.role !== 'CAMPUS_ADMIN') {
      const incident = await this.prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          incidentTeams: { select: { teamId: true } },
          assignments: {
            where: { member: { userId: user.id } },
            select: { id: true },
          },
        },
      });

      if (!incident) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
      }

      const isReporter = incident.reporterId === user.id;
      const isAssigned = (incident.assignments || []).length > 0;
      const userTeamIds = user.teamMemberships?.map(tm => tm.teamId) || [];
      const isInTeam = (incident.incidentTeams || []).some(it => userTeamIds.includes(it.teamId));

      if (!isReporter && !isAssigned && !isInTeam) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions to view incident timeline',
        });
      }
    }

    return this.prisma.auditEvent.findMany({
      where: { incidentId },
      orderBy: { occurredAt: 'asc' },
      include: {
        actor: { select: { fullName: true, role: true } },
      },
    });
  }

  /**
   * Get global audit trail with filters.
   */
  async getGlobalAudit(filters: {
    incident_id?: string;
    event_type?: string;
    actor?: string;
    from?: string;
    to?: string;
    limit?: number;
    cursor?: string;
  }) {
    const where: any = {};
    if (filters.incident_id) where.incidentId = filters.incident_id;
    if (filters.event_type) where.eventType = filters.event_type;
    if (filters.actor) where.actorUserId = filters.actor;
    if (filters.from) where.occurredAt = { ...where.occurredAt, gte: new Date(filters.from) };
    if (filters.to) where.occurredAt = { ...where.occurredAt, lte: new Date(filters.to) };

    const take = Math.min(filters.limit || 50, 100);

    return this.prisma.auditEvent.findMany({
      where,
      take,
      orderBy: { occurredAt: 'desc' },
      include: {
        actor: { select: { fullName: true } },
      },
    });
  }

  /**
   * Verify hash chain integrity.
   * GET /admin/audit/verify
   */
  async verifyChain(): Promise<{ valid: boolean; total: number; brokenAt?: number }> {
    const events = await this.prisma.auditEvent.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        occurredAt: true,
        eventType: true,
        actorUserId: true,
        details: true,
        prevHash: true,
        hash: true,
      },
    });

    const result = verifyAuditChain(
      events.map(e => ({
        id: String(e.id),
        occurredAt: e.occurredAt.toISOString(),
        eventType: e.eventType,
        actorUserId: e.actorUserId,
        details: e.details,
        prevHash: e.prevHash ? Buffer.from(e.prevHash) : null,
        hash: e.hash ? Buffer.from(e.hash) : null,
      })),
    );

    return {
      ...result,
      total: events.length,
    };
  }
}
