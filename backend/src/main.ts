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
  app.enableCors({
    origin: (origin, cb) => {
      // Allow requests from localhost frontend or tools without origin header
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        cb(null, true);
      } else {
        cb(null, configuredOrigin);
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
