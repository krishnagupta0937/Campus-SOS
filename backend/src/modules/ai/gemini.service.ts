import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GEMINI_SYSTEM_INSTRUCTION } from './ai.constants';
import { GeminiRawOutput, GeminiRawOutputSchema } from './ai.schema';
import { GeminiStructuredOutput } from './ai.types';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Check if Gemini API is enabled and configured with an API key.
   */
  isConfigured(): boolean {
    const enabled = this.configService?.get<string>('AI_ENABLED') ?? process.env.AI_ENABLED;
    if (enabled === 'false' || enabled === '0') {
      return false;
    }
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 0);
  }

  getApiKey(): string | null {
    return (
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      this.configService.get<string>('AI_API_KEY') ||
      process.env.AI_API_KEY ||
      null
    );
  }

  getModel(): string {
    return (
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'gemini-3.5-flash-lite'
    );
  }

  /**
   * Analyze incident text using Google Gemini API.
   * Throws on network, timeout, or schema validation failures so caller can cleanly trigger fallback.
   */
  async analyze(input: {
    description: string;
    studentCategory?: string | null;
    locationContext?: string | null;
    timeoutMs?: number;
  }): Promise<GeminiStructuredOutput> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
    }

    const model = this.getModel();
    const timeoutMs = input.timeoutMs || 4000;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const userPrompt = this.buildUserPrompt(input);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      this.logger.debug(`Calling Gemini model ${model} (timeout: ${timeoutMs}ms)`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          systemInstruction: {
            parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }],
          },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
            maxOutputTokens: 800,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        this.logger.warn(`Gemini API returned HTTP ${response.status}: ${errorText.slice(0, 200)}`);
        throw new Error(`GEMINI_API_HTTP_${response.status}`);
      }

      const data = (await response.json()) as any;
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('GEMINI_EMPTY_RESPONSE');
      }

      // Strip potential code block formatting
      const cleanJson = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        this.logger.warn(`Failed to parse Gemini output as JSON: ${cleanJson.slice(0, 150)}`);
        throw new Error('GEMINI_MALFORMED_JSON');
      }

      // Strict validation via Zod
      const validated: GeminiRawOutput = GeminiRawOutputSchema.parse(parsed);

      return {
        ...validated,
        source: 'gemini',
        provider: 'gemini',
        model,
      };
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        this.logger.warn(`Gemini API call timed out after ${timeoutMs}ms`);
        throw new Error('GEMINI_TIMEOUT');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private buildUserPrompt(input: {
    description: string;
    studentCategory?: string | null;
    locationContext?: string | null;
  }): string {
    const parts = [
      `INCIDENT DESCRIPTION: "${input.description}"`,
    ];
    if (input.studentCategory) {
      parts.push(`STUDENT DECLARED CATEGORY: "${input.studentCategory}"`);
    }
    if (input.locationContext) {
      parts.push(`LOCATION CONTEXT: "${input.locationContext}"`);
    }
    parts.push('Analyze this incident and output valid JSON according to the schema.');
    return parts.join('\n');
  }
}
