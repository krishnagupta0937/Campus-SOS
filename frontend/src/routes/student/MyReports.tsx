import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { incidentService } from '../../services/incidentService';
import { StatusChip } from '../../components/common/StatusChip';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import type { MyReportItem } from '../../types';
import { FileText, AlertCircle, ChevronRight, Clock } from 'lucide-react';

export const MyReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reports' | 'sos'>('reports');
  const [items, setItems] = useState<MyReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    incidentService
      .getMyReports(activeTab)
      .then((data) => {
        setItems(data || []);
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [activeTab]);

  return (
    <div className="content-wrap" style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700 }}>My Submissions</h1>
        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
          Track status and updates for your submitted incidents and SOS calls.
        </p>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          gap: '16px',
        }}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'reports'}
          type="button"
          onClick={() => setActiveTab('reports')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 4px',
            fontSize: 'var(--text-body)',
            fontWeight: activeTab === 'reports' ? 700 : 500,
            color: activeTab === 'reports' ? 'var(--brand)' : 'var(--text-muted)',
            borderBottom: activeTab === 'reports' ? '2px solid var(--brand)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileText size={18} />
          <span>Incident Reports</span>
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'sos'}
          type="button"
          onClick={() => setActiveTab('sos')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 4px',
            fontSize: 'var(--text-body)',
            fontWeight: activeTab === 'sos' ? 700 : 500,
            color: activeTab === 'sos' ? 'var(--emergency)' : 'var(--text-muted)',
            borderBottom: activeTab === 'sos' ? '2px solid var(--emergency)' : '2px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={18} />
          <span>Emergency SOS</span>
        </button>
      </div>

      {/* List content */}
      {isLoading ? (
        <LoadingState message="Loading your submissions..." />
      ) : items.length === 0 ? (
        <EmptyState
          title={activeTab === 'reports' ? 'No incident reports submitted' : 'No Emergency SOS records'}
          description={
            activeTab === 'reports'
              ? "You haven't submitted any non-emergency campus reports yet."
              : 'You have not initiated any Emergency SOS alerts.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map((item) => {
            const isSos = item.workflow === 'EMERGENCY_SOS';
            const detailUrl = isSos && item.status !== 'RESOLVED' && item.status !== 'CLOSED'
              ? `/student/sos/${item.id}/live`
              : `/student/reports/${item.id}`;

            return (
              <Link
                key={item.id}
                to={detailUrl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  backgroundColor: 'var(--surface)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--border)',
                  textDecoration: 'none',
                  color: 'var(--text)',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'border-color var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-body-sm)', color: isSos ? 'var(--emergency)' : 'var(--brand)' }}>
                      {item.publicId}
                    </span>
                    <StatusChip status={item.status} size="sm" />
                  </div>
                  <div style={{ fontSize: 'var(--text-body)', fontWeight: 600 }}>
                    {item.finalCategory || (isSos ? 'Emergency SOS' : 'Incident Report')}
                  </div>
                  <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '440px' }}>
                    {item.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                    <Clock size={12} />
                    <span>{new Date(item.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                </div>

                <ChevronRight size={20} color="var(--text-muted)" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
