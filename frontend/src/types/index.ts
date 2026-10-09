/**
 * Campus SOS — Strongly-Typed Domain Interfaces
 * Strictly mirrors backend contracts in API_SPECIFICATION.md & DATABASE_SCHEMA.md
 */

export type UserRole =
  | 'STUDENT'
  | 'CAMPUS_ADMIN'
  | 'CHIEF_PROCTOR'
  | 'SECURITY'
  | 'MEDICAL'
  | 'FIRE_SAFETY'
  | 'WOMEN_SAFETY'
  | 'MEN_SAFETY'
  | 'STUDENT_COUNCIL'
  | 'INFRASTRUCTURE'
  | 'TRANSPORTATION'
  | 'IT_DIGITAL';

export type DutyState = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export type WorkflowType = 'EMERGENCY_SOS' | 'STANDARD_REPORT';

export type IncidentStatus =
  | 'CREATED'
  | 'CLASSIFIED'
  | 'ROUTED'
  | 'ASSIGNED'
  | 'RESPONDER_ON_THE_WAY'
  | 'RESPONDER_AT_LOCATION'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED';

export interface TeamMembership {
  teamId: string;
  teamName: string;
  teamCode: string;
  isCoordinator: boolean;
  memberId: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  isSuspended: boolean;
  createdAt: string;
  teamMemberships: TeamMembership[];
}

export interface AuthSession {
  user: UserProfile;
  access_token: string;
  refresh_token: string;
}

export interface PinCoordinates {
  x: number; // [0, 1]
  y: number; // [0, 1]
}

export interface PredefinedLocation {
  id: string;
  mapId?: string;
  kind: string;
  name: string;
  anchorX: number | null;
  anchorY: number | null;
  isActive: boolean;
}

export interface CampusMapModel {
  id: string;
  name: string;
  storageKey: string;
  widthPx: number;
  heightPx: number;
  isActive: boolean;
  url?: string;
}

export interface IncidentLocationSummary {
  predefined?: {
    kind?: string;
    name?: string;
  } | null;
  pin?: PinCoordinates | null;
  text?: string | null;
}

export interface SosDraftResponse {
  draft_id: string;
  expires_at: string;
}

export interface AiIncidentAnalysis {
  category: string;
  incidentType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  immediateDanger: boolean;
  locationContext?: string | null;
  extractedKeywords?: string[];
  confidence: number;
  reasoning: string;
  source: 'gemini' | 'rule_fallback';
  provider?: string;
  model?: string;
}

export interface SosPreviewResponse {
  classification: {
    category_label: string;
    category?: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    immediate_danger: boolean;
    confidence?: number;
    reasoning?: string;
    location_context?: string | null;
    extracted_keywords?: string[];
  };
  ai_analysis?: AiIncidentAnalysis;
  source?: 'gemini' | 'rule_fallback';
  provider?: string;
  model?: string;
  teams_to_alert: string[];
  primary_team?: string | null;
  restricted_notice: boolean;
  campus_wide_eligible?: boolean;
  matched_rules?: string[];
}

export interface SosStepStatus {
  key: string;
  label: string;
  at: string | null;
  done: boolean;
}

export interface SosLiveStatusResponse {
  incident_id: string;
  public_id: string;
  steps: SosStepStatus[];
  current: string;
  responder_public?: {
    first_name: string;
    team: string;
  };
}

export interface MyReportItem {
  id: string;
  publicId: string;
  workflow: WorkflowType;
  status: IncidentStatus;
  finalCategory?: string;
  description: string;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface AttachmentItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  position: number;
  url?: string;
}

export interface IncidentDetailModel {
  id: string;
  public_id: string;
  workflow: WorkflowType;
  status: IncidentStatus;
  status_label: string;
  category_label?: string;
  description: string;
  created_at: string;
  resolved_at?: string | null;
  location: IncidentLocationSummary | null;
  assigned_teams: Array<{ team_name: string; team_code?: string }>;
  photos: AttachmentItem[];
  timeline?: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
}

export interface AdminIncidentItem {
  id: string;
  public_id: string;
  workflow: WorkflowType;
  category: string;
  description: string;
  status: IncidentStatus;
  created_at: string;
  location?: IncidentLocationSummary;
  assigned_teams?: string[];
  is_restricted?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  audienceType: string;
  isRead: boolean;
  createdAt: string;
  incidentId?: string;
}

export interface CampusNotice {
  id: string;
  publicId?: string;
  title: string;
  body: string;
  areaText?: string;
  category?: string;
  status: 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED';
  publishedAt?: string;
  createdAt: string;
}

export interface HotlineItem {
  id: string;
  label: string;
  phone: string;
  description?: string;
  is24x7: boolean;
  sortOrder: number;
}

export interface PersonnelDirectoryItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  teamName?: string;
  designation?: string;
  dutyState?: DutyState;
}

export interface DispatchOfferItem {
  assignment_id: string;
  incident_id: string;
  incident_summary: string;
  team_code: string;
  timeout_seconds: number;
  expires_at: string;
}

export interface AnalyticsOverview {
  total_incidents: number;
  active_emergencies: number;
  resolved_incidents: number;
  avg_response_time_seconds: number;
  categories: Record<string, number>;
}

export interface AuditLogItem {
  id: string;
  eventType: string;
  incidentId?: string;
  actorUserId?: string;
  actorKind: string;
  prevHash?: string;
  entryHash?: string;
  timestamp: string;
  details?: any;
}

// ── Emergency Access / Break-Glass Domain Types ──

export type BreakGlassScope =
  | 'INCIDENT_VIEW'
  | 'LOCATION_VIEW'
  | 'EVIDENCE_VIEW'
  | 'REPORTER_CONTACT_VIEW'
  | 'REALTIME_ACCESS'
  | 'INCIDENT_UPDATE'
  | 'TEMPORARY_TEAM_ASSIGNMENT';

export type BreakGlassType = 'NORMAL_OVERRIDE' | 'CRITICAL_BREAK_GLASS';

export type BreakGlassStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REVOKED';

export type SupervisorReviewStatus =
  | 'NOT_REQUIRED'
  | 'REVIEW_REQUIRED'
  | 'REVIEWED'
  | 'FLAGGED';

export interface BreakGlassRequest {
  id: string;
  incident_id: string;
  requester: {
    id: string;
    full_name: string;
    role: string;
  };
  type: BreakGlassType;
  status: BreakGlassStatus;
  requested_scopes: BreakGlassScope[];
  approved_scopes: BreakGlassScope[];
  reason: string;
  requested_at: string;
  approver?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
  approved_at?: string | null;
  activated_at?: string | null;
  expires_at?: string | null;
  supervisor_review_status: SupervisorReviewStatus;
  supervisor_reviewed_at?: string | null;
  supervisor_review_notes?: string | null;
  supervisor?: {
    id: string;
    full_name: string;
    role: string;
  } | null;
  revoked_at?: string | null;
  revocation_reason?: string | null;
  rejection_reason?: string | null;
}

export interface RequestBreakGlassInput {
  incident_id: string;
  type: BreakGlassType;
  requested_scopes: BreakGlassScope[];
  reason: string;
}

export interface ApproveBreakGlassInput {
  request_id: string;
  approved_scopes?: BreakGlassScope[];
  duration_minutes?: number;
}

export interface RejectBreakGlassInput {
  request_id: string;
  reason: string;
}

export interface RevokeBreakGlassInput {
  request_id: string;
  reason: string;
}

export interface ReviewBreakGlassInput {
  request_id: string;
  status: 'REVIEWED' | 'FLAGGED';
  notes: string;
}

export interface ProtectedReporterContact {
  incident_id: string;
  reporter: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
}
