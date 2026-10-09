import { api } from './api';
import type { NotificationItem, CampusNotice, HotlineItem } from '../types';

export const notificationService = {
  async getInbox(unreadOnly?: boolean): Promise<NotificationItem[]> {
    return api.get<NotificationItem[]>('/notifications', { unread: unreadOnly });
  },

  async markRead(notificationId: string): Promise<void> {
    return api.post(`/notifications/${notificationId}/read`);
  },

  async markAllRead(): Promise<void> {
    return api.post('/notifications/read-all');
  },

  async getActiveNotices(): Promise<CampusNotice[]> {
    return api.get<CampusNotice[]>('/notices/active');
  },

  async getHotlines(): Promise<HotlineItem[]> {
    return api.get<HotlineItem[]>('/hotlines');
  },

  // ── Admin Notice Gate ──
  async getPendingNotices(): Promise<CampusNotice[]> {
    return api.get<CampusNotice[]>('/admin/notices');
  },

  async approveNotice(noticeId: string): Promise<any> {
    return api.post(`/admin/notices/${noticeId}/approve`);
  },

  async rejectNotice(noticeId: string): Promise<any> {
    return api.post(`/admin/notices/${noticeId}/reject`);
  },
};
