import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';

@Processor('dispatch')
@Injectable()
export class DispatchProcessor extends WorkerHost {
  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'check-offer-timeout':
        return this.handleOfferTimeout(job.data);
      case 'retry-dispatch':
        return this.handleRetryDispatch(job.data);
      default:
        console.warn(`Unknown dispatch job: ${job.name}`);
    }
  }

  private async handleOfferTimeout(data: { incident_id: string; team_id: string }) {
    // Check if offers have been accepted; if not, time them out and try next
    console.log(`Checking offer timeout for incident ${data.incident_id}`);
  }

  private async handleRetryDispatch(data: {
    incident_id: string;
    team_id: string;
    slot_no: number;
    attempt_no: number;
  }) {
    console.log(`Retrying dispatch for incident ${data.incident_id}, attempt ${data.attempt_no}`);
  }
}
