import React from 'react';
import type { DutyState } from '../../types';

interface DutyBadgeProps {
  state: DutyState;
  showDotOnly?: boolean;
}

export const DutyBadge: React.FC<DutyBadgeProps> = ({ state, showDotOnly = false }) => {
  const getConfig = () => {
    switch (state) {
      case 'AVAILABLE':
        return {
          label: 'Available',
          color: 'var(--duty-available)',
          bgColor: 'var(--success-soft)',
        };
      case 'BUSY':
        return {
          label: 'Busy',
          color: 'var(--duty-busy)',
          bgColor: 'var(--warning-soft)',
        };
      case 'OFFLINE':
      default:
        return {
          label: 'Offline',
          color: 'var(--duty-offline)',
          bgColor: 'var(--surface-2)',
        };
    }
  };

  const config = getConfig();

  if (showDotOnly) {
    return (
      <span
        title={config.label}
        aria-label={config.label}
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: config.color,
          display: 'inline-block',
        }}
      />
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 8px',
        borderRadius: 'var(--radius-pill)',
        fontSize: 'var(--text-caption)',
        fontWeight: 600,
        backgroundColor: config.bgColor,
        color: config.color,
        border: `1px solid ${config.color}20`,
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: config.color,
        }}
      />
      {config.label}
    </span>
  );
};
