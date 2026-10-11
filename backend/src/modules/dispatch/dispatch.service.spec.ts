import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DispatchService } from './dispatch.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConflictException } from '@nestjs/common';

describe('DispatchService (Availability, Concurrency & Timeouts)', () => {
  let service: DispatchService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockQueue: any;

  beforeEach(() => {
    mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
    };
    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    };
    mockPrisma = {
      team: {
        findUnique: vi.fn(),
      },
      teamMember: {
        findMany: vi.fn(),
      },
      incident: {
        findUnique: vi.fn(),
      },
      assignment: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      responderProfile: {
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    service = new DispatchService(
      mockPrisma as PrismaService,
      mockAudit as AuditService,
      mockQueue,
    );
  });

  describe('Dispatch Timeouts Configuration (PRD & ARCHITECTURE.md)', () => {
    it('should use 45-second default timeout for EMERGENCY_SOS dispatch', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: 'team-1',
        code: 'FIRE_SAFETY',
        offerTimeoutSosSeconds: 45,
        offerTimeoutStandardSeconds: 600,
        sosParallelOffer: false,
        allowBusyOverrideForSos: false,
      });

      mockPrisma.teamMember.findMany.mockResolvedValue([
        {
          id: 'member-1',
          canViewRestricted: false,
          responderProfile: { dutyState: 'AVAILABLE', skills: [], currentAssignmentCount: 0 },
        },
      ]);

      mockPrisma.incident.findUnique.mockResolvedValue({ id: 'inc-1', isRestricted: false });
      mockPrisma.assignment.create.mockResolvedValue({ id: 'asgn-1' });

      await service.initiateDispatch(
        'inc-1',
        [{ team_code: 'FIRE_SAFETY', role: 'ACT', responders_required: 1 }],
        'EMERGENCY_SOS',
      );

      // Verify assignment created with expiresAt approx +45s
      expect(mockPrisma.assignment.create).toHaveBeenCalled();
      const callData = mockPrisma.assignment.create.mock.calls[0][0].data;
      const now = new Date().getTime();
      const expiry = new Date(callData.expiresAt).getTime();
      const diffSec = Math.round((expiry - now) / 1000);
      expect(diffSec).toBeCloseTo(45, 1);

      // Verify timeout check queued with 45000ms delay
      expect(mockQueue.add).toHaveBeenCalledWith(
        'check-offer-timeout',
        expect.any(Object),
        expect.objectContaining({ delay: 45000 }),
      );
    });

    it('should use 600-second timeout for STANDARD_REPORT dispatch', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({
        id: 'team-2',
        code: 'INFRASTRUCTURE',
        offerTimeoutSosSeconds: 45,
        offerTimeoutStandardSeconds: 600,
        sosParallelOffer: false,
        allowBusyOverrideForSos: false,
      });

      mockPrisma.teamMember.findMany.mockResolvedValue([
        {
          id: 'member-2',
          canViewRestricted: false,
          responderProfile: { dutyState: 'AVAILABLE', skills: [], currentAssignmentCount: 0 },
        },
      ]);

      mockPrisma.incident.findUnique.mockResolvedValue({ id: 'inc-2', isRestricted: false });
      mockPrisma.assignment.create.mockResolvedValue({ id: 'asgn-2' });

      await service.initiateDispatch(
        'inc-2',
        [{ team_code: 'INFRASTRUCTURE', role: 'ACT', responders_required: 1 }],
        'STANDARD_REPORT',
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        'check-offer-timeout',
        expect.any(Object),
        expect.objectContaining({ delay: 600000 }),
      );
    });
  });

  describe('Concurrent Dispatch Protection (Race Condition Prevention)', () => {
    it('should allow first responder to accept an offered assignment', async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue({
        id: 'asgn-1',
        incidentId: 'inc-1',
        slotNo: 1,
        status: 'OFFERED',
        memberId: 'mem-1',
      });

      mockPrisma.assignment.findFirst.mockResolvedValue(null); // No existing accepted
      mockPrisma.assignment.update.mockResolvedValue({ id: 'asgn-1', status: 'ACCEPTED' });
      mockPrisma.incident.update = vi.fn().mockResolvedValue({});

      const result = await service.acceptOffer('asgn-1', 'user-1');
      expect(result).toBeDefined();
      expect(mockPrisma.assignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'asgn-1' },
          data: expect.objectContaining({ status: 'ACCEPTED' }),
        }),
      );
      // Other offers for the same slot are cancelled
      expect(mockPrisma.assignment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            incidentId: 'inc-1',
            slotNo: 1,
            id: { not: 'asgn-1' },
          }),
          data: { status: 'CANCELLED' },
        }),
      );
    });

    it('should reject a second concurrent acceptance with ConflictException (409)', async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue({
        id: 'asgn-2',
        incidentId: 'inc-1',
        slotNo: 1,
        status: 'OFFERED',
        memberId: 'mem-2',
      });

      // Another responder already accepted slot 1 concurrently!
      mockPrisma.assignment.findFirst.mockResolvedValue({
        id: 'asgn-1',
        incidentId: 'inc-1',
        slotNo: 1,
        status: 'ACCEPTED',
      });

      await expect(
        service.acceptOffer('asgn-2', 'user-2'),
      ).rejects.toThrow(ConflictException);

      // Verify that assignment 2 was marked as CANCELLED
      expect(mockPrisma.assignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'asgn-2' },
          data: { status: 'CANCELLED' },
        }),
      );
    });
  });

  describe('Responder Lifecycle (En-route, On-scene, Complete)', () => {
    it('should transition assignment to EN_ROUTE and update incident status', async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue({
        id: 'asgn-1',
        incidentId: 'inc-1',
        status: 'ACCEPTED',
        member: { userId: 'resp-user-1' },
      });
      mockPrisma.assignment.update.mockResolvedValue({ id: 'asgn-1', status: 'EN_ROUTE' });
      mockPrisma.incident.update = vi.fn().mockResolvedValue({});
      mockPrisma.incidentStatusHistory = { create: vi.fn().mockResolvedValue({}) };

      const result = await service.markEnRoute('asgn-1', 'resp-user-1');
      expect(result.status).toBe('EN_ROUTE');
      expect(mockPrisma.assignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'asgn-1' },
          data: { status: 'EN_ROUTE' },
        }),
      );
      expect(mockPrisma.incident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inc-1' },
          data: { status: 'RESPONDER_ON_THE_WAY' },
        }),
      );
    });

    it('should transition assignment to ON_SCENE and record responder arrival', async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue({
        id: 'asgn-1',
        incidentId: 'inc-1',
        status: 'EN_ROUTE',
        member: { userId: 'resp-user-1' },
      });
      mockPrisma.assignment.update.mockResolvedValue({ id: 'asgn-1', status: 'ON_SCENE' });
      mockPrisma.incident.update = vi.fn().mockResolvedValue({});
      mockPrisma.incidentStatusHistory = { create: vi.fn().mockResolvedValue({}) };

      const result = await service.markOnScene('asgn-1', 'resp-user-1');
      expect(result.status).toBe('ON_SCENE');
      expect(mockPrisma.incident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inc-1' },
          data: expect.objectContaining({
            status: 'RESPONDER_AT_LOCATION',
            responderArrivedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should complete assignment, resolve incident, and revert responder to AVAILABLE', async () => {
      mockPrisma.assignment.findUnique.mockResolvedValue({
        id: 'asgn-1',
        incidentId: 'inc-1',
        memberId: 'mem-1',
        status: 'ON_SCENE',
        member: { userId: 'resp-user-1' },
      });
      mockPrisma.assignment.update.mockResolvedValue({ id: 'asgn-1', status: 'COMPLETED' });
      mockPrisma.incident.update = vi.fn().mockResolvedValue({});
      mockPrisma.responderProfile.update.mockResolvedValue({});
      mockPrisma.incidentStatusHistory = { create: vi.fn().mockResolvedValue({}) };

      const result = await service.completeAssignment('asgn-1', 'resp-user-1', 'Resolved water leak and repaired valve');
      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.incident.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inc-1' },
          data: expect.objectContaining({
            status: 'RESOLVED',
            resolutionSummary: 'Resolved water leak and repaired valve',
            resolutionCode: 'RESOLVED',
          }),
        }),
      );
      expect(mockPrisma.responderProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { memberId: 'mem-1' },
          data: expect.objectContaining({
            dutyState: 'AVAILABLE',
          }),
        }),
      );
    });
  });
});
