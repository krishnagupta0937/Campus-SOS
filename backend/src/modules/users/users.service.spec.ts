import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';

describe('UsersService (Personnel Directory & Student Privacy Protection)', () => {
  let service: UsersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    };
    service = new UsersService(mockPrisma as PrismaService);
  });

  describe('Directory Privacy (PRD §14, API §15)', () => {
    it('should query ONLY staff and personnel rows, never students', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'user-sec-1',
          fullName: 'Security Officer John',
          email: 'security.john@campus.edu',
          phone: '+919876543210',
          role: 'SECURITY',
          teamMembers: [
            {
              designation: 'Patrol Lead',
              isDirectoryVisible: true,
              team: { code: 'SECURITY', name: 'Campus Security' },
              responderProfile: { dutyState: 'AVAILABLE' },
            },
          ],
        },
      ]);

      const directory = await service.getDirectory({});

      // Verify Prisma query was constrained to staff/personnel only
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userType: { in: ['staff', 'personnel'] },
            isActive: true,
          }),
        }),
      );

      expect(directory.length).toBe(1);
      expect(directory[0].name).toBe('Security Officer John');
      expect(directory[0].teams[0].designation).toBe('Patrol Lead');
    });

    it('should exclude personnel whose isDirectoryVisible is false', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'user-hidden-1',
          fullName: 'Undercover Responder',
          email: 'hidden@campus.edu',
          phone: '+919999999999',
          role: 'SECURITY',
          teamMembers: [
            {
              designation: 'Special Duty',
              isDirectoryVisible: false, // Hidden from directory
              team: { code: 'SECURITY', name: 'Campus Security' },
              responderProfile: { dutyState: 'AVAILABLE' },
            },
          ],
        },
      ]);

      const directory = await service.getDirectory({});
      expect(directory.length).toBe(0);
    });
  });
});
