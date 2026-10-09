import { describe, it, expect } from 'vitest';
import { GeminiService } from './gemini.service';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { RuleClassifier } from './rule-classifier';
import { RoutingService } from '../routing/routing.service';
import { AuditService } from '../audit/audit.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

describe('Live Gemini API Verification', () => {
  const configService = new ConfigService();
  const geminiService = new GeminiService(configService);

  it('verifies live Gemini credentials and model configuration', () => {
    expect(geminiService.isConfigured()).toBe(true);
    expect(geminiService.getApiKey()).toBeDefined();
    expect(geminiService.getApiKey()!.length).toBeGreaterThan(10);
    expect(geminiService.getModel()).toBe('gemini-3.5-flash-lite');
  });

  it('performs real live Gemini inference on Test 1 (Fire)', async () => {
    const result = await geminiService.analyze({
      description: 'There is smoke and fire coming from the electrical room near Civil Block. Students are nearby.',
      studentCategory: 'FIRE',
      locationContext: 'Civil Block',
      timeoutMs: 10000,
    });

    expect(result.source).toBe('gemini');
    expect(result.provider).toBe('gemini');
    expect(result.category).toBe('FIRE');
    expect(result.severity).toBe('CRITICAL');
    expect(result.immediateDanger).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.85);
    expect(result.reasoning).toBeTruthy();
    expect(result.extractedKeywords.length).toBeGreaterThan(0);
  }, 15000);

  it('performs end-to-end AiService analysis with Category Union and deterministic routing', async () => {
    const mockAuditService = {
      log: () => Promise.resolve(),
    } as any;

    const mockPrisma = {
      team: {
        findMany: () => Promise.resolve([
          { code: 'WOMEN_SAFETY', isRestricted: true },
          { code: 'CHIEF_PROCTOR', isRestricted: false },
          { code: 'CAMPUS_ADMIN', isRestricted: false },
          { code: 'SECURITY', isRestricted: false },
        ]),
      },
    } as any;

    const ruleClassifier = new RuleClassifier();
    const llmClassifier = {
      isAvailable: () => false,
      classify: () => Promise.reject(new Error('LLM disabled')),
    } as any;
    const mockConfig = {
      get: (key: string, defaultVal?: any) => {
        if (key === 'AI_TIMEOUT_SOS_MS') return 15000;
        return configService.get(key) ?? defaultVal;
      },
    } as any;

    const routingService = new RoutingService(mockPrisma);
    const aiService = new AiService(
      mockConfig,
      ruleClassifier,
      llmClassifier,
      geminiService,
      routingService,
      mockAuditService
    );

    const analysis = await aiService.analyzeIncident({
      description: 'Ek ladki ko parking ke paas ek aadmi follow kar raha hai aur woh dar rahi hai.',
      studentCategory: 'WOMEN_SAFETY',
      locationContext: 'Campus Parking',
    });

    expect(analysis.success).toBe(true);
    expect(analysis.source).toBe('gemini');
    expect(['WOMEN_SAFETY', 'HARASSMENT_WOMEN']).toContain(analysis.classification.category);
    expect(analysis.classification.immediateDanger).toBe(true);

    // Verify deterministic Category Union routing
    expect(analysis.routingPreview.primaryTeam).toBe('WOMEN_SAFETY');
    expect(analysis.routingPreview.teamsToAlert).toContain('WOMEN_SAFETY');
    expect(analysis.routingPreview.teamsToAlert).toContain('CHIEF_PROCTOR');
  }, 15000);
});
