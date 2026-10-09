import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import type { AuditLogItem } from '../../types';
import { ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, KeyRound } from 'lucide-react';

export const AuditTrail: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    total_events: number;
    failure_index?: number;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const loadAudit = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getAuditTrail();
      setLogs(data || []);
    } catch {
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await adminService.verifyAuditChain();
      setVerificationResult(res);
    } catch {
      setVerificationResult({ valid: false, total_events: logs.length });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="content-wrap" style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={24} color="var(--brand)" />
            <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 700 }}>Cryptographic Audit Ledger</h1>
          </div>
          <p style={{ fontSize: 'var(--text-body-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
            Immutable SHA-256 hash-chained log of all safety actions, routing determinations, and data accesses.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          isLoading={isVerifying}
          onClick={handleVerifyChain}
          leftIcon={<KeyRound size={16} />}
        >
          Verify Chain Integrity
        </Button>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          style={{
            backgroundColor: verificationResult.valid ? 'var(--success-soft)' : 'var(--emergency-soft)',
            border: `1px solid ${verificationResult.valid ? 'var(--success)' : 'var(--emergency)'}`,
            borderRadius: 'var(--radius-card)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {verificationResult.valid ? (
            <CheckCircle2 size={24} color="var(--success)" />
          ) : (
            <AlertTriangle size={24} color="var(--emergency)" />
          )}
          <div>
            <strong style={{ fontSize: 'var(--text-body)', color: verificationResult.valid ? 'var(--success)' : 'var(--emergency)' }}>
              {verificationResult.valid ? 'Cryptographic Hash-Chain Intact' : 'Integrity Mismatch Detected'}
            </strong>
            <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginTop: '2px' }}>
              Verified {verificationResult.total_events} consecutive audit records using SHA-256 HMAC root state.
            </p>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {isLoading ? (
          <LoadingState message="Retrieving verifiable audit ledger..." />
        ) : logs.length === 0 ? (
          <EmptyState
            title="Audit log is empty"
            description="No system audit records recorded yet."
            icon={<ShieldCheck size={40} />}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-body-sm)' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Timestamp</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Event Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Incident Ref</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Actor Kind</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Entry Hash (SHA-256)</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                      {(() => {
                        const isBg = item.eventType.startsWith('BREAK_GLASS_');
                        const isCritical =
                          item.eventType === 'BREAK_GLASS_ACTIVATED' ||
                          item.eventType === 'BREAK_GLASS_REVIEW_REQUIRED' ||
                          item.eventType === 'BREAK_GLASS_REVOKED';
                        return (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: isBg
                                ? isCritical
                                  ? 'var(--emergency-soft)'
                                  : 'var(--brand-soft)'
                                : 'var(--surface-2)',
                              color: isBg
                                ? isCritical
                                  ? 'var(--emergency)'
                                  : 'var(--brand)'
                                : 'var(--text)',
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-pill)',
                              border: `1px solid ${
                                isBg
                                  ? isCritical
                                    ? 'var(--emergency-border)'
                                    : 'var(--brand)'
                                  : 'var(--border)'
                              }`,
                            }}
                          >
                            {item.eventType}
                          </span>
                        );
                      })()}
                      {item.details && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, marginTop: '4px' }}>
                          {item.details.reason && <span>"{item.details.reason}"</span>}
                          {item.details.scopes && (
                            <span style={{ marginLeft: '4px' }}>
                              [{Array.isArray(item.details.scopes) ? item.details.scopes.join(', ') : item.details.scopes}]
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)' }}>
                      {item.incidentId ? item.incidentId.slice(0, 12) + '...' : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text)' }}>
                      {item.actorKind}
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--brand)' }}>
                      {item.entryHash ? item.entryHash.slice(0, 16) + '...' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
