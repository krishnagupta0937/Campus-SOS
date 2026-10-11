import { Injectable } from '@nestjs/common';
import { hashToken } from '../../common/utils/crypto.utils';

@Injectable()
export class TokenRevocationService {
  private revokedTokens = new Set<string>();
  private userRevocations = new Map<string, number>();

  revokeUser(userId: string, token?: string): void {
    this.userRevocations.set(userId, Math.floor(Date.now() / 1000));
    if (token) {
      this.revokedTokens.add(hashToken(token));
    }
  }

  isRevoked(userId: string, iat?: number, token?: string): boolean {
    if (token && this.revokedTokens.has(hashToken(token))) {
      return true;
    }
    const userRevokedAt = this.userRevocations.get(userId);
    if (userRevokedAt !== undefined && iat !== undefined && iat <= userRevokedAt) {
      return true;
    }
    return false;
  }

  clear(): void {
    this.revokedTokens.clear();
    this.userRevocations.clear();
  }
}
