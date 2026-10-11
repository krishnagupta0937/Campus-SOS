import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { OutboxProcessorService } from '../src/modules/incidents/outbox-processor.service';

describe('PostgreSQL Concurrency: Atomic Outbox Locking with Two Simultaneous Workers', () => {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  let prisma: PrismaClient | null = null;
  let outboxProcessor: OutboxProcessorService | null = null;
  let testUserId: string | null = null;

  beforeAll(async () => {
    // If strict PostgreSQL is required by environment but TEST_DATABASE_URL is missing, fail immediately
    if (process.env.REQUIRE_POSTGRES === 'true' && !testDbUrl) {
      throw new Error('REQUIRE_POSTGRES is true, but TEST_DATABASE_URL is missing. A real PostgreSQL instance is required.');
    }

    if (!testDbUrl) {
      console.warn('⚠️  [SKIPPED] TEST_DATABASE_URL is not set. A real PostgreSQL database is required for this integration test.');
      return;
    }

    // Connect to the provided test database URL
    prisma = new PrismaClient({
      datasources: {
        db: { url: testDbUrl },
      },
    });

    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log(`[PostgreSQL Integration] Successfully connected to ${testDbUrl.replace(/:[^:@]+@/, ':***@')}`);
    } catch (err: any) {
      throw new Error(`TEST_DATABASE_URL was provided, but failed to connect to PostgreSQL: ${err.message}`);
    }

    // Step 3: Ensure the test database schema is migrated before the test runs
    try {
      console.log('[PostgreSQL Integration] Running prisma migrate deploy to ensure schema is up to date...');
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: testDbUrl },
        stdio: 'pipe',
      });
      console.log('[PostgreSQL Integration] Migrations verified successfully.');
    } catch (migErr: any) {
      throw new Error(`Prisma migration failed on test database: ${migErr.message}`);
    }

    const mockAuditService: any = {
      log: () => Promise.resolve(),
    };
    const mockDispatchService: any = {
      initiateDispatch: () => Promise.resolve(),
    };
    outboxProcessor = new OutboxProcessorService(prisma as any, mockAuditService, mockDispatchService);
  });

  afterAll(async () => {
    if (prisma) {
      if (testUserId) {
        await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
      }
      await prisma.$disconnect().catch(() => {});
    }
  });

  it('proves that two simultaneous workers competing for the same outbox event result in exactly one acquisition', async (ctx) => {
    // Requirement 1 & 2: Never report a successful concurrency verification without executing against real PostgreSQL.
    // Explicitly skip if TEST_DATABASE_URL is not provided (Vitest records this as SKIPPED, not PASSED).
    if (!testDbUrl || !prisma || !outboxProcessor) {
      ctx.skip('SKIPPED: TEST_DATABASE_URL is not set. A real PostgreSQL instance is required for this integration test.');
      return;
    }

    let testIncidentId: string | null = null;
    let testEventId: string | null = null;

    try {
      // Step 4: Create isolated test user to satisfy foreign key constraints
      const testUser = await prisma.user.upsert({
        where: { email: 'pg-concurrency-tester@campussos.local' },
        update: {},
        create: {
          email: 'pg-concurrency-tester@campussos.local',
          fullName: 'Postgres Concurrency Tester',
          userType: 'student',
          role: 'STUDENT',
        },
      });
      testUserId = testUser.id;

      // Create isolated test incident with valid foreign keys
      const testIncident = await prisma.incident.create({
        data: {
          publicId: `CONC-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          workflow: 'STANDARD_REPORT',
          status: 'CREATED',
          finalCategory: 'FIRE',
          description: 'PostgreSQL outbox concurrency isolation test',
          reporterId: testUser.id,
          createdById: testUser.id,
        },
      });
      testIncidentId = testIncident.id;

      // Create isolated outbox event pointing to the test incident
      const testEvent = await prisma.outboxEvent.create({
        data: {
          aggregateId: testIncident.id,
          eventType: 'incident.created',
          payload: { incident_id: testIncident.id, workflow: 'STANDARD_REPORT' },
          status: 'PENDING',
          processed: false,
          attempts: 0,
        },
      });
      testEventId = testEvent.id;

      // Step 5: Run two concurrent workers simultaneously against the exact same event
      const worker1Promise = outboxProcessor.processSingleEvent(testEvent.id, 'pg-worker-alpha');
      const worker2Promise = outboxProcessor.processSingleEvent(testEvent.id, 'pg-worker-beta');

      const [res1, res2] = await Promise.all([worker1Promise, worker2Promise]);

      const succeeded = [res1, res2].filter((r) => r.status === 'PROCESSED' && r.success === true);
      const locked = [res1, res2].filter((r) => r.status === 'LOCKED' && r.success === false);

      // Assert that exactly one worker claims and processes it, the other does not
      expect(succeeded.length).toBe(1);
      expect(locked.length).toBe(1);
      expect(succeeded[0].success).toBe(true);
      expect(locked[0].success).toBe(false);

      // Assert database records only one successful processing attempt
      const eventInDb = await prisma.outboxEvent.findUnique({
        where: { id: testEvent.id },
      });

      expect(eventInDb).not.toBeNull();
      expect(eventInDb?.status).toBe('PROCESSED');
      expect(eventInDb?.processed).toBe(true);
      expect(eventInDb?.attempts).toBe(1);
      expect(eventInDb?.lockedAt).toBeNull();
      expect(eventInDb?.lockedBy).toBeNull();
    } finally {
      // Step 4: Clean up test data safely in reverse dependency order, even on test failure
      if (testIncidentId) {
        await prisma.auditEvent.deleteMany({
          where: { incidentId: testIncidentId },
        }).catch(() => {});
      }

      if (testEventId) {
        await prisma.outboxEvent.delete({
          where: { id: testEventId },
        }).catch(() => {});
      }

      if (testIncidentId) {
        await prisma.incident.delete({
          where: { id: testIncidentId },
        }).catch(() => {});
      }
    }
  });
});
