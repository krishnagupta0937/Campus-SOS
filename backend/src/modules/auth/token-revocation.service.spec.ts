import { describe, it, expect, beforeEach } from 'vitest';
import { TokenRevocationService } from './token-revocation.service';

describe('TokenRevocationService', () => {
  let service: TokenRevocationService;

  beforeEach(() => {
    service = new TokenRevocationService();
  });

  it('should not report an active token as revoked initially', () => {
    const userId = 'user-1';
    const token = 'jwt-token-abc';
    const iat = Math.floor(Date.now() / 1000);

    expect(service.isRevoked(userId, iat, token)).toBe(false);
  });

  it('should immediately report specific token as revoked after logout', () => {
    const userId = 'user-1';
    const token = 'jwt-token-abc';
    const iat = Math.floor(Date.now() / 1000);

    service.revokeUser(userId, token);

    expect(service.isRevoked(userId, iat, token)).toBe(true);
    // Another token for another user should not be revoked
    expect(service.isRevoked('user-2', iat, 'other-token')).toBe(false);
  });

  it('should invalidate any token issued prior to user revocation timestamp', () => {
    const userId = 'user-1';
    const oldIat = Math.floor(Date.now() / 1000) - 100;

    service.revokeUser(userId);

    // Any token with iat <= revocation timestamp is rejected
    expect(service.isRevoked(userId, oldIat)).toBe(true);

    // New token with future iat is not revoked by previous user revocation
    const newIat = Math.floor(Date.now() / 1000) + 100;
    expect(service.isRevoked(userId, newIat)).toBe(false);
  });

  it('should clear all revocations on clear()', () => {
    const userId = 'user-1';
    const token = 'jwt-token-abc';
    service.revokeUser(userId, token);

    expect(service.isRevoked(userId, undefined, token)).toBe(true);
    service.clear();
    expect(service.isRevoked(userId, undefined, token)).toBe(false);
  });
});
