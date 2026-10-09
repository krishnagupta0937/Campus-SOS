import { api } from './api';
import type { DutyState, DispatchOfferItem } from '../types';

export const responderService = {
  async getMyProfile(): Promise<any> {
    return api.get('/responder/me');
  },

  async updateDutyState(dutyState: DutyState): Promise<any> {
    return api.put('/responder/me/duty-state', { duty_state: dutyState });
  },

  async getOffers(): Promise<DispatchOfferItem[]> {
    return api.get<DispatchOfferItem[]>('/responder/offers');
  },

  async acceptOffer(assignmentId: string): Promise<any> {
    return api.post(`/responder/offers/${assignmentId}/accept`);
  },

  async rejectOffer(assignmentId: string, reason?: string): Promise<any> {
    return api.post(`/responder/offers/${assignmentId}/reject`, { reason });
  },

  async markEnRoute(assignmentId: string): Promise<any> {
    return api.post(`/responder/assignments/${assignmentId}/en-route`);
  },

  async markOnScene(assignmentId: string): Promise<any> {
    return api.post(`/responder/assignments/${assignmentId}/on-scene`);
  },

  async completeAssignment(assignmentId: string, resolutionSummary: string): Promise<any> {
    return api.post(`/responder/assignments/${assignmentId}/complete`, {
      resolution_summary: resolutionSummary,
    });
  },

  async getTeamMembers(): Promise<any[]> {
    return api.get<any[]>('/team/members');
  },
};
