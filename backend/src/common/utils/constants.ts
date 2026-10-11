/**
 * Incident status state machine.
 * Defines valid status transitions as per ARCHITECTURE.md §6.1.
 */
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['CREATED'],
  CREATED: ['TEAMS_NOTIFIED', 'RESOLVED', 'CANCELLED'],
  TEAMS_NOTIFIED: ['RESPONDER_ASSIGNED', 'RESOLVED'],
  RESPONDER_ASSIGNED: ['RESPONDER_ON_THE_WAY'],
  RESPONDER_ON_THE_WAY: ['RESPONDER_AT_LOCATION'],
  RESPONDER_AT_LOCATION: ['RESOLVED'],
  RESOLVED: ['REOPENED'],
  REOPENED: ['TEAMS_NOTIFIED'],
  CANCELLED: [],
};

/**
 * Check if a status transition is valid.
 */
export function isValidStatusTransition(from: string, to: string): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Assignment status state machine.
 * ARCHITECTURE.md §6.2
 */
export const VALID_ASSIGNMENT_TRANSITIONS: Record<string, string[]> = {
  OFFERED: ['ACCEPTED', 'REJECTED', 'TIMED_OUT', 'CANCELLED'],
  ACCEPTED: ['EN_ROUTE'],
  EN_ROUTE: ['ON_SCENE'],
  ON_SCENE: ['COMPLETED'],
  REJECTED: [],
  TIMED_OUT: [],
  CANCELLED: [],
  COMPLETED: [],
};

/**
 * Student-facing labels for incident statuses.
 */
export const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Emergency Created',
  TEAMS_NOTIFIED: 'Teams Notified',
  RESPONDER_ASSIGNED: 'Responder Assigned',
  RESPONDER_ON_THE_WAY: 'Responder On the Way',
  RESPONDER_AT_LOCATION: 'Responder At Location',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
  CANCELLED: 'Closed',
};

/**
 * Categories that are hard-coded to deny campus-wide notices.
 * AI_ROUTING_SPECIFICATION.md §3
 */
export const CAMPUS_WIDE_DENY_LIST = new Set([
  'TEACHER_MISCONDUCT',
  'FACULTY_STAFF_MISCONDUCT',
  'STUDENT_MISCONDUCT',
  'STUDENT_TEACHER_DISPUTE',
  'HARASSMENT_WOMEN',
  'WOMEN_HARASSMENT',
  'HARASSMENT_MEN',
  'MEN_HARASSMENT',
  'MEDICAL_EMERGENCY',
  'ACCIDENT',
  'FIGHT_QUARREL',
  'GRIEVANCE_WELFARE',
  'GENERAL_COMPLAINT',
  'DISCIPLINARY_OTHER',
]);

/**
 * Categories marked as restricted/sensitive.
 */
export const RESTRICTED_CATEGORIES = new Set([
  'MEDICAL_EMERGENCY',
  'ACCIDENT',
  'FIGHT_QUARREL',
  'TEACHER_MISCONDUCT',
  'FACULTY_STAFF_MISCONDUCT',
  'STUDENT_MISCONDUCT',
  'STUDENT_TEACHER_DISPUTE',
  'HARASSMENT_WOMEN',
  'WOMEN_HARASSMENT',
  'HARASSMENT_MEN',
  'MEN_HARASSMENT',
  'GRIEVANCE_WELFARE',
  'GENERAL_COMPLAINT',
  'DISCIPLINARY_OTHER',
]);

/**
 * All valid incident categories.
 */
export const ALL_CATEGORIES = [
  'FIRE', 'FIRE_HAZARD',
  'MEDICAL_EMERGENCY', 'ACCIDENT',
  'FIGHT_QUARREL',
  'TEACHER_MISCONDUCT', 'STUDENT_MISCONDUCT', 'STUDENT_TEACHER_DISPUTE',
  'HARASSMENT_WOMEN', 'HARASSMENT_MEN',
  'UNKNOWN_PERSON', 'SUSPICIOUS_ACTIVITY', 'UNAUTHORIZED_ACCESS',
  'SECURITY_THREAT',
  'BLOCKED_ROUTE', 'VEHICLE_INCIDENT', 'PARKING_ISSUE',
  'INFRASTRUCTURE_HAZARD', 'ENVIRONMENTAL_HAZARD',
  'CYBER_DIGITAL',
  'GRIEVANCE_WELFARE',
  'EVENT_AREA_AVOIDANCE',
  'DISCIPLINARY_OTHER',
  'OTHER',
] as const;

export type IncidentCategory = typeof ALL_CATEGORIES[number];

/**
 * Generate human-readable public incident ID.
 * Format: SOS-YYYY-NNNNNN or INC-YYYY-NNNNNN
 */
export function generatePublicId(workflow: 'EMERGENCY_SOS' | 'STANDARD_REPORT', sequenceNumber: number): string {
  const year = new Date().getFullYear();
  const prefix = workflow === 'EMERGENCY_SOS' ? 'SOS' : 'INC';
  const padded = String(sequenceNumber).padStart(6, '0');
  return `${prefix}-${year}-${padded}`;
}
