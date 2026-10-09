import { api } from './api';
import type { CampusMapModel, PredefinedLocation } from '../types';

export const mapService = {
  async getActiveMap(): Promise<CampusMapModel | null> {
    try {
      return await api.get<CampusMapModel>('/map');
    } catch {
      return null;
    }
  },

  async getPredefinedLocations(mapId?: string): Promise<PredefinedLocation[]> {
    return api.get<PredefinedLocation[]>('/locations', { map_id: mapId });
  },

  async uploadMap(data: {
    name: string;
    storage_key: string;
    width_px: number;
    height_px: number;
  }): Promise<CampusMapModel> {
    return api.post<CampusMapModel>('/admin/map', data);
  },

  async createLocation(data: {
    map_id: string;
    kind: string;
    name: string;
    anchor_x?: number;
    anchor_y?: number;
  }): Promise<PredefinedLocation> {
    return api.post<PredefinedLocation>('/admin/locations', data);
  },

  async updateLocation(
    id: string,
    data: {
      name?: string;
      kind?: string;
      anchor_x?: number;
      anchor_y?: number;
      is_active?: boolean;
    }
  ): Promise<PredefinedLocation> {
    return api.patch<PredefinedLocation>(`/admin/locations/${id}`, data);
  },

  async deleteLocation(id: string): Promise<void> {
    return api.delete(`/admin/locations/${id}`);
  },
};
