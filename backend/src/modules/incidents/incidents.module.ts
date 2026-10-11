import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { SosController } from './sos.controller';
import { AccessPolicyModule } from '../access-policy/access-policy.module';
import { AuditModule } from '../audit/audit.module';
import { AiModule } from '../ai/ai.module';
import { RoutingModule } from '../routing/routing.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { StandardProcessor, SosProcessor } from './incidents.processor';

@Module({
  imports: [
    AccessPolicyModule,
    AuditModule,
    AiModule,
    RoutingModule,
    DispatchModule,
    BullModule.registerQueue(
      { name: 'sos-critical' },
      { name: 'standard' },
    ),
  ],
  controllers: [IncidentsController, SosController],
  providers: [IncidentsService, StandardProcessor, SosProcessor],
  exports: [IncidentsService],
})
export class IncidentsModule {}
