import React, { useState } from 'react';
import { breakGlassService } from '../../services/breakGlassService';
import { Button } from '../common/Button';
import type {
  BreakGlassRequest,
  BreakGlassScope,
  BreakGlassType,
} from '../../types';
import { ShieldAlert, AlertTriangle, X, CheckSquare, Square, Info } from 'lucide-react';

interface BreakGlassModalProps {
  incidentId: string;
  incidentPublicId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (request: BreakGlassRequest) => void;
}

const AVAILABLE_SCOPES: Array<{ id: BreakGlassScope; label: string; description: string }> = [
  {
    id: 'INCIDENT_VIEW',
    label: 'Incident Dossier',
    description: 'View full confidential incident narrative and status timeline',
  },
  {
    id: 'LOCATION_VIEW',
    label: 'Location & Map Pin',
    description: 'View restricted physical coordinates, floor maps, and precision pin',
  },
  {
    id: 'EVIDENCE_VIEW',
    label: 'Protected Evidence',
    description: 'Access signed URLs for photos and attached evidence files',
  },
  {
    id: 'REPORTER_CONTACT_VIEW',
    label: 'Reporter Contact',
    description: 'Access student/reporter identity, email, and phone (strictly audited)',
  },
  {
    id: 'REALTIME_ACCESS',
    label: 'Live Realtime Telemetry',
    description: 'Subscribe to WebSocket live updates and telemetry for this incident',
  },
  {
    id: 'INCIDENT_UPDATE',
    label: 'Incident Update',
    description: 'Transition status, add operational field notes, or reassign units',
  },
  {
    id: 'TEMPORARY_TEAM_ASSIGNMENT',
    label: 'Temporary Team Assignment',
    description: 'Operate temporarily under the incident response roster',
  },
];

export const BreakGlassModal: React.FC<BreakGlassModalProps> = ({
  incidentId,
  incidentPublicId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<BreakGlassType>('NORMAL_OVERRIDE');
  const [selectedScopes, setSelectedScopes] = useState<BreakGlassScope[]>(['INCIDENT_VIEW']);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleScope = (scope: BreakGlassScope) => {
    if (selectedScopes.includes(scope)) {
      if (selectedScopes.length === 1) {
        setErrorMessage('At least one access scope must be requested.');
        return;
      }
      setSelectedScopes(selectedScopes.filter((s) => s !== scope));
    } else {
      setSelectedScopes([...selectedScopes, scope]);
    }
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMessage('Substantive operational reason required (minimum 5 characters).');
      return;
    }
    if (selectedScopes.length === 0) {
      setErrorMessage('Select at least one emergency access scope.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await breakGlassService.requestEmergencyAccess({
        incident_id: incidentId,
        type: mode,
        requested_scopes: selectedScopes,
        reason: reason.trim(),
      });
      onSuccess(result);
      onClose();
    } catch (err: any) {
      const msg =
        err?.details?.message ||
        err?.message ||
        'Unable to process emergency access request. Please verify permissions.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCritical = mode === 'CRITICAL_BREAK_GLASS';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="break-glass-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          border: isCritical ? '2px solid var(--emergency)' : '1px solid var(--border)',
          width: '100%',
          maxWidth: '560px',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: isCritical ? 'var(--emergency-soft)' : 'var(--surface-2)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isCritical ? (
              <AlertTriangle size={24} color="var(--emergency)" />
            ) : (
              <ShieldAlert size={24} color="var(--brand)" />
            )}
            <div>
              <h2
                id="break-glass-title"
                style={{
                  fontSize: 'var(--text-h3)',
                  fontWeight: 700,
                  color: isCritical ? 'var(--emergency)' : 'var(--text)',
                }}
              >
                {isCritical ? 'CRITICAL EMERGENCY BREAK-GLASS' : 'Emergency Access Request'}
              </h2>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                Target: <strong>{incidentPublicId || incidentId.slice(0, 8)}</strong>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Mode Selector */}
          <div>
            <label style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Access Workflow Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setMode('NORMAL_OVERRIDE')}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-control)',
                  border: mode === 'NORMAL_OVERRIDE' ? '2px solid var(--brand)' : '1px solid var(--border)',
                  backgroundColor: mode === 'NORMAL_OVERRIDE' ? 'var(--brand-soft)' : 'var(--surface-2)',
                  color: mode === 'NORMAL_OVERRIDE' ? 'var(--brand)' : 'var(--text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 'var(--text-body-sm)' }}>Normal Override</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Supervisor authorization required</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('CRITICAL_BREAK_GLASS')}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-control)',
                  border: mode === 'CRITICAL_BREAK_GLASS' ? '2px solid var(--emergency)' : '1px solid var(--border)',
                  backgroundColor: mode === 'CRITICAL_BREAK_GLASS' ? 'var(--emergency-soft)' : 'var(--surface-2)',
                  color: mode === 'CRITICAL_BREAK_GLASS' ? 'var(--emergency)' : 'var(--text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 'var(--text-body-sm)' }}>Critical Break-Glass</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Immediate life-safety activation</span>
              </button>
            </div>
          </div>

          {/* Critical Warning Callout */}
          {isCritical && (
            <div
              style={{
                backgroundColor: 'var(--emergency-soft)',
                border: '1px solid var(--emergency-border)',
                borderRadius: 'var(--radius-control)',
                padding: '12px 14px',
                display: 'flex',
                gap: '10px',
                fontSize: 'var(--text-caption)',
                color: 'var(--text)',
                lineHeight: '18px',
              }}
            >
              <AlertTriangle size={18} color="var(--emergency)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--emergency)' }}>THIS IS AN EMERGENCY ACCESS ACTION.</strong>
                <p style={{ margin: '4px 0 0 0' }}>
                  Critical break-glass grants immediate temporary access for urgent life safety. All actions are cryptographic hash-chained and flag a <strong>mandatory supervisor audit</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Scopes Selection */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Required Scopes (Minimum Necessary Privilege)
              </label>
              <span style={{ fontSize: '11px', color: 'var(--brand)', fontWeight: 600 }}>
                {selectedScopes.length} selected
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {AVAILABLE_SCOPES.map((scope) => {
                const isChecked = selectedScopes.includes(scope.id);
                return (
                  <div
                    key={scope.id}
                    onClick={() => toggleScope(scope.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-control)',
                      border: `1px solid ${isChecked ? 'var(--brand)' : 'var(--border)'}`,
                      backgroundColor: isChecked ? 'var(--brand-soft)' : 'var(--surface-2)',
                      cursor: 'pointer',
                      transition: 'border-color var(--transition-fast)',
                    }}
                  >
                    <div style={{ marginTop: '2px', color: isChecked ? 'var(--brand)' : 'var(--text-muted)' }}>
                      {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-body-sm)', color: 'var(--text)' }}>
                        {scope.label} <code style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>{scope.id}</code>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {scope.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Substantive Reason */}
          <div>
            <label
              htmlFor="break-glass-reason"
              style={{
                display: 'block',
                fontSize: 'var(--text-caption)',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Operational Justification (Mandatory & Audited)
            </label>
            <textarea
              id="break-glass-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the operational necessity (e.g. Officer coordinating perimeter response with medical unit...)"
              required
              minLength={5}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 'var(--text-body-sm)',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                backgroundColor: 'var(--emergency-soft)',
                border: '1px solid var(--emergency)',
                borderRadius: 'var(--radius-control)',
                padding: '10px 12px',
                fontSize: 'var(--text-caption)',
                color: 'var(--emergency)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Info size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isCritical ? 'sos' : 'primary'}
              size="md"
              isLoading={isSubmitting}
            >
              {isCritical ? 'Activate Emergency Access' : 'Submit Access Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
