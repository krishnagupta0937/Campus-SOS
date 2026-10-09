import { api } from './api';
import type {
  SosDraftResponse,
  SosPreviewResponse,
  SosLiveStatusResponse,
} from '../types';

export interface CreateSosDraftInput {
  description: string;
  location?: {
    predefined_location_id?: string;
    kind?: string;
    text?: string;
  };
  pin?: { x: number; y: number };
  attachment_ids?: string[];
}

export const sosService = {
  /**
   * Staging draft only. DOES NOT CREATE EMERGENCY OR ALERT TEAMS.
   */
  async createDraft(input: CreateSosDraftInput): Promise<SosDraftResponse> {
    return api.post<SosDraftResponse>('/sos/drafts', input);
  },

  /**
   * Update draft payload while user is filling the steps.
   */
  async updateDraft(draftId: string, input: Partial<CreateSosDraftInput>): Promise<{ updated: boolean }> {
    return api.patch<{ updated: boolean }>(`/sos/drafts/${draftId}`, input);
  },

  /**
   * Preview AI classification and routing without alerting teams.
   */
  async previewDraft(draftId: string): Promise<SosPreviewResponse> {
    return api.post<SosPreviewResponse>(`/sos/drafts/${draftId}/preview`);
  },

  /**
   * EXPLICIT CONFIRMATION GATE ONLY.
   * Dispatches emergency creation with strict Idempotency-Key.
   */
  async confirmDraft(
    draftId: string,
    idempotencyKey: string = crypto.randomUUID()
  ): Promise<{
    incident: {
      id: string;
      public_id: string;
      status: string;
      workflow: string;
    };
    live_channel: string;
    idempotency_replay?: boolean;
  }> {
    return api.post(
      `/sos/drafts/${draftId}/confirm`,
      {},
      idempotencyKey
    );
  },

  /**
   * Delete discarded draft.
   */
  async deleteDraft(draftId: string): Promise<{ deleted: boolean }> {
    return api.delete<{ deleted: boolean }>(`/sos/drafts/${draftId}`);
  },

  /**
   * Fetch live 6-step progress for the active SOS emergency.
   */
  async getLiveStatus(incidentId: string): Promise<SosLiveStatusResponse> {
    return api.get<SosLiveStatusResponse>(`/sos/${incidentId}/live`);
  },
};
