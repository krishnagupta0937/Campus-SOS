import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { DispatchService } from './dispatch.service';

@Processor('dispatch')
@Injectable()
export class DispatchProcessor extends WorkerHost {
  constructor(
    @Inject(forwardRef(() => DispatchService))
    private readonly dispatchService: DispatchService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'check-offer-timeout':
        return this.dispatchService.processOfferTimeout(job.data.incident_id, job.data.team_id);
      case 'retry-dispatch':
        return this.dispatchService.retryDispatch(
          job.data.incident_id,
          job.data.team_id,
          job.data.slot_no,
          job.data.attempt_no,
        );
      default:
        console.warn(`Unknown dispatch job: ${job.name}`);
    }
  }
}
