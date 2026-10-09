import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { AccessPolicyModule } from '../access-policy/access-policy.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AccessPolicyModule, AuthModule],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
