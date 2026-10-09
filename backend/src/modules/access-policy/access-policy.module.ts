import { Module } from '@nestjs/common';
import { AccessPolicyService } from './access-policy.service';
import { AccessPolicyController } from './access-policy.controller';
import { BreakGlassCron } from './break-glass.cron';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AccessPolicyController],
  providers: [AccessPolicyService, BreakGlassCron],
  exports: [AccessPolicyService],
})
export class AccessPolicyModule {}
