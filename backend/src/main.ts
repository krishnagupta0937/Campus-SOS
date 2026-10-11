import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

process.on('uncaughtException', (err: any) => {
  if (err?.message?.includes('Connection is closed') || err?.message?.includes('ECONNREFUSED')) {
    return;
  }
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason: any) => {
  if (reason?.message?.includes('Connection is closed') || reason?.message?.includes('ECONNREFUSED')) {
    return;
  }
  console.error('Unhandled Rejection:', reason);
});

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const config = app.get(ConfigService);

  // Global prefix
  const prefix = config.get<string>('API_PREFIX', '/api/v1');
  app.setGlobalPrefix(prefix);

  // CORS
  const configuredOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:3000');
  const allowedOrigins = configuredOrigin.split(',').map((o) => o.trim()).filter(Boolean);
  const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

  app.enableCors({
    origin: (origin, cb) => {
      // Allow requests without origin header (mobile apps, server-to-server, curl)
      if (!origin) {
        cb(null, true);
        return;
      }
      // Strict boundary check: exact localhost host or configured production origin
      if (localhostRegex.test(origin) || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`Origin ${origin} not allowed by CORS policy`), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'X-Request-Id',
    ],
    exposedHeaders: ['X-Request-Id'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = config.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Campus SOS Backend running on port ${port}`);
  console.log(`📡 API prefix: ${prefix}`);
  console.log(`🌍 CORS origin: ${configuredOrigin}`);
}

void bootstrap();
