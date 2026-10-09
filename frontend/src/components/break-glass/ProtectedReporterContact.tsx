import React, { useState } from 'react';
import { breakGlassService } from '../../services/breakGlassService';
import { Button } from '../common/Button';
import type { ProtectedReporterContact as ReporterContactType } from '../../types';
import { UserCheck, ShieldAlert, Phone, Mail, User, Eye, EyeOff, Lock } from 'lucide-react';

interface ProtectedReporterContactProps {
  incidentId: string;
  hasPermission: boolean; // Has REPORTER_CONTACT_VIEW scope or is CAMPUS_ADMIN / CHIEF_PROCTOR
  isEmergencyAuthorized?: boolean;
}

export const ProtectedReporterContact: React.FC<ProtectedReporterContactProps> = ({
  incidentId,
  hasPermission,
  isEmergencyAuthorized = false,
}) => {
  const [contact, setContact] = useState<ReporterContactType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleReveal = async () => {
    if (isRevealed && contact) {
      setIsRevealed(false);
      return;
    }

    if (contact) {
      setIsRevealed(true);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await breakGlassService.getReporterContact(incidentId);
      setContact(data);
      setIsRevealed(true);
    } catch (err: any) {
      setErrorMessage(
        err?.status === 403
          ? 'Access forbidden: Explicit REPORTER_CONTACT_VIEW authorization is required.'
          : 'Unable to retrieve reporter contact information.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        padding: '20px',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={18} color="var(--brand)" />
          <h3 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, margin: 0 }}>
            Reporter Identity & Contact
          </h3>
        </div>

        {/* Privacy Status Badge */}
        {hasPermission ? (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: isEmergencyAuthorized ? 'var(--warning-soft)' : 'var(--brand-soft)',
              color: isEmergencyAuthorized ? 'var(--warning-contrast, #b45309)' : 'var(--brand)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-pill)',
              border: `1px solid ${isEmergencyAuthorized ? 'var(--warning)' : 'var(--border)'}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isEmergencyAuthorized
              ? 'Authorized under Emergency Access'
              : 'Privileged Administrative Access'}
          </span>
        ) : (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: 'var(--surface-2)',
              color: 'var(--text-muted)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Lock size={12} />
            Reporter Contact Restricted
          </span>
        )}
      </div>

      {!hasPermission ? (
        <div
          style={{
            backgroundColor: 'var(--surface-2)',
            borderRadius: 'var(--radius-control)',
            padding: '12px 14px',
            fontSize: 'var(--text-caption)',
            color: 'var(--text-muted)',
            lineHeight: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <Lock size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            Direct student contact details are protected under campus privacy policy. To view contact information during an operational response, request <code>REPORTER_CONTACT_VIEW</code> via emergency access.
          </div>
        </div>
      ) : (
        <div>
          {!isRevealed ? (
            <div
              style={{
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-control)',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: 'var(--text-body-sm)', fontWeight: 600 }}>
                  Contact details hidden by default
                </div>
                <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Viewing reporter contact is logged and cryptographically signed in the audit ledger.
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                isLoading={isLoading}
                onClick={handleReveal}
                leftIcon={<Eye size={14} />}
              >
                Reveal Reporter Contact
              </Button>
            </div>
          ) : contact ? (
            <div
              style={{
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--border)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: 'var(--text-body-sm)' }}>
                  <User size={16} color="var(--brand)" />
                  <span>{contact.reporter.full_name}</span>
                </div>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => setIsRevealed(false)}
                  leftIcon={<EyeOff size={14} />}
                >
                  Hide
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: 'var(--text-caption)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} color="var(--text-muted)" />
                  <a href={`mailto:${contact.reporter.email}`} style={{ color: 'var(--brand)', textDecoration: 'none' }}>
                    {contact.reporter.email}
                  </a>
                </div>
                {contact.reporter.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} color="var(--text-muted)" />
                    <a href={`tel:${contact.reporter.phone}`} style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>
                      {contact.reporter.phone}
                    </a>
                  </div>
                )}
              </div>

              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border)',
                  paddingTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ShieldAlert size={12} color="var(--brand)" />
                Access logged with actor ID and IP address into immutable SHA-256 ledger.
              </div>
            </div>
          ) : null}

          {errorMessage && (
            <div
              style={{
                marginTop: '8px',
                backgroundColor: 'var(--emergency-soft)',
                border: '1px solid var(--emergency)',
                borderRadius: 'var(--radius-control)',
                padding: '8px 12px',
                fontSize: 'var(--text-caption)',
                color: 'var(--emergency)',
              }}
            >
              {errorMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
