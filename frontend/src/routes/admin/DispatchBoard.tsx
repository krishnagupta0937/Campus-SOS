import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { CampusMap, MapIncidentPin } from '../../components/map/CampusMap';
import { StatusChip } from '../../components/common/StatusChip';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { Link } from 'react-router-dom';
import { Shield, Clock, Eye, UserPlus } from 'lucide-react';

export const DispatchBoard: React.FC = () => {
  const [activeCases, setActiveCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);

  const loadDispatchData = async () => {
    try {
      const [incRes, teamsRes] = await Promise.allSettled([
        adminService.getIncidents({ status: 'CREATED' }),
        adminService.getTeams(),
      ]);

      if (incRes.status === 'fulfilled') {
        const incidents = incRes.value.incidents || [];
        setActiveCases(incidents);
        if (incidents.length > 0 && !selectedCase) {
          setSelectedCase(incidents[0]);
        }
      }
      if (teamsRes.status === 'fulfilled') {
        setTeams(teamsRes.value || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDispatchData();
    const timer = setInterval(loadDispatchData, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleManualAssign = async () => {
    if (!selectedCase || !selectedTeamId) return;
    setIsAssigning(true);
    try {
      await adminService.assignIncident(selectedCase.id, selectedTeamId);
      await loadDispatchData();
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Connecting to emergency dispatch board..." />;
  }

  const mapPins: MapIncidentPin[] = activeCases
    .filter((c) => c.location?.pin)
    .map((c) => ({
      id: c.id,
      x: c.location.pin.x,
      y: c.location.pin.y,
      type: 'emergency',
      label: c.public_id,
      category: c.category,
    }));

  return (
    <div className="content-wrap" style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={24} color="var(--emergency)" />
          <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700 }}>Live Emergency Operations & Dispatch</h1>
        </div>
        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
          Real-time incident dispatch board, active unit telemetry, and manual override controls.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(0, 1.8fr)', gap: '20px' }}>
        {/* Left: Active Incidents List (SOS first) */}
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 'var(--text-h3)' }}>Pending Dispatch ({activeCases.length})</strong>
          </div>

          {activeCases.length === 0 ? (
            <EmptyState
              title="No pending emergencies"
              description="All active cases have been dispatched to response teams."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '600px', overflowY: 'auto' }}>
              {activeCases.map((c) => {
                const isSelected = selectedCase?.id === c.id;
                const isSos = c.workflow === 'EMERGENCY_SOS';
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border)',
                      backgroundColor: isSelected ? 'var(--brand-soft)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-body-sm)', color: isSos ? 'var(--emergency)' : 'var(--brand)' }}>
                        {c.public_id}
                      </span>
                      <StatusChip status={c.status} size="sm" />
                    </div>
                    <strong style={{ fontSize: 'var(--text-body-sm)' }}>{c.category}</strong>
                    <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <Clock size={12} />
                      <span>Received {new Date(c.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Map and Selected Incident Controller */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
            <CampusMap
              pins={mapPins}
              selectedPin={selectedCase?.location?.pin || null}
              height="360px"
            />
          </div>

          {selectedCase && (
            <div style={{ backgroundColor: 'var(--surface)', padding: '20px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand)', fontSize: 'var(--text-caption)' }}>
                    Case {selectedCase.public_id}
                  </span>
                  <h3 style={{ fontSize: 'var(--text-h3)', fontWeight: 700 }}>
                    {selectedCase.category}
                  </h3>
                  <p style={{ fontSize: 'var(--text-body-sm)', marginTop: '4px' }}>
                    {selectedCase.description}
                  </p>
                </div>
                <Link
                  to={`/admin/incidents/${selectedCase.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    backgroundColor: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-control)',
                    fontSize: 'var(--text-caption)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: 'var(--text)',
                  }}
                >
                  <Eye size={14} /> Full Dossier
                </Link>
              </div>

              {/* Manual Dispatch Action */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">-- Manually Assign Operational Team --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
                <Button
                  variant="primary"
                  size="md"
                  disabled={!selectedTeamId}
                  isLoading={isAssigning}
                  onClick={handleManualAssign}
                  leftIcon={<UserPlus size={16} />}
                >
                  Dispatch Unit
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
