import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StatusTracker } from '../../components/timeline/StatusTracker';
import { Button } from '../../components/common/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { sosService } from '../../services/sosService';
import { incidentService } from '../../services/incidentService';
import { realtime } from '../../realtime/socket';
import { notificationService } from '../../services/notificationService';
import type { SosLiveStatusResponse } from '../../types';
import {
  Shield,
  PhoneCall,
  UserCheck,
  AlertTriangle,
  HeartPulse,
  Send,
  CheckCircle,
} from 'lucide-react';

export const SosLiveTracking: React.FC = () => {
  const { incidentId } = useParams<{ incidentId: string }>();

  const [liveData, setLiveData] = useState<SosLiveStatusResponse | null>(null);
  const [primaryHotline, setPrimaryHotline] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followUpNote, setFollowUpNote] = useState('');
  const [noteSent, setNoteSent] = useState(false);
  const [isSendingNote, setIsSendingNote] = useState(false);

  useEffect(() => {
    // Fetch active hotlines dynamically from backend
    notificationService.getHotlines().then((hotlines) => {
      if (hotlines && hotlines.length > 0) {
        setPrimaryHotline(hotlines[0].phone);
      }
    }).catch(() => {});

    if (!incidentId) return;

    // Initial fetch
    const fetchStatus = async () => {
      try {
        const res = await sosService.getLiveStatus(incidentId);
        setLiveData(res);
      } catch {
        // Handled gracefully
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();

    // Fallback polling every 5s as specified
    const pollInterval = setInterval(fetchStatus, 5000);

    // Subscribe to realtime updates for this incident
    const unsub = realtime.subscribeIncident(incidentId, (update) => {
      if (update.status) {
        fetchStatus();
      }
    });

    return () => {
      clearInterval(pollInterval);
      unsub();
    };
  }, [incidentId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentId || !followUpNote.trim()) return;

    setIsSendingNote(true);
    try {
      await incidentService.addFollowUpNote(incidentId, followUpNote.trim());
      setFollowUpNote('');
      setNoteSent(true);
      setTimeout(() => setNoteSent(false), 3000);
    } catch {
      // Note failure handled
    } finally {
      setIsSendingNote(false);
    }
  };

  if (isLoading || !liveData) {
    return <LoadingState message="Connecting to emergency response status..." />;
  }

  const getHeadline = () => {
    switch (liveData.current) {
      case 'RESOLVED':
        return 'Emergency Resolved';
      case 'RESPONDER_AT_LOCATION':
        return 'Responder At Location';
      case 'RESPONDER_ON_THE_WAY':
        return 'Help is on the way';
      case 'ASSIGNED':
        return 'Responder Assigned';
      case 'ROUTED':
      case 'CLASSIFIED':
        return 'Teams Notified';
      case 'CREATED':
      default:
        return 'Emergency Request Received';
    }
  };

  return (
    <div className="content-wrap" style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Live Status Hero Banner */}
      <div
        style={{
          backgroundColor: liveData.current === 'RESOLVED' ? 'var(--success-soft)' : 'var(--emergency-soft)',
          border: `1px solid ${liveData.current === 'RESOLVED' ? 'var(--success)' : 'var(--emergency-border)'}`,
          borderRadius: 'var(--radius-card)',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: 'var(--text-caption)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: liveData.current === 'RESOLVED' ? 'var(--success)' : 'var(--emergency)',
          }}
        >
          Case {liveData.public_id}
        </span>
        <h1
          style={{
            fontSize: 'var(--text-display)',
            fontWeight: 700,
            color: liveData.current === 'RESOLVED' ? 'var(--success)' : 'var(--emergency)',
            marginTop: '4px',
            lineHeight: 1.2,
          }}
        >
          {getHeadline()}
        </h1>
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--text)', marginTop: '8px' }}>
          Response teams are coordinated via central dispatch. Stay in a safe area.
        </p>
      </div>

      {/* Responder Card */}
      {liveData.responder_public ? (
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--brand-soft)',
              color: 'var(--brand)',
              padding: '10px',
              borderRadius: '50%',
            }}
          >
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', fontWeight: 600 }}>
              Assigned Field Responder
            </div>
            <div style={{ fontSize: 'var(--text-h3)', fontWeight: 700 }}>
              {liveData.responder_public.first_name} ({liveData.responder_public.team})
            </div>
          </div>
        </div>
      ) : liveData.current !== 'CREATED' && (
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Shield size={20} color="var(--brand)" />
          <span style={{ fontSize: 'var(--text-body-sm)', fontWeight: 500 }}>
            An authorized response unit is actively assigned to this case.
          </span>
        </div>
      )}

      {/* 6-Step Status Progress Tracker */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: '20px 24px',
        }}
      >
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, marginBottom: '8px' }}>
          Response Milestones
        </h2>
        <StatusTracker
          steps={liveData.steps}
          currentStatus={liveData.current}
        />
      </div>

      {/* Medical First-Aid Guidance (conservative guidance if medical) */}
      <div
        style={{
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <HeartPulse size={18} color="var(--brand)" />
          <strong style={{ fontSize: 'var(--text-body-sm)' }}>Immediate Safety Guidance</strong>
        </div>
        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', lineHeight: '18px' }}>
          Stay calm and remain in your current safe position if safe to do so. If someone is injured, do not move them unless there is immediate danger. Do not wait for guidance — responders are en route.
        </p>
      </div>

      {/* Follow-up Note Form */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: '20px',
        }}
      >
        <h3 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, marginBottom: '6px' }}>
          Add Additional Information
        </h3>
        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Send quick follow-up details directly to the assigned response team.
        </p>

        <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="e.g. Moved to Room 202; bleeding has slowed"
            value={followUpNote}
            onChange={(e) => setFollowUpNote(e.target.value)}
            disabled={isSendingNote}
          />
          <Button
            type="submit"
            variant="primary"
            isLoading={isSendingNote}
            disabled={!followUpNote.trim()}
            leftIcon={<Send size={16} />}
          >
            Send
          </Button>
        </form>

        {noteSent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', marginTop: '8px', fontSize: 'var(--text-caption)' }}>
            <CheckCircle size={14} /> Note transmitted to response team.
          </div>
        )}
      </div>

      {/* Direct Call to Hotline Strip */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        {primaryHotline ? (
          <a
            href={`tel:${primaryHotline}`}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: 'var(--surface)',
              border: '2px solid var(--emergency)',
              color: 'var(--emergency)',
              borderRadius: 'var(--radius-control)',
              padding: '12px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 'var(--text-body)',
            }}
          >
            <PhoneCall size={18} /> Call Campus Emergency ({primaryHotline})
          </a>
        ) : (
          <Link
            to="/contacts"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: 'var(--surface)',
              border: '2px solid var(--emergency)',
              color: 'var(--emergency)',
              borderRadius: 'var(--radius-control)',
              padding: '12px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 'var(--text-body)',
            }}
          >
            <PhoneCall size={18} /> Campus Emergency Directory
          </Link>
        )}

        <Link
          to="/student/my-reports"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            borderRadius: 'var(--radius-control)',
            padding: '12px 18px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 'var(--text-body)',
          }}
        >
          My Reports
        </Link>
      </div>
    </div>
  );
};
