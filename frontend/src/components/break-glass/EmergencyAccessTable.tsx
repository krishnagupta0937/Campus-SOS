import React, { useState, useEffect } from 'react';
import { breakGlassService } from '../../services/breakGlassService';
import { Button } from '../common/Button';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { SupervisorReviewModal } from './SupervisorReviewModal';
import type { BreakGlassRequest, UserProfile } from '../../types';
import { ShieldAlert, AlertTriangle, Clock, RefreshCw, CheckCircle2, ShieldCheck, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmergencyAccessTableProps {
  currentUser: UserProfile | null;
}

export const EmergencyAccessTable: React.FC<EmergencyAccessTableProps> = ({ currentUser }) => {
  const [requests, setRequests] = useState<BreakGlassRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedReviewRequest, setSelectedReviewRequest] = useState<BreakGlassRequest | null>(null);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await breakGlassService.listEmergencyAccessRequests(
        undefined,
        statusFilter || undefined
      );
      setRequests(data || []);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const isSupervisor =
    currentUser?.role === 'CAMPUS_ADMIN' || currentUser?.role === 'CHIEF_PROCTOR';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Controls & Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={20} color="var(--brand)" />
          <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, margin: 0 }}>
            Emergency Access Oversight
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '160px' }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="REVOKED">REVOKED</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadRequests}
            leftIcon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <LoadingState message="Loading emergency access telemetry..." />
        ) : requests.length === 0 ? (
          <EmptyState
            title="No emergency access grants recorded"
            description="All case accesses are currently restricted to designated primary response rosters."
            icon={<ShieldAlert size={40} />}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: 'var(--text-body-sm)',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Requester</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Incident</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Scopes</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Reason</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Expires / State</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const isCritical = req.type === 'CRITICAL_BREAK_GLASS';
                  const needsReview = req.supervisor_review_status === 'REVIEW_REQUIRED';

                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      {/* Requester */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{req.requester.full_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {req.requester.role}
                        </div>
                      </td>

                      {/* Incident Link */}
                      <td style={{ padding: '14px 16px' }}>
                        <Link
                          to={`/admin/incidents/${req.incident_id}`}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 'var(--text-caption)',
                            color: 'var(--brand)',
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          {req.incident_id.slice(0, 8)}...
                        </Link>
                      </td>

                      {/* Type */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: isCritical ? 'var(--emergency-soft)' : 'var(--brand-soft)',
                            color: isCritical ? 'var(--emergency)' : 'var(--brand)',
                            border: `1px solid ${isCritical ? 'var(--emergency-border)' : 'var(--border)'}`,
                          }}
                        >
                          {isCritical ? 'CRITICAL' : 'NORMAL'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor:
                              req.status === 'ACTIVE'
                                ? 'var(--brand)'
                                : req.status === 'REQUESTED'
                                ? 'var(--warning, #d97706)'
                                : 'var(--surface-3)',
                            color:
                              req.status === 'ACTIVE' || req.status === 'REQUESTED'
                                ? '#ffffff'
                                : 'var(--text-muted)',
                          }}
                        >
                          {req.status}
                        </span>
                      </td>

                      {/* Scopes */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {(req.approved_scopes.length > 0 ? req.approved_scopes : req.requested_scopes).map(
                            (s) => (
                              <span
                                key={s}
                                style={{
                                  fontSize: '10px',
                                  fontFamily: 'var(--font-mono)',
                                  backgroundColor: 'var(--surface-2)',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  border: '1px solid var(--border)',
                                }}
                              >
                                {s}
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      {/* Reason */}
                      <td
                        style={{
                          padding: '14px 16px',
                          maxWidth: '220px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 'var(--text-caption)',
                        }}
                        title={req.reason}
                      >
                        {req.reason}
                      </td>

                      {/* Expiry / Review Status */}
                      <td style={{ padding: '14px 16px', fontSize: 'var(--text-caption)' }}>
                        {req.status === 'ACTIVE' && req.expires_at ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text)' }}>
                            <Clock size={12} />
                            <span>{new Date(req.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>
                            {new Date(req.requested_at).toLocaleDateString()}
                          </span>
                        )}

                        {needsReview && (
                          <div style={{ color: 'var(--emergency)', fontWeight: 700, fontSize: '10px', marginTop: '2px' }}>
                            REVIEW REQUIRED
                          </div>
                        )}
                        {req.supervisor_review_status === 'REVIEWED' && (
                          <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '10px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <ShieldCheck size={10} /> REVIEWED
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 16px' }}>
                        {needsReview && isSupervisor ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedReviewRequest(req)}
                          >
                            Audit
                          </Button>
                        ) : (
                          <Link
                            to={`/admin/incidents/${req.incident_id}`}
                            style={{
                              fontSize: 'var(--text-caption)',
                              color: 'var(--brand)',
                              textDecoration: 'none',
                              fontWeight: 600,
                            }}
                          >
                            View Case
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supervisor Review Modal */}
      {selectedReviewRequest && (
        <SupervisorReviewModal
          request={selectedReviewRequest}
          isOpen={!!selectedReviewRequest}
          onClose={() => setSelectedReviewRequest(null)}
          onSuccess={() => {
            setSelectedReviewRequest(null);
            loadRequests();
          }}
        />
      )}
    </div>
  );
};
