import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './database/prisma.service';

/**
 * BullMQ Worker Process Bootstrap.
 * ARCHITECTURE.md §4, CLAUDE_BACKEND_HANDOFF.md §3
 *
 * Runs as a separate process from the API server.
 * Handles async queues:
 *   - sos-critical: Emergency SOS dispatch, AI classification, routing
 *   - standard: Standard report processing
 *   - notify: Multi-channel notification fan-out
 *   - dispatch: Responder assignment offers, timeout checks, escalation
 *
 * Startup:
 *   npm run start:worker
 *   node dist/worker.js
 */
async function bootstrapWorker() {
  // Create a standalone NestJS app context (no HTTP server)
  const app = await NestFactory.createApplicationContext(AppModule);

  const prisma = app.get(PrismaService);

  console.log('🔧 Campus SOS Worker process started');
  console.log('📋 Listening on queues: sos-critical, standard, notify, dispatch');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('⏹️  Worker shutting down...');
    await prisma.$disconnect();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Keep the process running
  // BullMQ processors are registered via @Processor decorators in modules
  // The application context keeps them alive
}

bootstrapWorker().catch((err) => {
  console.error('❌ Worker failed to start:', err);
  process.exit(1);
});
