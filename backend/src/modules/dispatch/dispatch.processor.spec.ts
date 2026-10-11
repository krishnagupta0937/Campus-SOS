import { describe, it, expect, vi } from 'vitest';
import { DispatchProcessor } from './dispatch.processor';
import { DispatchService } from './dispatch.service';

describe('DispatchProcessor (BullMQ Queue Job Processing)', () => {
  it('should process check-offer-timeout job by delegating to dispatchService.processOfferTimeout', async () => {
    const mockDispatchService = {
      processOfferTimeout: vi.fn().mockResolvedValue({ processed: true }),
      retryDispatch: vi.fn(),
    };

    const processor = new DispatchProcessor(mockDispatchService as any);

    const job = {
      name: 'check-offer-timeout',
      data: {
        incident_id: 'inc-timeout-1',
        team_id: 'team-fire-1',
      },
    };

    const result = await processor.process(job as any);

    expect(mockDispatchService.processOfferTimeout).toHaveBeenCalledWith(
      'inc-timeout-1',
      'team-fire-1',
    );
    expect(result).toEqual({ processed: true });
  });

  it('should process retry-dispatch job by delegating to dispatchService.retryDispatch', async () => {
    const mockDispatchService = {
      processOfferTimeout: vi.fn(),
      retryDispatch: vi.fn().mockResolvedValue({ offered: true, candidateId: 'mem-2' }),
    };

    const processor = new DispatchProcessor(mockDispatchService as any);

    const job = {
      name: 'retry-dispatch',
      data: {
        incident_id: 'inc-retry-1',
        team_id: 'team-sec-1',
        slot_no: 1,
        attempt_no: 2,
      },
    };

    const result = await processor.process(job as any);

    expect(mockDispatchService.retryDispatch).toHaveBeenCalledWith(
      'inc-retry-1',
      'team-sec-1',
      1,
      2,
    );
    expect(result).toEqual({ offered: true, candidateId: 'mem-2' });
  });
});
