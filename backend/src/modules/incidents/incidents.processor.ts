import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Standard Queue Processor for process-standard jobs.
 * Ensures that queued standard reports are processed reliably without leaving unconsumed jobs.
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
      return { skipped: true, reason: 'missing_incident_id' };
    }

    const incident = await this.prisma.incident.findUnique({
      where: { id: incident_id },
      include: {
        incidentTeams: true,
      },
    });

    if (!incident) {
      this.logger.warn(`Incident ${incident_id} not found in database`);
      return { skipped: true, reason: 'incident_not_found' };
    }

    return {
      success: true,
      incidentId: incident.id,
      publicId: incident.publicId,
      teamsAssigned: incident.incidentTeams?.length || 0,
      processedAt: new Date().toISOString(),
    };
  }
}

/**
 * SOS Queue Processor for process-sos jobs on sos-critical queue.
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
      return { skipped: true, reason: 'missing_incident_id' };
    }

    const incident = await this.prisma.incident.findUnique({
      where: { id: incident_id },
      include: {
        incidentTeams: true,
      },
    });

    if (!incident) {
      this.logger.warn(`Incident ${incident_id} not found in database`);
      return { skipped: true, reason: 'incident_not_found' };
    }

    return {
      success: true,
      incidentId: incident.id,
      publicId: incident.publicId,
      teamsAssigned: incident.incidentTeams?.length || 0,
      processedAt: new Date().toISOString(),
    };
  }
}
