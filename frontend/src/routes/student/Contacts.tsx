import React, { useState, useEffect } from 'react';
import { notificationService } from '../../services/notificationService';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import type { HotlineItem } from '../../types';
import { PhoneCall, Copy, Check, Phone } from 'lucide-react';

export const Contacts: React.FC = () => {
  const [hotlines, setHotlines] = useState<HotlineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    notificationService
      .getHotlines()
      .then((data) => {
        setHotlines(data || []);
      })
      .catch(() => {
        setHotlines([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleCopy = (id: string, phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="content-wrap" style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700 }}>Emergency Contacts & Hotlines</h1>
        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
          Official 24/7 campus dispatch and emergency responder phone lines.
        </p>
      </div>

      {isLoading ? (
        <LoadingState message="Loading campus hotline directory..." />
      ) : hotlines.length === 0 ? (
        <EmptyState
          title="No hotlines configured"
          description="Emergency hotlines have not been configured by campus administration yet."
          icon={<Phone size={36} />}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {hotlines.map((h) => (
            <div
              key={h.id}
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-card)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: 'var(--text-h3)' }}>{h.label}</strong>
                  {h.is24x7 && (
                    <span
                      style={{
                        backgroundColor: 'var(--success-soft)',
                        color: 'var(--success)',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-pill)',
                      }}
                    >
                      24/7
                    </span>
                  )}
                </div>
                {h.description && (
                  <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {h.description}
                  </p>
                )}
                <div style={{ fontSize: 'var(--text-body)', fontWeight: 700, color: 'var(--brand)', marginTop: '4px' }}>
                  {h.phone}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleCopy(h.id, h.phone)}
                  title="Copy Phone Number"
                  aria-label={`Copy phone number for ${h.label}`}
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-control)',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: 'var(--text-caption)',
                    fontWeight: 600,
                    color: 'var(--text)',
                  }}
                >
                  {copiedId === h.id ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                  <span>{copiedId === h.id ? 'Copied' : 'Copy'}</span>
                </button>

                <a
                  href={`tel:${h.phone}`}
                  style={{
                    backgroundColor: 'var(--brand)',
                    color: 'white',
                    borderRadius: 'var(--radius-control)',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                    fontSize: 'var(--text-body-sm)',
                    fontWeight: 600,
                  }}
                >
                  <PhoneCall size={16} />
                  <span>Call</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
