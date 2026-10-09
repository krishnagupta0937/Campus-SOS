import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { incidentService } from '../../services/incidentService';
import { StatusChip } from '../../components/common/StatusChip';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { Link } from 'react-router-dom';
import type { UserRole } from '../../types';
import {
  Lock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface RoleWorkspaceProps {
  forcedRole?: UserRole;
  title: string;
  subtitle: string;
  allowedWorkflows?: string[];
  isRestrictedQueue?: boolean;
}

const ROLE_ACTION_PRESETS: Record<string, string[]> = {
  CHIEF_PROCTOR: [
    'Student statement recorded; scheduled proctorial board inquiry',
    'Dispute mediated amicably; behavioral undertaking logged',
    'Disciplinary warning issued; parent/guardian notified',
  ],
  SECURITY: [
    'Patrol unit dispatched and perimeter secured',
    'Unauthorized individual escorted off premises; logs filed',
    'CCTV footage archived; scene verified clear',
  ],
  MEDICAL: [
    'First-aid triage administered on site; vitals stabilized',
    'Patient safely transferred to Campus Health Clinic',
    'Emergency ambulance dispatched; referred to external hospital',
  ],
  FIRE_SAFETY: [
    'Hazard isolated; dry chemical fire suppression deployed',
    'Alarm verified; ventilation cleared and inspected',
    'Evacuation orderly; all-clear certified by safety officer',
  ],
  WOMEN_SAFETY: [
    'Confidential support protocol initiated; ICC counselor assigned',
    'Protection order communicated to campus security liaison',
    'Confidential statement secured; monitoring active',
  ],
  MEN_SAFETY: [
    'Student welfare check completed; harassment grievance logged',
    'Advisory communicated; mediation session scheduled',
    'Confidential review completed with proctorial liaison',
  ],
  STUDENT_COUNCIL: [
    'Student grievance logged; referred to hostel committee',
    'Council mediation session concluded; resolution accepted',
    'Campus facility repair complaint forwarded to administration',
  ],
  INFRASTRUCTURE: [
    'Maintenance crew dispatched; electrical/water line isolated',
    'Hazard cordoned; replacement hardware deployed',
    'Repair completed; operational inspection passed',
  ],
  TRANSPORTATION: [
    'Transit pathway cleared; traffic flow restored',
    'Obstruction vehicle removed from emergency egress lane',
    'Campus shuttle temporary detour verified and communicated',
  ],
  IT_DIGITAL: [
    'Compromised credential revoked; security reset enforced',
    'Malicious IP/source blocked on border gateway firewall',
    'Digital incident log preserved and exported for audit',
  ],
};

export const RoleWorkspace: React.FC<RoleWorkspaceProps> = ({
  forcedRole,
  title,
  subtitle,
  isRestrictedQueue = false,
}) => {
  const { user } = useAuth();
  const activeRole = forcedRole || user?.role;
  const presets = activeRole ? ROLE_ACTION_PRESETS[activeRole] || [] : [];
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [isActing, setIsActing] = useState(false);

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const data = await incidentService.getTeamIncidents();
      setIncidents(data || []);
    } catch {
      setIncidents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleResolve = async (incidentId: string) => {
    setIsActing(true);
    try {
      await incidentService.transitionTeamStatus(incidentId, 'RESOLVED', actionNote || undefined);
      await loadIncidents();
      setSelectedIncident(null);
      setActionNote('');
    } catch {} finally {
      setIsActing(false);
    }
  };

  const handleEscalate = async (incidentId: string) => {
    setIsActing(true);
    try {
      await incidentService.escalateIncident(incidentId);
      await loadIncidents();
      setSelectedIncident(null);
    } catch {} finally {
      setIsActing(false);
    }
  };

  return (
    <div className="content-wrap" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700 }}>{title}</h1>
            {isRestrictedQueue && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: 'var(--emergency-soft)',
                  color: 'var(--emergency)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Lock size={12} /> RESTRICTED CASELOAD
              </span>
            )}
          </div>
          <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
            {subtitle}
          </p>
        </div>

        <Link
          to="/responder"
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-control)',
            fontSize: 'var(--text-body-sm)',
            fontWeight: 600,
            color: 'var(--text)',
            textDecoration: 'none',
          }}
        >
          My Duty State
        </Link>
      </div>

      {/* Caseload Queue Table */}
      <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700 }}>
            Routed Incident Queue ({incidents.length})
          </h2>
        </div>

        {isLoading ? (
          <LoadingState message="Loading role-specific incident caseload..." />
        ) : incidents.length === 0 ? (
          <EmptyState
            title="Caseload is currently clear"
            description="No active incidents have been routed to this operational team at this time."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-body-sm)' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Reference</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Summary</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Received</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr key={inc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand)' }}>
                      {inc.publicId || inc.public_id}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                      {inc.finalCategory || inc.category}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {inc.description}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusChip status={inc.status} size="sm" />
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>
                      {new Date(inc.createdAt || inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedIncident(inc)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-control)',
                          fontSize: 'var(--text-caption)',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Inspect & Act
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Case Action Drawer / Modal */}
      {selectedIncident && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border)',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand)', fontSize: 'var(--text-caption)' }}>
                  {selectedIncident.publicId || selectedIncident.public_id}
                </span>
                <h3 style={{ fontSize: 'var(--text-h3)', fontWeight: 700 }}>
                  {selectedIncident.finalCategory || selectedIncident.category}
                </h3>
              </div>
              <StatusChip status={selectedIncident.status} />
            </div>

            <div style={{ backgroundColor: 'var(--surface-2)', padding: '14px', borderRadius: 'var(--radius-control)', fontSize: 'var(--text-body-sm)' }}>
              <strong>Description:</strong>
              <p style={{ marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                {selectedIncident.description}
              </p>
            </div>

            <div>
              <label htmlFor="action-note" style={{ display: 'block', fontSize: 'var(--text-body-sm)', fontWeight: 600, marginBottom: '6px' }}>
                Operational Action Note:
              </label>

              {presets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Standard SOP Quick Notes:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {presets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActionNote(preset)}
                        style={{
                          textAlign: 'left',
                          fontSize: '11px',
                          padding: '4px 8px',
                          backgroundColor: actionNote === preset ? 'var(--brand-soft)' : 'var(--surface-2)',
                          color: actionNote === preset ? 'var(--brand)' : 'var(--text)',
                          border: `1px solid ${actionNote === preset ? 'var(--brand)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-control)',
                          cursor: 'pointer',
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                id="action-note"
                rows={2}
                placeholder="Log internal action taken, team updates, or resolution findings..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Link
                to={`/admin/incidents/${selectedIncident.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-control)',
                  fontSize: 'var(--text-body-sm)',
                  fontWeight: 600,
                  color: 'var(--text)',
                  textDecoration: 'none',
                }}
              >
                Open Full Dossier
              </Link>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleEscalate(selectedIncident.id)}
                isLoading={isActing}
                leftIcon={<AlertTriangle size={14} />}
              >
                Escalate
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleResolve(selectedIncident.id)}
                isLoading={isActing}
                leftIcon={<CheckCircle size={14} />}
              >
                Mark Resolved
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedIncident(null)}
                disabled={isActing}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
