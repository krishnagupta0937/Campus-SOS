import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Standard Queue Processor for process-standard jobs.
 * Consumes queued standard reports, processes pending outbox events, and logs worker audit trail.
 */
@Processor('standard')
@Injectable()
export class StandardProcessor extends WorkerHost {
  private readonly logger = new Logger(StandardProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
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

    // Process and mark outbox events as processed
    let processedOutboxEvents = 0;
    if (this.prisma.outboxEvent?.updateMany) {
      const updateRes = await this.prisma.outboxEvent.updateMany({
        where: {
          aggregateId: incident.id,
          processed: false,
        },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });
      processedOutboxEvents = updateRes?.count ?? 0;
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
        outbox_events_processed: processedOutboxEvents,
      },
    });

    return {
      success: true,
      incidentId: incident.id,
      publicId: incident.publicId,
      teamsAssigned: incident.incidentTeams?.length || 0,
      outboxEventsProcessed: processedOutboxEvents,
      processedAt: new Date().toISOString(),
    };
  }
}

/**
 * SOS Queue Processor for process-sos jobs on sos-critical queue.
 * Consumes critical emergency jobs, processes outbox events, and logs worker audit trail.
 */
@Processor('sos-critical')
@Injectable()
export class SosProcessor extends WorkerHost {
  private readonly logger = new Logger(SosProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
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

    // Process and mark outbox events as processed
    let processedOutboxEvents = 0;
    if (this.prisma.outboxEvent?.updateMany) {
      const updateRes = await this.prisma.outboxEvent.updateMany({
        where: {
          aggregateId: incident.id,
          processed: false,
        },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });
      processedOutboxEvents = updateRes?.count ?? 0;
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
        outbox_events_processed: processedOutboxEvents,
      },
    });

    return {
      success: true,
      incidentId: incident.id,
      publicId: incident.publicId,
      teamsAssigned: incident.incidentTeams?.length || 0,
      outboxEventsProcessed: processedOutboxEvents,
      processedAt: new Date().toISOString(),
    };
  }
}
