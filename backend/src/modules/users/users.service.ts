import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get personnel directory. PRD §14: Student phone numbers are NEVER returned.
   * Only personnel (staff/personnel) are included.
   */
  async getDirectory(filters: {
    team?: string;
    role?: string;
    availability?: string;
    q?: string;
  }) {
    const where: any = {
      userType: { in: ['staff', 'personnel'] },
      isActive: true,
    };

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.q) {
      where.OR = [
        { fullName: { contains: filters.q, mode: 'insensitive' } },
        { email: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        teamMembers: {
          where: { leftAt: null },
          select: {
            designation: true,
            isDirectoryVisible: true,
            team: { select: { code: true, name: true } },
            responderProfile: {
              select: { dutyState: true },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    // Filter by team if specified
    let result = users;
    if (filters.team) {
      result = users.filter(u =>
        u.teamMembers.some(tm => tm.team.code === filters.team),
      );
    }

    // Filter by availability if specified
    if (filters.availability) {
      result = result.filter(u =>
        u.teamMembers.some(
          tm => tm.responderProfile?.dutyState === filters.availability,
        ),
      );
    }

    return result
      .filter(u => u.teamMembers.some(tm => tm.isDirectoryVisible))
      .map(u => ({
        id: u.id,
        name: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        teams: u.teamMembers.map(tm => ({
          team: tm.team.code,
          team_name: tm.team.name,
          designation: tm.designation,
          availability: tm.responderProfile?.dutyState || null,
        })),
      }));
  }

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        teamMembers: {
          where: { leftAt: null },
          include: {
            team: true,
            responderProfile: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
    return user;
  }
}
