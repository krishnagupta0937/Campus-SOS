import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { OutboxProcessorService } from './outbox-processor.service';
import { AuditService } from '../audit/audit.service';

/**
 * OutboxReconcilerService
 * 
 * Background reconciler that scans for unprocessed outbox events
 * caused by transient queue outages, network failures, or worker crashes.
 * 
 * Provides fallback reconciliation:
 * - Attempts to enqueue pending events to their respective BullMQ queues.
 * - If queue infrastructure is offline/degraded, directly processes events via OutboxProcessorService.
 */
@Injectable()
export class OutboxReconcilerService {
  private readonly logger = new Logger(OutboxReconcilerService.name);
  private isReconciling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxProcessor: OutboxProcessorService,
    private readonly auditService: AuditService,
    @Optional()
    @InjectQueue('sos-critical')
    private readonly sosQueue?: Queue,
    @Optional()
    @InjectQueue('standard')
    private readonly standardQueue?: Queue,
  ) {}

  /**
   * Periodic reconciliation sweep every 30 seconds.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCronSweep() {
    await this.reconcilePendingEvents();
  }

  /**
   * Reconcile all pending and failed outbox events.
   * Can be triggered on-demand by tests, controllers, or scheduled jobs.
   */
  async reconcilePendingEvents(): Promise<{
    found: number;
    enqueued: number;
    directProcessed: number;
    failed: number;
  }> {
    if (this.isReconciling) {
      return { found: 0, enqueued: 0, directProcessed: 0, failed: 0 };
    }

    this.isReconciling = true;
    let found = 0;
    let enqueued = 0;
    let directProcessed = 0;
    let failed = 0;

    try {
      const allEvents = await this.prisma.outboxEvent.findMany({
        where: {
          processed: false,
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      const now = Date.now();
      const pendingEvents = allEvents.filter((e: any) => {
        const status = e.status || 'PENDING';
        if (status === 'PROCESSED') return false;
        if (status === 'PENDING' || status === 'FAILED') return true;
        if (status === 'PROCESSING' && e.lockedAt) {
          return now - new Date(e.lockedAt).getTime() > 120_000;
        }
        return false;
      });

      found = pendingEvents.length;
      if (found === 0) {
        return { found, enqueued, directProcessed, failed };
      }

      this.logger.log(`Reconciling ${found} unprocessed outbox event(s)`);

      for (const event of pendingEvents) {
        const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : (event.payload || {});
        const workflow = payload.workflow || 'STANDARD_REPORT';
        const isSos = workflow === 'EMERGENCY_SOS';

        let enqueueSuccess = false;

        // Attempt queue enqueue if BullMQ is online
        const targetQueue = isSos ? this.sosQueue : this.standardQueue;
        const jobName = isSos ? 'process-sos' : 'process-standard';

        if (targetQueue) {
          try {
            await targetQueue.add(jobName, {
              incident_id: event.aggregateId,
              workflow,
              reconciled: true,
              outbox_event_id: event.id,
            }, {
              attempts: 3,
              backoff: { type: 'exponential', delay: 1000 },
            });
            enqueueSuccess = true;
            enqueued++;
          } catch (qErr: any) {
            this.logger.warn(`Queue unavailable during reconciliation for event ${event.id}: ${qErr?.message}`);
          }
        }

        // If queue failed or is unavailable, directly execute outbox processor to guarantee delivery!
        if (!enqueueSuccess) {
          try {
            this.logger.log(`Executing direct outbox fallback for event ${event.id}`);
            const res = await this.outboxProcessor.processSingleEvent(
              event.id,
              'reconciler-direct',
              workflow,
            );
            if (res.success) {
              directProcessed++;
            } else {
              failed++;
            }
          } catch (execErr: any) {
            this.logger.error(`Direct reconciliation failed for event ${event.id}: ${execErr?.message}`);
            failed++;
          }
        }
      }

      if (directProcessed > 0 || enqueued > 0) {
        await this.auditService.log({
          eventType: 'OUTBOX_RECONCILIATION_COMPLETED',
          actorKind: 'SYSTEM',
          details: {
            found,
            enqueued,
            direct_processed: directProcessed,
            failed,
          },
        });
      }
    } catch (err: any) {
      this.logger.error(`Error during outbox reconciliation: ${err?.message}`);
    } finally {
      this.isReconciling = false;
    }

    return { found, enqueued, directProcessed, failed };
  }
}
