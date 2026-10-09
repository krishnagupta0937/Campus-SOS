import React, { useState, useEffect } from 'react';
import { CampusMap, MapIncidentPin } from '../../components/map/CampusMap';
import { exploreService, ExploreIncidentItem } from '../../services/exploreService';
import { StatusChip } from '../../components/common/StatusChip';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { Compass, Filter, ShieldCheck } from 'lucide-react';

export const Explore: React.FC = () => {
  const [incidents, setIncidents] = useState<ExploreIncidentItem[]>([]);
  const [mapPins, setMapPins] = useState<MapIncidentPin[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<ExploreIncidentItem | null>(null);

  useEffect(() => {
    const loadExploreData = async () => {
      setIsLoading(true);
      try {
        const statusParam = statusFilter === 'ALL' ? undefined : statusFilter;
        const [feedData, pinData] = await Promise.allSettled([
          exploreService.getIncidents({ status: statusParam }),
          exploreService.getMapPins(),
        ]);

        if (feedData.status === 'fulfilled') {
          setIncidents(feedData.value || []);
        }
        if (pinData.status === 'fulfilled') {
          const formattedPins: MapIncidentPin[] = (pinData.value || []).map((p) => ({
            id: p.incident_id,
            x: p.pin.x,
            y: p.pin.y,
            type: p.status === 'RESOLVED' ? 'standard' : 'emergency',
            label: p.category,
            category: p.category,
          }));
          setMapPins(formattedPins);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadExploreData();
  }, [statusFilter]);

  const handlePinClick = (pin: MapIncidentPin) => {
    const found = incidents.find((inc) => inc.id === pin.id);
    if (found) {
      setSelectedIncident(found);
    }
  };

  return (
    <div className="content-wrap" style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={24} color="var(--brand)" />
            <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700 }}>Campus Incident Explorer</h1>
          </div>
          <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
            Public safety transparency map. Sensitive cases and reporter identities are securely protected.
          </p>
        </div>

        {/* Status Filter (STATUS ONLY - NO URGENCY FILTER) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--text-muted)" />
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-control)',
              padding: '2px',
              border: '1px solid var(--border)',
            }}
          >
            {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: 'var(--radius-control)',
                  fontSize: 'var(--text-caption)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: statusFilter === filter ? 'var(--surface)' : 'transparent',
                  color: statusFilter === filter ? 'var(--brand)' : 'var(--text-muted)',
                  boxShadow: statusFilter === filter ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {filter === 'ALL' ? 'All Statuses' : filter === 'ACTIVE' ? 'Active Cases' : 'Resolved'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Campus Map Viewport */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
        <CampusMap
          pins={mapPins}
          onPinClick={handlePinClick}
          height="380px"
        />
      </div>

      {/* Selected Incident Drawer / Card */}
      {selectedIncident && (
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '2px solid var(--brand)',
            borderRadius: 'var(--radius-card)',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-caption)', color: 'var(--brand)' }}>
                {selectedIncident.public_id}
              </span>
              <StatusChip status={selectedIncident.status} size="sm" />
            </div>
            <strong style={{ fontSize: 'var(--text-body)' }}>{selectedIncident.category}</strong>
            <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
              {selectedIncident.description_summary} • {selectedIncident.location_summary}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedIncident(null)}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-control)',
              cursor: 'pointer',
              fontSize: 'var(--text-caption)',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Incident List */}
      <div>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600, marginBottom: '12px' }}>
          Recent Public Activity ({incidents.length})
        </h2>

        {isLoading ? (
          <LoadingState message="Loading campus explore records..." />
        ) : incidents.length === 0 ? (
          <EmptyState
            title="No campus activity reported"
            description="There are currently no public safety reports matching the selected status."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {incidents.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--border)',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                      {item.public_id}
                    </span>
                    <StatusChip status={item.status} size="sm" />
                  </div>
                  <strong style={{ fontSize: 'var(--text-body)' }}>{item.category}</strong>
                  <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {item.location_summary || 'Campus'} • {item.description_summary}
                  </p>
                </div>
                <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                  {new Date(item.reported_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
