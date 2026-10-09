import { api } from './api';

export interface ExploreIncidentItem {
  id: string;
  public_id: string;
  status: string;
  category: string;
  description_summary: string;
  location_summary: string;
  reported_at: string;
  pin?: { x: number; y: number };
}

export const exploreService = {
  async getIncidents(filters?: { status?: string; limit?: number; cursor?: string }): Promise<ExploreIncidentItem[]> {
    return api.get<ExploreIncidentItem[]>('/explore/incidents', filters);
  },

  async getMapPins(): Promise<Array<{ incident_id: string; status: string; pin: { x: number; y: number }; category: string }>> {
    return api.get('/explore/map-pins');
  },

  async getActivity(): Promise<any[]> {
    return api.get<any[]>('/explore/activity');
  },
};
