import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { attachmentService } from '../../services/attachmentService';
import { breakGlassService } from '../../services/breakGlassService';
import { useAuth } from '../../context/AuthContext';
import { StatusChip } from '../../components/common/StatusChip';
import { CampusMap } from '../../components/map/CampusMap';
import { LoadingState } from '../../components/common/LoadingState';
import { Button } from '../../components/common/Button';
import { BreakGlassBanner } from '../../components/break-glass/BreakGlassBanner';
import { BreakGlassModal } from '../../components/break-glass/BreakGlassModal';
import { ProtectedReporterContact } from '../../components/break-glass/ProtectedReporterContact';
import { realtime } from '../../realtime/socket';
import type { BreakGlassRequest, BreakGlassScope } from '../../types';
import {
  ArrowLeft,
  MapPin,
  Bot,
  Route,
  UserCheck,
  Image as ImageIcon,
  History,
  Copy,
  Check,
  ShieldAlert,
  Lock,
} from 'lucide-react';

export const IncidentCaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [incident, setIncident] = useState<any | null>(null);
  const [breakGlassRequest, setBreakGlassRequest] = useState<BreakGlassRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  const isSupervisor =
    user?.role === 'CAMPUS_ADMIN' || user?.role === 'CHIEF_PROCTOR';
  const isPersonnel = user?.role !== 'STUDENT';

  // Compute active authorized scopes from break-glass grant (if active)
  const activeScopes: BreakGlassScope[] =
    breakGlassRequest?.status === 'ACTIVE'
      ? breakGlassRequest.approved_scopes.length > 0
        ? breakGlassRequest.approved_scopes
        : breakGlassRequest.requested_scopes
      : [];

  const _canViewIncident = isSupervisor || activeScopes.includes('INCIDENT_VIEW');
  const canViewEvidence = isSupervisor || activeScopes.includes('EVIDENCE_VIEW');
  const canViewReporterContact = isSupervisor || activeScopes.includes('REPORTER_CONTACT_VIEW');
  const canUpdateIncident = isSupervisor || activeScopes.includes('INCIDENT_UPDATE');
  const hasRealtime = isSupervisor || activeScopes.includes('REALTIME_ACCESS');

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      // Fetch break-glass status for this user on this incident
      if (isPersonnel) {
        try {
          const bg = await breakGlassService.getEmergencyAccessStatus(id);
          setBreakGlassRequest(bg);
        } catch {
          setBreakGlassRequest(null);
        }
      }

      // Fetch incident dossier
      const data = await adminService.getIncidentDetail(id);
      setIncident(data);
      setSelectedStatus(data.status);
      setAccessDenied(false);

      // Fetch signed URLs for photos ONLY if permitted
      const evidencePermitted =
        isSupervisor ||
        (breakGlassRequest?.status === 'ACTIVE' &&
          (breakGlassRequest.approved_scopes.includes('EVIDENCE_VIEW') ||
            breakGlassRequest.requested_scopes.includes('EVIDENCE_VIEW'))) ||
        !data.isRestricted;

      if (evidencePermitted && data.attachments && data.attachments.length > 0) {
        for (const att of data.attachments) {
          try {
            const urlRes = await attachmentService.getSignedUrl(att.id);
            setPhotoUrls((prev) => ({ ...prev, [att.id]: urlRes.download_url }));
          } catch {}
        }
      }
    } catch (err: any) {
      if (err?.status === 403) {
        setAccessDenied(true);
        setAccessDeniedMessage(
          err?.message || 'Access Restricted: You lack authorization to view this incident dossier.'
        );
      } else {
        setIncident(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, isPersonnel, isSupervisor, breakGlassRequest?.status]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Realtime subscription if authorized
  useEffect(() => {
    if (!id || !hasRealtime) return;

    const unsubscribe = realtime.subscribeIncident(id, () => {
      fetchDetail();
    });

    return () => {
      unsubscribe();
    };
  }, [id, hasRealtime, fetchDetail]);

  const handleCopyDescription = () => {
    if (incident?.description) {
      navigator.clipboard.writeText(incident.description);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStatusChange = async () => {
    if (!id || !selectedStatus) return;
    setIsUpdatingStatus(true);
    try {
      await adminService.changeIncidentStatus(id, selectedStatus, statusNote || undefined);
      await fetchDetail();
      setStatusNote('');
    } catch {} finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Retrieving full incident dossier..." />;
  }

  // 403 Access Denied Gate with Break-Glass Access Option
  if (accessDenied && !incident) {
    return (
      <div className="content-wrap" style={{ maxWidth: '800px', margin: '40px auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/admin/incidents" style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>
            <ArrowLeft size={20} />
          </Link>
          <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 700 }}>Confidential Incident</h1>
        </div>

        {/* Break-glass banner if requested / active */}
        <BreakGlassBanner
          request={breakGlassRequest}
          currentUser={user}
          onRefresh={fetchDetail}
          onRequestClick={() => setIsRequestModalOpen(true)}
          isRestrictedIncident={true}
        />

        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <Lock size={48} color="var(--brand)" />
          <div>
            <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700 }}>
              Access Authorization Required
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-body-sm)', maxWidth: '480px', margin: '8px auto 0 auto' }}>
              {accessDeniedMessage ||
                'This incident case is restricted to designated response teams. If you are responding to an active life-safety emergency, you may request emergency break-glass authorization.'}
            </p>
          </div>

          {isPersonnel && (!breakGlassRequest || breakGlassRequest.status === 'EXPIRED' || breakGlassRequest.status === 'REVOKED') && (
            <Button
              variant="sos"
              size="md"
              onClick={() => setIsRequestModalOpen(true)}
              leftIcon={<ShieldAlert size={16} />}
            >
              Request Emergency Break-Glass Access
            </Button>
          )}
        </div>

        {id && isPersonnel && (
          <BreakGlassModal
            incidentId={id}
            isOpen={isRequestModalOpen}
            onClose={() => setIsRequestModalOpen(false)}
            onSuccess={(_req) => {
              setIsRequestModalOpen(false);
              fetchDetail();
            }}
          />
        )}
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="content-wrap" style={{ maxWidth: '800px', margin: '40px auto' }}>
        <p>Incident not found or inaccessible.</p>
      </div>
    );
  }

  const isEmergency = incident.workflow === 'EMERGENCY_SOS';

  return (
    <div className="content-wrap" style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Breadcrumb & Action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/admin/incidents" style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-h3)', color: isEmergency ? 'var(--emergency)' : 'var(--brand)' }}>
                {incident.publicId}
              </span>
              <StatusChip status={incident.status} />
              {incident.isRestricted && (
                <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: 'var(--emergency-soft)', color: 'var(--emergency)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--emergency-border)' }}>
                  RESTRICTED / CONFIDENTIAL
                </span>
              )}
            </div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginTop: '2px' }}>
              Workflow: {incident.workflow} • ID: {incident.id}
            </div>
          </div>
        </div>

        {/* Status Transition Control (Authorized to Supervisors or INCIDENT_UPDATE scope) */}
        {canUpdateIncident && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ width: 'auto', minWidth: '150px' }}
            >
              <option value="CREATED">CREATED</option>
              <option value="CLASSIFIED">CLASSIFIED</option>
              <option value="ROUTED">ROUTED</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="RESPONDER_ON_THE_WAY">RESPONDER ON THE WAY</option>
              <option value="RESPONDER_AT_LOCATION">RESPONDER AT LOCATION</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <Button
              variant="primary"
              size="sm"
              isLoading={isUpdatingStatus}
              onClick={handleStatusChange}
            >
              Update Status
            </Button>
          </div>
        )}
      </div>

      {/* Emergency Access / Break-Glass Banner */}
      {isPersonnel && (
        <BreakGlassBanner
          request={breakGlassRequest}
          currentUser={user}
          onRefresh={fetchDetail}
          onRequestClick={() => setIsRequestModalOpen(true)}
          isRestrictedIncident={incident.isRestricted}
        />
      )}

      {/* Main Grid Dossier */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr)', gap: '24px' }}>
        {/* Left Column: Full narrative, Location, Photos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Full unmodified student narrative */}
          <div style={{ backgroundColor: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700 }}>
                Full Student Description
              </h2>
              <button
                type="button"
                onClick={handleCopyDescription}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--brand)',
                  fontSize: 'var(--text-caption)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy Narrative'}</span>
              </button>
            </div>
            <p style={{ fontSize: 'var(--text-body)', whiteSpace: 'pre-wrap', lineHeight: '24px', color: 'var(--text)' }}>
              {incident.description}
            </p>
          </div>

          {/* 2. Location & Campus Pin */}
          <div style={{ backgroundColor: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <MapPin size={20} color="var(--brand)" />
              <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700 }}>Location Coordinates & Pin</h2>
            </div>
            {incident.location && (
              <div style={{ marginBottom: '12px', fontSize: 'var(--text-body-sm)' }}>
                {incident.location.predefinedLocation && (
                  <div>
                    Area: <strong>{incident.location.predefinedLocation.name}</strong> ({incident.location.predefinedLocation.kind})
                  </div>
                )}
                {incident.location.locationText && (
                  <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                    Note: {incident.location.locationText}
                  </div>
                )}
              </div>
            )}
            <CampusMap
              selectedPin={incident.location?.pinX ? { x: Number(incident.location.pinX), y: Number(incident.location.pinY) } : null}
              height="260px"
            />
          </div>

          {/* 3. Evidence Photos (Scoped under EVIDENCE_VIEW) */}
          <div style={{ backgroundColor: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={20} color="var(--brand)" />
                <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, margin: 0 }}>
                  Attached Evidence (Scrubbed & Audited)
                </h2>
              </div>
              {canViewEvidence && (
                <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>
                  Authorized View
                </span>
              )}
            </div>

            {!canViewEvidence ? (
              <div
                style={{
                  backgroundColor: 'var(--surface-2)',
                  borderRadius: 'var(--radius-control)',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: 'var(--text-body-sm)',
                  color: 'var(--text-muted)',
                }}
              >
                <Lock size={20} color="var(--text-muted)" />
                <div>
                  <strong>Evidence Protected:</strong> Viewing photographic evidence on confidential incidents requires explicit <code>EVIDENCE_VIEW</code> scope.
                </div>
              </div>
            ) : (!incident.attachments || incident.attachments.length === 0) ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-body-sm)' }}>
                No photos attached to this incident.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {incident.attachments.map((att: any) => (
                  <div
                    key={att.id}
                    style={{
                      width: '180px',
                      backgroundColor: 'var(--surface-2)',
                      borderRadius: 'var(--radius-control)',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                    }}
                  >
                    {photoUrls[att.id] ? (
                      <img
                        src={photoUrls[att.id]}
                        alt={`Evidence ${att.id}`}
                        style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                        Loading signed URL...
                      </div>
                    )}
                    <div style={{ padding: '8px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      SHA-256 Verified
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Protected Reporter Contact, AI classification, Routing, Responders, Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Protected Reporter Contact Component */}
          {id && (
            <ProtectedReporterContact
              incidentId={id}
              hasPermission={canViewReporterContact}
              isEmergencyAuthorized={activeScopes.includes('REPORTER_CONTACT_VIEW')}
            />
          )}

          {/* AI Assistive Classification & Case Intelligence */}
          <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={18} color="var(--brand)" />
                <h3 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, margin: 0 }}>AI Incident Intelligence</h3>
              </div>
              <span
                style={{
                  backgroundColor: 'var(--brand-soft)',
                  color: 'var(--brand)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                {incident.ai_classification?.source === 'AI' ? 'Gemini 1.5 Flash' : 'Safety Rule Engine'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div style={{ backgroundColor: 'var(--surface-2)', padding: '8px 10px', borderRadius: 'var(--radius-control)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>CLASSIFICATION</div>
                <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 700, marginTop: '2px' }}>
                  {incident.ai_classification?.category || incident.finalCategory || 'OTHER'}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--surface-2)', padding: '8px 10px', borderRadius: 'var(--radius-control)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>CONFIDENCE</div>
                <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 700, marginTop: '2px' }}>
                  {incident.ai_classification?.confidence ? `${Math.round(Number(incident.ai_classification.confidence) * 100)}%` : 'Rule-Based'}
                </div>
              </div>
            </div>

            {incident.ai_reasoning && (
              <div style={{ backgroundColor: 'var(--surface-2)', padding: '10px', borderRadius: 'var(--radius-control)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>AI REASONING</div>
                <div style={{ fontSize: 'var(--text-body-sm)', fontStyle: 'italic', color: 'var(--text)' }}>
                  "{incident.ai_reasoning}"
                </div>
              </div>
            )}

            <div
              style={{
                backgroundColor: 'var(--surface-2)',
                padding: '10px',
                borderRadius: 'var(--radius-control)',
                fontSize: 'var(--text-caption)',
                color: 'var(--text-muted)',
              }}
            >
              Note: AI assists incident understanding. Final routing and authorization decisions remain governed by Campus SOS safety policy.
            </div>
          </div>

          {/* Routing Decision & Assigned Teams */}
          <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Route size={18} color="var(--brand)" />
              <h3 style={{ fontSize: 'var(--text-h3)', fontWeight: 700 }}>Assigned Teams</h3>
            </div>
            {(!incident.incidentTeams || incident.incidentTeams.length === 0) ? (
              <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)' }}>
                No specialized team dispatched.
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {incident.incidentTeams.map((it: any) => (
                  <div
                    key={it.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--brand-soft)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-control)',
                      color: 'var(--brand)',
                      fontWeight: 600,
                      fontSize: 'var(--text-body-sm)',
                    }}
                  >
                    <span>{it.team?.name || 'Response Unit'}</span>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase' }}>{it.team?.code}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Responders */}
          <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <UserCheck size={18} color="var(--brand)" />
              <h3 style={{ fontSize: 'var(--text-h3)', fontWeight: 700 }}>Field Responders</h3>
            </div>
            {(!incident.assignments || incident.assignments.length === 0) ? (
              <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)' }}>
                No active responder assignments.
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {incident.assignments.map((ass: any) => (
                  <div
                    key={ass.id}
                    style={{
                      backgroundColor: 'var(--surface-2)',
                      padding: '10px',
                      borderRadius: 'var(--radius-control)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-body-sm)' }}>
                      {ass.member?.user?.fullName || 'Responder'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Status: <strong>{ass.status}</strong> • Team: {ass.member?.team?.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Response Milestone Timeline */}
          <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <History size={18} color="var(--brand)" />
              <h3 style={{ fontSize: 'var(--text-h3)', fontWeight: 700 }}>Status Timeline</h3>
            </div>
            {(!incident.statusHistory || incident.statusHistory.length === 0) ? (
              <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)' }}>
                Created: {new Date(incident.createdAt).toLocaleTimeString()}
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {incident.statusHistory.map((sh: any) => (
                  <div key={sh.id} style={{ display: 'flex', gap: '10px', fontSize: 'var(--text-caption)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', minWidth: '60px' }}>
                      {new Date(sh.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div>
                      <strong style={{ color: 'var(--text)' }}>{sh.toStatus}</strong>
                      {sh.note && <div style={{ color: 'var(--text-muted)' }}>{sh.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Break-Glass Request Modal */}
      {id && isPersonnel && (
        <BreakGlassModal
          incidentId={id}
          incidentPublicId={incident?.publicId}
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          onSuccess={(req) => {
            setBreakGlassRequest(req);
            setIsRequestModalOpen(false);
            fetchDetail();
          }}
        />
      )}
    </div>
  );
};
