import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, FilePlus, PhoneCall, Bell, Users, Activity, ChevronRight } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { exploreService } from '../../services/exploreService';
import { EmptyState } from '../../components/common/EmptyState';
import { LoadingState } from '../../components/common/LoadingState';
import type { CampusNotice, HotlineItem } from '../../types';

export const StudentHome: React.FC = () => {
  const navigate = useNavigate();
  const [notices, setNotices] = useState<CampusNotice[]>([]);
  const [hotlines, setHotlines] = useState<HotlineItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [activeNotices, campusHotlines, activityFeed] = await Promise.allSettled([
          notificationService.getActiveNotices(),
          notificationService.getHotlines(),
          exploreService.getActivity(),
        ]);

        if (activeNotices.status === 'fulfilled') setNotices(activeNotices.value);
        if (campusHotlines.status === 'fulfilled') setHotlines(campusHotlines.value);
        if (activityFeed.status === 'fulfilled') setRecentActivity(activityFeed.value);
      } finally {
        setIsLoading(false);
      }
    };

    loadHomeData();
  }, []);

  if (isLoading) {
    return <LoadingState message="Loading campus safety status..." />;
  }

  return (
    <div className="content-wrap" style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Primary Actions — Emergency SOS & Report Incident */}
      <section aria-label="Emergency actions" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Giant Emergency SOS Button */}
        <button
          type="button"
          onClick={() => navigate('/student/sos')}
          style={{
            height: '72px',
            minHeight: '72px',
            width: '100%',
            backgroundColor: 'var(--emergency)',
            color: 'var(--emergency-contrast)',
            border: 'none',
            borderRadius: 'var(--radius-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: 'var(--text-h2)',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(200, 16, 46, 0.35)',
            transition: 'transform var(--transition-fast), background-color var(--transition-fast)',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <AlertCircle size={28} />
          <span>EMERGENCY SOS</span>
        </button>

        {/* Report an Incident Button */}
        <Link
          to="/student/report"
          style={{
            height: '52px',
            width: '100%',
            backgroundColor: 'var(--surface)',
            color: 'var(--brand)',
            border: '2px solid var(--brand)',
            borderRadius: 'var(--radius-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: 'var(--text-h3)',
            fontWeight: 600,
            textDecoration: 'none',
            boxSizing: 'border-box',
          }}
        >
          <FilePlus size={20} />
          <span>Report Non-Emergency Incident</span>
        </Link>
      </section>

      {/* 2. Active Safety Notices */}
      <section aria-label="Active safety notices">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Active Safety Notices</h2>
        </div>
        {notices.length === 0 ? (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: 'var(--text-body-sm)',
            }}
          >
            No active safety notices at this time.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notices.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--surface)',
                  borderRadius: 'var(--radius-card)',
                  borderLeft: '4px solid var(--brand)',
                  border: '1px solid var(--border)',
                  borderLeftWidth: '4px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Bell size={16} color="var(--brand)" />
                  <strong style={{ fontSize: 'var(--text-body)' }}>{n.title}</strong>
                </div>
                <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)' }}>{n.body}</p>
                {n.areaText && (
                  <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Affected Area: {n.areaText}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Recent Campus Activity (Explore sanitized summary) */}
      <section aria-label="Recent campus activity">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Recent Campus Activity</h2>
          <Link to="/student/explore" style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600 }}>
            View Map & Details
          </Link>
        </div>
        {recentActivity.length === 0 ? (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: 'var(--text-body-sm)',
            }}
          >
            No recent campus safety activity reported.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentActivity.slice(0, 3).map((act, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--surface)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: 'var(--text-body)' }}>{act.category || 'Incident'}</span>
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                    {act.location_summary || 'Campus'} • {act.status}
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Emergency Contacts (24/7 Hotlines) */}
      <section aria-label="Emergency contacts">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 600 }}>Emergency Hotlines (24/7)</h2>
          <Link to="/contacts" style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600 }}>
            All Contacts
          </Link>
        </div>
        {hotlines.length === 0 ? (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: 'var(--text-body-sm)',
            }}
          >
            No hotlines currently configured.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
            {hotlines.map((h) => (
              <a
                key={h.id}
                href={`tel:${h.phone}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card)',
                  textDecoration: 'none',
                  color: 'var(--text)',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-body)' }}>{h.label}</div>
                  <div style={{ fontSize: 'var(--text-caption)', color: 'var(--brand)', fontWeight: 500 }}>
                    {h.phone}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: 'var(--brand-soft)',
                    color: 'var(--brand)',
                    padding: '8px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PhoneCall size={16} />
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
