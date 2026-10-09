import { api } from './api';
import type {
  MyReportItem,
  IncidentDetailModel,
} from '../types';

export interface CreateStandardReportInput {
  description: string;
  category: string;
  location: {
    predefined_location_id?: string;
    kind: string;
    text?: string;
  };
  pin: { x: number; y: number };
  attachment_ids?: string[];
}

export const incidentService = {
  /**
   * Submit standard incident report with mandatory map pin and idempotency.
   */
  async createStandardReport(
    input: CreateStandardReportInput,
    idempotencyKey: string = crypto.randomUUID()
  ): Promise<{
    incident: {
      id: string;
      public_id: string;
      status: string;
      workflow: string;
    };
  }> {
    return api.post('/incidents', input, idempotencyKey);
  },

  /**
   * Fetch reporter's own submissions.
   */
  async getMyReports(tab: 'reports' | 'sos' = 'reports'): Promise<MyReportItem[]> {
    return api.get<MyReportItem[]>('/me/reports', { tab });
  },

  /**
   * Fetch reporter's incident case detail.
   */
  async getMyIncidentDetail(incidentId: string): Promise<IncidentDetailModel> {
    return api.get<IncidentDetailModel>(`/me/incidents/${incidentId}`);
  },

  /**
   * Append follow-up note to own incident.
   */
  async addFollowUpNote(incidentId: string, note: string): Promise<{ added: boolean }> {
    return api.post(`/me/incidents/${incidentId}/notes`, { note });
  },

  // ── Team Workspace Endpoints ──
  async getTeamIncidents(filters?: {
    status?: string;
    workflow?: string;
    category?: string;
    assigned_to_me?: boolean;
  }): Promise<any[]> {
    return api.get<any[]>('/team/incidents', filters);
  },

  async getTeamIncidentDetail(incidentId: string): Promise<any> {
    return api.get<any>(`/team/incidents/${incidentId}`);
  },

  async transitionTeamStatus(
    incidentId: string,
    toStatus: string,
    note?: string
  ): Promise<any> {
    return api.post(`/team/incidents/${incidentId}/status`, {
      to_status: toStatus,
      note,
    });
  },

  async addTeamNote(incidentId: string, note: string): Promise<{ added: boolean }> {
    return api.post(`/team/incidents/${incidentId}/notes`, { note });
  },

  async escalateIncident(incidentId: string): Promise<{ escalated: boolean }> {
    return api.post(`/team/incidents/${incidentId}/escalate`);
  },
};
