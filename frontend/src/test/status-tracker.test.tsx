import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusTracker } from '../components/timeline/StatusTracker';
import type { SosStepStatus } from '../types';

describe('StatusTracker Component', () => {
  const steps: SosStepStatus[] = [
    { key: 'EMERGENCY_CREATED', label: 'Emergency Created', at: '2026-10-06T08:00:00Z', done: true },
    { key: 'TEAMS_NOTIFIED', label: 'Teams Notified', at: '2026-10-06T08:00:30Z', done: true },
    { key: 'RESPONDER_ASSIGNED', label: 'Responder Assigned', at: '2026-10-06T08:01:15Z', done: true },
    { key: 'RESPONDER_ON_THE_WAY', label: 'Responder On the Way', at: null, done: false },
    { key: 'RESPONDER_AT_LOCATION', label: 'Responder At Location', at: null, done: false },
    { key: 'RESOLVED', label: 'Resolved', at: null, done: false },
  ];

  it('renders all 6 response milestones with correct labels', () => {
    render(<StatusTracker steps={steps} currentStatus="RESPONDER_ASSIGNED" />);

    expect(screen.getByText('Emergency Created')).toBeInTheDocument();
    expect(screen.getByText('Teams Notified')).toBeInTheDocument();
    expect(screen.getByText('Responder Assigned')).toBeInTheDocument();
    expect(screen.getByText('Responder On the Way')).toBeInTheDocument();
    expect(screen.getByText('Responder At Location')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('has aria-live polite accessibility attribute', () => {
    const { container } = render(<StatusTracker steps={steps} currentStatus="RESPONDER_ASSIGNED" />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });
});
