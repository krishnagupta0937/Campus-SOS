import { api } from './api';
import type { UserProfile } from '../types';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/login', { email, password });
    if (res.access_token) {
      api.setToken(res.access_token);
      localStorage.setItem('campus_sos_refresh', res.refresh_token);
      localStorage.setItem('campus_sos_user', JSON.stringify(res.user));
    }
    return res;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignored if session already ended
    } finally {
      api.setToken(null);
      localStorage.removeItem('campus_sos_refresh');
      localStorage.removeItem('campus_sos_user');
    }
  },

  async getProfile(): Promise<UserProfile> {
    return api.get<UserProfile>('/auth/me');
  },

  async refreshToken(): Promise<string | null> {
    const refresh = localStorage.getItem('campus_sos_refresh');
    if (!refresh) return null;
    try {
      const res = await api.post<{ access_token: string }>('/auth/refresh', {
        refresh_token: refresh,
      });
      if (res.access_token) {
        api.setToken(res.access_token);
        return res.access_token;
      }
    } catch {
      this.logout();
    }
    return null;
  },
};
