import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { StatusChip } from '../../components/common/StatusChip';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import type { AdminIncidentItem } from '../../types';
import { Search, Eye, Filter } from 'lucide-react';

export const IncidentTable: React.FC = () => {
  const [incidents, setIncidents] = useState<AdminIncidentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [workflow, setWorkflow] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await adminService.getIncidents({
        q: search || undefined,
        status: status || undefined,
        workflow: workflow || undefined,
      });
      setIncidents(res.incidents || []);
    } catch {
      setIncidents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [status, workflow]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  return (
    <div className="content-wrap" style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700 }}>Incident Management Master Roster</h1>
        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
          Inspect, filter, and review all reported cases, dispatched units, and resolutions.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '380px' }}>
          <input
            type="text"
            placeholder="Search incident ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--brand)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-control)',
              cursor: 'pointer',
            }}
          >
            <Search size={16} />
          </button>
        </form>

        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={workflow} onChange={(e) => setWorkflow(e.target.value)} style={{ width: 'auto' }}>
            <option value="">All Workflows</option>
            <option value="EMERGENCY_SOS">Emergency SOS</option>
            <option value="STANDARD_REPORT">Standard Report</option>
          </select>

          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 'auto' }}>
            <option value="">All Statuses</option>
            <option value="CREATED">CREATED</option>
            <option value="ROUTED">ROUTED</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="RESPONDER_ON_THE_WAY">EN ROUTE</option>
            <option value="RESPONDER_AT_LOCATION">AT LOCATION</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingState message="Loading incident records..." />
        ) : incidents.length === 0 ? (
          <EmptyState
            title="No matching incidents"
            description="No incidents matched your query. Adjust search or filters."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-body-sm)' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Workflow</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Reported At</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => {
                  const isEmerg = inc.workflow === 'EMERGENCY_SOS';
                  return (
                    <tr key={inc.id} style={{ borderBottom: '1px solid var(--border)' }}>
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
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{inc.category}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inc.description}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <StatusChip status={inc.status} size="sm" />
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>
                        {new Date(inc.created_at).toLocaleString()}
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
    </div>
  );
};
