import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BreakGlassModal } from '../components/break-glass/BreakGlassModal';
import { BreakGlassBanner } from '../components/break-glass/BreakGlassBanner';
import { ProtectedReporterContact } from '../components/break-glass/ProtectedReporterContact';
import { SupervisorReviewModal } from '../components/break-glass/SupervisorReviewModal';
import { breakGlassService } from '../services/breakGlassService';
import type { BreakGlassRequest, UserProfile } from '../types';

vi.mock('../services/breakGlassService', () => ({
  breakGlassService: {
    requestEmergencyAccess: vi.fn(),
    approveEmergencyAccess: vi.fn(),
    rejectEmergencyAccess: vi.fn(),
    revokeEmergencyAccess: vi.fn(),
    reviewEmergencyAccess: vi.fn(),
    getEmergencyAccessStatus: vi.fn(),
    listEmergencyAccessRequests: vi.fn(),
    getReporterContact: vi.fn(),
    cleanupExpiredGrants: vi.fn(),
  },
}));

const mockOfficerUser: UserProfile = {
  id: 'usr-officer-1',
  email: 'officer@campus.edu',
  fullName: 'Officer Safety',
  role: 'SECURITY',
  isSuspended: false,
  createdAt: '2026-01-01T00:00:00Z',
  teamMemberships: [],
};

const mockAdminUser: UserProfile = {
  id: 'usr-admin-1',
  email: 'admin@campus.edu',
  fullName: 'Campus Admin',
  role: 'CAMPUS_ADMIN',
  isSuspended: false,
  createdAt: '2026-01-01T00:00:00Z',
  teamMemberships: [],
};

const baseActiveRequest: BreakGlassRequest = {
  id: 'bg-req-123',
  incident_id: 'inc-456',
  requester: {
    id: 'usr-officer-1',
    full_name: 'Officer Safety',
    role: 'SECURITY',
  },
  type: 'NORMAL_OVERRIDE',
  status: 'ACTIVE',
  requested_scopes: ['INCIDENT_VIEW', 'LOCATION_VIEW'],
  approved_scopes: ['INCIDENT_VIEW', 'LOCATION_VIEW'],
  reason: 'Urgent containment of south quad chemical alert.',
  requested_at: '2026-10-06T09:00:00Z',
  approver: {
    id: 'usr-admin-1',
    full_name: 'Campus Admin',
    role: 'CAMPUS_ADMIN',
  },
  approved_at: '2026-10-06T09:05:00Z',
  activated_at: '2026-10-06T09:05:00Z',
  expires_at: new Date(Date.now() + 50 * 60 * 1000).toISOString(), // 50 mins in future
  supervisor_review_status: 'NOT_REQUIRED',
};

describe('Emergency Access / Break-Glass Frontend Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. BreakGlassModal Request Flow', () => {
    it('renders scopes, mode options, and requires substantive reason', async () => {
      const onClose = vi.fn();
      const onSuccess = vi.fn();

      render(
        <BreakGlassModal
          incidentId="inc-456"
          incidentPublicId="INC-2026-042"
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

      // Verify header and target public ID
      expect(screen.getByText(/Emergency Access Request/i)).toBeInTheDocument();
      expect(screen.getByText('INC-2026-042')).toBeInTheDocument();

      // Scopes rendered
      expect(screen.getByText('Incident Dossier')).toBeInTheDocument();
      expect(screen.getByText('Location & Map Pin')).toBeInTheDocument();
      expect(screen.getByText('Protected Evidence')).toBeInTheDocument();
      expect(screen.getByText('Reporter Contact')).toBeInTheDocument();
      expect(screen.getByText('Live Realtime Telemetry')).toBeInTheDocument();

      // Attempt submit with short reason (< 5 chars)
      const reasonInput = screen.getByPlaceholderText(/State the operational necessity/i);
      fireEvent.change(reasonInput, { target: { value: 'ab' } });
      const submitBtn = screen.getByRole('button', { name: /Submit Access Request/i });
      fireEvent.click(submitBtn);

      // Verify validation warning
      expect(screen.getByText(/Substantive operational reason required/i)).toBeInTheDocument();
      expect(breakGlassService.requestEmergencyAccess).not.toHaveBeenCalled();
    });

    it('submits valid request to breakGlassService', async () => {
      const onSuccess = vi.fn();
      vi.mocked(breakGlassService.requestEmergencyAccess).mockResolvedValueOnce({
        ...baseActiveRequest,
        status: 'REQUESTED',
      });

      render(
        <BreakGlassModal
          incidentId="inc-456"
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />
      );

      // Enter valid reason
      const reasonInput = screen.getByPlaceholderText(/State the operational necessity/i);
      fireEvent.change(reasonInput, {
        target: { value: 'Officer assisting with perimeter lock for HazMat unit' },
      });

      // Submit
      const submitBtn = screen.getByRole('button', { name: /Submit Access Request/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(breakGlassService.requestEmergencyAccess).toHaveBeenCalledWith({
          incident_id: 'inc-456',
          type: 'NORMAL_OVERRIDE',
          requested_scopes: ['INCIDENT_VIEW'],
          reason: 'Officer assisting with perimeter lock for HazMat unit',
        });
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('switches to CRITICAL_BREAK_GLASS and shows solemn emergency warning', async () => {
      render(
        <BreakGlassModal
          incidentId="inc-456"
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      // Click Critical Break-Glass
      const criticalBtn = screen.getByRole('button', { name: /Critical Break-Glass/i });
      fireEvent.click(criticalBtn);

      // Solemn warning displayed
      expect(screen.getByText(/THIS IS AN EMERGENCY ACCESS ACTION/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Activate Emergency Access/i })).toBeInTheDocument();
    });
  });

  describe('2. BreakGlassBanner State Display', () => {
    it('displays active access banner with scopes and countdown', () => {
      render(
        <BreakGlassBanner
          request={baseActiveRequest}
          currentUser={mockOfficerUser}
          onRefresh={vi.fn()}
        />
      );

      expect(screen.getByText(/EMERGENCY ACCESS ACTIVE/i)).toBeInTheDocument();
      expect(screen.getByText('NORMAL OVERRIDE')).toBeInTheDocument();
      expect(screen.getByText('INCIDENT_VIEW')).toBeInTheDocument();
      expect(screen.getByText('LOCATION_VIEW')).toBeInTheDocument();
      expect(screen.getByText(new RegExp(baseActiveRequest.reason, 'i'))).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Revoke Access/i })).toBeInTheDocument();
    });

    it('displays pending approval state and allows supervisor to approve', async () => {
      const pendingRequest: BreakGlassRequest = {
        ...baseActiveRequest,
        status: 'REQUESTED',
        approved_scopes: [],
        approver: null,
      };

      vi.mocked(breakGlassService.approveEmergencyAccess).mockResolvedValueOnce({
        ...pendingRequest,
        status: 'ACTIVE',
      });

      const onRefresh = vi.fn();

      render(
        <BreakGlassBanner
          request={pendingRequest}
          currentUser={mockAdminUser}
          onRefresh={onRefresh}
        />
      );

      expect(screen.getByText(/ACCESS REQUEST PENDING/i)).toBeInTheDocument();

      // Admin sees approve button
      const approveBtn = screen.getByRole('button', { name: /Approve Access/i });
      fireEvent.click(approveBtn);

      // Confirm dialog appears
      const confirmBtn = screen.getByRole('button', { name: /Confirm Approval/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(breakGlassService.approveEmergencyAccess).toHaveBeenCalledWith({
          request_id: 'bg-req-123',
        });
        expect(onRefresh).toHaveBeenCalled();
      });
    });

    it('allows revocation with operational reason', async () => {
      vi.mocked(breakGlassService.revokeEmergencyAccess).mockResolvedValueOnce({
        ...baseActiveRequest,
        status: 'REVOKED',
      });

      const onRefresh = vi.fn();

      render(
        <BreakGlassBanner
          request={baseActiveRequest}
          currentUser={mockOfficerUser}
          onRefresh={onRefresh}
        />
      );

      // Click Revoke
      const revokeBtn = screen.getByRole('button', { name: /Revoke Access/i });
      fireEvent.click(revokeBtn);

      // Revocation reason input appears
      const reasonInput = screen.getByPlaceholderText(/Operational reason for revocation/i);
      fireEvent.change(reasonInput, {
        target: { value: 'Handover to primary medical team completed.' },
      });

      const confirmRevokeBtn = screen.getByRole('button', { name: /Confirm Revoke/i });
      fireEvent.click(confirmRevokeBtn);

      await waitFor(() => {
        expect(breakGlassService.revokeEmergencyAccess).toHaveBeenCalledWith({
          request_id: 'bg-req-123',
          reason: 'Handover to primary medical team completed.',
        });
        expect(onRefresh).toHaveBeenCalled();
      });
    });

    it('displays REVIEW REQUIRED badge for critical break-glass', () => {
      const reviewReq: BreakGlassRequest = {
        ...baseActiveRequest,
        type: 'CRITICAL_BREAK_GLASS',
        supervisor_review_status: 'REVIEW_REQUIRED',
      };

      render(
        <BreakGlassBanner
          request={reviewReq}
          currentUser={mockAdminUser}
          onRefresh={vi.fn()}
        />
      );

      expect(screen.getByText(/REVIEW REQUIRED/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Audit Break-Glass/i })).toBeInTheDocument();
    });
  });

  describe('3. ProtectedReporterContact Audited Gate', () => {
    it('shows restricted indicator when user lacks permission and never auto-loads', () => {
      render(
        <ProtectedReporterContact
          incidentId="inc-456"
          hasPermission={false}
        />
      );

      expect(screen.getByText(/Reporter Contact Restricted/i)).toBeInTheDocument();
      expect(breakGlassService.getReporterContact).not.toHaveBeenCalled();
    });

    it('requires explicit user action to reveal contact when permitted', async () => {
      vi.mocked(breakGlassService.getReporterContact).mockResolvedValueOnce({
        incident_id: 'inc-456',
        reporter: {
          id: 'stu-789',
          full_name: 'Jane Doe',
          email: 'jane@campus.edu',
          phone: '+919876543210',
        },
      });

      render(
        <ProtectedReporterContact
          incidentId="inc-456"
          hasPermission={true}
          isEmergencyAuthorized={true}
        />
      );

      // Initially concealed
      expect(screen.getByText(/Authorized under Emergency Access/i)).toBeInTheDocument();
      expect(screen.getByText(/Contact details hidden by default/i)).toBeInTheDocument();
      expect(breakGlassService.getReporterContact).not.toHaveBeenCalled();

      // Click Reveal
      const revealBtn = screen.getByRole('button', { name: /Reveal Reporter Contact/i });
      fireEvent.click(revealBtn);

      await waitFor(() => {
        expect(breakGlassService.getReporterContact).toHaveBeenCalledWith('inc-456');
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText('jane@campus.edu')).toBeInTheDocument();
        expect(screen.getByText('+919876543210')).toBeInTheDocument();
        expect(screen.getByText(/Access logged with actor ID and IP address/i)).toBeInTheDocument();
      });
    });
  });

  describe('4. SupervisorReviewModal Administrative Audit', () => {
    it('records review decision and notes into cryptographic audit ledger', async () => {
      const reviewReq: BreakGlassRequest = {
        ...baseActiveRequest,
        type: 'CRITICAL_BREAK_GLASS',
        supervisor_review_status: 'REVIEW_REQUIRED',
      };

      vi.mocked(breakGlassService.reviewEmergencyAccess).mockResolvedValueOnce({
        ...reviewReq,
        supervisor_review_status: 'REVIEWED',
        supervisor_review_notes: 'Verified emergency entry with fire marshal.',
      });

      const onSuccess = vi.fn();

      render(
        <SupervisorReviewModal
          request={reviewReq}
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={onSuccess}
        />
      );

      expect(screen.getByText(/Supervisor Break-Glass Audit/i)).toBeInTheDocument();

      const notesInput = screen.getByPlaceholderText(/Record supervisory findings/i);
      fireEvent.change(notesInput, {
        target: { value: 'Verified emergency entry with fire marshal.' },
      });

      const submitBtn = screen.getByRole('button', { name: /Record Review/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(breakGlassService.reviewEmergencyAccess).toHaveBeenCalledWith({
          request_id: 'bg-req-123',
          status: 'REVIEWED',
          notes: 'Verified emergency entry with fire marshal.',
        });
        expect(onSuccess).toHaveBeenCalled();
      });
    });
  });
});
