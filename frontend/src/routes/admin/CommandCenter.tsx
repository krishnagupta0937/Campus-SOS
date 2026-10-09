import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { StatusChip } from '../../components/common/StatusChip';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { EmergencyAccessTable } from '../../components/break-glass/EmergencyAccessTable';
import { useAuth } from '../../context/AuthContext';
import type { AnalyticsOverview, AdminIncidentItem } from '../../types';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Filter,
  Eye,
  Activity,
  ShieldAlert,
} from 'lucide-react';

export const CommandCenter: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'incidents' | 'emergency-access'>('incidents');

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [incidents, setIncidents] = useState<AdminIncidentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [overviewData, incidentsData] = await Promise.allSettled([
        adminService.getOverview(),
        adminService.getIncidents({ q: searchQuery || undefined, status: statusFilter || undefined }),
      ]);

      if (overviewData.status === 'fulfilled') setOverview(overviewData.value);
      if (incidentsData.status === 'fulfilled') setIncidents(incidentsData.value.incidents || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  if (isLoading && !overview) {
    return <LoadingState message="Connecting to central command operational telemetry..." />;
  }

  return (
    <div className="content-wrap" style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700 }}>Campus Safety Command Center</h1>
        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
          Central operational command and incident management console.
        </p>
      </div>

      {/* 5 Core Clickable Metric Cards (Calm Authority - Real Data Only) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Total Incidents */}
        <div
          onClick={() => navigate('/admin/incidents')}
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '20px',
            cursor: 'pointer',
            transition: 'border-color var(--transition-fast)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, textTransform: 'uppercase' }}>Total Incidents</span>
            <Layers size={18} />
          </div>
          <div style={{ fontSize: 'var(--text-display)', fontWeight: 700, color: 'var(--text)', marginTop: '8px' }}>
            {overview ? overview.total_incidents : '—'}
          </div>
        </div>

        {/* Active Emergencies (Crimson accent) */}
        <div
          onClick={() => navigate('/admin/dispatch')}
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--emergency-border)',
            borderLeft: '4px solid var(--emergency)',
            borderRadius: 'var(--radius-card)',
            padding: '20px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--emergency)' }}>
            <span style={{ fontSize: 'var(--text-caption)', fontWeight: 700, textTransform: 'uppercase' }}>Active Emergencies</span>
            <AlertTriangle size={18} />
          </div>
          <div style={{ fontSize: 'var(--text-display)', fontWeight: 700, color: 'var(--emergency)', marginTop: '8px' }}>
            {overview ? overview.active_emergencies : '—'}
          </div>
        </div>

        {/* Resolved Incidents */}
        <div
          onClick={() => navigate('/admin/incidents?status=RESOLVED')}
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '20px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--success)' }}>
            <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, textTransform: 'uppercase' }}>Resolved Incidents</span>
            <CheckCircle2 size={18} />
          </div>
          <div style={{ fontSize: 'var(--text-display)', fontWeight: 700, color: 'var(--success)', marginTop: '8px' }}>
            {overview ? overview.resolved_incidents : '—'}
          </div>
        </div>

        {/* Average Response Time */}
        <div
          onClick={() => navigate('/admin/analytics')}
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '20px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--brand)' }}>
            <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, textTransform: 'uppercase' }}>Avg Response Time</span>
            <Clock size={18} />
          </div>
          <div style={{ fontSize: 'var(--text-display)', fontWeight: 700, color: 'var(--brand)', marginTop: '8px' }}>
            {overview && overview.avg_response_time_seconds > 0
              ? `${Math.round(overview.avg_response_time_seconds / 60)} min`
              : '—'}
          </div>
        </div>

        {/* Domain Categories Count */}
        <div
          onClick={() => navigate('/admin/analytics')}
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)',
            padding: '20px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, textTransform: 'uppercase' }}>Active Domains</span>
            <Activity size={18} />
          </div>
          <div style={{ fontSize: 'var(--text-display)', fontWeight: 700, color: 'var(--text)', marginTop: '8px' }}>
            {overview && overview.categories ? Object.keys(overview.categories).length : '—'}
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('incidents')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-control)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 'var(--text-body-sm)',
            backgroundColor: activeTab === 'incidents' ? 'var(--brand-soft)' : 'transparent',
            color: activeTab === 'incidents' ? 'var(--brand)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Layers size={16} />
          <span>Active Incident Roster ({incidents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('emergency-access')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-control)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 'var(--text-body-sm)',
            backgroundColor: activeTab === 'emergency-access' ? 'var(--emergency-soft)' : 'transparent',
            color: activeTab === 'emergency-access' ? 'var(--emergency)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldAlert size={16} />
          <span>Emergency Access Oversight</span>
        </button>
      </div>

      {activeTab === 'emergency-access' ? (
        <EmergencyAccessTable currentUser={user} />
      ) : (
        /* Admin Operational Incident Table */
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Table Filter Controls */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700 }}>
              Active Incident Roster ({incidents.length})
            </h2>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Search incident ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '200px', padding: '6px 10px', fontSize: 'var(--text-body-sm)' }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--brand)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-control)',
                    cursor: 'pointer',
                  }}
                >
                  <Search size={14} />
                </button>
              </form>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 'auto', padding: '6px 10px', fontSize: 'var(--text-body-sm)' }}
              >
                <option value="">All Statuses</option>
                <option value="CREATED">CREATED</option>
                <option value="ROUTED">ROUTED</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="RESPONDER_ON_THE_WAY">EN ROUTE</option>
                <option value="RESPONDER_AT_LOCATION">AT LOCATION</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>
          </div>

          {/* Incident Table */}
          {incidents.length === 0 ? (
            <EmptyState
              title="No incidents in queue"
              description="There are currently no active or reported cases matching this criteria."
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-body-sm)' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>ID</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Description</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>Time</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc) => {
                    const isEmerg = inc.workflow === 'EMERGENCY_SOS';
                    return (
                      <tr
                        key={inc.id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          transition: 'background-color var(--transition-fast)',
                        }}
                      >
                        <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isEmerg ? 'var(--emergency)' : 'var(--brand)' }}>
                          {inc.public_id}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-pill)',
                              backgroundColor: isEmerg ? 'var(--emergency-soft)' : 'var(--brand-soft)',
                              color: isEmerg ? 'var(--emergency)' : 'var(--brand)',
                            }}
                          >
                            {isEmerg ? 'EMERGENCY SOS' : 'STANDARD'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                          {inc.category}
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-muted)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inc.description}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <StatusChip status={inc.status} size="sm" />
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>
                          {new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <Link
                            to={`/admin/incidents/${inc.id}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              backgroundColor: 'var(--surface-2)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-control)',
                              fontSize: 'var(--text-caption)',
                              fontWeight: 600,
                              color: 'var(--text)',
                              textDecoration: 'none',
                            }}
                          >
                            <Eye size={13} /> View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
