import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiService } from './gemini.service';
import { ConfigService } from '@nestjs/config';

describe('GeminiService (Google Gemini Integration & Schema Validation)', () => {
  let service: GeminiService;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      get: vi.fn((key: string, def?: any) => {
        if (key === 'GEMINI_API_KEY') return 'test-gemini-key-12345';
        if (key === 'GEMINI_MODEL') return 'gemini-1.5-flash';
        if (key === 'AI_ENABLED') return 'true';
        return def;
      }),
    };
    service = new GeminiService(mockConfig as ConfigService);
  });

  it('correctly detects when Gemini is configured with API key', () => {
    expect(service.isConfigured()).toBe(true);
    expect(service.getModel()).toBe('gemini-1.5-flash');
  });

  it('detects when Gemini is disabled or key missing', () => {
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'AI_ENABLED') return 'false';
      return null;
    });
    expect(service.isConfigured()).toBe(false);
  });

  it('parses and validates structured JSON output from Gemini API', async () => {
    const mockGeminiJson = {
      category: 'FIRE',
      incidentType: 'Fire Hazard',
      severity: 'CRITICAL',
      immediateDanger: true,
      locationContext: 'Civil Block electrical room',
      extractedKeywords: ['smoke', 'fire', 'electrical room'],
      confidence: 0.98,
      reasoning: 'Active fire hazard with smoke and nearby students detected.',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(mockGeminiJson) }],
            },
          },
        ],
      }),
    } as any);

    const result = await service.analyze({
      description: 'There is smoke and fire coming from the electrical room near Civil Block. Students are nearby.',
    });

    expect(result.category).toBe('FIRE');
    expect(result.incidentType).toBe('Fire Hazard');
    expect(result.severity).toBe('CRITICAL');
    expect(result.immediateDanger).toBe(true);
    expect(result.confidence).toBe(0.98);
    expect(result.source).toBe('gemini');
    expect(result.provider).toBe('gemini');
  });

  it('normalizes category synonyms (e.g., WOMEN_SAFETY -> HARASSMENT_WOMEN)', async () => {
    const mockGeminiJson = {
      category: 'WOMEN_SAFETY',
      incidentType: 'Stalking / Harassment',
      severity: 'HIGH',
      immediateDanger: true,
      locationContext: 'Parking area',
      extractedKeywords: ['follow', 'stalking'],
      confidence: 0.92,
      reasoning: 'Female student being followed in parking area.',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(mockGeminiJson) }],
            },
          },
        ],
      }),
    } as any);

    const result = await service.analyze({
      description: 'Ek ladki ko parking ke paas ek aadmi follow kar raha hai aur woh dar rahi hai.',
    });

    expect(result.category).toBe('HARASSMENT_WOMEN');
    expect(result.immediateDanger).toBe(true);
  });

  it('rejects malformed JSON and throws GEMINI_MALFORMED_JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'NOT VALID JSON AT ALL' }],
            },
          },
        ],
      }),
    } as any);

    await expect(
      service.analyze({ description: 'Testing invalid JSON' }),
    ).rejects.toThrow('GEMINI_MALFORMED_JSON');
  });

  it('rejects invalid category not in authoritative taxonomy', async () => {
    const invalidCategoryJson = {
      category: 'ALIEN_INVASION_UNAUTHORIZED',
      incidentType: 'Unknown',
      severity: 'LOW',
      immediateDanger: false,
      confidence: 0.5,
      reasoning: 'Invalid category',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(invalidCategoryJson) }],
            },
          },
        ],
      }),
    } as any);

    await expect(
      service.analyze({ description: 'Invalid category payload' }),
    ).rejects.toThrow();
  });

  it('rejects missing mandatory fields', async () => {
    const missingFieldsJson = {
      category: 'FIRE',
      // missing incidentType, severity, confidence, reasoning
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(missingFieldsJson) }],
            },
          },
        ],
      }),
    } as any);

    await expect(
      service.analyze({ description: 'Missing fields payload' }),
    ).rejects.toThrow();
  });

  it('handles API HTTP 500 error gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as any);

    await expect(
      service.analyze({ description: 'Server failure test' }),
    ).rejects.toThrow('GEMINI_API_HTTP_500');
  });

  it('handles timeout when AbortController triggers', async () => {
    global.fetch = vi.fn().mockImplementation((_url, options) => {
      return new Promise((_, reject) => {
        options?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    await expect(
      service.analyze({ description: 'Timeout test', timeoutMs: 50 }),
    ).rejects.toThrow('GEMINI_TIMEOUT');
  });
});
