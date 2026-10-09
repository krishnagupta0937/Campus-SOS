import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, HttpException, HttpStatus,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { generatePublicId, isValidStatusTransition, STATUS_LABELS } from '../../common/utils/constants';

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @InjectQueue('sos-critical') private readonly sosQueue: Queue,
    @InjectQueue('standard') private readonly standardQueue: Queue,
  ) {}

  /**
   * Create an SOS draft for staging before explicit confirmation.
   */
  async createSosDraft(reporterId: string, data: {
    description: string;
    location?: { predefined_location_id?: string; kind?: string; text?: string };
    pin?: { x: number; y: number };
    attachment_ids?: string[];
  }) {
    // Validate pin coordinates if provided
    if (data.pin) {
      if (data.pin.x < 0 || data.pin.x > 1 || data.pin.y < 0 || data.pin.y > 1) {
        throw new HttpException(
          { code: 'PIN_OUT_OF_RANGE', message: 'Pin coordinates must be between 0 and 1' },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const draft = await this.prisma.incidentDraft.create({
      data: {
        reporterId,
        workflow: 'EMERGENCY_SOS',
        payload: data as any,
        expiresAt,
      },
    });

    return {
      draft_id: draft.id,
      expires_at: draft.expiresAt.toISOString(),
    };
  }

  async getDraft(draftId: string, reporterId: string) {
    const draft = await this.prisma.incidentDraft.findFirst({
      where: { id: draftId, reporterId },
    });
    if (!draft) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'SOS draft not found' });
    }
    return draft;
  }

  async saveDraftPreview(draftId: string, classificationPreview: any, routingPreview: any) {
    return this.prisma.incidentDraft.update({
      where: { id: draftId },
      data: {
        classificationPreview,
        routingPreview,
      },
    }).catch(() => null);
  }

  /**
   * Confirm an SOS draft — explicit confirmation step.
   * This is the critical transaction: creates the incident, audit entry, and outbox event atomically.
   * NEVER calls external services (AI, SMS, Push) in this transaction.
   */
  async confirmSosDraft(draftId: string, reporterId: string, idempotencyKey: string) {
    // Check idempotency
    const existing = await this.prisma.incident.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      return {
        incident: {
          id: existing.id,
          public_id: existing.publicId,
          status: existing.status,
          workflow: existing.workflow,
        },
        live_channel: `incident:${existing.id}`,
        idempotency_replay: true,
      };
    }

    // Find draft
    const draft = await this.prisma.incidentDraft.findFirst({
      where: { id: draftId, reporterId, workflow: 'EMERGENCY_SOS' },
    });

    if (!draft) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'SOS draft not found' });
    }

    if (draft.expiresAt < new Date()) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Draft has expired' });
    }

    const payload = draft.payload as any;

    // Generate public ID
    const count = await this.prisma.incident.count({ where: { workflow: 'EMERGENCY_SOS' } });
    const publicId = generatePublicId('EMERGENCY_SOS', count + 1);

    // Atomic transaction: incident + location + outbox + audit
    const result = await this.prisma.$transaction(async (tx) => {
      const incident = await tx.incident.create({
        data: {
          publicId,
          workflow: 'EMERGENCY_SOS',
          reporterId,
          createdById: reporterId,
          description: payload.description,
          studentCategory: null, // SOS never has student category
          status: 'CREATED',
          confirmedAt: new Date(),
          idempotencyKey,
        },
      });

      // Create location if provided
      if (payload.pin || payload.location) {
        await tx.incidentLocation.create({
          data: {
            incidentId: incident.id,
            mapId: null,
            predefinedLocationId: payload.location?.predefined_location_id || null,
            locationKind: payload.location?.kind || null,
            locationText: payload.location?.text || null,
            pinX: payload.pin?.x || null,
            pinY: payload.pin?.y || null,
          },
        });
      }

      // Link attachments if any
      if (payload.attachment_ids && payload.attachment_ids.length > 0) {
        if (payload.attachment_ids.length > 2) {
          throw new HttpException(
            { code: 'PHOTO_LIMIT_EXCEEDED', message: 'Maximum 2 photos allowed' },
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }

        for (let i = 0; i < payload.attachment_ids.length; i++) {
          await tx.attachment.update({
            where: { id: payload.attachment_ids[i] },
            data: {
              incidentId: incident.id,
              draftId: null,
              position: i + 1,
            },
          });
        }
      }

      // Outbox event: guaranteed delivery to worker
      await tx.outboxEvent.create({
        data: {
          eventType: 'incident.created',
          aggregateId: incident.id,
          payload: {
            incident_id: incident.id,
            workflow: 'EMERGENCY_SOS',
            public_id: publicId,
            reporter_id: reporterId,
          },
        },
      });

      // Audit: SOS_CONFIRMED
      await this.auditService.logWithTransaction(tx, {
        eventType: 'SOS_CONFIRMED',
        incidentId: incident.id,
        actorUserId: reporterId,
        actorKind: 'USER',
        details: { public_id: publicId, workflow: 'EMERGENCY_SOS' },
      });

      return incident;
    });

    // Enqueue for background processing (non-blocking)
    try {
      await this.sosQueue.add('process-sos', {
        incident_id: result.id,
        workflow: 'EMERGENCY_SOS',
      }, {
        priority: 1,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
    } catch {
      // Queue failure doesn't block confirmation — watchdog will pick it up
    }

    // Delete draft
    await this.prisma.incidentDraft.delete({ where: { id: draftId } }).catch(() => {});

    return {
      incident: {
        id: result.id,
        public_id: result.publicId,
        status: result.status,
        workflow: result.workflow,
      },
      live_channel: `incident:${result.id}`,
    };
  }

  /**
   * Create a standard report.
   */
  async createStandardReport(reporterId: string, data: {
    description: string;
    category: string;
    location: { predefined_location_id?: string; kind: string; text?: string };
    pin: { x: number; y: number };
    attachment_ids?: string[];
  }, idempotencyKey: string) {
    // Validate pin
    if (data.pin.x < 0 || data.pin.x > 1 || data.pin.y < 0 || data.pin.y > 1) {
      throw new HttpException(
        { code: 'PIN_OUT_OF_RANGE', message: 'Pin coordinates must be between 0 and 1' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (data.description.length < 10) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Standard report description must be at least 10 characters',
      });
    }

    // Check idempotency
    const existing = await this.prisma.incident.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return {
        incident: {
          id: existing.id,
          public_id: existing.publicId,
          status: existing.status,
          workflow: existing.workflow,
        },
        idempotency_replay: true,
      };
    }

    const count = await this.prisma.incident.count({ where: { workflow: 'STANDARD_REPORT' } });
    const publicId = generatePublicId('STANDARD_REPORT', count + 1);

    const result = await this.prisma.$transaction(async (tx) => {
      const incident = await tx.incident.create({
        data: {
          publicId,
          workflow: 'STANDARD_REPORT',
          reporterId,
          createdById: reporterId,
          description: data.description,
          studentCategory: data.category,
          status: 'CREATED',
          idempotencyKey,
        },
      });

      // Location is required for standard reports
      await tx.incidentLocation.create({
        data: {
          incidentId: incident.id,
          predefinedLocationId: data.location?.predefined_location_id || null,
          locationKind: data.location?.kind as any || null,
          locationText: data.location?.text || null,
          pinX: data.pin.x,
          pinY: data.pin.y,
        },
      });

      // Attachments
      if (data.attachment_ids && data.attachment_ids.length > 0) {
        if (data.attachment_ids.length > 2) {
          throw new HttpException(
            { code: 'PHOTO_LIMIT_EXCEEDED', message: 'Maximum 2 photos allowed' },
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }
        for (let i = 0; i < data.attachment_ids.length; i++) {
          await tx.attachment.update({
            where: { id: data.attachment_ids[i] },
            data: { incidentId: incident.id, position: i + 1 },
          });
        }
      }

      // Outbox event
      await tx.outboxEvent.create({
        data: {
          eventType: 'incident.created',
          aggregateId: incident.id,
          payload: {
            incident_id: incident.id,
            workflow: 'STANDARD_REPORT',
            public_id: publicId,
            reporter_id: reporterId,
            student_category: data.category,
          },
        },
      });

      // Audit
      await this.auditService.logWithTransaction(tx, {
        eventType: 'INCIDENT_CREATED',
        incidentId: incident.id,
        actorUserId: reporterId,
        actorKind: 'USER',
        details: { public_id: publicId, workflow: 'STANDARD_REPORT', category: data.category },
      });

      return incident;
    });

    // Enqueue
    try {
      await this.standardQueue.add('process-standard', {
        incident_id: result.id,
        workflow: 'STANDARD_REPORT',
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });
    } catch {
      // Watchdog handles retry
    }

    return {
      incident: {
        id: result.id,
        public_id: result.publicId,
        status: result.status,
        workflow: result.workflow,
      },
    };
  }

  /**
   * Get SOS live status for student tracking.
   */
  async getSosLiveStatus(incidentId: string, reporterId: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, reporterId, workflow: 'EMERGENCY_SOS' },
      include: {
        assignments: {
          where: { status: { in: ['ACCEPTED', 'EN_ROUTE', 'ON_SCENE'] } },
          include: {
            member: {
              include: {
                user: { select: { fullName: true } },
                team: { select: { name: true } },
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!incident) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
    }

    const steps = [
      { key: 'EMERGENCY_CREATED', label: 'Emergency Created', at: incident.createdAt?.toISOString(), done: true },
      { key: 'TEAMS_NOTIFIED', label: 'Teams Notified', at: incident.firstTeamNotifiedAt?.toISOString() || null, done: !!incident.firstTeamNotifiedAt },
      { key: 'RESPONDER_ASSIGNED', label: 'Responder Assigned', at: incident.firstAcceptedAt?.toISOString() || null, done: !!incident.firstAcceptedAt },
      { key: 'RESPONDER_ON_THE_WAY', label: 'Responder On the Way', at: null, done: ['RESPONDER_ON_THE_WAY', 'RESPONDER_AT_LOCATION', 'RESOLVED'].includes(incident.status) },
      { key: 'RESPONDER_AT_LOCATION', label: 'Responder At Location', at: incident.responderArrivedAt?.toISOString() || null, done: ['RESPONDER_AT_LOCATION', 'RESOLVED'].includes(incident.status) },
      { key: 'RESOLVED', label: 'Resolved', at: incident.resolvedAt?.toISOString() || null, done: incident.status === 'RESOLVED' },
    ];

    const responderPublic = incident.assignments[0] && !incident.isRestricted
      ? {
          first_name: incident.assignments[0].member.user.fullName.split(' ')[0],
          team: incident.assignments[0].member.team.name,
        }
      : undefined;

    return {
      incident_id: incident.id,
      public_id: incident.publicId,
      steps,
      current: incident.status,
      responder_public: responderPublic,
    };
  }

  /**
   * Get student's reports (My Reports).
   */
  async getMyReports(reporterId: string, tab: 'reports' | 'sos') {
    const workflow = tab === 'sos' ? 'EMERGENCY_SOS' : 'STANDARD_REPORT';

    return this.prisma.incident.findMany({
      where: { reporterId, workflow },
      select: {
        id: true,
        publicId: true,
        workflow: true,
        status: true,
        finalCategory: true,
        description: true,
        createdAt: true,
        resolvedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get reporter's own incident detail.
   */
  async getMyIncidentDetail(incidentId: string, reporterId: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, reporterId },
      include: {
        location: {
          include: { predefinedLocation: true, map: true },
        },
        attachments: { orderBy: { position: 'asc' } },
        incidentTeams: {
          where: { revokedAt: null },
          include: { team: { select: { name: true, code: true } } },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!incident) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
    }

    return {
      id: incident.id,
      public_id: incident.publicId,
      workflow: incident.workflow,
      status: incident.status,
      status_label: STATUS_LABELS[incident.status] || incident.status,
      category_label: incident.finalCategory,
      description: incident.description,
      created_at: incident.createdAt,
      resolved_at: incident.resolvedAt,
      location: incident.location ? {
        predefined: incident.location.predefinedLocation
          ? { kind: incident.location.predefinedLocation.kind, name: incident.location.predefinedLocation.name }
          : null,
        pin: incident.location.pinX
          ? { x: Number(incident.location.pinX), y: Number(incident.location.pinY) }
          : null,
        text: incident.location.locationText,
      } : null,
      assigned_teams: incident.incidentTeams.map(it => ({
        team_name: it.team.name,
      })),
      photos: incident.attachments.map(a => ({
        id: a.id,
        position: a.position,
        url_endpoint: `/attachments/${a.id}/url`,
      })),
      timeline: incident.statusHistory.map(sh => ({
        from: sh.fromStatus,
        to: sh.toStatus,
        at: sh.createdAt,
        note: sh.note,
      })),
    };
  }

  /**
   * Transition incident status with validation.
   */
  async transitionStatus(
    incidentId: string,
    toStatus: string,
    changedBy: string,
    note?: string,
  ) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
    }

    if (!isValidStatusTransition(incident.status, toStatus)) {
      throw new ConflictException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from ${incident.status} to ${toStatus}`,
      });
    }

    const updateData: any = { status: toStatus };

    // Set milestone timestamps
    if (toStatus === 'TEAMS_NOTIFIED' && !incident.firstTeamNotifiedAt) {
      updateData.firstTeamNotifiedAt = new Date();
    }
    if (toStatus === 'RESPONDER_ASSIGNED' && !incident.firstAcceptedAt) {
      updateData.firstAcceptedAt = new Date();
    }
    if (toStatus === 'RESPONDER_AT_LOCATION' && !incident.responderArrivedAt) {
      updateData.responderArrivedAt = new Date();
    }
    if (toStatus === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.incident.update({
        where: { id: incidentId },
        data: updateData,
      });

      await tx.incidentStatusHistory.create({
        data: {
          incidentId,
          fromStatus: incident.status,
          toStatus,
          changedBy,
          note,
        },
      });

      await this.auditService.logWithTransaction(tx, {
        eventType: 'STATUS_CHANGED',
        incidentId,
        actorUserId: changedBy,
        actorKind: 'USER',
        details: { from: incident.status, to: toStatus, note },
      });

      return result;
    });

    return updated;
  }

  /**
   * Get admin full case view (20-field View button).
   */
  async getAdminIncidentDetail(incidentId: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        reporter: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        location: {
          include: { predefinedLocation: true, map: true },
        },
        attachments: { orderBy: { position: 'asc' } },
        aiClassifications: { orderBy: { createdAt: 'desc' }, take: 1 },
        routingDecisions: { orderBy: { createdAt: 'desc' }, take: 1 },
        incidentTeams: {
          where: { revokedAt: null },
          include: { team: { select: { id: true, code: true, name: true } } },
        },
        assignments: {
          include: {
            member: {
              include: {
                user: { select: { fullName: true } },
                team: { select: { name: true } },
              },
            },
          },
          orderBy: { offeredAt: 'desc' },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        notifications: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            deliveries: true,
            recipient: { select: { fullName: true } },
          },
        },
        auditEvents: { orderBy: { occurredAt: 'desc' }, take: 50 },
      },
    });

    if (!incident) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
    }

    const classification = incident.aiClassifications[0];
    const routing = incident.routingDecisions[0];

    return {
      id: incident.id,
      public_id: incident.publicId,
      report_type: incident.workflow === 'EMERGENCY_SOS' ? 'Emergency SOS' : 'Standard Report',
      workflow: incident.workflow,
      full_description: incident.description,
      category: {
        final: incident.finalCategory,
        student_selected: incident.studentCategory,
      },
      location: incident.location ? {
        predefined: incident.location.predefinedLocation
          ? { kind: incident.location.predefinedLocation.kind, name: incident.location.predefinedLocation.name }
          : null,
        pin: incident.location.pinX
          ? { x: Number(incident.location.pinX), y: Number(incident.location.pinY) }
          : null,
        map: incident.location.map
          ? { id: incident.location.map.id, image_url: `/attachments/map/${incident.location.map.id}` }
          : null,
      } : null,
      created_at: incident.createdAt,
      reporter: {
        id: incident.reporter.id,
        name: incident.reporter.fullName,
        email: incident.reporter.email,
        phone: incident.reporter.phone,
      },
      ai_classification: classification ? {
        source: classification.source,
        model: classification.model || (classification.source === 'AI' ? 'gemini-1.5-flash' : 'campus-sos-rules-v1'),
        provider: classification.source === 'AI' ? 'gemini' : 'rule',
        category: classification.category,
        confidence: Number(classification.confidence),
        immediate_danger: classification.immediateDanger,
        structured: classification.output,
      } : null,
      ai_reasoning: classification?.reasoning || null,
      routing_decision: routing ? {
        matched_rules: routing.matchedRules,
        teams: routing.teams,
        flags: routing.flags,
        config_version: routing.configVersion,
      } : null,
      assigned_teams: incident.incidentTeams.map(it => ({
        team_id: it.team.id,
        team_code: it.team.code,
        team_name: it.team.name,
        role: it.role,
      })),
      assigned_responders: incident.assignments.map(a => ({
        member: a.member.user.fullName,
        team: a.member.team.name,
        status: a.status,
        offered_at: a.offeredAt,
        accepted_at: a.acceptedAt,
      })),
      photos: incident.attachments.map(a => ({
        id: a.id,
        position: a.position,
        url_endpoint: `/attachments/${a.id}/url`,
      })),
      notification_history: incident.notifications.map(n => ({
        at: n.createdAt,
        audience: n.audienceType,
        recipient: n.recipient?.fullName || 'broadcast',
        deliveries: n.deliveries.map(d => ({
          channel: d.channel,
          status: d.status,
        })),
      })),
      response_timeline: incident.statusHistory.map(sh => ({
        from: sh.fromStatus,
        to: sh.toStatus,
        at: sh.createdAt,
        by: sh.changedBy,
        note: sh.note,
      })),
      status_history: incident.statusHistory,
      resolution: {
        code: incident.resolutionCode,
        summary: incident.resolutionSummary,
        resolved_at: incident.resolvedAt,
      },
      audit_history: incident.auditEvents.map(ae => ({
        id: Number(ae.id),
        event: ae.eventType,
        at: ae.occurredAt,
        actor: ae.actorKind,
        details: ae.details,
      })),
      is_restricted: incident.isRestricted,
      is_drill: incident.isDrill,
    };
  }

  /**
   * Admin incidents list with filters.
   */
  async getAdminIncidents(filters: {
    status?: string;
    workflow?: string;
    category?: string;
    from?: string;
    to?: string;
    team?: string;
    q?: string;
    limit?: number;
    cursor?: string;
  }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.workflow) where.workflow = filters.workflow;
    if (filters.category) where.finalCategory = filters.category;
    if (filters.from) where.createdAt = { ...where.createdAt, gte: new Date(filters.from) };
    if (filters.to) where.createdAt = { ...where.createdAt, lte: new Date(filters.to) };
    if (filters.q) {
      where.OR = [
        { publicId: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(filters.limit || 25, 100);
    const queryArgs: any = {
      where,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        publicId: true,
        workflow: true,
        finalCategory: true,
        status: true,
        createdAt: true,
        isRestricted: true,
        location: {
          select: {
            locationText: true,
            predefinedLocation: { select: { name: true } },
          },
        },
      },
    };

    if (filters.cursor) {
      queryArgs.cursor = { id: filters.cursor };
      queryArgs.skip = 1;
    }

    const incidents = await this.prisma.incident.findMany(queryArgs);

    const hasMore = incidents.length > take;
    const data = hasMore ? incidents.slice(0, take) : incidents;

    return {
      data: data.map(i => ({
        id: i.id,
        public_id: i.publicId,
        type: i.workflow === 'EMERGENCY_SOS' ? 'Emergency SOS' : 'Standard Report',
        category: i.finalCategory,
        workflow_label: i.workflow,
        location: (i as any).location?.predefinedLocation?.name || (i as any).location?.locationText || null,
        status: i.status,
        created_at: i.createdAt,
        is_restricted: i.isRestricted,
      })),
      next_cursor: hasMore ? data[data.length - 1].id : null,
    };
  }
}
