import { Controller, Get, Put, Body, Param, Query } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { Roles, CurrentUser } from '../../common/decorators';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';

@Controller()
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get('team/members')
  async getTeamMembers(@CurrentUser() user: AuthUser) {
    if (user.teamMemberships.length === 0) return [];
    const teamId = user.teamMemberships[0].teamId;
    const team = await this.teamsService.findByCode(
      user.teamMemberships[0].teamCode,
    );
    return team.members.map(m => ({
      id: m.id,
      name: m.user.fullName,
      designation: m.designation,
      duty_state: m.responderProfile?.dutyState || 'OFFLINE',
      is_coordinator: m.isCoordinator,
    }));
  }

  @Get('responder/me')
  async getResponderProfile(@CurrentUser() user: AuthUser) {
    if (user.teamMemberships.length === 0) {
      return { duty_state: null, current_assignments: [] };
    }
    const memberId = user.teamMemberships[0].memberId;
    const profile = await this.teamsService.findByCode(
      user.teamMemberships[0].teamCode,
    );
    return profile;
  }

  @Put('responder/me/duty-state')
  async updateMyDutyState(
    @CurrentUser() user: AuthUser,
    @Body() body: { duty_state: 'AVAILABLE' | 'BUSY' | 'OFFLINE' },
  ) {
    if (user.teamMemberships.length === 0) {
      return { error: 'Not a team member' };
    }
    const memberId = user.teamMemberships[0].memberId;
    return this.teamsService.updateDutyState(
      memberId,
      body.duty_state,
      user.id,
      'SELF',
    );
  }

  // Admin endpoints
  @Get('admin/teams')
  @Roles('CAMPUS_ADMIN')
  async getAllTeams() {
    return this.teamsService.findAll();
  }
}
