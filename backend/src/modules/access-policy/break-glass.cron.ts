import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccessPolicyService } from './access-policy.service';

@Injectable()
export class BreakGlassCron {
  private readonly logger = new Logger(BreakGlassCron.name);

  constructor(@Inject(AccessPolicyService) private readonly accessPolicyService: AccessPolicyService) {}

  /**
   * Periodic sweep to identify and mark expired emergency access grants.
   * State transitions to EXPIRED and records BREAK_GLASS_EXPIRED audit event.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredGrantsCleanup() {
    try {
      const count = await this.accessPolicyService.cleanupExpiredGrants();
      if (count > 0) {
        this.logger.log(`Expired ${count} emergency access grant(s)`);
      }
    } catch (err) {
      this.logger.error('Error cleaning up expired break-glass grants', err);
    }
  }
}
