import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('AuthService (Authentication & Privilege Safety)', () => {
  let service: AuthService;
  let mockPrisma: any;
  let mockJwt: any;
  let mockConfig: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
      session: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
    };
    mockJwt = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
    };
    mockConfig = {
      get: vi.fn((key: string, defaultVal?: any) => {
        if (key === 'JWT_ACCESS_EXPIRY') return '15m';
        if (key === 'JWT_REFRESH_EXPIRY') return '7d';
        return defaultVal;
      }),
    };

    service = new AuthService(
      mockPrisma as PrismaService,
      mockJwt as JwtService,
      mockConfig as ConfigService,
    );
  });

  describe('Credential Validation & Password Handling', () => {
    it('should authenticate user with valid credentials and return access token', async () => {
      const password = 'CorrectPassword123!';
      const hash = await argon2.hash(password);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'student@campus.edu',
        passwordHash: hash,
        isActive: true,
        userType: 'student',
        role: 'STUDENT',
        fullName: 'Student Doe',
        teamMembers: [],
      });

      const result = await service.login({ email: 'student@campus.edu', password }, '127.0.0.1');

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.expires_in).toBe(900); // 15m in seconds
      expect(result.refresh_token).toBeDefined();
      expect(result.user.role).toBe('STUDENT');
      // Password hash must never leak in response
      expect((result as any).passwordHash).toBeUndefined();
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should reject invalid password with 401 UNAUTHENTICATED', async () => {
      const hash = await argon2.hash('CorrectPassword123!');

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'student@campus.edu',
        passwordHash: hash,
        isActive: true,
        userType: 'student',
        role: 'STUDENT',
        fullName: 'Student Doe',
        teamMembers: [],
      });

      await expect(
        service.login({ email: 'student@campus.edu', password: 'WrongPassword!' }, '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject inactive users even with correct password', async () => {
      const password = 'CorrectPassword123!';
      const hash = await argon2.hash(password);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'disabled@campus.edu',
        passwordHash: hash,
        isActive: false, // Inactive / suspended account
        userType: 'student',
        role: 'STUDENT',
        fullName: 'Disabled Student',
        teamMembers: [],
      });

      await expect(
        service.login({ email: 'disabled@campus.edu', password }, '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should enforce account lockout after 5 consecutive failed login attempts', async () => {
      const hash = await argon2.hash('CorrectPassword123!');

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'target@campus.edu',
        passwordHash: hash,
        isActive: true,
        userType: 'student',
        role: 'STUDENT',
        fullName: 'Target Student',
        teamMembers: [],
      });

      // Fail 5 times
      for (let i = 0; i < 5; i++) {
        try {
          await service.login({ email: 'target@campus.edu', password: 'BadPassword' }, '10.0.0.1');
        } catch {
          // Expected failure
        }
      }

      // 6th attempt should be blocked immediately by rate limiter before password check
      await expect(
        service.login({ email: 'target@campus.edu', password: 'CorrectPassword123!' }, '10.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    }, 25000);
  });

  describe('Privilege Safety & Token Claims Integrity', () => {
    it('should derive user roles strictly from database records, not request inputs', async () => {
      const password = 'ValidPassword123!';
      const hash = await argon2.hash(password);

      // Student attempts to claim admin role in login payload
      const loginPayload: any = {
        email: 'student@campus.edu',
        password,
        role: 'CAMPUS_ADMIN', // FORGED role attempt in body
      };

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'student@campus.edu',
        passwordHash: hash,
        isActive: true,
        userType: 'student',
        role: 'STUDENT', // DB role is STUDENT
        fullName: 'Student Doe',
        teamMembers: [],
      });

      const result = await service.login(loginPayload, '127.0.0.1');

      // The returned user and JWT token must have role STUDENT, ignoring forged body field
      expect(result.user.role).toBe('STUDENT');
      const tokenPayload = mockJwt.sign.mock.calls[0][0];
      expect(tokenPayload.role).toBe('STUDENT');
      expect(tokenPayload.role).not.toBe('CAMPUS_ADMIN');
    });
  });
});
