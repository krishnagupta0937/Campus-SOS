import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { SosController } from './sos.controller';
import { AccessPolicyModule } from '../access-policy/access-policy.module';
import { AuditModule } from '../audit/audit.module';
import { AiModule } from '../ai/ai.module';
import { DispatchModule } from '../dispatch/dispatch.module';

@Module({
  imports: [
    AccessPolicyModule,
    AuditModule,
    AiModule,
    DispatchModule,
    BullModule.registerQueue(
      { name: 'sos-critical' },
      { name: 'standard' },
    ),
  ],
  controllers: [IncidentsController, SosController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
