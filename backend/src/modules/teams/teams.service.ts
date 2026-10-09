import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.team.findMany({
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: { select: { id: true, fullName: true, email: true, role: true } },
            responderProfile: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async findByCode(code: string) {
    const team = await this.prisma.team.findUnique({
      where: { code },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: { select: { id: true, fullName: true, email: true } },
            responderProfile: true,
          },
        },
      },
    });
    if (!team) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Team not found' });
    return team;
  }

  /**
   * Get available responders for a team.
   * Only returns members with AVAILABLE duty state.
   */
  async getAvailableResponders(teamId: string, requiredSkills?: string[]) {
    const members = await this.prisma.teamMember.findMany({
      where: {
        teamId,
        leftAt: null,
        responderProfile: {
          dutyState: 'AVAILABLE',
        },
      },
      include: {
        user: { select: { id: true, fullName: true } },
        responderProfile: true,
      },
      orderBy: [
        { responderProfile: { currentAssignmentCount: 'asc' } },
        { responderProfile: { lastAssignedAt: 'asc' } },
      ],
    });

    if (requiredSkills && requiredSkills.length > 0) {
      return members.filter(m =>
        requiredSkills.every(skill =>
          m.responderProfile?.skills?.includes(skill),
        ),
      );
    }

    return members;
  }

  /**
   * Update responder duty state.
   * Constraint: change_reason can never be 'INACTIVITY'.
   */
  async updateDutyState(
    memberId: string,
    dutyState: 'AVAILABLE' | 'BUSY' | 'OFFLINE',
    changedBy: string,
    changeReason: string,
  ) {
    if (changeReason === 'INACTIVITY') {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Inactivity auto-offline is prohibited',
      });
    }

    return this.prisma.responderProfile.update({
      where: { memberId },
      data: {
        dutyState,
        dutyStateChangedAt: new Date(),
        dutyStateChangedBy: changedBy,
        changeReason,
      },
    });
  }

  async getTeamIncidentCount(teamId: string) {
    return this.prisma.incidentTeam.count({
      where: {
        teamId,
        revokedAt: null,
        incident: {
          status: { notIn: ['RESOLVED', 'CANCELLED'] },
        },
      },
    });
  }
}
