import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiService } from './ai.service';
import { RuleClassifier } from './rule-classifier';
import { LlmClassifier } from './llm-classifier';
import { GeminiService } from './gemini.service';
import { RoutingService } from '../routing/routing.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';

describe('AiService (Assistive AI Pipeline, Category Union & Deterministic Routing)', () => {
  let aiService: AiService;
  let mockConfig: any;
  let mockRuleClassifier: any;
  let mockLlmClassifier: any;
  let mockGeminiService: any;
  let mockRoutingService: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockConfig = {
      get: vi.fn((key: string, def?: any) => {
        if (key === 'AI_TIMEOUT_SOS_MS') return 4000;
        if (key === 'AI_TIMEOUT_STANDARD_MS') return 8000;
        return def;
      }),
    };

    mockRuleClassifier = new RuleClassifier();
    mockLlmClassifier = {} as LlmClassifier;

    mockGeminiService = {
      isConfigured: vi.fn().mockReturnValue(true),
      getModel: vi.fn().mockReturnValue('gemini-1.5-flash'),
      analyze: vi.fn(),
    };

    mockRoutingService = {
      route: vi.fn().mockResolvedValue({
        teams: [
          { team_code: 'FIRE_SAFETY', role: 'ACT', reason: 'Fire response', responders_required: 1 },
          { team_code: 'SECURITY', role: 'ACT', reason: 'Security support', responders_required: 1 },
          { team_code: 'CAMPUS_ADMIN', role: 'KNOW', reason: 'Admin awareness', responders_required: 0 },
        ],
        restricted: false,
        campus_wide_eligible: true,
        flags: [],
        matched_rules: ['R-ADM-000', 'R-FIRE-001'],
        config_version: 1,
      }),
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    aiService = new AiService(
      mockConfig as ConfigService,
      mockRuleClassifier,
      mockLlmClassifier,
      mockGeminiService as GeminiService,
      mockRoutingService as RoutingService,
      mockAuditService as AuditService,
    );
  });

  it('successfully analyzes incident via Gemini and triggers deterministic routing', async () => {
    mockGeminiService.analyze.mockResolvedValue({
      category: 'FIRE',
      incidentType: 'Fire Hazard',
      severity: 'CRITICAL',
      immediateDanger: true,
      locationContext: 'Civil Block',
      extractedKeywords: ['smoke', 'fire'],
      confidence: 0.97,
      reasoning: 'The description indicates an active fire-related safety hazard with potential immediate danger.',
      source: 'gemini',
      provider: 'gemini',
      model: 'gemini-1.5-flash',
    });

    const result = await aiService.analyzeIncident(
      {
        description: 'There is smoke and fire coming from the electrical room near Civil Block. Students are nearby.',
        studentCategory: 'FIRE',
        locationContext: 'Civil Block',
      },
      'student-uuid-1',
    );

    expect(result.success).toBe(true);
    expect(result.source).toBe('gemini');
    expect(result.provider).toBe('gemini');
    expect(result.model).toBe('gemini-1.5-flash');
    expect(result.classification.category).toBe('FIRE');
    expect(result.classification.confidence).toBe(0.97);
    expect(result.routingPreview.teamsToAlert).toContain('FIRE_SAFETY');
    expect(result.routingPreview.teamsToAlert).toContain('SECURITY');

    // Audit verification
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AI_CLASSIFICATION',
        actorUserId: 'student-uuid-1',
        details: expect.objectContaining({
          provider: 'gemini',
          category: 'FIRE',
          fallback: false,
        }),
      }),
    );
  });

  it('falls back gracefully to RuleClassifier when Gemini throws an error', async () => {
    mockGeminiService.analyze.mockRejectedValue(new Error('GEMINI_API_HTTP_503'));

    const result = await aiService.analyzeIncident(
      {
        description: 'Student fell near library stairs and is bleeding heavily from arm.',
      },
      'student-uuid-2',
    );

    expect(result.success).toBe(true);
    expect(result.source).toBe('rule_fallback');
    expect(result.provider).toBe('rule');
    expect(result.fallbackReason).toBe('GEMINI_API_HTTP_503');
    expect(result.classification.category).toBe('MEDICAL_EMERGENCY');
    expect(result.classification.immediateDanger).toBe(true);

    // Audit verification for fallback
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'AI_FALLBACK_USED',
        actorUserId: 'student-uuid-2',
        details: expect.objectContaining({
          provider: 'rule',
          reason: 'GEMINI_API_HTTP_503',
          fallback: true,
        }),
      }),
    );
  });

  it('falls back immediately when Gemini is not configured', async () => {
    mockGeminiService.isConfigured.mockReturnValue(false);

    const result = await aiService.analyzeIncident({
      description: 'Ek ladki ko parking ke paas ek aadmi follow kar raha hai aur woh dar rahi hai.',
    });

    expect(result.success).toBe(true);
    expect(result.source).toBe('rule_fallback');
    expect(result.fallbackReason).toBe('AI_PROVIDER_NOT_CONFIGURED');
    expect(result.classification.category).toBe('HARASSMENT_WOMEN');
    expect(result.classification.immediateDanger).toBe(true);
  });

  it('preserves Category Union by passing studentCategory and AI category to routing', async () => {
    mockGeminiService.analyze.mockResolvedValue({
      category: 'MEDICAL_EMERGENCY',
      incidentType: 'Accident',
      severity: 'HIGH',
      immediateDanger: true,
      locationContext: null,
      extractedKeywords: ['accident'],
      confidence: 0.90,
      reasoning: 'Road accident near gate.',
      source: 'gemini',
      provider: 'gemini',
      model: 'gemini-1.5-flash',
    });

    await aiService.analyzeIncident({
      description: 'Bike collision near gate, rider hurt.',
      studentCategory: 'TRANSPORTATION',
    });

    // Verify routing was called with student category preserved
    expect(mockRoutingService.route).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'MEDICAL_EMERGENCY',
      }),
      expect.objectContaining({
        student_category: 'TRANSPORTATION',
      }),
    );
  });
});
