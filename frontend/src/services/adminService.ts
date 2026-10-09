import { api } from './api';
import type {
  AdminIncidentItem,
  AnalyticsOverview,
  AuditLogItem,
  PersonnelDirectoryItem,
} from '../types';

export const adminService = {
  async getOverview(): Promise<AnalyticsOverview> {
    return api.get<AnalyticsOverview>('/admin/analytics/overview');
  },

  async getIncidents(filters?: {
    status?: string;
    workflow?: string;
    category?: string;
    team?: string;
    q?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ incidents: AdminIncidentItem[]; next_cursor?: string }> {
    return api.get<{ incidents: AdminIncidentItem[]; next_cursor?: string }>('/admin/incidents', filters);
  },

  async getIncidentDetail(id: string): Promise<any> {
    return api.get<any>(`/admin/incidents/${id}`);
  },

  async changeIncidentStatus(id: string, toStatus: string, note?: string): Promise<any> {
    return api.post(`/admin/incidents/${id}/status`, { to_status: toStatus, note });
  },

  async assignIncident(id: string, teamId: string, memberId?: string): Promise<any> {
    return api.post(`/admin/incidents/${id}/assign`, {
      team_id: teamId,
      member_id: memberId,
    });
  },

  async reclassifyIncident(id: string, category: string): Promise<any> {
    return api.post(`/admin/incidents/${id}/reclassify`, { category });
  },

  async getAuditTrail(filters?: {
    incident_id?: string;
    event_type?: string;
    actor?: string;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<AuditLogItem[]> {
    return api.get<AuditLogItem[]>('/admin/audit', filters);
  },

  async verifyAuditChain(): Promise<{ valid: boolean; total_events: number; failure_index?: number }> {
    return api.get('/admin/audit/verify');
  },

  async getDirectory(filters?: {
    team?: string;
    role?: string;
    availability?: string;
    q?: string;
  }): Promise<PersonnelDirectoryItem[]> {
    return api.get<PersonnelDirectoryItem[]>('/directory', filters);
  },

  async getTeams(): Promise<any[]> {
    return api.get<any[]>('/admin/teams');
  },

  async getSettings(): Promise<any[]> {
    return api.get<any[]>('/admin/settings');
  },

  async updateSetting(key: string, value: any): Promise<any> {
    return api.patch(`/admin/settings/${key}`, { value });
  },

  async getRoutingRules(): Promise<any[]> {
    return api.get<any[]>('/admin/routing-rules');
  },

  async updateRoutingRule(id: string, data: any): Promise<any> {
    return api.patch(`/admin/routing-rules/${id}`, data);
  },
};
