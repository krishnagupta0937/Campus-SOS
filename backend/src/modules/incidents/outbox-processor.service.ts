import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DispatchService } from '../dispatch/dispatch.service';

export interface OutboxProcessResult {
  eventId: string;
  eventType: string;
  status: 'PROCESSED' | 'FAILED' | 'LOCKED' | 'SKIPPED';
  success: boolean;
  error?: string;
}

/**
 * OutboxProcessorService
 * 
 * Reliable, idempotent transactional outbox event processor.
 * 
 * Guarantees:
 * 1. Event ID and eventType specific operation execution.
 * 2. Strict status state machine: PENDING -> PROCESSING -> PROCESSED (or FAILED).
 * 3. Concurrency safety: atomic locking prevents two workers from processing the same event simultaneously.
 * 4. Idempotency: re-running operations does not duplicate assignments or notifications.
 * 5. Failure preservation: failed events are recorded with error metadata and left retryable.
 * 6. Granular completion: only events whose operations actually succeed are marked PROCESSED.
 */
@Injectable()
export class OutboxProcessorService {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private readonly lockTtlMs = 120_000; // 2 minutes lock lease
  private readonly maxRetries = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Optional()
    @Inject(forwardRef(() => DispatchService))
    private readonly dispatchService?: DispatchService,
  ) {}

  /**
   * Process all pending outbox events for an aggregate (incident).
   * Evaluates each event individually so an error on one event does not mark others processed.
   */
  async processIncidentEvents(
    incidentId: string,
    workerId: string = `worker-${process.pid}`,
    workflow: string = 'STANDARD_REPORT',
  ): Promise<{
    processedCount: number;
    failedCount: number;
    results: OutboxProcessResult[];
  }> {
    this.logger.log(`Processing outbox events for incident ${incidentId} by worker ${workerId}`);

    // Query eligible outbox events for this incident
    const allEvents = await this.prisma.outboxEvent.findMany({
      where: { aggregateId: incidentId },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date().getTime();
    const eligibleEvents = allEvents.filter((e: any) => {
      if (e.processed) return false;
      const status = e.status || (e.processed ? 'PROCESSED' : 'PENDING');
      if (status === 'PROCESSED') return false;
      if (status === 'PENDING' || status === 'FAILED') return true;
      if (status === 'PROCESSING') {
        // Recover if lock expired
        if (!e.lockedAt) return true;
        const lockTime = new Date(e.lockedAt).getTime();
        return now - lockTime > this.lockTtlMs;
      }
      return false;
    });

    let processedCount = 0;
    let failedCount = 0;
    const results: OutboxProcessResult[] = [];

    for (const event of eligibleEvents) {
      const res = await this.processSingleEvent(event.id, workerId, workflow);
      results.push(res);
      if (res.status === 'PROCESSED') {
        processedCount++;
      } else if (res.status === 'FAILED') {
        failedCount++;
      }
    }

    return { processedCount, failedCount, results };
  }

  /**
   * Atomically lock and execute a single outbox event by its ID.
   * 
   * Atomicity guarantee:
   * Only one worker can conditionally claim an eligible event in the database.
   * If another worker holds an active lease, claim count is 0 and execution is skipped.
   */
  async processSingleEvent(
    eventId: string,
    workerId: string = `worker-${process.pid}`,
    workflowOverride?: string,
  ): Promise<OutboxProcessResult> {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - this.lockTtlMs);

    // Initial check: verify event exists and is not already processed or exhausted
    const initial = await this.prisma.outboxEvent.findUnique({
      where: { id: eventId },
    });

    if (!initial) {
      return {
        eventId,
        eventType: 'UNKNOWN',
        status: 'FAILED',
        success: false,
        error: `Outbox event ${eventId} not found`,
      };
    }

    // 1. Check if already processed (idempotent completion)
    if (initial.processed || initial.status === 'PROCESSED') {
      return {
        eventId,
        eventType: initial.eventType,
        status: 'PROCESSED',
        success: true,
      };
    }

    // Check bounded retry exhaustion
    if ((initial.attempts || 0) >= this.maxRetries && initial.status === 'FAILED') {
      return {
        eventId,
        eventType: initial.eventType,
        status: 'FAILED',
        success: false,
        error: `Max retry limit (${this.maxRetries}) reached for event ${eventId}`,
      };
    }

    // 2. ATOMIC CONDITIONAL CLAIM:
    // Uses conditional updateMany (or row-level locked transaction) so only one worker
    // transitions an eligible row from PENDING/FAILED/expired-PROCESSING into PROCESSING.
    const claim = await this.prisma.outboxEvent.updateMany({
      where: {
        id: eventId,
        processed: false,
        OR: [
          { status: 'PENDING' },
          { status: 'FAILED' },
          {
            AND: [
              { status: 'PROCESSING' },
              { lockedAt: { lt: staleThreshold } },
            ],
          },
        ],
      },
      data: {
        status: 'PROCESSING',
        lockedAt: now,
        lockedBy: workerId,
        attempts: { increment: 1 },
      },
    });

    if (claim.count === 0) {
      // Re-read current database state to provide definitive reason
      const current = await this.prisma.outboxEvent.findUnique({
        where: { id: eventId },
      });

      if (current?.processed || current?.status === 'PROCESSED') {
        return {
          eventId,
          eventType: current?.eventType || initial.eventType,
          status: 'PROCESSED',
          success: true,
        };
      }

      this.logger.warn(`Event ${eventId} locked by worker ${current?.lockedBy || 'unknown'}, skipping concurrent execution`);
      return {
        eventId,
        eventType: current?.eventType || initial.eventType,
        status: 'LOCKED',
        success: false,
        error: `Event currently locked by worker ${current?.lockedBy || 'another worker'}`,
      };
    }

    // 3. Atomically locked! Read fresh record with incremented attempts
    const event = (await this.prisma.outboxEvent.findUnique({
      where: { id: eventId },
    })) || initial;
    const currentAttempts = event.attempts || (initial.attempts || 0) + 1;

    // 4. Execute operation specific to eventType
    try {
      await this.executeEventOperation(event, workflowOverride);

      // 5. On success: Mark as PROCESSED
      const completedAt = new Date();
      await this.prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: 'PROCESSED',
          processed: true,
          processedAt: completedAt,
          lockedAt: null,
          lockedBy: null,
          lastError: null,
        },
      });

      await this.auditService.log({
        eventType: 'OUTBOX_EVENT_PROCESSED',
        incidentId: event.aggregateId,
        actorKind: 'WORKER',
        details: {
          outbox_event_id: event.id,
          event_type: event.eventType,
          worker_id: workerId,
          attempt: currentAttempts,
          completed_at: completedAt.toISOString(),
        },
      });

      return {
        eventId,
        eventType: event.eventType,
        status: 'PROCESSED',
        success: true,
      };
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      this.logger.error(`Failed executing operation for outbox event ${eventId} (${event.eventType}): ${errorMessage}`, err?.stack);

      // 6. On failure: Mark as FAILED, preserve error, release lock, leave retryable
      await this.prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: 'FAILED',
          processed: false,
          lockedAt: null,
          lockedBy: null,
          lastError: errorMessage,
        },
      });

      await this.auditService.log({
        eventType: 'OUTBOX_EVENT_FAILED',
        incidentId: event.aggregateId,
        actorKind: 'WORKER',
        details: {
          outbox_event_id: event.id,
          event_type: event.eventType,
          worker_id: workerId,
          attempt: currentAttempts,
          error: errorMessage,
        },
      });

      return {
        eventId,
        eventType: event.eventType,
        status: 'FAILED',
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute the actual domain operation intended by the event.
   * Explicitly throws on unknown event types to prevent false-positive completions.
   */
  private async executeEventOperation(event: any, workflowOverride?: string): Promise<void> {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : (event.payload || {});
    const incidentId = event.aggregateId;

    switch (event.eventType) {
      case 'incident.created': {
        await this.handleIncidentCreatedOperation(incidentId, payload, workflowOverride);
        break;
      }
      case 'dispatch.initiate': {
        await this.handleDispatchInitiateOperation(incidentId, payload, workflowOverride);
        break;
      }
      case 'notification.send': {
        await this.handleNotificationSendOperation(incidentId, payload);
        break;
      }
      default: {
        // Unknown event type: reject explicitly
        this.logger.error(`Unsupported outbox event type encountered: '${event.eventType}' for aggregate ${incidentId}`);
        throw new Error(`Unsupported outbox event type: '${event.eventType}'`);
      }
    }
  }

  /**
   * Handler for 'incident.created' outbox event.
   * 
   * Intended Operations:
   * 1. Validate incident persistence.
   * 2. Ensure ACT team dispatch offers exist (idempotently initiate if not already done).
   * 3. Ensure responder/team notification integrity without duplicates.
   */
  private async handleIncidentCreatedOperation(
    incidentId: string,
    payload: any,
    workflowOverride?: string,
  ): Promise<void> {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        incidentTeams: true,
      },
    });

    if (!incident) {
      throw new Error(`Target incident ${incidentId} does not exist in database`);
    }

    const workflow = workflowOverride || payload.workflow || incident.workflow || 'STANDARD_REPORT';
    const routingTeams = payload.routing_decision?.teams || [];

    // Idempotent dispatch initiation:
    // If assignments have not been generated yet for this incident's ACT teams, trigger dispatch now
    if (this.dispatchService && routingTeams.length > 0) {
      const existingAssignments = await this.prisma.assignment.findMany({
        where: { incidentId },
      });

      const actTeams = routingTeams.filter((t: any) => t.role === 'ACT');
      if (actTeams.length > 0 && existingAssignments.length === 0) {
        this.logger.log(`Outbox worker initiating pending dispatch offers for incident ${incidentId}`);
        await this.dispatchService.initiateDispatch(
          incidentId,
          routingTeams,
          workflow as any,
        );
      }
    }

    // Idempotent notification delivery check:
    // Verify that at least one notification exists for the incident if teams were notified
    const existingNotifs = await this.prisma.notification.count({
      where: { incidentId },
    });

    if (existingNotifs === 0 && incident.incidentTeams && incident.incidentTeams.length > 0) {
      // Create missing notifications for active members idempotently
      for (const it of incident.incidentTeams) {
        const teamMembers = await this.prisma.teamMember.findMany({
          where: { teamId: it.teamId },
        });

        for (const tm of teamMembers) {
          const alreadyNotified = await this.prisma.notification.findFirst({
            where: { incidentId, recipientUserId: tm.userId },
          });

          if (!alreadyNotified) {
            const notif = await this.prisma.notification.create({
              data: {
                recipientUserId: tm.userId,
                recipientId: tm.userId,
                incidentId,
                audienceType: 'ACT',
                channel: 'IN_APP',
                deliveryStatus: 'SENT',
                title: `${incident.workflow === 'EMERGENCY_SOS' ? 'Emergency SOS' : 'Incident Report'}: ${incident.publicId}`,
                body: incident.description?.substring(0, 100) || 'New incident assigned',
                payload: {
                  incident_id: incidentId,
                  public_id: incident.publicId,
                  workflow: incident.workflow,
                },
              },
            });

            if (notif?.id && this.prisma.notificationDelivery?.create) {
              await this.prisma.notificationDelivery.create({
                data: {
                  notificationId: notif.id,
                  channel: 'IN_APP',
                  status: 'SENT',
                  sentAt: new Date(),
                },
              });
            }
          }
        }
      }
    }
  }

  /**
   * Handler for 'dispatch.initiate' outbox event.
   */
  private async handleDispatchInitiateOperation(
    incidentId: string,
    payload: any,
    workflowOverride?: string,
  ): Promise<void> {
    if (!this.dispatchService) {
      throw new Error('DispatchService unavailable for dispatch.initiate event');
    }
    const teams = payload.teams || [];
    const workflow = workflowOverride || payload.workflow || 'STANDARD_REPORT';
    await this.dispatchService.initiateDispatch(incidentId, teams, workflow as any);
  }

  /**
   * Handler for 'notification.send' outbox event.
   */
  private async handleNotificationSendOperation(
    incidentId: string,
    payload: any,
  ): Promise<void> {
    if (!payload.recipient_id || !payload.title) {
      throw new Error('Invalid notification payload: missing recipient_id or title');
    }

    // Check idempotency: avoid duplicate notification with exact title and incident
    const existing = await this.prisma.notification.findFirst({
      where: {
        incidentId,
        recipientUserId: payload.recipient_id,
        title: payload.title,
      },
    });

    if (existing) {
      this.logger.log(`Notification already exists for user ${payload.recipient_id}, skipping duplicate`);
      return;
    }

    const notif = await this.prisma.notification.create({
      data: {
        recipientUserId: payload.recipient_id,
        recipientId: payload.recipient_id,
        incidentId,
        audienceType: payload.audience_type || 'ACT',
        channel: payload.channel || 'IN_APP',
        deliveryStatus: 'SENT',
        title: payload.title,
        body: payload.body || '',
        payload: payload.data || null,
      },
    });

    if (notif?.id && this.prisma.notificationDelivery?.create) {
      await this.prisma.notificationDelivery.create({
        data: {
          notificationId: notif.id,
          channel: payload.channel || 'IN_APP',
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    }
  }
}
