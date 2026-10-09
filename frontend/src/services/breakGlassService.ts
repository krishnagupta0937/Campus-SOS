import { api } from './api';
import type {
  BreakGlassRequest,
  RequestBreakGlassInput,
  ApproveBreakGlassInput,
  RejectBreakGlassInput,
  RevokeBreakGlassInput,
  ReviewBreakGlassInput,
  ProtectedReporterContact,
} from '../types';

export const breakGlassService = {
  /**
   * Submit an emergency break-glass request (NORMAL_OVERRIDE or CRITICAL_BREAK_GLASS).
   * Authorized for personnel roles only (Security, Medical, Fire, Admin, Proctor, etc.).
   */
  async requestEmergencyAccess(input: RequestBreakGlassInput): Promise<BreakGlassRequest> {
    return api.post<BreakGlassRequest>('/access-policy/break-glass/request', input);
  },

  /**
   * Authorized approver (Campus Admin, Chief Proctor, or Team Coordinator) grants emergency access.
   */
  async approveEmergencyAccess(input: ApproveBreakGlassInput): Promise<BreakGlassRequest> {
    return api.post<BreakGlassRequest>('/access-policy/break-glass/approve', input);
  },

  /**
   * Authorized approver rejects emergency access request.
   */
  async rejectEmergencyAccess(input: RejectBreakGlassInput): Promise<BreakGlassRequest> {
    return api.post<BreakGlassRequest>('/access-policy/break-glass/reject', input);
  },

  /**
   * Revoke active emergency access. Can be invoked by supervisor or requester themselves.
   */
  async revokeEmergencyAccess(input: RevokeBreakGlassInput): Promise<BreakGlassRequest> {
    return api.post<BreakGlassRequest>('/access-policy/break-glass/revoke', input);
  },

  /**
   * Campus Admin or Chief Proctor performs mandatory review on critical break-glass actions.
   */
  async reviewEmergencyAccess(input: ReviewBreakGlassInput): Promise<BreakGlassRequest> {
    return api.post<BreakGlassRequest>('/access-policy/break-glass/review', input);
  },

  /**
   * Check active break-glass grant status for current user on a specific incident.
   * Returns null if no grant exists or if never requested.
   */
  async getEmergencyAccessStatus(incidentId: string): Promise<BreakGlassRequest | null> {
    return api.get<BreakGlassRequest | null>('/access-policy/break-glass/status', {
      incident_id: incidentId,
    });
  },

  /**
   * List emergency access requests (filtered by incident and/or status).
   * Supervisors see all requests; non-supervisors see their own.
   */
  async listEmergencyAccessRequests(
    incidentId?: string,
    status?: string
  ): Promise<BreakGlassRequest[]> {
    return api.get<BreakGlassRequest[]>('/access-policy/break-glass/requests', {
      incident_id: incidentId,
      status,
    });
  },

  /**
   * Retrieve reporter contact under explicit REPORTER_CONTACT_VIEW scope.
   * Only requested when user explicitly has permission and activates the view.
   */
  async getReporterContact(incidentId: string): Promise<ProtectedReporterContact> {
    return api.get<ProtectedReporterContact>(`/access-policy/incidents/${incidentId}/reporter-contact`);
  },

  /**
   * Campus Admin maintenance sweep for expired grants.
   */
  async cleanupExpiredGrants(): Promise<{ expired_count: number }> {
    return api.post<{ expired_count: number }>('/access-policy/break-glass/cleanup');
  },
};
