import { describe, it, expect } from 'vitest';
import { computeAuditHash, verifyAuditChain, generateSecureToken, hashToken } from './crypto.utils';

describe('CryptoUtils', () => {
  describe('Audit Hash Chain', () => {
    it('should compute deterministic hashes for audit events', () => {
      const hash1 = computeAuditHash({
        prevHash: null,
        id: 'event-1',
        occurredAt: '2026-10-04T12:00:00.000Z',
        eventType: 'INCIDENT_CREATED',
        actorUserId: 'user-1',
        detailsJson: JSON.stringify({ publicId: 'SOS-2026-0001' }),
      });

      const hash2 = computeAuditHash({
        prevHash: null,
        id: 'event-1',
        occurredAt: '2026-10-04T12:00:00.000Z',
        eventType: 'INCIDENT_CREATED',
        actorUserId: 'user-1',
        detailsJson: JSON.stringify({ publicId: 'SOS-2026-0001' }),
      });

      expect(hash1.toString('hex')).toBe(hash2.toString('hex'));
      expect(hash1.length).toBe(32); // 256 bits = 32 bytes
    });

    it('should verify a valid audit chain successfully', () => {
      const event1Id = 'evt-1';
      const event1Time = '2026-10-04T12:00:00.000Z';
      const event1Details = { action: 'created' };
      const hash1 = computeAuditHash({
        prevHash: null,
        id: event1Id,
        occurredAt: event1Time,
        eventType: 'INCIDENT_CREATED',
        actorUserId: 'user-1',
        detailsJson: JSON.stringify(event1Details),
      });

      const event2Id = 'evt-2';
      const event2Time = '2026-10-04T12:01:00.000Z';
      const event2Details = { status: 'TEAMS_NOTIFIED' };
      const hash2 = computeAuditHash({
        prevHash: hash1,
        id: event2Id,
        occurredAt: event2Time,
        eventType: 'STATUS_CHANGED',
        actorUserId: null,
        detailsJson: JSON.stringify(event2Details),
      });

      const chain = [
        {
          id: event1Id,
          occurredAt: event1Time,
          eventType: 'INCIDENT_CREATED',
          actorUserId: 'user-1',
          details: event1Details,
          prevHash: null,
          hash: hash1,
        },
        {
          id: event2Id,
          occurredAt: event2Time,
          eventType: 'STATUS_CHANGED',
          actorUserId: null,
          details: event2Details,
          prevHash: hash1,
          hash: hash2,
        },
      ];

      const result = verifyAuditChain(chain);
      expect(result.valid).toBe(true);
      expect(result.brokenAt).toBeUndefined();
    });

    it('should detect a tampered audit event payload', () => {
      const event1Id = 'evt-1';
      const event1Time = '2026-10-04T12:00:00.000Z';
      const event1Details = { action: 'created' };
      const hash1 = computeAuditHash({
        prevHash: null,
        id: event1Id,
        occurredAt: event1Time,
        eventType: 'INCIDENT_CREATED',
        actorUserId: 'user-1',
        detailsJson: JSON.stringify(event1Details),
      });

      const chain = [
        {
          id: event1Id,
          occurredAt: event1Time,
          eventType: 'INCIDENT_CREATED',
          actorUserId: 'user-1',
          details: { action: 'TAMPERED_ACTION' }, // payload tampered!
          prevHash: null,
          hash: hash1,
        },
      ];

      const result = verifyAuditChain(chain);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe(0);
    });
  });

  describe('Secure Tokens', () => {
    it('should generate secure random tokens of requested length', () => {
      const token = generateSecureToken(32);
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes hex encoded = 64 characters
    });

    it('should deterministically hash tokens with SHA-256', () => {
      const token = 'my-sample-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
