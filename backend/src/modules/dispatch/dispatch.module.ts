import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DispatchService } from './dispatch.service';
import { DispatchProcessor } from './dispatch.processor';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    BullModule.registerQueue(
      { name: 'dispatch' },
    ),
  ],
  providers: [DispatchService, DispatchProcessor],
  exports: [DispatchService],
})
export class DispatchModule {}
