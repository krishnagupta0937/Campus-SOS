import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../database/prisma.service';

/**
 * Health check controller.
 * Public endpoints for liveness/readiness probes.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /health — Liveness probe.
   */
  @Public()
  @Get()
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'campus-sos-backend',
    };
  }

  /**
   * GET /health/ready — Readiness probe (checks database connectivity).
   */
  @Public()
  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new HttpException(
        {
          status: 'error',
          database: 'disconnected',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
