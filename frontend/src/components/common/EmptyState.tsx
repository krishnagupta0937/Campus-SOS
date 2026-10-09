import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There is currently no data to display.',
  icon,
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        backgroundColor: 'var(--surface)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border)',
        minHeight: '200px',
      }}
    >
      <div
        style={{
          color: 'var(--text-muted)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon || <Inbox size={40} strokeWidth={1.5} />}
      </div>
      <h3
        style={{
          fontSize: 'var(--text-h3)',
          fontWeight: 600,
          color: 'var(--text)',
          marginBottom: '6px',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 'var(--text-body-sm)',
          color: 'var(--text-muted)',
          maxWidth: '380px',
          marginBottom: action ? '20px' : '0px',
        }}
      >
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
