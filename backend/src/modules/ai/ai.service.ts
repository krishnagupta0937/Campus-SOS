import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { RuleClassifier } from './rule-classifier';
import { LlmClassifier } from './llm-classifier';
import { GeminiService } from './gemini.service';
import { RoutingService } from '../routing/routing.service';
import { AuditService } from '../audit/audit.service';
import { AiAnalyzeRequestDto } from './ai.schema';
import { AiAnalysisOutput, GeminiStructuredOutput, RoutingPreviewDto } from './ai.types';

/**
 * AI classification output contract (matches AI_ROUTING_SPECIFICATION.md §4).
 */
export interface AiClassification {
  schema_version: string;
  category: string;
  secondary_categories: string[];
  confidence: number;
  immediate_danger: boolean;
  flags: {
    injury_present: boolean;
    violence_flag: boolean;
    safety_risk: boolean;
    crowd_risk: boolean;
    disciplinary_flag: boolean;
    is_major: boolean;
    area_to_avoid: string | null;
    weapon_mentioned: boolean;
    digital_harassment: boolean;
    self_harm_indicator: boolean;
  };
  extracted: {
    hazard_type: string | null;
    people_involved_count: number | null;
    symptoms: string[];
    location_hint: string | null;
    time_reference: string | null;
    vehicle_involved: boolean;
    persons_described: string | null;
  };
  summary_for_staff: string;
  reasoning: string;
  language: string;
  source: 'AI' | 'RULE_FALLBACK';
}

export interface AiInput {
  workflow: 'EMERGENCY_SOS' | 'STANDARD_REPORT';
  description: string;
  student_category: string | null;
  location: { kind: string | null; name: string | null } | null;
  photo_present: boolean;
  photo_count: number;
  time_of_day: string;
  language_hint: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly ruleClassifier: RuleClassifier,
    private readonly llmClassifier: LlmClassifier,
    private readonly geminiService: GeminiService,
    @Optional() @Inject(RoutingService) private readonly routingService?: RoutingService,
    @Optional() @Inject(AuditService) private readonly auditService?: AuditService,
  ) {}

  /**
   * Unified Assistive Incident Analysis.
   * 1. Calls Gemini for structured understanding (English, Hindi, Hinglish).
   * 2. Validates schema strictly.
   * 3. On any failure/timeout/missing key -> falls back gracefully to RuleClassifier.
   * 4. Evaluates deterministic routing engine using Category Union (Student Category ∪ AI Category).
   * 5. Emits security audit events without leaking secrets.
   */
  async analyzeIncident(
    input: AiAnalyzeRequestDto,
    actorUserId?: string,
    ipAddress?: string,
  ): Promise<AiAnalysisOutput> {
    const startTime = Date.now();
    const correlationId = uuidv4();
    const workflow = input.workflow || 'EMERGENCY_SOS';
    const sanitizedDescription = this.sanitizeInput(input.description);

    let structuredOutput: GeminiStructuredOutput | null = null;
    let fallbackReason: string | null = null;

    // Check if Gemini is enabled & configured
    if (this.geminiService.isConfigured()) {
      try {
        const timeoutMs = workflow === 'EMERGENCY_SOS'
          ? this.configService.get<number>('AI_TIMEOUT_SOS_MS', 4000)
          : this.configService.get<number>('AI_TIMEOUT_STANDARD_MS', 8000);

        structuredOutput = await this.geminiService.analyze({
          description: sanitizedDescription,
          studentCategory: input.studentCategory,
          locationContext: input.locationContext,
          timeoutMs,
        });

        // Audit successful Gemini classification
        if (this.auditService) {
          await this.auditService.log({
            eventType: 'AI_CLASSIFICATION',
            actorKind: actorUserId ? 'STUDENT' : 'SYSTEM',
            actorUserId,
            details: {
              provider: 'gemini',
              model: structuredOutput.model,
              category: structuredOutput.category,
              confidence: structuredOutput.confidence,
              immediateDanger: structuredOutput.immediateDanger,
              severity: structuredOutput.severity,
              correlationId,
              fallback: false,
              latencyMs: Date.now() - startTime,
            },
            ipAddress,
          }).catch((err) => this.logger.warn(`Audit log failed: ${err.message}`));
        }
      } catch (err: any) {
        fallbackReason = err.message || 'GEMINI_CALL_FAILED';
        this.logger.warn(`Gemini analysis failed (${fallbackReason}), activating rule fallback`);
      }
    } else {
      fallbackReason = 'AI_PROVIDER_NOT_CONFIGURED';
    }

    // Normalized classification object for deterministic routing
    let normalizedClassification: AiClassification;

    if (structuredOutput) {
      // Map Gemini output to AiClassification
      normalizedClassification = this.mapGeminiToClassification(structuredOutput);
    } else {
      // Fallback to RuleClassifier
      const ruleInput: AiInput = {
        workflow,
        description: sanitizedDescription,
        student_category: input.studentCategory || null,
        location: input.locationContext ? { kind: null, name: input.locationContext } : null,
        photo_present: false,
        photo_count: 0,
        time_of_day: 'DAY',
        language_hint: 'auto',
      };

      normalizedClassification = this.ruleClassifier.classify(ruleInput);

      structuredOutput = {
        category: normalizedClassification.category as any,
        incidentType: normalizedClassification.extracted.hazard_type || `${normalizedClassification.category.replace(/_/g, ' ')} Incident`,
        severity: normalizedClassification.immediate_danger ? 'CRITICAL' : (normalizedClassification.flags.safety_risk ? 'HIGH' : 'MEDIUM'),
        immediateDanger: normalizedClassification.immediate_danger,
        locationContext: normalizedClassification.extracted.location_hint || input.locationContext || null,
        extractedKeywords: normalizedClassification.summary_for_staff ? [normalizedClassification.category.toLowerCase()] : [],
        confidence: normalizedClassification.confidence,
        reasoning: normalizedClassification.reasoning || 'Categorized using deterministic campus safety rules.',
        source: 'rule_fallback',
        provider: 'rule',
        model: 'campus-sos-rules-v1',
      };

      // Audit AI fallback event
      if (this.auditService) {
        await this.auditService.log({
          eventType: 'AI_FALLBACK_USED',
          actorKind: actorUserId ? 'STUDENT' : 'SYSTEM',
          actorUserId,
          details: {
            provider: 'rule',
            model: 'campus-sos-rules-v1',
            reason: fallbackReason,
            category: normalizedClassification.category,
            confidence: normalizedClassification.confidence,
            correlationId,
            fallback: true,
            latencyMs: Date.now() - startTime,
          },
          ipAddress,
        }).catch((err) => this.logger.warn(`Audit log failed: ${err.message}`));
      }
    }

    // Evaluate Deterministic Routing
    let routingPreview: RoutingPreviewDto = {
      teamsToAlert: ['Campus Safety & Security'],
      primaryTeam: 'SECURITY',
      restrictedNotice: false,
      campusWideEligible: false,
      matchedRules: ['R-DEFAULT'],
      respondersRequiredTotal: 1,
    };

    if (this.routingService) {
      try {
        const routingDecision = await this.routingService.route(normalizedClassification, {
          workflow,
          student_category: input.studentCategory || null,
        });

        routingPreview = {
          teamsToAlert: routingDecision.teams.map((t) => t.team_code),
          primaryTeam: routingDecision.teams.find((t) => t.role === 'ACT')?.team_code || null,
          restrictedNotice: routingDecision.restricted,
          campusWideEligible: routingDecision.campus_wide_eligible,
          matchedRules: routingDecision.matched_rules,
          respondersRequiredTotal: routingDecision.teams.reduce((acc, t) => acc + (t.responders_required || 1), 0),
        };
      } catch (routingErr: any) {
        this.logger.error(`Deterministic routing evaluation failed: ${routingErr.message}`);
      }
    }

    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      source: structuredOutput.source,
      provider: structuredOutput.provider,
      model: structuredOutput.model,
      correlationId,
      latencyMs,
      classification: structuredOutput,
      normalizedClassification,
      routingPreview,
      fallbackReason,
    };
  }

  /**
   * Helper to map Gemini output into the internal AiClassification structure.
   */
  private mapGeminiToClassification(gemini: GeminiStructuredOutput): AiClassification {
    const isMedical = gemini.category === 'MEDICAL_EMERGENCY' || gemini.category === 'ACCIDENT';
    const isViolence = gemini.category === 'FIGHT_QUARREL' || gemini.category === 'SECURITY_THREAT';
    const isDisciplinary = ['STUDENT_MISCONDUCT', 'TEACHER_MISCONDUCT', 'STUDENT_TEACHER_DISPUTE', 'DISCIPLINARY_OTHER'].includes(gemini.category);

    return {
      schema_version: '1.0',
      category: gemini.category,
      secondary_categories: [],
      confidence: gemini.confidence,
      immediate_danger: gemini.immediateDanger,
      flags: {
        injury_present: gemini.severity === 'CRITICAL' || isMedical,
        violence_flag: isViolence,
        safety_risk: gemini.immediateDanger || gemini.severity === 'HIGH' || gemini.severity === 'CRITICAL',
        crowd_risk: false,
        disciplinary_flag: isDisciplinary,
        is_major: gemini.severity === 'CRITICAL',
        area_to_avoid: gemini.locationContext || null,
        weapon_mentioned: false,
        digital_harassment: gemini.category === 'CYBER_DIGITAL',
        self_harm_indicator: false,
      },
      extracted: {
        hazard_type: gemini.incidentType,
        people_involved_count: null,
        symptoms: [],
        location_hint: gemini.locationContext || null,
        time_reference: null,
        vehicle_involved: ['VEHICLE_INCIDENT', 'PARKING_ISSUE'].includes(gemini.category),
        persons_described: null,
      },
      summary_for_staff: `${gemini.incidentType}: ${gemini.reasoning}`,
      reasoning: gemini.reasoning,
      language: 'en',
      source: 'AI',
    };
  }

  /**
   * Legacy classification entry point preserved for pipeline compatibility.
   */
  async classify(input: AiInput): Promise<AiClassification> {
    const provider = this.configService.get<string>('AI_PROVIDER', 'rule');

    if (provider === 'rule' || provider === 'null') {
      return this.ruleClassifier.classify(input);
    }

    const timeoutMs = input.workflow === 'EMERGENCY_SOS'
      ? this.configService.get<number>('AI_TIMEOUT_SOS_MS', 4000)
      : this.configService.get<number>('AI_TIMEOUT_STANDARD_MS', 10000);

    try {
      const result = await Promise.race([
        this.llmClassifier.classify(input),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs),
        ),
      ]);

      if (result.confidence < 0.55) {
        result.category = 'OTHER';
        result.flags = { ...result.flags };
      }

      return result;
    } catch (error) {
      this.logger.warn(`AI classification failed, using rule fallback: ${(error as Error).message}`);
      return this.ruleClassifier.classify(input);
    }
  }

  /**
   * Sanitize input by replacing names with [PERSON] tokens.
   */
  sanitizeInput(description: string): string {
    return description
      .replace(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, '[PERSON]')
      .replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|Sir|Madam)\.\s+\w+/gi, '[PERSON]');
  }
}
