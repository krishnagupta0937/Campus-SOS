import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { DutyBadge } from '../../components/common/DutyBadge';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import type { PersonnelDirectoryItem } from '../../types';
import { BookOpen, Search, Phone, Mail } from 'lucide-react';

export const Directory: React.FC = () => {
  const [personnel, setPersonnel] = useState<PersonnelDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const loadDirectory = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getDirectory({
        q: searchQuery || undefined,
        role: roleFilter || undefined,
      });
      setPersonnel(data || []);
    } catch {
      setPersonnel([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, [roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDirectory();
  };

  return (
    <div className="content-wrap" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={24} color="var(--brand)" />
          <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700 }}>Personnel & Responders Roster</h1>
        </div>
        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
          Official directory of campus safety officers, team coordinators, and active field personnel. Students are excluded.
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
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flex: 1, maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Search personnel by name or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ width: 'auto', minWidth: '180px' }}
        >
          <option value="">All Operational Roles</option>
          <option value="CAMPUS_ADMIN">Campus Admin</option>
          <option value="SECURITY">Security</option>
          <option value="MEDICAL">Medical</option>
          <option value="FIRE_SAFETY">Fire & Safety</option>
          <option value="CHIEF_PROCTOR">Chief Proctor</option>
          <option value="WOMEN_SAFETY">Women Safety</option>
          <option value="MEN_SAFETY">Men Safety</option>
          <option value="INFRASTRUCTURE">Infrastructure</option>
          <option value="TRANSPORTATION">Transportation</option>
        </select>
      </div>

      {/* Personnel Roster Table */}
      <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingState message="Loading personnel directory..." />
        ) : personnel.length === 0 ? (
          <EmptyState
            title="No personnel found"
            description="Directory lists Campus SOS personnel and responders only. No matching staff records found."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-body-sm)' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Department / Team</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Duty State</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Contact Phone</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Email</th>
                </tr>
              </thead>
              <tbody>
                {personnel.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor: 'var(--brand-soft)',
                          color: 'var(--brand)',
                        }}
                      >
                        {p.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text)' }}>
                      {p.teamName || p.designation || 'Central Campus'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <DutyBadge state={p.dutyState || 'OFFLINE'} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {p.phone ? (
                        <a href={`tel:${p.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={13} /> {p.phone}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <a href={`mailto:${p.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={13} /> {p.email}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
