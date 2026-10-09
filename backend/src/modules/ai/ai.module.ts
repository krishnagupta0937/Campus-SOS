import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { RuleClassifier } from './rule-classifier';
import { LlmClassifier } from './llm-classifier';
import { GeminiService } from './gemini.service';
import { RoutingModule } from '../routing/routing.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [RoutingModule, AuditModule, AuthModule],
  controllers: [AiController],
  providers: [AiService, RuleClassifier, LlmClassifier, GeminiService],
  exports: [AiService, GeminiService],
})
export class AiModule {}
