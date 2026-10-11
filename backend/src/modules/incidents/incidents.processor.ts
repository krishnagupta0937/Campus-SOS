import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OutboxProcessorService } from './outbox-processor.service';

/**
 * Standard Queue Processor for process-standard jobs.
 * Consumes queued standard reports, executes event-specific outbox handlers,
 * and maintains worker audit trail.
 */
@Processor('standard')
@Injectable()
export class StandardProcessor extends WorkerHost {
  private readonly logger = new Logger(StandardProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly outboxProcessor: OutboxProcessorService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { incident_id, workflow } = job.data || {};
    this.logger.log(`Consuming standard queue job ${job.id} (${job.name}) for incident ${incident_id}`);

    if (!incident_id) {
      this.logger.error(`Standard processor job ${job.id} missing incident_id`);
      throw new Error('Job missing incident_id');
    }

    const incident = await this.prisma.incident.findUnique({
      where: { id: incident_id },
      include: {
        incidentTeams: true,
      },
    });

    if (!incident) {
      this.logger.error(`Incident ${incident_id} not found in database for job ${job.id}`);
      throw new Error(`Incident ${incident_id} not found`);
    }

    // Process outbox events individually with verified operations and concurrency lock
    const outboxResult = await this.outboxProcessor.processIncidentEvents(
      incident.id,
      `standard-worker-${job.id}`,
      workflow || 'STANDARD_REPORT',
    );

    // If any event failed, preserve failure and trigger queue retry
    if (outboxResult.failedCount > 0) {
      const errDetails = outboxResult.results
        .filter((r) => !r.success)
        .map((r) => `${r.eventId}: ${r.error}`)
        .join('; ');
      this.logger.error(`Standard processor failed for incident ${incident.id}: ${errDetails}`);
      throw new Error(`Outbox event execution failed: ${errDetails}`);
    }

    // Record worker audit event
    await this.auditService.log({
      eventType: 'QUEUE_PROCESSED',
      incidentId: incident.id,
      actorKind: 'WORKER',
      details: {
        job_id: job.id,
        queue: 'standard',
        workflow: workflow || 'STANDARD_REPORT',
        teams_assigned: incident.incidentTeams?.length || 0,
        outbox_events_processed: outboxResult.processedCount,
      },
    });

    return {
      success: true,
      incidentId: incident.id,
      publicId: incident.publicId,
      teamsAssigned: incident.incidentTeams?.length || 0,
      outboxEventsProcessed: outboxResult.processedCount,
      outboxResults: outboxResult.results,
      processedAt: new Date().toISOString(),
    };
  }
}

/**
 * SOS Queue Processor for process-sos jobs on sos-critical queue.
 * Consumes critical emergency jobs, executes event-specific operations,
 * and maintains worker audit trail.
 */
@Processor('sos-critical')
@Injectable()
export class SosProcessor extends WorkerHost {
  private readonly logger = new Logger(SosProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly outboxProcessor: OutboxProcessorService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { incident_id, workflow } = job.data || {};
    this.logger.log(`Consuming sos-critical queue job ${job.id} (${job.name}) for incident ${incident_id}`);

    if (!incident_id) {
      this.logger.error(`SOS processor job ${job.id} missing incident_id`);
      throw new Error('Job missing incident_id');
    }

    const incident = await this.prisma.incident.findUnique({
      where: { id: incident_id },
      include: {
        incidentTeams: true,
      },
    });

    if (!incident) {
      this.logger.error(`Incident ${incident_id} not found in database for job ${job.id}`);
      throw new Error(`Incident ${incident_id} not found`);
    }

    // Process outbox events individually with verified operations and concurrency lock
    const outboxResult = await this.outboxProcessor.processIncidentEvents(
      incident.id,
      `sos-worker-${job.id}`,
      workflow || 'EMERGENCY_SOS',
    );

    // If any event failed, preserve failure and trigger queue retry
    if (outboxResult.failedCount > 0) {
      const errDetails = outboxResult.results
        .filter((r) => !r.success)
        .map((r) => `${r.eventId}: ${r.error}`)
        .join('; ');
      this.logger.error(`SOS processor failed for incident ${incident.id}: ${errDetails}`);
      throw new Error(`SOS outbox event execution failed: ${errDetails}`);
    }

    // Record worker audit event
    await this.auditService.log({
      eventType: 'QUEUE_PROCESSED',
      incidentId: incident.id,
      actorKind: 'WORKER',
      details: {
        job_id: job.id,
        queue: 'sos-critical',
        workflow: workflow || 'EMERGENCY_SOS',
        teams_assigned: incident.incidentTeams?.length || 0,
        outbox_events_processed: outboxResult.processedCount,
      },
    });

    return {
      success: true,
      incidentId: incident.id,
      publicId: incident.publicId,
      teamsAssigned: incident.incidentTeams?.length || 0,
      outboxEventsProcessed: outboxResult.processedCount,
      outboxResults: outboxResult.results,
      processedAt: new Date().toISOString(),
    };
  }
}
