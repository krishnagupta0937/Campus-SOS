import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutboxProcessorService } from './outbox-processor.service';
import { OutboxReconcilerService } from './outbox-reconciler.service';
import { StandardProcessor, SosProcessor } from './incidents.processor';

describe('OutboxProcessorService & Outbox Reliability (P0 & P1)', () => {
  let mockPrisma: any;
  let mockAudit: any;
  let mockDispatch: any;
  let service: OutboxProcessorService;

  beforeEach(() => {
    mockPrisma = {
      outboxEvent: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      incident: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      assignment: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      notification: {
        count: vi.fn().mockResolvedValue(0),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      },
      notificationDelivery: {
        create: vi.fn().mockResolvedValue({ id: 'deliv-1' }),
      },
      teamMember: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    mockDispatch = {
      initiateDispatch: vi.fn().mockResolvedValue(undefined),
    };

    service = new OutboxProcessorService(mockPrisma, mockAudit, mockDispatch);
  });

  describe('Single Event Lifecycle & State Model', () => {
    it('successfully processes an outbox event and transitions from PENDING -> PROCESSING -> PROCESSED', async () => {
      const mockEvent = {
        id: 'evt-100',
        eventType: 'incident.created',
        aggregateId: 'inc-100',
        status: 'PENDING',
        processed: false,
        attempts: 0,
        payload: {
          incident_id: 'inc-100',
          workflow: 'EMERGENCY_SOS',
          routing_decision: {
            teams: [{ team_code: 'FIRE_SAFETY', role: 'ACT' }],
          },
        },
      };

      const mockIncident = {
        id: 'inc-100',
        publicId: 'SOS-2026-000100',
        workflow: 'EMERGENCY_SOS',
        incidentTeams: [{ teamId: 'team-fire-1' }],
      };

      mockPrisma.outboxEvent.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.incident.findUnique.mockResolvedValue(mockIncident);
      mockPrisma.outboxEvent.update.mockImplementation(({ data }: any) => {
        Object.assign(mockEvent, data);
        return Promise.resolve(mockEvent);
      });

      const result = await service.processSingleEvent('evt-100', 'worker-unit-1');

      expect(result.success).toBe(true);
      expect(result.status).toBe('PROCESSED');

      // Verify atomic lock was acquired
      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'evt-100' },
          data: expect.objectContaining({
            status: 'PROCESSING',
            lockedBy: 'worker-unit-1',
            attempts: 1,
          }),
        }),
      );

      // Verify final PROCESSED state
      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'evt-100' },
          data: expect.objectContaining({
            status: 'PROCESSED',
            processed: true,
            lockedAt: null,
            lockedBy: null,
          }),
        }),
      );

      // Verify dispatch was invoked for ACT teams
      expect(mockDispatch.initiateDispatch).toHaveBeenCalledWith(
        'inc-100',
        [{ team_code: 'FIRE_SAFETY', role: 'ACT' }],
        'EMERGENCY_SOS',
      );

      // Verify audit trail logged
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'OUTBOX_EVENT_PROCESSED',
          incidentId: 'inc-100',
          actorKind: 'WORKER',
        }),
      );
    });

    it('preserves failed events with error metadata and leaves them retryable when an operation fails', async () => {
      const mockEvent = {
        id: 'evt-fail-1',
        eventType: 'incident.created',
        aggregateId: 'inc-missing',
        status: 'PENDING',
        processed: false,
        attempts: 0,
        payload: { incident_id: 'inc-missing' },
      };

      mockPrisma.outboxEvent.findUnique.mockResolvedValue(mockEvent);
      // Simulate missing target incident causing operation failure
      mockPrisma.incident.findUnique.mockResolvedValue(null);
      mockPrisma.outboxEvent.update.mockImplementation(({ data }: any) => {
        Object.assign(mockEvent, data);
        return Promise.resolve(mockEvent);
      });

      const result = await service.processSingleEvent('evt-fail-1', 'worker-fail-1');

      expect(result.success).toBe(false);
      expect(result.status).toBe('FAILED');
      expect(result.error).toContain('Target incident inc-missing does not exist');

      // Verify event was NOT marked processed, error was recorded, and lock was released
      expect(mockEvent.processed).toBe(false);
      expect(mockEvent.status).toBe('FAILED');
      expect(mockEvent.lastError).toContain('Target incident inc-missing does not exist');
      expect(mockEvent.lockedAt).toBeNull();
      expect(mockEvent.lockedBy).toBeNull();

      // Verify audit logged failure
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'OUTBOX_EVENT_FAILED',
          incidentId: 'inc-missing',
          actorKind: 'WORKER',
        }),
      );
    });

    it('ensures idempotent completion: re-running an already processed event does not re-execute operations', async () => {
      const mockProcessedEvent = {
        id: 'evt-done-1',
        eventType: 'incident.created',
        aggregateId: 'inc-100',
        status: 'PROCESSED',
        processed: true,
        attempts: 1,
      };

      mockPrisma.outboxEvent.findUnique.mockResolvedValue(mockProcessedEvent);

      const result = await service.processSingleEvent('evt-done-1', 'worker-2');

      expect(result.success).toBe(true);
      expect(result.status).toBe('PROCESSED');

      // Does not update database or call dispatch
      expect(mockPrisma.outboxEvent.update).not.toHaveBeenCalled();
      expect(mockDispatch.initiateDispatch).not.toHaveBeenCalled();
    });

    it('prevents concurrent execution when another active worker holds the lock', async () => {
      const mockLockedEvent = {
        id: 'evt-locked-1',
        eventType: 'incident.created',
        aggregateId: 'inc-100',
        status: 'PROCESSING',
        processed: false,
        lockedAt: new Date(), // Just locked
        lockedBy: 'worker-concurrent-A',
        attempts: 1,
      };

      mockPrisma.outboxEvent.findUnique.mockResolvedValue(mockLockedEvent);

      const result = await service.processSingleEvent('evt-locked-1', 'worker-concurrent-B');

      expect(result.success).toBe(false);
      expect(result.status).toBe('LOCKED');
      expect(result.error).toContain('locked by worker worker-concurrent-A');

      // Worker B does not modify event or trigger dispatch
      expect(mockPrisma.outboxEvent.update).not.toHaveBeenCalled();
      expect(mockDispatch.initiateDispatch).not.toHaveBeenCalled();
    });

    it('breaks stale locks if previous worker crashed and lease expired', async () => {
      const staleTime = new Date(Date.now() - 180_000); // 3 minutes ago (TTL is 2 min)
      const mockStaleEvent = {
        id: 'evt-stale-1',
        eventType: 'incident.created',
        aggregateId: 'inc-100',
        status: 'PROCESSING',
        processed: false,
        lockedAt: staleTime,
        lockedBy: 'worker-crashed',
        attempts: 1,
        payload: {
          incident_id: 'inc-100',
          workflow: 'STANDARD_REPORT',
        },
      };

      const mockIncident = {
        id: 'inc-100',
        publicId: 'REP-2026-000100',
        workflow: 'STANDARD_REPORT',
        incidentTeams: [],
      };

      mockPrisma.outboxEvent.findUnique.mockResolvedValue(mockStaleEvent);
      mockPrisma.incident.findUnique.mockResolvedValue(mockIncident);
      mockPrisma.outboxEvent.update.mockImplementation(({ data }: any) => {
        Object.assign(mockStaleEvent, data);
        return Promise.resolve(mockStaleEvent);
      });

      const result = await service.processSingleEvent('evt-stale-1', 'worker-recovery');

      expect(result.success).toBe(true);
      expect(result.status).toBe('PROCESSED');
      expect(mockStaleEvent.processed).toBe(true);
    });
  });

  describe('Multiple Events Per Incident & Granular Failure', () => {
    it('does NOT mark an entire incident complete if one event fails', async () => {
      const mockEvent1 = {
        id: 'evt-1',
        aggregateId: 'inc-multi',
        eventType: 'incident.created',
        status: 'PENDING',
        processed: false,
        payload: { incident_id: 'inc-multi' },
      };
      const mockEvent2 = {
        id: 'evt-2',
        aggregateId: 'inc-multi',
        eventType: 'dispatch.initiate',
        status: 'PENDING',
        processed: false,
        payload: { teams: [] },
      };

      mockPrisma.outboxEvent.findMany.mockResolvedValue([mockEvent1, mockEvent2]);

      // Event 1 succeeds
      mockPrisma.outboxEvent.findUnique
        .mockResolvedValueOnce(mockEvent1)
        .mockResolvedValueOnce(mockEvent2);

      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-multi',
        workflow: 'STANDARD_REPORT',
      });

      // Event 2 dispatch fails
      mockDispatch.initiateDispatch.mockRejectedValueOnce(new Error('Dispatch connection lost'));

      mockPrisma.outboxEvent.update.mockResolvedValue({});

      const outcome = await service.processIncidentEvents('inc-multi', 'worker-multi');

      expect(outcome.processedCount).toBe(1);
      expect(outcome.failedCount).toBe(1);
      expect(outcome.results[0].status).toBe('PROCESSED');
      expect(outcome.results[1].status).toBe('FAILED');
    });
  });

  describe('Queue Processors (StandardProcessor & SosProcessor)', () => {
    it('StandardProcessor delegates outbox processing to OutboxProcessorService', async () => {
      const processor = new StandardProcessor(mockPrisma, mockAudit, service);

      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-std-1',
        publicId: 'REP-2026-000001',
        incidentTeams: [{ teamId: 'team-infra' }],
      });

      vi.spyOn(service, 'processIncidentEvents').mockResolvedValue({
        processedCount: 1,
        failedCount: 0,
        results: [{ eventId: 'evt-1', eventType: 'incident.created', status: 'PROCESSED', success: true }],
      });

      const res = await processor.process({
        id: 'job-std-1',
        name: 'process-standard',
        data: { incident_id: 'inc-std-1', workflow: 'STANDARD_REPORT' },
      } as any);

      expect(res.success).toBe(true);
      expect(res.outboxEventsProcessed).toBe(1);
      expect(service.processIncidentEvents).toHaveBeenCalledWith(
        'inc-std-1',
        'standard-worker-job-std-1',
        'STANDARD_REPORT',
      );
    });

    it('StandardProcessor throws error to trigger queue retry if outbox processing fails', async () => {
      const processor = new StandardProcessor(mockPrisma, mockAudit, service);

      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-std-1',
        publicId: 'REP-2026-000001',
      });

      vi.spyOn(service, 'processIncidentEvents').mockResolvedValue({
        processedCount: 0,
        failedCount: 1,
        results: [{ eventId: 'evt-1', eventType: 'incident.created', status: 'FAILED', success: false, error: 'Database timeout' }],
      });

      await expect(
        processor.process({
          id: 'job-std-2',
          name: 'process-standard',
          data: { incident_id: 'inc-std-1', workflow: 'STANDARD_REPORT' },
        } as any),
      ).rejects.toThrow('Outbox event execution failed');
    });

    it('SosProcessor delegates outbox processing and throws if emergency event processing fails', async () => {
      const processor = new SosProcessor(mockPrisma, mockAudit, service);

      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-sos-1',
        publicId: 'SOS-2026-000001',
      });

      vi.spyOn(service, 'processIncidentEvents').mockResolvedValue({
        processedCount: 0,
        failedCount: 1,
        results: [{ eventId: 'evt-sos-1', eventType: 'incident.created', status: 'FAILED', success: false, error: 'Network dropped' }],
      });

      await expect(
        processor.process({
          id: 'job-sos-1',
          name: 'process-sos',
          data: { incident_id: 'inc-sos-1', workflow: 'EMERGENCY_SOS' },
        } as any),
      ).rejects.toThrow('SOS outbox event execution failed');
    });
  });

  describe('Outbox Reconciler Service', () => {
    it('scans pending/failed events and directly executes fallback when BullMQ queues are unavailable', async () => {
      const reconciler = new OutboxReconcilerService(
        mockPrisma,
        service,
        mockAudit,
        undefined, // sosQueue offline
        undefined, // standardQueue offline
      );

      const mockPendingEvent = {
        id: 'evt-unprocessed-1',
        aggregateId: 'inc-unprocessed',
        eventType: 'incident.created',
        status: 'PENDING',
        processed: false,
        payload: { workflow: 'EMERGENCY_SOS' },
      };

      mockPrisma.outboxEvent.findMany.mockResolvedValue([mockPendingEvent]);
      vi.spyOn(service, 'processSingleEvent').mockResolvedValue({
        eventId: 'evt-unprocessed-1',
        eventType: 'incident.created',
        status: 'PROCESSED',
        success: true,
      });

      const result = await reconciler.reconcilePendingEvents();

      expect(result.found).toBe(1);
      expect(result.directProcessed).toBe(1);
      expect(result.failed).toBe(0);
      expect(service.processSingleEvent).toHaveBeenCalledWith(
        'evt-unprocessed-1',
        'reconciler-direct',
        'EMERGENCY_SOS',
      );
    });
  });
});
