import { describe, it, expect, vi } from 'vitest';
import { HealthController } from './health.controller';
import { PrismaService } from '../../database/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('HealthController (Liveness & Readiness Probes)', () => {
  it('should return 200 OK for liveness probe (/health)', async () => {
    const mockPrisma = {} as PrismaService;
    const controller = new HealthController(mockPrisma);

    const result = await controller.health();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('campus-sos-backend');
    expect(result.timestamp).toBeDefined();
  });

  it('should return 200 OK for readiness probe when database responds', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;

    const controller = new HealthController(mockPrisma);
    const result = await controller.ready();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
  });

  it('should throw 503 SERVICE_UNAVAILABLE when database is unreachable', async () => {
    const mockPrisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('Connection refused')),
    } as unknown as PrismaService;

    const controller = new HealthController(mockPrisma);

    await expect(controller.ready()).rejects.toThrow(HttpException);
    try {
      await controller.ready();
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(err.getResponse()).toMatchObject({
        status: 'error',
        database: 'disconnected',
      });
    }
  });
});
