import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import type { CampusNotice } from '../../types';
import { Bell, Check, X, AlertTriangle } from 'lucide-react';

export const BroadcastGate: React.FC = () => {
  const [notices, setNotices] = useState<CampusNotice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadNotices = async () => {
    setIsLoading(true);
    try {
      const data = await notificationService.getPendingNotices();
      setNotices(data || []);
    } catch {
      setNotices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const handleApprove = async (id: string) => {
    setActionId(id);
    try {
      await notificationService.approveNotice(id);
      await loadNotices();
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionId(id);
    try {
      await notificationService.rejectNotice(id);
      await loadNotices();
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="content-wrap" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={24} color="var(--brand)" />
          <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700 }}>Campus Broadcast Approval Gate</h1>
        </div>
        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
          Review proposed campus-wide safety alerts before publication. Sensitive disciplinary and harassment cases are strictly blocked.
        </p>
      </div>

      {/* Safety Policy Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: '14px 18px',
          fontSize: 'var(--text-body-sm)',
        }}
      >
        <AlertTriangle size={20} color="var(--warning)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Broadcast Policy:</strong> Only verified physical safety hazards (e.g. fire, road blockages, severe weather) may be broadcast. Confidential cases cannot be broadcast.
        </span>
      </div>

      {isLoading ? (
        <LoadingState message="Loading pending broadcast proposals..." />
      ) : notices.length === 0 ? (
        <EmptyState
          title="No pending broadcasts"
          description="There are currently no campus-wide notices awaiting administrative approval."
          icon={<Bell size={40} />}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {notices.map((n) => (
            <div
              key={n.id}
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-card)',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: '280px' }}>
                <strong style={{ fontSize: 'var(--text-h3)', display: 'block', marginBottom: '6px' }}>
                  {n.title}
                </strong>
                <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text)', lineHeight: '22px' }}>
                  {n.body}
                </p>
                {n.areaText && (
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Affected Campus Area: <strong>{n.areaText}</strong>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApprove(n.id)}
                  isLoading={actionId === n.id}
                  leftIcon={<Check size={16} />}
                >
                  Approve & Broadcast
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleReject(n.id)}
                  isLoading={actionId === n.id}
                  leftIcon={<X size={16} />}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
