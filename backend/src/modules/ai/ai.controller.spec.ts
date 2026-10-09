import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './gemini.service';
import { BadRequestException } from '@nestjs/common';

describe('AiController (REST Endpoints & Validation)', () => {
  let controller: AiController;
  let mockAiService: any;
  let mockGeminiService: any;

  beforeEach(() => {
    mockAiService = {
      analyzeIncident: vi.fn().mockResolvedValue({
        success: true,
        source: 'gemini',
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        correlationId: 'corr-123',
        latencyMs: 340,
        classification: {
          category: 'FIRE',
          incidentType: 'Fire Hazard',
          severity: 'CRITICAL',
          immediateDanger: true,
          locationContext: 'Civil Block',
          extractedKeywords: ['smoke', 'fire'],
          confidence: 0.98,
          reasoning: 'Fire hazard detected.',
          source: 'gemini',
          provider: 'gemini',
          model: 'gemini-1.5-flash',
        },
        routingPreview: {
          teamsToAlert: ['FIRE_SAFETY', 'SECURITY'],
          primaryTeam: 'FIRE_SAFETY',
          restrictedNotice: false,
          campusWideEligible: true,
          matchedRules: ['R-FIRE-001'],
          respondersRequiredTotal: 2,
        },
      }),
    };

    mockGeminiService = {
      isConfigured: vi.fn().mockReturnValue(true),
      getModel: vi.fn().mockReturnValue('gemini-1.5-flash'),
    };

    controller = new AiController(
      mockAiService as AiService,
      mockGeminiService as GeminiService,
    );
  });

  it('POST /ai/analyze processes valid request payload', async () => {
    const mockUser: any = { id: 'usr-1', role: 'STUDENT' };
    const mockReq: any = { ip: '127.0.0.1' };

    const response = await controller.analyze(
      {
        description: 'Smoke is coming out of lab 304, smells like burning wire.',
        locationContext: 'Lab 304',
        studentCategory: 'FIRE',
      },
      mockUser,
      mockReq,
    );

    expect(response.success).toBe(true);
    expect(response.classification.category).toBe('FIRE');
    expect(mockAiService.analyzeIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Smoke is coming out of lab 304, smells like burning wire.',
      }),
      'usr-1',
      '127.0.0.1',
    );
  });

  it('POST /ai/analyze throws BadRequestException on invalid input (too short)', async () => {
    const mockUser: any = { id: 'usr-1', role: 'STUDENT' };
    const mockReq: any = { ip: '127.0.0.1' };

    await expect(
      controller.analyze({ description: 'hi' }, mockUser, mockReq),
    ).rejects.toThrow(BadRequestException);
  });

  it('GET /ai/status returns active configuration telemetry without exposing secrets', async () => {
    const status = await controller.getStatus();

    expect(status.status).toBe('ok');
    expect(status.configured).toBe(true);
    expect(status.activeProvider).toBe('gemini');
    expect(status.model).toBe('gemini-1.5-flash');
    expect(status.features.deterministicRoutingGated).toBe(true);
    // Crucial security invariant: no API keys in response
    expect((status as any).apiKey).toBeUndefined();
  });
});
