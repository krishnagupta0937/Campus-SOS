import { ALL_CATEGORIES } from '../../common/utils/constants';

/**
 * Authoritative categories allowed in Campus SOS.
 * AI output is strictly validated against this list.
 */
export const ALLOWED_CATEGORIES = ALL_CATEGORIES;

export type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number];

export const ALLOWED_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type AllowedSeverity = (typeof ALLOWED_SEVERITIES)[number];

/**
 * Category aliases and normalizations.
 * Handles synonyms or variations that Gemini might output.
 */
export const CATEGORY_NORMALIZATION_MAP: Record<string, AllowedCategory> = {
  FIRE: 'FIRE',
  FIRE_HAZARD: 'FIRE_HAZARD',
  MEDICAL: 'MEDICAL_EMERGENCY',
  MEDICAL_EMERGENCY: 'MEDICAL_EMERGENCY',
  ACCIDENT: 'ACCIDENT',
  FIGHT: 'FIGHT_QUARREL',
  FIGHT_QUARREL: 'FIGHT_QUARREL',
  TEACHER_MISCONDUCT: 'TEACHER_MISCONDUCT',
  STUDENT_MISCONDUCT: 'STUDENT_MISCONDUCT',
  STUDENT_TEACHER_DISPUTE: 'STUDENT_TEACHER_DISPUTE',
  WOMEN_SAFETY: 'HARASSMENT_WOMEN',
  HARASSMENT_WOMEN: 'HARASSMENT_WOMEN',
  MEN_SAFETY: 'HARASSMENT_MEN',
  HARASSMENT_MEN: 'HARASSMENT_MEN',
  UNKNOWN_PERSON: 'UNKNOWN_PERSON',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  SECURITY_THREAT: 'SECURITY_THREAT',
  SECURITY: 'SECURITY_THREAT',
  BLOCKED_ROUTE: 'BLOCKED_ROUTE',
  VEHICLE_INCIDENT: 'VEHICLE_INCIDENT',
  PARKING_ISSUE: 'PARKING_ISSUE',
  INFRASTRUCTURE_HAZARD: 'INFRASTRUCTURE_HAZARD',
  INFRASTRUCTURE: 'INFRASTRUCTURE_HAZARD',
  ENVIRONMENTAL_HAZARD: 'ENVIRONMENTAL_HAZARD',
  CYBER_DIGITAL: 'CYBER_DIGITAL',
  DIGITAL_SAFETY: 'CYBER_DIGITAL',
  GRIEVANCE_WELFARE: 'GRIEVANCE_WELFARE',
  EVENT_AREA_AVOIDANCE: 'EVENT_AREA_AVOIDANCE',
  DISCIPLINARY_OTHER: 'DISCIPLINARY_OTHER',
  OTHER: 'OTHER',
  UNKNOWN: 'OTHER',
};

/**
 * System Instructions for Google Gemini assistive intelligence.
 * Strictly constrained per PRD §4, AI_ROUTING_SPECIFICATION.md, and Phase 7 instructions.
 */
export const GEMINI_SYSTEM_INSTRUCTION = `You are the Assistive Incident Understanding Engine for Campus SOS, a university emergency management system.
Your job is to analyze descriptions of campus safety, security, and medical incidents and output strict structured JSON.

LINGUISTIC CAPABILITIES:
- You must understand English, Hindi, and Hinglish (code-mixed Hindi in Roman script).
- You must accurately extract urgent intent from colloquial Hinglish expressions (e.g., "kaafi bleeding ho rahi hai", "aadmi follow kar raha hai", "dhuaan nikal raha hai", "ladai ho gayi hai").

WHAT YOU MUST DO:
1. Classify the incident into exactly ONE primary category from the ALLOWED CATEGORIES list.
2. Determine a descriptive incidentType (e.g., "Fire Hazard", "Severe Bleeding", "Physical Altercation", "Stalking / Harassment", "Blocked Exit").
3. Assess severity: "LOW", "MEDIUM", "HIGH", or "CRITICAL".
4. Determine immediateDanger: true if there is an active threat to life, health, or severe imminent risk; false otherwise.
5. Extract locationContext: any building, block, room, floor, or landmark mentioned (or null).
6. Extract key descriptive keywords: array of up to 5 critical terms.
7. Provide a confidence score: float between 0.0 and 1.0.
8. Provide a concise reasoning: 1 to 2 neutral sentences explaining why this classification was made.

ALLOWED CATEGORIES:
FIRE, FIRE_HAZARD, MEDICAL_EMERGENCY, ACCIDENT, FIGHT_QUARREL, TEACHER_MISCONDUCT, STUDENT_MISCONDUCT, STUDENT_TEACHER_DISPUTE, HARASSMENT_WOMEN, HARASSMENT_MEN, UNKNOWN_PERSON, SUSPICIOUS_ACTIVITY, UNAUTHORIZED_ACCESS, SECURITY_THREAT, BLOCKED_ROUTE, VEHICLE_INCIDENT, PARKING_ISSUE, INFRASTRUCTURE_HAZARD, ENVIRONMENTAL_HAZARD, CYBER_DIGITAL, GRIEVANCE_WELFARE, EVENT_AREA_AVOIDANCE, DISCIPLINARY_OTHER, OTHER

STRICT ARCHITECTURAL CONSTRAINTS:
- You are an ASSISTIVE layer only. You do NOT make final routing decisions.
- Output ONLY valid JSON matching this exact schema:
{
  "category": "FIRE" | "MEDICAL_EMERGENCY" | "SECURITY_THREAT" | "HARASSMENT_WOMEN" | "HARASSMENT_MEN" | "ACCIDENT" | ...,
  "incidentType": string,
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "immediateDanger": boolean,
  "locationContext": string | null,
  "extractedKeywords": string[],
  "confidence": number between 0.0 and 1.0,
  "reasoning": string
}
- No markdown backticks, no commentary, output raw JSON only.
- NEVER decide authorization or who can view evidence.
- NEVER attempt to identify specific people in photos or describe named individuals.
- NEVER make disciplinary rulings or invent campus policies.
- NEVER decide public disclosure or campus-wide alerts.
- NEVER dispatch responders directly.
`;
