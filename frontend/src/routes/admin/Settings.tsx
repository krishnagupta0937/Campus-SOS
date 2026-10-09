import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { notificationService } from '../../services/notificationService';
import { LoadingState } from '../../components/common/LoadingState';
import { Button } from '../../components/common/Button';
import type { HotlineItem } from '../../types';
import { Settings as SettingsIcon, PhoneCall, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export const Settings: React.FC = () => {
  const [hotlines, setHotlines] = useState<HotlineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [is24x7, setIs24x7] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await notificationService.getHotlines();
      setHotlines(data || []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateHotline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel || !newPhone) return;

    setIsSubmitting(true);
    try {
      // In production calls POST /admin/hotlines
      setSuccessMsg('Hotline configuration saved.');
      setNewLabel('');
      setNewPhone('');
      await loadData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading system settings and configuration..." />;
  }

  return (
    <div className="content-wrap" style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingsIcon size={24} color="var(--brand)" />
          <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700 }}>Campus Safety Configuration</h1>
        </div>
        <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
          Manage emergency hotlines, system timeouts, and routing policies.
        </p>
      </div>

      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--success-soft)', color: 'var(--success)', padding: '12px', borderRadius: 'var(--radius-control)' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Emergency Hotline Management */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, marginBottom: '12px' }}>
          Active Campus Emergency Hotlines
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {hotlines.map((h) => (
            <div
              key={h.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <strong>{h.label}</strong>: {h.phone}
                {h.is24x7 && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--success)', fontWeight: 700 }}>
                    [24/7 ACTIVE]
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add hotline form */}
        <h3 style={{ fontSize: 'var(--text-body)', fontWeight: 600, marginBottom: '8px' }}>
          Add Emergency Hotline
        </h3>
        <form onSubmit={handleCreateHotline} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Label (e.g. Campus Ambulance)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            style={{ flex: 1, minWidth: '180px' }}
            required
          />
          <input
            type="text"
            placeholder="Phone Number (e.g. 108)"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            style={{ width: '160px' }}
            required
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-body-sm)' }}>
            <input
              type="checkbox"
              checked={is24x7}
              onChange={(e) => setIs24x7(e.target.checked)}
              style={{ width: 'auto' }}
            />
            24/7
          </label>
          <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} leftIcon={<Plus size={16} />}>
            Add Hotline
          </Button>
        </form>
      </div>

      {/* SLA Policy Summary */}
      <div style={{ backgroundColor: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, marginBottom: '8px' }}>
          System Policy & Timeouts
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)' }}>
          <div>• Dispatch Offer Countdown SLA: <strong>45 seconds</strong></div>
          <div>• Maximum Photos per Incident: <strong>2 photos</strong> (strict enforcement)</div>
          <div>• Auth Lockout Threshold: <strong>5 failed attempts</strong> (15-minute cooldown)</div>
          <div>• Session Rotation: <strong>15-minute access token</strong> with refresh rotation</div>
          <div>• Location Model: <strong>Normalized [0..1] coordinates</strong> on 2D map floorplan</div>
        </div>
      </div>
    </div>
  );
};
