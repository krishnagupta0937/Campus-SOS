import { z } from 'zod';
import { ALLOWED_CATEGORIES, ALLOWED_SEVERITIES, CATEGORY_NORMALIZATION_MAP } from './ai.constants';

/**
 * Strict Zod schema for validating raw JSON returned by Google Gemini.
 */
export const GeminiRawOutputSchema = z.preprocess(
  (raw: any) => {
    if (!raw || typeof raw !== 'object') return raw;
    return {
      category: raw.category ?? raw.primaryCategory ?? raw.primary_category,
      incidentType: raw.incidentType ?? raw.incident_type ?? raw.hazard_type,
      severity: raw.severity ?? raw.incident_severity,
      immediateDanger: raw.immediateDanger ?? raw.immediate_danger,
      locationContext: raw.locationContext ?? raw.location_context ?? raw.location ?? null,
      extractedKeywords: raw.extractedKeywords ?? raw.extracted_keywords ?? raw.keywords ?? [],
      confidence: typeof raw.confidence === 'number'
        ? raw.confidence
        : (raw.confidence ? parseFloat(raw.confidence) : undefined),
      reasoning: raw.reasoning ?? raw.explanation ?? raw.summary,
    };
  },
  z.object({
    category: z
      .string()
      .transform((val) => {
        const upper = val.trim().toUpperCase().replace(/[\s-]+/g, '_');
        if (CATEGORY_NORMALIZATION_MAP[upper]) {
          return CATEGORY_NORMALIZATION_MAP[upper];
        }
        return upper;
      })
      .refine((val) => ALLOWED_CATEGORIES.includes(val as any), {
        message: 'Category must be one of the authoritative Campus SOS categories',
      }),
    incidentType: z.string().min(1).max(100),
    severity: z.enum(ALLOWED_SEVERITIES),
    immediateDanger: z.boolean(),
    locationContext: z.string().nullable().optional().default(null),
    extractedKeywords: z.array(z.string()).optional().default([]),
    confidence: z.number().min(0).max(1),
    reasoning: z.string().min(1).max(500),
  })
);

export type GeminiRawOutput = z.infer<typeof GeminiRawOutputSchema>;

/**
 * Schema for the POST /api/v1/ai/analyze request payload.
 */
export const AiAnalyzeRequestSchema = z.object({
  description: z.string().min(3, 'Incident description is too short').max(2000, 'Incident description exceeds 2000 characters'),
  studentCategory: z.string().optional().nullable(),
  locationContext: z.string().optional().nullable(),
  draftId: z.string().uuid().optional().nullable(),
  workflow: z.enum(['EMERGENCY_SOS', 'STANDARD_REPORT']).optional().default('EMERGENCY_SOS'),
});

export type AiAnalyzeRequestDto = z.infer<typeof AiAnalyzeRequestSchema>;
