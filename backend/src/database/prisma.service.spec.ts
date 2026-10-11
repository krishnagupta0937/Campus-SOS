import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaService } from './prisma.service';

describe('PrismaService (Reliability, Strict Mode & Transaction Rollbacks)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should throw an error in strict mode when PostgreSQL connection fails (REQUIRE_POSTGRES=true)', async () => {
    process.env.REQUIRE_POSTGRES = 'true';
    const service = new PrismaService();
    vi.spyOn(service, '$connect').mockRejectedValue(new Error('Connection refused at 5432'));

    await expect(service.onModuleInit()).rejects.toThrow(
      /PostgreSQL connection failed. Strict persistence mode requires a live database connection./,
    );
    expect(service.isPostgresConnected).toBe(false);
  });

  it('should fall back to DevStore in development when REQUIRE_POSTGRES is not set', async () => {
    process.env.REQUIRE_POSTGRES = 'false';
    process.env.NODE_ENV = 'development';
    const service = new PrismaService();
    vi.spyOn(service, '$connect').mockRejectedValue(new Error('Connection refused at 5432'));

    await service.onModuleInit();
    expect(service.isPostgresConnected).toBe(false);
  });

  it('should rollback DevStore state if a transaction callback fails', async () => {
    const service = new PrismaService();
    service.isPostgresConnected = false;

    // Record initial incident count in devStore
    const initialCount = await (service as any).incident.count();

    // Execute transaction that fails midway
    await expect(
      service.$transaction(async (tx: any) => {
        await tx.incident.create({
          data: {
            publicId: 'INC-TEST-ROLLBACK',
            workflow: 'STANDARD_REPORT',
            reporterId: 'usr-1',
            createdById: 'usr-1',
            description: 'This transaction will intentionally fail',
          },
        });

        // Deliberate error inside transaction
        throw new Error('Simulation of failure midway through transaction');
      }),
    ).rejects.toThrow('Simulation of failure midway through transaction');

    // Verify incident was rolled back and count is unchanged
    const countAfter = await (service as any).incident.count();
    expect(countAfter).toBe(initialCount);

    const abortedRecord = await (service as any).incident.findUnique({
      where: { publicId: 'INC-TEST-ROLLBACK' },
    });
    expect(abortedRecord).toBeNull();
  });

  it('should commit DevStore state if transaction callback succeeds', async () => {
    const service = new PrismaService();
    service.isPostgresConnected = false;

    const uniqueId = `INC-SUCCESS-${Date.now()}`;
    await service.$transaction(async (tx: any) => {
      await tx.incident.create({
        data: {
          publicId: uniqueId,
          workflow: 'STANDARD_REPORT',
          reporterId: 'usr-1',
          createdById: 'usr-1',
          description: 'Transaction success test',
        },
      });
    });

    const created = await (service as any).incident.findUnique({
      where: { publicId: uniqueId },
    });
    expect(created).toBeDefined();
    expect(created.publicId).toBe(uniqueId);
  });
});
