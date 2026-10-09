import React, { useState } from 'react';
import { breakGlassService } from '../../services/breakGlassService';
import { Button } from '../common/Button';
import type { BreakGlassRequest } from '../../types';
import { ClipboardCheck, AlertTriangle, X, Info } from 'lucide-react';

interface SupervisorReviewModalProps {
  request: BreakGlassRequest;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: BreakGlassRequest) => void;
}

export const SupervisorReviewModal: React.FC<SupervisorReviewModalProps> = ({
  request,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [reviewStatus, setReviewStatus] = useState<'REVIEWED' | 'FLAGGED'>('REVIEWED');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || notes.trim().length < 5) {
      setErrorMessage('Substantive supervisor review notes required (minimum 5 characters).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updated = await breakGlassService.reviewEmergencyAccess({
        request_id: request.id,
        status: reviewStatus,
        notes: notes.trim(),
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err?.details?.message || err?.message || 'Unable to record supervisor review decision.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="supervisor-review-title"
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
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: '540px',
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
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardCheck size={22} color="var(--brand)" />
            <div>
              <h2
                id="supervisor-review-title"
                style={{ fontSize: 'var(--text-h3)', fontWeight: 700, color: 'var(--text)' }}
              >
                Supervisor Break-Glass Audit
              </h2>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                Request: <code>{request.id.slice(0, 8)}</code> • Incident: <code>{request.incident_id.slice(0, 8)}</code>
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
        <form
          onSubmit={handleSubmit}
          style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}
        >
          {/* Summary Box */}
          <div
            style={{
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--border)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: 'var(--text-body-sm)',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Requester: </span>
              <strong>{request.requester.full_name}</strong> ({request.requester.role})
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Scopes Granted: </span>
              <strong>{(request.approved_scopes.length > 0 ? request.approved_scopes : request.requested_scopes).join(', ')}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Requester Justification: </span>
              <p
                style={{
                  fontStyle: 'italic',
                  margin: '4px 0 0 0',
                  color: 'var(--text)',
                  backgroundColor: 'var(--surface)',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--border)',
                }}
              >
                "{request.reason}"
              </p>
            </div>
          </div>

          {/* Review Disposition */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--text-caption)',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Audit Determination
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setReviewStatus('REVIEWED')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-control)',
                  border: reviewStatus === 'REVIEWED' ? '2px solid var(--brand)' : '1px solid var(--border)',
                  backgroundColor: reviewStatus === 'REVIEWED' ? 'var(--brand-soft)' : 'var(--surface-2)',
                  color: reviewStatus === 'REVIEWED' ? 'var(--brand)' : 'var(--text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 'var(--text-body-sm)' }}>Review Complete</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Justified & compliant</div>
              </button>
              <button
                type="button"
                onClick={() => setReviewStatus('FLAGGED')}
                style={{
                  padding: '10px',
                  borderRadius: 'var(--radius-control)',
                  border: reviewStatus === 'FLAGGED' ? '2px solid var(--emergency)' : '1px solid var(--border)',
                  backgroundColor: reviewStatus === 'FLAGGED' ? 'var(--emergency-soft)' : 'var(--surface-2)',
                  color: reviewStatus === 'FLAGGED' ? 'var(--emergency)' : 'var(--text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 'var(--text-body-sm)' }}>Flag for Inquiry</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Requires escalation</div>
              </button>
            </div>
          </div>

          {/* Supervisor Notes */}
          <div>
            <label
              htmlFor="supervisor-notes"
              style={{
                display: 'block',
                fontSize: 'var(--text-caption)',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              Supervisor Audit Notes (Mandatory)
            </label>
            <textarea
              id="supervisor-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record supervisory findings, validation of incident urgency, or rationale..."
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
              }}
            />
          </div>

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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
              variant={reviewStatus === 'FLAGGED' ? 'destructive' : 'primary'}
              size="md"
              isLoading={isSubmitting}
            >
              Record Review
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
