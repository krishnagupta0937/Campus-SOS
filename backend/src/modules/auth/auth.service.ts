import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import { AuthUser } from '../../common/guards/jwt-auth.guard';
import { generateSecureToken, hashToken } from '../../common/utils/crypto.utils';
import { LoginDto, RefreshDto } from './dto/auth.dto';
import { TokenRevocationService } from './token-revocation.service';

@Injectable()
export class AuthService {
  private readonly maxLoginAttempts = 5;
  private readonly lockoutDuration = 15 * 60 * 1000; // 15 minutes
  private readonly loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenRevocationService: TokenRevocationService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string) {
    // Rate limiting check
    const key = `${dto.email}:${ipAddress}`;
    this.checkRateLimit(key);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        teamMembers: {
          where: { leftAt: null },
          include: {
            team: { select: { id: true, code: true } },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      this.recordFailedAttempt(key);
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Invalid email or password',
      });
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'SSO account — use SSO login',
      });
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      this.recordFailedAttempt(key);
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Invalid email or password',
      });
    }

    // Clear login attempts on success
    this.loginAttempts.delete(key);

    // Check if MFA is required
    if (user.mfaEnabled && user.mfaSecret) {
      // Return partial auth response requiring MFA
      const mfaToken = this.jwtService.sign(
        { sub: user.id, mfaPending: true },
        { expiresIn: '5m' },
      );
      return {
        access_token: null,
        mfa_required: true,
        mfa_token: mfaToken,
        expires_in: null,
      };
    }

    // Generate full tokens
    return this.generateAuthResponse(user);
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);

    const session = await this.prisma.session.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            teamMembers: {
              where: { leftAt: null },
              include: {
                team: { select: { id: true, code: true } },
              },
            },
          },
        },
      },
    });

    if (!session || !session.user.isActive) {
      throw new UnauthorizedException({
        code: 'TOKEN_EXPIRED',
        message: 'Invalid or expired refresh token',
      });
    }

    // Rotate: revoke old session, create new one
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.generateAuthResponse(session.user, session.id);
  }

  async logout(userId: string, accessToken?: string) {
    // Revoke all sessions for the user
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Revoke access token immediately
    this.tokenRevocationService.revokeUser(userId, accessToken);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        userType: true,
        mfaEnabled: true,
        notificationsEnabled: true,
        teamMembers: {
          where: { leftAt: null },
          select: {
            id: true,
            designation: true,
            isCoordinator: true,
            team: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'User not found' });
    }

    return {
      id: user.id,
      full_name: user.fullName,
      email: user.email,
      role: user.role,
      user_type: user.userType,
      mfa_enabled: user.mfaEnabled,
      notifications_enabled: user.notificationsEnabled,
      teams: (user.teamMembers || []).map((tm: any) => ({
        team_id: tm.team?.id || tm.teamId,
        team_code: tm.team?.code || tm.teamCode,
        team_name: tm.team?.name || 'Campus Team',
        designation: tm.designation,
        is_coordinator: tm.isCoordinator,
      })),
    };
  }

  async updateSettings(userId: string, settings: { notifications_enabled?: boolean }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        notificationsEnabled: settings.notifications_enabled,
      },
      select: {
        notificationsEnabled: true,
      },
    });
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  }

  private async generateAuthResponse(user: any, rotatedFrom?: string) {
    const teamMemberships = (user.teamMembers || []).map((tm: any) => ({
      teamId: tm.team?.id || tm.teamId,
      teamCode: tm.team?.code || tm.teamCode,
      memberId: tm.id,
      isCoordinator: tm.isCoordinator || false,
      canViewRestricted: tm.canViewRestricted || false,
    }));

    const payload: AuthUser = {
      id: user.id,
      role: user.role,
      teams: teamMemberships.map((tm: any) => tm.teamCode),
      teamMemberships,
      isPersonnel: user.userType !== 'student',
      email: user.email,
      fullName: user.fullName,
    };

    const accessToken = this.jwtService.sign(
      { sub: user.id, ...payload },
      { expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m') as any },
    );

    // Generate refresh token
    const refreshTokenRaw = generateSecureToken(32);
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7); // 7 days

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshTokenRaw),
        expiresAt: refreshExpiresAt,
        rotatedFrom: rotatedFrom || null,
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      access_token: accessToken,
      expires_in: 900, // 15 minutes in seconds
      mfa_required: false,
      refresh_token: refreshTokenRaw,
      user: {
        id: user.id,
        role: user.role,
        full_name: user.fullName,
        teams: payload.teams,
      },
    };
  }

  private checkRateLimit(key: string) {
    const attempts = this.loginAttempts.get(key);
    if (attempts && attempts.count >= this.maxLoginAttempts) {
      const elapsed = Date.now() - attempts.lastAttempt.getTime();
      if (elapsed < this.lockoutDuration) {
        const retryAfter = Math.ceil((this.lockoutDuration - elapsed) / 1000);
        throw new UnauthorizedException({
          code: 'RATE_LIMITED',
          message: `Account temporarily locked. Try again in ${retryAfter} seconds.`,
        });
      }
      // Reset after lockout
      this.loginAttempts.delete(key);
    }
  }

  private recordFailedAttempt(key: string) {
    const current = this.loginAttempts.get(key) || { count: 0, lastAttempt: new Date() };
    current.count++;
    current.lastAttempt = new Date();
    this.loginAttempts.set(key, current);
  }
}
