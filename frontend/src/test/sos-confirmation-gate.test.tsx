import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SosConfirmation } from '../routes/student/SosConfirmation';
import { sosService } from '../services/sosService';

vi.mock('../services/sosService', () => ({
  sosService: {
    previewDraft: vi.fn(),
    confirmDraft: vi.fn().mockResolvedValue({
      incident: { id: 'inc-123', public_id: 'SOS-2026-001', status: 'CREATED', workflow: 'EMERGENCY_SOS' },
      live_channel: 'incident:inc-123',
    }),
    deleteDraft: vi.fn().mockResolvedValue({ deleted: true }),
  },
}));

describe('SOS Confirmation Gate & AI Panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CRITICAL: Never calls final confirmDraft on initial render or preview', async () => {
    (sosService.previewDraft as any).mockResolvedValueOnce({
      classification: {
        category_label: 'Fire Hazard',
        category: 'FIRE',
        severity: 'CRITICAL',
        immediate_danger: true,
        confidence: 0.98,
        reasoning: 'Active fire hazard reported with smoke.',
      },
      source: 'gemini',
      teams_to_alert: ['Fire & Safety', 'Security'],
      restricted_notice: false,
    });

    render(
      <MemoryRouter initialEntries={['/student/sos/draft-456/confirm']}>
        <Routes>
          <Route path="/student/sos/:draftId/confirm" element={<SosConfirmation />} />
        </Routes>
      </MemoryRouter>
    );

    // Verify preview was loaded
    await waitFor(() => {
      expect(sosService.previewDraft).toHaveBeenCalledWith('draft-456');
    });

    // Assert that confirmDraft has NEVER been called yet
    expect(sosService.confirmDraft).not.toHaveBeenCalled();

    // Verify AI analysis panel rendered
    expect(await screen.findByText(/AI Incident Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Gemini Live Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/98%/i)).toBeInTheDocument();
    expect(screen.getByText(/AI assists incident understanding. Campus SOS policy determines routing./i)).toBeInTheDocument();
  });

  it('Calls confirmDraft ONLY when user explicitly clicks CONFIRM EMERGENCY', async () => {
    (sosService.previewDraft as any).mockResolvedValueOnce({
      classification: {
        category_label: 'Medical Emergency',
        category: 'MEDICAL_EMERGENCY',
        severity: 'CRITICAL',
        immediate_danger: true,
        confidence: 0.95,
      },
      source: 'gemini',
      teams_to_alert: ['Medical', 'Security'],
      restricted_notice: true,
    });

    render(
      <MemoryRouter initialEntries={['/student/sos/draft-456/confirm']}>
        <Routes>
          <Route path="/student/sos/:draftId/confirm" element={<SosConfirmation />} />
          <Route path="/student/sos/inc-123/live" element={<div>Live Tracking Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the confirmation button to be available
    const confirmButton = await screen.findByRole('button', { name: /confirm emergency/i });
    expect(confirmButton).toBeInTheDocument();

    // Confirm button has not been clicked yet
    expect(sosService.confirmDraft).not.toHaveBeenCalled();

    // Explicit user click
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(sosService.confirmDraft).toHaveBeenCalledTimes(1);
      // Ensure it was called with the draft ID and an idempotency key parameter
      expect(sosService.confirmDraft).toHaveBeenCalledWith('draft-456', expect.any(String));
    });
  });

  it('Displays AI fallback banner when AI source is rule_fallback', async () => {
    (sosService.previewDraft as any).mockResolvedValueOnce({
      classification: {
        category_label: 'Physical Altercation',
        category: 'FIGHT_QUARREL',
        severity: 'HIGH',
        immediate_danger: true,
        confidence: 0.85,
        reasoning: 'Safety keyword match: fight reported.',
      },
      source: 'rule_fallback',
      teams_to_alert: ['Security', 'Chief Proctor'],
      restricted_notice: true,
    });

    render(
      <MemoryRouter initialEntries={['/student/sos/draft-789/confirm']}>
        <Routes>
          <Route path="/student/sos/:draftId/confirm" element={<SosConfirmation />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/AI analysis unavailable. Using Campus SOS safety rules./i)).toBeInTheDocument();
    expect(screen.getByText(/Deterministic Safety Rules/i)).toBeInTheDocument();
  });
});
