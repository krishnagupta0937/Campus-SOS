import React, { useState, useEffect } from 'react';
import { breakGlassService } from '../../services/breakGlassService';
import { Button } from '../common/Button';
import { SupervisorReviewModal } from './SupervisorReviewModal';
import type { BreakGlassRequest, UserProfile } from '../../types';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  ShieldCheck,
  FileText,
  User,
  Info,
} from 'lucide-react';

interface BreakGlassBannerProps {
  request: BreakGlassRequest | null;
  currentUser: UserProfile | null;
  onRefresh: () => void;
  onRequestClick?: () => void;
  isRestrictedIncident?: boolean;
}

export const BreakGlassBanner: React.FC<BreakGlassBannerProps> = ({
  request,
  currentUser,
  onRefresh,
  onRequestClick,
  isRestrictedIncident = false,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState<boolean>(false);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<boolean>(false);
  const [revokeReason, setRevokeReason] = useState<string>('');
  const [showApproveConfirm, setShowApproveConfirm] = useState<boolean>(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Compute countdown timer (display-only)
  useEffect(() => {
    if (!request || request.status !== 'ACTIVE' || !request.expires_at) {
      setTimeRemaining('');
      setIsExpiringSoon(false);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(request.expires_at!).getTime();
      const diffMs = expiry - now;

      if (diffMs <= 0) {
        setTimeRemaining('Expired');
        setIsExpiringSoon(false);
        // Backend authoritative refresh
        onRefresh();
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setIsExpiringSoon(minutes < 10);
      setTimeRemaining(`${minutes}m ${seconds.toString().padStart(2, '0')}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [request?.expires_at, request?.status, onRefresh]);

  const isSupervisor =
    currentUser?.role === 'CAMPUS_ADMIN' || currentUser?.role === 'CHIEF_PROCTOR';
  const isRequester = currentUser?.id === request?.requester.id;

  const handleRevoke = async () => {
    if (!request || !revokeReason.trim()) {
      setActionError('Revocation reason is required.');
      return;
    }
    setIsRevoking(true);
    setActionError(null);
    try {
      await breakGlassService.revokeEmergencyAccess({
        request_id: request.id,
        reason: revokeReason.trim(),
      });
      setShowRevokeConfirm(false);
      setRevokeReason('');
      onRefresh();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to revoke access.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleApprove = async () => {
    if (!request) return;
    setActionError(null);
    try {
      await breakGlassService.approveEmergencyAccess({
        request_id: request.id,
      });
      setShowApproveConfirm(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err?.message || 'Approval failed.');
    }
  };

  const handleReject = async () => {
    if (!request || !rejectReason.trim()) {
      setActionError('Rejection reason is required.');
      return;
    }
    setActionError(null);
    try {
      await breakGlassService.rejectEmergencyAccess({
        request_id: request.id,
        reason: rejectReason.trim(),
      });
      setShowRejectConfirm(false);
      setRejectReason('');
      onRefresh();
    } catch (err: any) {
      setActionError(err?.message || 'Rejection failed.');
    }
  };

  // State 1: No emergency access record
  if (!request) {
    if (isRestrictedIncident && onRequestClick && currentUser?.role !== 'STUDENT') {
      return (
        <div
          style={{
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert size={22} color="var(--brand)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-body-sm)' }}>
                Confidential Incident Case
              </div>
              <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                Field personnel without assigned team access can submit an expedited break-glass request.
              </div>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={onRequestClick} leftIcon={<ShieldAlert size={14} />}>
            Request Emergency Access
          </Button>
        </div>
      );
    }
    return null;
  }

  const isCritical = request.type === 'CRITICAL_BREAK_GLASS';
  const isActive = request.status === 'ACTIVE';
  const isPending = request.status === 'REQUESTED';
  const isExpired = request.status === 'EXPIRED';
  const isRevoked = request.status === 'REVOKED';
  const isRejected = request.status === 'REJECTED';
  const needsReview = request.supervisor_review_status === 'REVIEW_REQUIRED';
  const isReviewed = request.supervisor_review_status === 'REVIEWED';

  // State Color Palette
  let bannerBorder = 'var(--border)';
  let bannerBg = 'var(--surface)';

  if (isActive) {
    if (isCritical) {
      bannerBorder = 'var(--emergency)';
      bannerBg = 'var(--emergency-soft)';
    } else {
      bannerBorder = 'var(--brand)';
      bannerBg = 'var(--brand-soft)';
    }
  } else if (isPending) {
    bannerBorder = 'var(--warning, #d97706)';
    bannerBg = 'var(--warning-soft, #fffbeb)';
  } else if (isRevoked || isRejected) {
    bannerBorder = 'var(--emergency-border)';
    bannerBg = 'var(--surface-2)';
  } else if (isExpired) {
    bannerBorder = 'var(--border)';
    bannerBg = 'var(--surface-2)';
  }

  return (
    <div
      style={{
        backgroundColor: bannerBg,
        border: `1px solid ${bannerBorder}`,
        borderRadius: 'var(--radius-card)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: isActive ? 'var(--shadow-card)' : 'none',
      }}
    >
      {/* Banner Top Row: Badge, Scopes, Countdown */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {isCritical ? (
            <AlertTriangle size={20} color="var(--emergency)" />
          ) : (
            <ShieldAlert size={20} color="var(--brand)" />
          )}

          {/* Status Badge */}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: isActive
                ? isCritical
                  ? 'var(--emergency)'
                  : 'var(--brand)'
                : isPending
                ? 'var(--warning, #d97706)'
                : 'var(--surface-3)',
              color: isActive
                ? '#ffffff'
                : isPending
                ? '#ffffff'
                : 'var(--text-muted)',
            }}
          >
            {isActive
              ? isExpiringSoon
                ? 'EMERGENCY ACCESS EXPIRING SOON'
                : 'EMERGENCY ACCESS ACTIVE'
              : isPending
              ? 'ACCESS REQUEST PENDING'
              : isExpired
              ? 'EMERGENCY ACCESS EXPIRED'
              : isRevoked
              ? 'EMERGENCY ACCESS REVOKED'
              : isRejected
              ? 'ACCESS REQUEST REJECTED'
              : request.status}
          </span>

          {/* Type Badge */}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 'var(--radius-control)',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              color: isCritical ? 'var(--emergency)' : 'var(--text)',
            }}
          >
            {isCritical ? 'CRITICAL BREAK-GLASS' : 'NORMAL OVERRIDE'}
          </span>

          {/* Supervisor Review Tag */}
          {needsReview && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--warning-soft, #fffbeb)',
                color: 'var(--warning-contrast, #b45309)',
                border: '1px solid var(--warning, #d97706)',
              }}
            >
              REVIEW REQUIRED
            </span>
          )}

          {isReviewed && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ShieldCheck size={12} color="var(--success)" />
              AUDITED & REVIEWED
            </span>
          )}
        </div>

        {/* Right side: Countdown or Timestamps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isActive && timeRemaining && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-body-sm)',
                fontWeight: 700,
                color: isExpiringSoon ? 'var(--emergency)' : 'var(--text)',
                backgroundColor: 'var(--surface)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-control)',
                border: `1px solid ${isExpiringSoon ? 'var(--emergency)' : 'var(--border)'}`,
              }}
            >
              <Clock size={16} />
              <span>{timeRemaining}</span>
            </div>
          )}

          {/* Revoke Action (Requester or Supervisor) */}
          {isActive && (isRequester || isSupervisor) && !showRevokeConfirm && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowRevokeConfirm(true)}
            >
              Revoke Access
            </Button>
          )}

          {/* Review Action (Supervisor) */}
          {needsReview && isSupervisor && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowReviewModal(true)}
              leftIcon={<ShieldCheck size={14} />}
            >
              Audit Break-Glass
            </Button>
          )}
        </div>
      </div>

      {/* Grant Scope Tags */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: 'var(--text-caption)' }}>
        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Authorized Scopes:</span>
        {(request.approved_scopes.length > 0 ? request.approved_scopes : request.requested_scopes).map(
          (scope) => (
            <code
              key={scope}
              style={{
                backgroundColor: 'var(--surface)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                color: 'var(--brand)',
                fontSize: '11px',
              }}
            >
              {scope}
            </code>
          )
        )}
      </div>

      {/* Reason & Personnel Context */}
      <div
        style={{
          fontSize: 'var(--text-body-sm)',
          color: 'var(--text)',
          backgroundColor: 'var(--surface)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-control)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>
            Requester: <strong>{request.requester.full_name}</strong> ({request.requester.role})
          </span>
          {request.approver && (
            <span>
              Authorized by: <strong>{request.approver.full_name}</strong> ({request.approver.role})
            </span>
          )}
        </div>
        <div style={{ fontStyle: 'italic', color: 'var(--text)', marginTop: '2px' }}>
          "{request.reason}"
        </div>
        {request.revocation_reason && (
          <div style={{ fontSize: '11px', color: 'var(--emergency)', marginTop: '4px' }}>
            Revocation reason: {request.revocation_reason}
          </div>
        )}
        {request.rejection_reason && (
          <div style={{ fontSize: '11px', color: 'var(--emergency)', marginTop: '4px' }}>
            Rejection reason: {request.rejection_reason}
          </div>
        )}
        {request.supervisor_review_notes && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Supervisor review notes: {request.supervisor_review_notes}
          </div>
        )}
      </div>

      {/* Pending Approval Controls for Approvers */}
      {isPending && isSupervisor && !isRequester && (
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-control)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: 'var(--text-body-sm)' }}>
            <strong>Operational Approval Required:</strong> Responder requested access to this case.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowRejectConfirm(true)}
            >
              Reject
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowApproveConfirm(true)}
            >
              Approve Access (60 min)
            </Button>
          </div>
        </div>
      )}

      {/* Approve Confirmation Box */}
      {showApproveConfirm && (
        <div
          style={{
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-control)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600 }}>
            Authorize emergency access for {request.requester.full_name}?
          </div>
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
            This will grant the requested scopes ({request.requested_scopes.join(', ')}) for 60 minutes.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowApproveConfirm(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleApprove}>
              Confirm Approval
            </Button>
          </div>
        </div>
      )}

      {/* Reject Confirmation Box */}
      {showRejectConfirm && (
        <div
          style={{
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-control)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600 }}>
            Reject emergency access request:
          </div>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Operational reason for rejection..."
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--border)',
              fontSize: 'var(--text-body-sm)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={() => setShowRejectConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleReject}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Box */}
      {showRevokeConfirm && (
        <div
          style={{
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--emergency-border)',
            borderRadius: 'var(--radius-control)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--emergency)' }}>
            Confirm Immediate Access Revocation
          </div>
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
            Revoking access will immediately disable all protected capabilities and unsubscribe realtime telemetry.
          </div>
          <input
            type="text"
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            placeholder="Operational reason for revocation (e.g. Handover complete)..."
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--border)',
              fontSize: 'var(--text-body-sm)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              disabled={isRevoking}
              onClick={() => setShowRevokeConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={isRevoking}
              onClick={handleRevoke}
            >
              Confirm Revoke
            </Button>
          </div>
        </div>
      )}

      {actionError && (
        <div
          style={{
            backgroundColor: 'var(--emergency-soft)',
            border: '1px solid var(--emergency)',
            borderRadius: 'var(--radius-control)',
            padding: '8px 12px',
            fontSize: 'var(--text-caption)',
            color: 'var(--emergency)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Info size={14} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Supervisor Review Modal */}
      {showReviewModal && (
        <SupervisorReviewModal
          request={request}
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => {
            setShowReviewModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
