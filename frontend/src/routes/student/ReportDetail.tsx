import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { incidentService } from '../../services/incidentService';
import { StatusChip } from '../../components/common/StatusChip';
import { CampusMap } from '../../components/map/CampusMap';
import { LoadingState } from '../../components/common/LoadingState';
import { Button } from '../../components/common/Button';
import type { IncidentDetailModel } from '../../types';
import { ArrowLeft, Clock, MapPin, Shield, Image as ImageIcon, Send, CheckCircle2 } from 'lucide-react';

export const ReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<IncidentDetailModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);
  const [noteSent, setNoteSent] = useState(false);

  useEffect(() => {
    if (!id) return;
    incidentService
      .getMyIncidentDetail(id)
      .then((data) => {
        setIncident(data);
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !noteText.trim()) return;
    setIsSendingNote(true);
    try {
      await incidentService.addFollowUpNote(id, noteText.trim());
      setNoteText('');
      setNoteSent(true);
      setTimeout(() => setNoteSent(false), 3000);
    } finally {
      setIsSendingNote(false);
    }
  };

  if (isLoading || !incident) {
    return <LoadingState message="Loading incident case details..." />;
  }

  const isSos = incident.workflow === 'EMERGENCY_SOS';

  return (
    <div className="content-wrap" style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Link to="/student/my-reports" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-muted)' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <span style={{ fontSize: 'var(--text-caption)', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isSos ? 'var(--emergency)' : 'var(--brand)' }}>
            {incident.public_id}
          </span>
          <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 700 }}>
            {incident.category_label || (isSos ? 'Emergency SOS' : 'Incident Report')}
          </h1>
        </div>
      </div>

      {/* Case Header Banner */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <StatusChip status={incident.status} />
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
            Logged: {new Date(incident.created_at).toLocaleString()}
          </span>
        </div>

        {isSos && incident.status !== 'RESOLVED' && (
          <Link
            to={`/student/sos/${incident.id}/live`}
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--emergency)',
              color: 'var(--emergency-contrast)',
              borderRadius: 'var(--radius-control)',
              fontWeight: 700,
              fontSize: 'var(--text-caption)',
              textDecoration: 'none',
            }}
          >
            Open Live SOS Tracker
          </Link>
        )}
      </div>

      {/* Full Description */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, marginBottom: '8px' }}>
          Reported Description
        </h2>
        <p style={{ fontSize: 'var(--text-body)', whiteSpace: 'pre-wrap', lineHeight: '24px' }}>
          {incident.description}
        </p>
      </div>

      {/* Location */}
      {incident.location && (
        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <MapPin size={18} color="var(--brand)" />
            <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Location Details</h2>
          </div>
          {incident.location.predefined && (
            <div style={{ fontSize: 'var(--text-body)', fontWeight: 600, marginBottom: '4px' }}>
              {incident.location.predefined.name} ({incident.location.predefined.kind})
            </div>
          )}
          {incident.location.text && (
            <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {incident.location.text}
            </div>
          )}
          {incident.location.pin && (
            <CampusMap
              selectedPin={incident.location.pin}
              height="220px"
            />
          )}
        </div>
      )}

      {/* Assigned Teams */}
      {incident.assigned_teams && incident.assigned_teams.length > 0 && (
        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Shield size={18} color="var(--brand)" />
            <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Assigned Response Teams</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {incident.assigned_teams.map((t, idx) => (
              <span
                key={idx}
                style={{
                  backgroundColor: 'var(--brand-soft)',
                  color: 'var(--brand)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-pill)',
                  fontWeight: 600,
                  fontSize: 'var(--text-caption)',
                }}
              >
                {t.team_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      {incident.photos && incident.photos.length > 0 && (
        <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <ImageIcon size={18} color="var(--brand)" />
            <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Attached Evidence</h2>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {incident.photos.map((p, idx) => (
              <div
                key={p.id || idx}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  backgroundColor: 'var(--surface-2)',
                }}
              >
                {p.url ? (
                  <img src={p.url} alt={`Evidence ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Photo {idx + 1}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add follow up note */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, marginBottom: '6px' }}>Add Follow-up Note</h3>
        <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Add additional details to your report..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <Button type="submit" variant="primary" isLoading={isSendingNote} disabled={!noteText.trim()} leftIcon={<Send size={16} />}>
            Send
          </Button>
        </form>
        {noteSent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', marginTop: '8px', fontSize: 'var(--text-caption)' }}>
            <CheckCircle2 size={14} /> Follow-up note logged.
          </div>
        )}
      </div>
    </div>
  );
};
