import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import type { NotificationItem } from '../../types';
import { Bell, CheckCheck, Clock } from 'lucide-react';

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getInbox();
      setNotifications(data || []);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {}
  };

  return (
    <div className="content-wrap" style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700 }}>Notifications & Alerts</h1>
          <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
            Official notices, report status updates, and emergency bulletins.
          </p>
        </div>
        {notifications.length > 0 && (
          <Button variant="quiet" size="sm" onClick={handleMarkAllRead} leftIcon={<CheckCheck size={16} />}>
            Mark All Read
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingState message="Loading notification inbox..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="Your safety notification inbox is currently clear."
          icon={<Bell size={36} />}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && handleMarkRead(n.id)}
              style={{
                backgroundColor: n.isRead ? 'var(--surface)' : 'var(--brand-soft)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-card)',
                padding: '16px',
                cursor: n.isRead ? 'default' : 'pointer',
                display: 'flex',
                gap: '12px',
                transition: 'background-color var(--transition-fast)',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: n.isRead ? 'var(--surface-2)' : 'var(--brand)',
                  color: n.isRead ? 'var(--text-muted)' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Bell size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: 'var(--text-body)', color: 'var(--text)' }}>
                    {n.title}
                  </strong>
                  {!n.isRead && (
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--brand)',
                      }}
                    />
                  )}
                </div>
                <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)' }}>
                  {n.body}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <Clock size={12} />
                  <span>{new Date(n.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
