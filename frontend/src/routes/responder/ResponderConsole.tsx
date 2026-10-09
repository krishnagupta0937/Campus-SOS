import React, { useState, useEffect } from 'react';
import { responderService } from '../../services/responderService';
import { DutyBadge } from '../../components/common/DutyBadge';
import { Button } from '../../components/common/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import type { DutyState, DispatchOfferItem } from '../../types';
import {
  Navigation,
  MapPin,
  CheckCircle2,
  Shield,
} from 'lucide-react';

export const ResponderConsole: React.FC = () => {
  const [dutyState, setDutyState] = useState<DutyState>('AVAILABLE');
  const [_offers, setOffers] = useState<DispatchOfferItem[]>([]);
  const [activeAssignment, setActiveAssignment] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const loadResponderState = async () => {
    try {
      const [profileData, offersData] = await Promise.allSettled([
        responderService.getMyProfile(),
        responderService.getOffers(),
      ]);

      if (profileData.status === 'fulfilled' && profileData.value?.dutyState) {
        setDutyState(profileData.value.dutyState);
      }
      if (offersData.status === 'fulfilled') {
        setOffers(offersData.value || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResponderState();
    const interval = setInterval(loadResponderState, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDutyChange = async (newState: DutyState) => {
    try {
      await responderService.updateDutyState(newState);
      setDutyState(newState);
    } catch {}
  };

  const handleEnRoute = async (assignmentId: string) => {
    setIsSubmittingAction(true);
    try {
      await responderService.markEnRoute(assignmentId);
      if (activeAssignment) {
        setActiveAssignment({ ...activeAssignment, status: 'EN_ROUTE' });
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleOnScene = async (assignmentId: string) => {
    setIsSubmittingAction(true);
    try {
      await responderService.markOnScene(assignmentId);
      if (activeAssignment) {
        setActiveAssignment({ ...activeAssignment, status: 'ON_SCENE' });
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleComplete = async (assignmentId: string) => {
    if (!resolutionSummary.trim()) return;
    setIsSubmittingAction(true);
    try {
      await responderService.completeAssignment(assignmentId, resolutionSummary);
      setActiveAssignment(null);
      setResolutionSummary('');
      setDutyState('AVAILABLE');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Connecting to responder unit status..." />;
  }

  return (
    <div className="content-wrap" style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Duty State Controller Strip */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          padding: '20px',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 700 }}>Field Duty Console</h1>
            <DutyBadge state={dutyState} />
          </div>
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginTop: '2px' }}>
            Inactivity never changes duty state. Select your current status:
          </p>
        </div>

        {/* 3 Duty State Buttons */}
        <div style={{ display: 'inline-flex', backgroundColor: 'var(--surface-2)', padding: '3px', borderRadius: 'var(--radius-control)', border: '1px solid var(--border)' }}>
          {(['AVAILABLE', 'BUSY', 'OFFLINE'] as DutyState[]).map((state) => (
            <button
              key={state}
              type="button"
              onClick={() => handleDutyChange(state)}
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: 'var(--radius-control)',
                fontSize: 'var(--text-caption)',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: dutyState === state ? 'var(--surface)' : 'transparent',
                color: dutyState === state ? 'var(--brand)' : 'var(--text-muted)',
                boxShadow: dutyState === state ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {/* Active Assignment in Flight */}
      {activeAssignment ? (
        <div
          style={{
            backgroundColor: 'var(--surface)',
            padding: '24px',
            borderRadius: 'var(--radius-card)',
            border: '2px solid var(--brand)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 'var(--text-caption)', fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase' }}>
                Active Assignment
              </span>
              <h2 style={{ fontSize: 'var(--text-h2)', fontWeight: 700 }}>
                {activeAssignment.summary || 'Emergency Case In Progress'}
              </h2>
            </div>
            <span
              style={{
                backgroundColor: 'var(--brand-soft)',
                color: 'var(--brand)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                fontWeight: 700,
                fontSize: 'var(--text-caption)',
              }}
            >
              {activeAssignment.status}
            </span>
          </div>

          {/* Stepper actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant={activeAssignment.status === 'EN_ROUTE' ? 'primary' : 'secondary'}
              size="md"
              onClick={() => handleEnRoute(activeAssignment.id)}
              isLoading={isSubmittingAction}
              leftIcon={<Navigation size={16} />}
            >
              Mark En Route (T2)
            </Button>
            <Button
              variant={activeAssignment.status === 'ON_SCENE' ? 'primary' : 'secondary'}
              size="md"
              onClick={() => handleOnScene(activeAssignment.id)}
              isLoading={isSubmittingAction}
              leftIcon={<MapPin size={16} />}
            >
              Mark At Location (T3)
            </Button>
          </div>

          {/* Completion Form */}
          <div style={{ backgroundColor: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius-control)', marginTop: '8px' }}>
            <h3 style={{ fontSize: 'var(--text-body-sm)', fontWeight: 700, marginBottom: '6px' }}>
              Resolve & Complete Case (T4)
            </h3>
            <textarea
              rows={2}
              placeholder="Enter resolution notes, outcome, or follow-up instructions..."
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              style={{ marginBottom: '8px' }}
            />
            <Button
              variant="sos"
              size="md"
              onClick={() => handleComplete(activeAssignment.id)}
              disabled={!resolutionSummary.trim()}
              isLoading={isSubmittingAction}
              leftIcon={<CheckCircle2 size={16} />}
            >
              Complete Assignment
            </Button>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No active assignment"
          description={
            dutyState === 'AVAILABLE'
              ? 'You are on AVAILABLE duty. Dispatch offers will alert you with a 45-second countdown.'
              : 'Set your duty status to AVAILABLE to receive emergency dispatch offers.'
          }
          icon={<Shield size={40} />}
        />
      )}
    </div>
  );
};
