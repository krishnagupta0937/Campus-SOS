import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { CampusMap } from '../../components/map/CampusMap';
import { sosService } from '../../services/sosService';
import type { SosPreviewResponse, PinCoordinates } from '../../types';
import {
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Users,
  Bot,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { LoadingState } from '../../components/common/LoadingState';

export type AiStatusState =
  | 'AI_ANALYZING'
  | 'AI_RESULT'
  | 'AI_UNAVAILABLE'
  | 'AI_FALLBACK'
  | 'AI_VALIDATION_ERROR';

export const SosConfirmation: React.FC = () => {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const stateData = (location.state as {
    description?: string;
    pin?: PinCoordinates | null;
    locationName?: string;
    photoCount?: number;
  }) || {};

  const [preview, setPreview] = useState<SosPreviewResponse | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatusState>('AI_ANALYZING');
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!draftId) {
      navigate('/student/sos');
      return;
    }

    setAiStatus('AI_ANALYZING');

    sosService
      .previewDraft(draftId)
      .then((res) => {
        setPreview(res);
        if (res.source === 'gemini') {
          setAiStatus('AI_RESULT');
        } else {
          setAiStatus('AI_FALLBACK');
        }
      })
      .catch((err) => {
        // Fallback default preview if backend preview fails
        setAiStatus('AI_UNAVAILABLE');
        setPreview({
          classification: {
            category_label: 'Emergency SOS Response',
            category: 'SECURITY_THREAT',
            severity: 'CRITICAL',
            immediate_danger: true,
            confidence: 0.85,
            reasoning: 'Direct safety escalation using deterministic campus safety rules.',
          },
          source: 'rule_fallback',
          teams_to_alert: ['Campus Security', 'Medical / Fire Units'],
          restricted_notice: false,
        });
      })
      .finally(() => {
        setIsLoadingPreview(false);
      });
  }, [draftId, navigate]);

  const handleExplicitConfirm = async () => {
    if (!draftId) return;

    setIsConfirming(true);
    setErrorMessage(null);

    try {
      // Cryptographically random Idempotency-Key header to prevent double submission
      const idempotencyKey = crypto.randomUUID();

      const res = await sosService.confirmDraft(draftId, idempotencyKey);

      // Transition immediately to live tracking
      navigate(`/student/sos/${res.incident.id}/live`, { replace: true });
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Could not dispatch emergency. Check connection or call the emergency hotline immediately.'
      );
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (draftId) {
      await sosService.deleteDraft(draftId).catch(() => {});
    }
    navigate('/student');
  };

  if (isLoadingPreview) {
    return <LoadingState message="Analyzing incident details with Campus SOS AI..." />;
  }

  // Format confidence to percentage
  const confidencePercent = preview?.classification?.confidence
    ? Math.round(Number(preview.classification.confidence) * 100)
    : 85;

  const severityColor = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL':
        return { bg: 'var(--emergency-soft)', color: 'var(--emergency)', border: 'var(--emergency-border)' };
      case 'HIGH':
        return { bg: '#FEF3E2', color: '#A15C00', border: '#FCE1B6' };
      default:
        return { bg: 'var(--brand-soft)', color: 'var(--brand)', border: 'var(--brand-border)' };
    }
  };

  const activeSeverity = preview?.classification?.severity || 'CRITICAL';
  const sevStyle = severityColor(activeSeverity);

  return (
    <div className="content-wrap" style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Critical Header */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          padding: '24px',
          borderRadius: 'var(--radius-card)',
          border: '2px solid var(--emergency)',
          boxShadow: 'var(--shadow-card)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--emergency-soft)',
            color: 'var(--emergency)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          <AlertCircle size={32} />
        </div>
        <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 700, color: 'var(--emergency)', marginBottom: '6px' }}>
          Emergency Verification Gate
        </h1>
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-muted)' }}>
          Review the AI incident understanding and verified response routing before initiating dispatch.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--emergency-soft)',
            color: 'var(--emergency)',
            padding: '14px',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--emergency-border)',
            fontSize: 'var(--text-body-sm)',
            fontWeight: 600,
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Case Summary Card */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Description */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Your Description
            </span>
            <button
              type="button"
              onClick={() => navigate('/student/sos')}
              style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 'var(--text-caption)', fontWeight: 600, cursor: 'pointer' }}
            >
              Edit
            </button>
          </div>
          <p style={{ fontSize: 'var(--text-body)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
            {stateData.description || 'Emergency assistance requested.'}
          </p>
        </div>

        {/* Location */}
        <div>
          <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Location & Map Pin
          </span>
          <div style={{ fontSize: 'var(--text-body-sm)', marginTop: '4px', fontWeight: 500 }}>
            {stateData.locationName ? stateData.locationName : 'Location specified via map pin'}
          </div>
          {stateData.pin && (
            <div style={{ marginTop: '10px' }}>
              <CampusMap
                selectedPin={stateData.pin}
                height="180px"
              />
            </div>
          )}
        </div>

        {/* Evidence */}
        {stateData.photoCount !== undefined && stateData.photoCount > 0 && (
          <div>
            <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Evidence Photos
            </span>
            <div style={{ fontSize: 'var(--text-body-sm)', marginTop: '2px' }}>
              {stateData.photoCount} photo(s) attached
            </div>
          </div>
        )}
      </div>

      {/* ── AI INCIDENT ANALYSIS PANEL ── */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--brand-border)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          position: 'relative',
        }}
      >
        {/* Panel Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {aiStatus === 'AI_RESULT' ? (
              <Sparkles size={20} color="var(--brand)" />
            ) : (
              <Bot size={20} color="var(--brand)" />
            )}
            <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, margin: 0 }}>
              AI Incident Analysis
            </h2>
          </div>

          {/* AI Status Badge */}
          {aiStatus === 'AI_RESULT' ? (
            <span
              style={{
                backgroundColor: 'var(--brand-soft)',
                color: 'var(--brand)',
                border: '1px solid var(--brand-border)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '11px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Sparkles size={12} /> Gemini Live Intelligence
            </span>
          ) : (
            <span
              style={{
                backgroundColor: 'var(--surface-2)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '11px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ShieldCheck size={12} /> Deterministic Safety Rules
            </span>
          )}
        </div>

        {/* Fallback notification if AI was unavailable */}
        {(aiStatus === 'AI_FALLBACK' || aiStatus === 'AI_UNAVAILABLE') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--surface-2)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-control)',
              fontSize: 'var(--text-caption)',
              color: 'var(--text-muted)',
            }}
          >
            <Info size={14} color="var(--brand)" />
            <span>AI analysis unavailable. Using Campus SOS safety rules.</span>
          </div>
        )}

        {/* Structured Understanding Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
          }}
        >
          {/* Category */}
          <div style={{ backgroundColor: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-control)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Category
            </span>
            <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 700, marginTop: '2px' }}>
              {preview?.classification?.category ? preview.classification.category.replace(/_/g, ' ') : 'General Emergency'}
            </div>
          </div>

          {/* Incident Type */}
          <div style={{ backgroundColor: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-control)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Incident Type
            </span>
            <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 700, marginTop: '2px' }}>
              {preview?.classification?.category_label || 'Hazard / Incident'}
            </div>
          </div>

          {/* Severity */}
          <div style={{ backgroundColor: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-control)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Severity
            </span>
            <div style={{ marginTop: '2px' }}>
              <span
                style={{
                  backgroundColor: sevStyle.bg,
                  color: sevStyle.color,
                  border: `1px solid ${sevStyle.border}`,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {activeSeverity}
              </span>
            </div>
          </div>

          {/* Immediate Danger */}
          <div style={{ backgroundColor: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-control)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Immediate Danger
            </span>
            <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 700, marginTop: '2px', color: preview?.classification?.immediate_danger ? 'var(--emergency)' : 'var(--text)' }}>
              {preview?.classification?.immediate_danger ? 'Yes' : 'No'}
            </div>
          </div>

          {/* Confidence */}
          <div style={{ backgroundColor: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-control)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Confidence
            </span>
            <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 700, marginTop: '2px' }}>
              {confidencePercent}%
            </div>
          </div>

          {/* Location Context */}
          <div style={{ backgroundColor: 'var(--surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-control)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Location
            </span>
            <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {preview?.classification?.location_context || stateData.locationName || 'Campus Precinct'}
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        {preview?.classification?.reasoning && (
          <div style={{ backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: 'var(--radius-control)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Reasoning
            </span>
            <p style={{ fontSize: 'var(--text-body-sm)', fontStyle: 'italic', marginTop: '2px', color: 'var(--text)' }}>
              "{preview.classification.reasoning}"
            </p>
          </div>
        )}

        {/* Transparent Legal/Architectural Label */}
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            paddingTop: '4px',
            borderTop: '1px dashed var(--border)',
          }}
        >
          AI assists incident understanding. Campus SOS policy determines routing.
        </div>
      </div>

      {/* ── ROUTING DECISION PANEL ── */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="var(--brand)" />
          <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, margin: 0 }}>
            Routing Decision
          </h2>
        </div>

        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)' }}>
          Based on verified safety policy and category union rules, the following emergency response units will be alerted:
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {preview?.teams_to_alert && preview.teams_to_alert.length > 0 ? (
            preview.teams_to_alert.map((team, idx) => (
              <span
                key={idx}
                style={{
                  backgroundColor: 'var(--brand-soft)',
                  color: 'var(--brand)',
                  border: '1px solid var(--brand-border)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 'var(--text-body-sm)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ShieldCheck size={14} />
                {team.replace(/_/g, ' ')}
              </span>
            ))
          ) : (
            <span
              style={{
                backgroundColor: 'var(--brand-soft)',
                color: 'var(--brand)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-pill)',
                fontSize: 'var(--text-body-sm)',
                fontWeight: 600,
              }}
            >
              Security • Medical / Fire Response
            </span>
          )}
        </div>

        {preview?.restricted_notice && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--emergency-soft)',
              color: 'var(--emergency)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-control)',
              fontSize: 'var(--text-caption)',
              fontWeight: 600,
              marginTop: '4px',
            }}
          >
            <AlertTriangle size={14} />
            <span>Confidentiality protection active. Evidence restricted to authorized response team.</span>
          </div>
        )}
      </div>

      {/* Confirmation Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
        {/* Giant CONFIRM EMERGENCY button */}
        <Button
          variant="sos"
          size="xl"
          fullWidth
          isLoading={isConfirming}
          onClick={handleExplicitConfirm}
          leftIcon={<CheckCircle2 size={24} />}
        >
          CONFIRM EMERGENCY
        </Button>

        <Button
          variant="quiet"
          size="md"
          fullWidth
          disabled={isConfirming}
          onClick={handleCancel}
          leftIcon={<ArrowLeft size={16} />}
        >
          Cancel and return to home
        </Button>
      </div>
    </div>
  );
};
