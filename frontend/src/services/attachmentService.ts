import { api } from './api';

export interface PresignedUploadResponse {
  attachment_id: string;
  upload_url: string;
  expires_at: string;
}

export const attachmentService = {
  /**
   * Request presigned upload for up to 2 photos.
   */
  async requestUpload(data: {
    mime_type: string;
    size_bytes: number;
    position: number;
    incident_id?: string;
    draft_id?: string;
  }): Promise<PresignedUploadResponse> {
    return api.post<PresignedUploadResponse>('/attachments/uploads', data);
  },

  /**
   * Directly upload file binary to the presigned S3/storage URL.
   */
  async uploadBinary(uploadUrl: string, file: File): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });
    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`);
    }
  },

  /**
   * Notify backend to verify upload, scrub metadata, and finalize.
   */
  async completeUpload(attachmentId: string): Promise<any> {
    return api.post(`/attachments/${attachmentId}/complete`);
  },

  /**
   * Get short-lived signed URL for viewing. Audited on server.
   */
  async getSignedUrl(attachmentId: string): Promise<{ download_url: string; expires_in_seconds: number }> {
    return api.get(`/attachments/${attachmentId}/url`);
  },
};
