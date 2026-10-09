import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiClassification, AiInput } from './ai.service';

/**
 * LLM-based classifier implementation.
 * Calls external LLM API with strict JSON schema output.
 * AI_ROUTING_SPECIFICATION.md §4.
 */
@Injectable()
export class LlmClassifier {
  constructor(private readonly configService: ConfigService) {}

  async classify(input: AiInput): Promise<AiClassification> {
    const apiEndpoint = this.configService.get<string>('AI_API_ENDPOINT');
    const apiKey = this.configService.get<string>('AI_API_KEY');
    const modelName = this.configService.get<string>('AI_MODEL_NAME', 'gpt-4o-mini');

    if (!apiEndpoint || !apiKey) {
      throw new Error('AI configuration missing');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty LLM response');
    }

    const parsed = JSON.parse(content);

    // Validate the output structure
    if (!parsed.category || typeof parsed.confidence !== 'number') {
      throw new Error('Invalid LLM output structure');
    }

    return {
      ...parsed,
      source: 'AI' as const,
      schema_version: parsed.schema_version || '1.0',
    };
  }

  private buildSystemPrompt(): string {
    return `You are a campus safety incident classifier. Analyze the student's report and output ONLY a JSON object.

CRITICAL RULES:
- Output ONLY valid JSON matching the exact schema. No prose, no policy advice.
- Never identify people from photographs. Never infer identity.
- Never recommend specific teams or routing decisions.
- Never invent campus policy.
- For medical cases, only reference first-aid card IDs from: bleeding, bee_sting, fainting, burn, choking, seizure.
- Self-harm/suicide indications → MEDICAL_EMERGENCY with immediate_danger=true, self_harm_indicator=true.
- Support English, Hindi, and Hinglish inputs.

CATEGORIES: FIRE, FIRE_HAZARD, MEDICAL_EMERGENCY, ACCIDENT, FIGHT_QUARREL, TEACHER_MISCONDUCT, STUDENT_MISCONDUCT, STUDENT_TEACHER_DISPUTE, HARASSMENT_WOMEN, HARASSMENT_MEN, UNKNOWN_PERSON, SUSPICIOUS_ACTIVITY, UNAUTHORIZED_ACCESS, SECURITY_THREAT, BLOCKED_ROUTE, VEHICLE_INCIDENT, PARKING_ISSUE, INFRASTRUCTURE_HAZARD, ENVIRONMENTAL_HAZARD, CYBER_DIGITAL, GRIEVANCE_WELFARE, EVENT_AREA_AVOIDANCE, DISCIPLINARY_OTHER, OTHER

OUTPUT JSON SCHEMA:
{
  "schema_version": "1.0",
  "category": "string (one of the categories above)",
  "secondary_categories": ["string"],
  "confidence": 0.0 to 1.0,
  "immediate_danger": boolean,
  "flags": {
    "injury_present": boolean,
    "violence_flag": boolean,
    "safety_risk": boolean,
    "crowd_risk": boolean,
    "disciplinary_flag": boolean,
    "is_major": boolean,
    "area_to_avoid": "string|null",
    "weapon_mentioned": boolean,
    "digital_harassment": boolean,
    "self_harm_indicator": boolean
  },
  "extracted": {
    "hazard_type": "string|null",
    "people_involved_count": number|null,
    "symptoms": ["string"],
    "location_hint": "string|null",
    "time_reference": "string|null",
    "vehicle_involved": boolean,
    "persons_described": "behaviour description only, never identity"
  },
  "summary_for_staff": "1-2 neutral sentences",
  "reasoning": "short rationale",
  "language": "en|hi"
}`;
  }

  private buildUserPrompt(input: AiInput): string {
    const parts = [
      `Workflow: ${input.workflow}`,
      `Description: ${input.description}`,
    ];

    if (input.student_category) {
      parts.push(`Student-selected category: ${input.student_category}`);
    }
    if (input.location) {
      parts.push(`Location: ${input.location.kind || ''} ${input.location.name || ''}`);
    }
    parts.push(`Photo present: ${input.photo_present} (count: ${input.photo_count})`);
    parts.push(`Time: ${input.time_of_day}`);

    return parts.join('\n');
  }
}
