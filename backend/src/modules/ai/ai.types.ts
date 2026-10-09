import { GeminiRawOutput } from './ai.schema';
import { RoutingDecision } from '../routing/routing.service';
import { AiClassification } from './ai.service';

export type AiSource = 'gemini' | 'rule_fallback';

export interface GeminiStructuredOutput extends GeminiRawOutput {
  source: AiSource;
  provider: 'gemini' | 'rule';
  model: string;
}

export interface RoutingPreviewDto {
  teamsToAlert: string[];
  primaryTeam: string | null;
  restrictedNotice: boolean;
  campusWideEligible: boolean;
  matchedRules: string[];
  respondersRequiredTotal: number;
}

export interface AiAnalysisOutput {
  success: boolean;
  source: AiSource;
  provider: string;
  model: string;
  correlationId: string;
  latencyMs: number;
  classification: GeminiStructuredOutput;
  normalizedClassification: AiClassification;
  routingPreview: RoutingPreviewDto;
  fallbackReason?: string | null;
}
