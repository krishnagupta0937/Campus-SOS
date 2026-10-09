import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, Check, X } from 'lucide-react';
import { Button } from '../common/Button';
import { responderService } from '../../services/responderService';

interface DispatchOfferModalProps {
  offer: {
    assignment_id: string;
    incident_id: string;
    incident_summary: string;
    team_code: string;
    timeout_seconds?: number;
    expires_at?: string;
  };
  onClose: () => void;
}

export const DispatchOfferModal: React.FC<DispatchOfferModalProps> = ({ offer, onClose }) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (offer.expires_at) {
      const remaining = Math.round((new Date(offer.expires_at).getTime() - Date.now()) / 1000);
      return Math.max(0, remaining);
    }
    return offer.timeout_seconds || 45;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onClose();
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onClose]);

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await responderService.acceptOffer(offer.assignment_id);
      onClose();
    } catch {
      // Handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await responderService.rejectOffer(offer.assignment_id, rejectReason || undefined);
      onClose();
    } catch {
      // Handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          border: '2px solid var(--emergency)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: 'var(--shadow-overlay)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle color="var(--emergency)" size={24} />
            <h2 id="offer-title" style={{ fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--emergency)' }}>
              Emergency Dispatch Offer
            </h2>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: secondsLeft < 15 ? 'var(--emergency-soft)' : 'var(--warning-soft)',
              color: secondsLeft < 15 ? 'var(--emergency)' : 'var(--warning)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-body)',
            }}
          >
            <Clock size={16} />
            <span>{secondsLeft}s</span>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-control)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Incident Summary
          </div>
          <p style={{ fontSize: 'var(--text-body)', marginTop: '4px', fontWeight: 500 }}>
            {offer.incident_summary}
          </p>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Assigned Team: <strong>{offer.team_code}</strong>
          </div>
        </div>

        {showRejectInput ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="reject-reason" style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600 }}>
              Reason for declining (optional):
            </label>
            <input
              id="reject-reason"
              type="text"
              placeholder="e.g. In the middle of medical procedure"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <Button
                variant="destructive"
                onClick={handleReject}
                isLoading={isSubmitting}
                fullWidth
              >
                Confirm Decline
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowRejectInput(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Button
              variant="sos"
              size="lg"
              onClick={handleAccept}
              isLoading={isSubmitting}
              fullWidth
              leftIcon={<Check size={18} />}
            >
              ACCEPT DISPATCH
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setShowRejectInput(true)}
              disabled={isSubmitting}
              leftIcon={<X size={18} />}
            >
              Decline
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
