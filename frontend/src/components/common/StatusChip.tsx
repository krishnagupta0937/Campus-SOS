import React from 'react';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Navigation,
  MapPin,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import type { IncidentStatus } from '../../types';

interface StatusChipProps {
  status: IncidentStatus | string;
  size?: 'sm' | 'md';
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'CREATED':
        return {
          label: 'Created',
          icon: <Clock size={size === 'sm' ? 12 : 14} aria-hidden="true" />,
          className: 'chip-neutral',
        };
      case 'CLASSIFIED':
      case 'ROUTED':
        return {
          label: 'In Review',
          icon: <ShieldAlert size={size === 'sm' ? 12 : 14} aria-hidden="true" />,
          className: 'chip-info',
        };
      case 'ASSIGNED':
        return {
          label: 'Assigned',
          icon: <AlertCircle size={size === 'sm' ? 12 : 14} aria-hidden="true" />,
          className: 'chip-warning',
        };
      case 'RESPONDER_ON_THE_WAY':
        return {
          label: 'En Route',
          icon: <Navigation size={size === 'sm' ? 12 : 14} aria-hidden="true" />,
          className: 'chip-info',
        };
      case 'RESPONDER_AT_LOCATION':
        return {
          label: 'At Location',
          icon: <MapPin size={size === 'sm' ? 12 : 14} aria-hidden="true" />,
          className: 'chip-warning',
        };
      case 'RESOLVED':
      case 'CLOSED':
        return {
          label: 'Resolved',
          icon: <CheckCircle2 size={size === 'sm' ? 12 : 14} aria-hidden="true" />,
          className: 'chip-success',
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          icon: <XCircle size={size === 'sm' ? 12 : 14} aria-hidden="true" />,
          className: 'chip-neutral',
        };
      default:
        return {
          label: status.replace(/_/g, ' '),
          icon: <Clock size={size === 'sm' ? 12 : 14} aria-hidden="true" />,
          className: 'chip-neutral',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className={`chip ${config.className}`}
      style={{
        fontSize: size === 'sm' ? '11px' : 'var(--text-caption)',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
      }}
      role="status"
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
