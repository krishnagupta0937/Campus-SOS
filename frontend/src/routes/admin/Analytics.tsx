import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import type { AnalyticsOverview } from '../../types';
import { BarChart3, Clock, Layers, Activity } from 'lucide-react';

export const Analytics: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminService
      .getOverview()
      .then((data) => setOverview(data))
      .catch(() => setOverview(null))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <LoadingState message="Aggregating response milestones and SLA analytics..." />;
  }

  if (!overview) {
    return (
      <div className="content-wrap" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <EmptyState title="Analytics telemetry unavailable" description="Ensure backend analytics service is running." />
      </div>
    );
  }

  return (
    <div className="content-wrap" style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={24} color="var(--brand)" />
          <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700 }}>Response Time Analytics & SLAs</h1>
        </div>
        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
          Real operational time-to-dispatch metrics computed from authoritative timestamp milestones.
        </p>
      </div>

      {/* SLA Milestones Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 600 }}>
            T1: CREATED → NOTIFIED
          </span>
          <div style={{ fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--brand)', marginTop: '6px' }}>
            &lt; 30 sec target
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Automated deterministic routing</span>
        </div>

        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 600 }}>
            T2: DISPATCH OFFER ACCEPTANCE
          </span>
          <div style={{ fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--brand)', marginTop: '6px' }}>
            45 sec SLA
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Auto-escalates on expiration</span>
        </div>

        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 600 }}>
            T3: TIME TO AT-LOCATION
          </span>
          <div style={{ fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--brand)', marginTop: '6px' }}>
            {overview.avg_response_time_seconds > 0
              ? `${Math.round(overview.avg_response_time_seconds / 60)} min`
              : '—'}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Average physical arrival</span>
        </div>

        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 600 }}>
            TOTAL RESOLUTION RATE
          </span>
          <div style={{ fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--success)', marginTop: '6px' }}>
            {overview.total_incidents > 0
              ? `${Math.round((overview.resolved_incidents / overview.total_incidents) * 100)}%`
              : '—'}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {overview.resolved_incidents} of {overview.total_incidents} cases resolved
          </span>
        </div>
      </div>

      {/* Incidents by Domain / Category Breakdown */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, marginBottom: '16px' }}>
          Incidents by Safety Domain & Category
        </h2>

        {!overview.categories || Object.keys(overview.categories).length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-body-sm)' }}>
            No categorical incident history recorded.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(overview.categories).map(([category, count]) => {
              const percentage = overview.total_incidents > 0 ? (count / overview.total_incidents) * 100 : 0;
              return (
                <div key={category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-body-sm)' }}>
                    <strong>{category}</strong>
                    <span>{count} incidents ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      backgroundColor: 'var(--surface-2)',
                      borderRadius: 'var(--radius-pill)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${percentage}%`,
                        backgroundColor: 'var(--brand)',
                        borderRadius: 'var(--radius-pill)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
