import { BreakGlassScope, BreakGlassStatus, BreakGlassType, SupervisorReviewStatus } from '@prisma/client';

export interface RequestBreakGlassDto {
  incident_id: string;
  type?: BreakGlassType;
  requested_scopes: BreakGlassScope[];
  reason: string;
}

export interface ApproveBreakGlassDto {
  request_id: string;
  approved_scopes?: BreakGlassScope[];
  duration_minutes?: number;
}

export interface RejectBreakGlassDto {
  request_id: string;
  reason: string;
}

export interface RevokeBreakGlassDto {
  request_id: string;
  reason: string;
}

export interface ReviewBreakGlassDto {
  request_id: string;
  status: 'REVIEWED' | 'FLAGGED';
  notes: string;
}

export interface BreakGlassResponseDto {
  id: string;
  incident_id: string;
  requester: {
    id: string;
    full_name?: string;
    role?: string;
  };
  type: BreakGlassType;
  status: BreakGlassStatus;
  requested_scopes: BreakGlassScope[];
  approved_scopes: BreakGlassScope[];
  reason: string;
  requested_at: string;
  approver?: {
    id: string;
    full_name?: string;
    role?: string;
  } | null;
  approved_at?: string | null;
  activated_at?: string | null;
  expires_at?: string | null;
  revoker?: {
    id: string;
    full_name?: string;
  } | null;
  revoked_at?: string | null;
  revocation_reason?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  supervisor_review_status: SupervisorReviewStatus;
  reviewed_at?: string | null;
  reviewer?: {
    id: string;
    full_name?: string;
  } | null;
  review_notes?: string | null;
}
