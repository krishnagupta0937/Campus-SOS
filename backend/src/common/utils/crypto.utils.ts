import { createHash, randomBytes } from 'crypto';

/**
 * Compute SHA-256 hash for the audit chain.
 * hash = SHA-256(prevHash + id + occurredAt + eventType + actorUserId + detailsJson)
 */
export function computeAuditHash(params: {
  prevHash: Buffer | null;
  id: string;
  occurredAt: string;
  eventType: string;
  actorUserId: string | null;
  detailsJson: string;
}): Buffer {
  const data = [
    params.prevHash ? params.prevHash.toString('hex') : '0'.repeat(64),
    params.id,
    params.occurredAt,
    params.eventType,
    params.actorUserId || '',
    params.detailsJson,
  ].join('|');

  return createHash('sha256').update(data).digest();
}

/**
 * Verify the integrity of an audit event chain.
 */
export function verifyAuditChain(events: Array<{
  id: string;
  occurredAt: string;
  eventType: string;
  actorUserId: string | null;
  details: any;
  prevHash: Buffer | null;
  hash: Buffer | null;
}>): { valid: boolean; brokenAt?: number } {
  let expectedPrevHash: Buffer | null = null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Check prev_hash matches
    if (i > 0 && event.prevHash) {
      const prev = events[i - 1];
      if (prev.hash && !event.prevHash.equals(prev.hash)) {
        return { valid: false, brokenAt: i };
      }
    }

    // Recompute hash and compare
    const expectedHash = computeAuditHash({
      prevHash: expectedPrevHash,
      id: String(event.id),
      occurredAt: event.occurredAt,
      eventType: event.eventType,
      actorUserId: event.actorUserId,
      detailsJson: JSON.stringify(event.details || {}),
    });

    if (event.hash && !event.hash.equals(expectedHash)) {
      return { valid: false, brokenAt: i };
    }

    expectedPrevHash = event.hash || expectedHash;
  }

  return { valid: true };
}

/**
 * Generate a cryptographically secure random token (hex string).
 */
export function generateSecureToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Hash a refresh token for storage using SHA-256.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
