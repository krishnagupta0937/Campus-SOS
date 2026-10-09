import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IncidentsService } from './incidents.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { HttpException, ConflictException } from '@nestjs/common';

describe('IncidentsService (SOS Fast Path, Idempotency & State Machine)', () => {
  let service: IncidentsService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockSosQueue: any;
  let mockStandardQueue: any;

  beforeEach(() => {
    mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
      logWithTransaction: vi.fn().mockResolvedValue(undefined),
    };
    mockSosQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-sos-1' }),
    };
    mockStandardQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-std-1' }),
    };
    mockPrisma = {
      incident: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: 'inc-std-1', publicId: 'INC-2026-000001', status: 'CREATED', workflow: 'STANDARD_REPORT' }),
        update: vi.fn().mockResolvedValue({ id: 'inc-1', status: 'TEAMS_NOTIFIED' }),
        count: vi.fn().mockResolvedValue(0),
      },
      incidentDraft: {
        create: vi.fn(),
        findFirst: vi.fn(),
        delete: vi.fn().mockResolvedValue({}),
      },
      incidentLocation: {
        create: vi.fn(),
      },
      incidentStatusHistory: {
        create: vi.fn(),
      },
      attachment: {
        update: vi.fn(),
      },
      outboxEvent: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    service = new IncidentsService(
      mockPrisma as PrismaService,
      mockAudit as AuditService,
      mockSosQueue,
      mockStandardQueue,
    );
  });

  describe('Emergency SOS Drafts & Pin Validation', () => {
    it('should reject draft with pin coordinates < 0 with 422 PIN_OUT_OF_RANGE', async () => {
      await expect(
        service.createSosDraft('user-1', {
          description: 'Emergency in corridor',
          pin: { x: -0.1, y: 0.5 },
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should reject draft with pin coordinates > 1 with 422 PIN_OUT_OF_RANGE', async () => {
      await expect(
        service.createSosDraft('user-1', {
          description: 'Emergency in corridor',
          pin: { x: 0.5, y: 1.1 },
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should allow valid normalized pin (0 <= x,y <= 1)', async () => {
      mockPrisma.incidentDraft.create.mockResolvedValue({
        id: 'draft-1',
        expiresAt: new Date(Date.now() + 86400000),
      });

      const result = await service.createSosDraft('user-1', {
        description: 'Valid emergency',
        pin: { x: 0.42, y: 0.88 },
      });

      expect(result.draft_id).toBe('draft-1');
      expect(result.expires_at).toBeDefined();
    });
  });

  describe('Emergency SOS Fast Path (Confirmation Without Pin)', () => {
    it('should confirm SOS draft WITHOUT a map pin and create emergency successfully', async () => {
      mockPrisma.incident.findUnique.mockResolvedValue(null); // No idempotency replay
      mockPrisma.incidentDraft.findFirst.mockResolvedValue({
        id: 'draft-1',
        reporterId: 'user-1',
        workflow: 'EMERGENCY_SOS',
        expiresAt: new Date(Date.now() + 86400000),
        payload: {
          description: 'Immediate danger, fire alarm ringing!',
          // NO PIN OR LOCATION PROVIDED — FAST PATH
        },
      });

      mockPrisma.incident.create.mockResolvedValue({
        id: 'inc-sos-1',
        publicId: 'SOS-2026-000001',
        status: 'CREATED',
        workflow: 'EMERGENCY_SOS',
      });

      const result = await service.confirmSosDraft('draft-1', 'user-1', 'idemp-key-1');

      expect(result.incident.public_id).toBe('SOS-2026-000001');
      expect(result.incident.status).toBe('CREATED');
      expect(result.live_channel).toBe('incident:inc-sos-1');

      // Verify incident location was not created since none was provided
      expect(mockPrisma.incidentLocation.create).not.toHaveBeenCalled();

      // Verify atomic outbox event was created
      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'incident.created',
            aggregateId: 'inc-sos-1',
          }),
        }),
      );

      // Verify asynchronous queue dispatch was enqueued to sos-critical
      expect(mockSosQueue.add).toHaveBeenCalledWith(
        'process-sos',
        expect.objectContaining({ incident_id: 'inc-sos-1' }),
        expect.any(Object),
      );
    });

    it('should handle idempotency replay safely without creating duplicate incidents', async () => {
      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-sos-1',
        publicId: 'SOS-2026-000001',
        status: 'CREATED',
        workflow: 'EMERGENCY_SOS',
      });

      const result = await service.confirmSosDraft('draft-1', 'user-1', 'idemp-key-existing');

      expect(result.idempotency_replay).toBe(true);
      expect(result.incident.public_id).toBe('SOS-2026-000001');
      // No new creation in DB
      expect(mockPrisma.incident.create).not.toHaveBeenCalled();
      expect(mockSosQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('Standard Report Photo Limit & Validation', () => {
    it('should reject standard report with > 2 photos with 422 PHOTO_LIMIT_EXCEEDED', async () => {
      mockPrisma.incident.findUnique.mockResolvedValue(null);

      await expect(
        service.createStandardReport(
          'user-1',
          {
            description: 'Broken window in lab 4',
            category: 'INFRASTRUCTURE_HAZARD',
            pin: { x: 0.5, y: 0.5 },
            attachment_ids: ['photo-1', 'photo-2', 'photo-3'], // 3 photos > max 2
          },
          'idemp-key-photos',
        ),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('Incident State Machine Status Transitions', () => {
    it('should permit valid transition: CREATED -> TEAMS_NOTIFIED and set timestamp', async () => {
      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-1',
        status: 'CREATED',
        firstTeamNotifiedAt: null,
      });

      mockPrisma.incident.update.mockResolvedValue({
        id: 'inc-1',
        status: 'TEAMS_NOTIFIED',
      });

      const result = await service.transitionStatus('inc-1', 'TEAMS_NOTIFIED', 'actor-1');
      expect(result.status).toBe('TEAMS_NOTIFIED');

      expect(mockPrisma.incident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'TEAMS_NOTIFIED',
            firstTeamNotifiedAt: expect.any(Date),
          }),
        }),
      );
      expect(mockAudit.logWithTransaction).toHaveBeenCalled();
    });

    it('should reject invalid transition: CREATED -> RESPONDER_AT_LOCATION with 409 INVALID_STATUS_TRANSITION', async () => {
      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-1',
        status: 'CREATED',
      });

      await expect(
        service.transitionStatus('inc-1', 'RESPONDER_AT_LOCATION', 'actor-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject backwards transition: RESOLVED -> CREATED with 409 INVALID_STATUS_TRANSITION', async () => {
      mockPrisma.incident.findUnique.mockResolvedValue({
        id: 'inc-1',
        status: 'RESOLVED',
      });

      await expect(
        service.transitionStatus('inc-1', 'CREATED', 'actor-1'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
