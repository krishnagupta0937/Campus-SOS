import { Controller, Post, Get, Body, Param, Query, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { DispatchService } from '../dispatch/dispatch.service';
import { Roles, CurrentUser } from '../../common/decorators';
import { AuthUser } from '../../common/guards/jwt-auth.guard';

@Controller()
export class IncidentsController {
  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly dispatchService: DispatchService,
  ) {}

  // Standard Reports
  @Post('incidents')
  @Roles('STUDENT')
  @HttpCode(HttpStatus.CREATED)
  async createStandardReport(
    @CurrentUser() user: AuthUser,
    @Body() body: {
      description: string;
      category: string;
      location: { predefined_location_id?: string; kind: string; text?: string };
      pin: { x: number; y: number };
      attachment_ids?: string[];
    },
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.incidentsService.createStandardReport(user.id, body, idempotencyKey);
  }

  // My Reports
  @Get('me/reports')
  @Roles('STUDENT')
  async getMyReports(
    @CurrentUser() user: AuthUser,
    @Query('tab') tab: 'reports' | 'sos' = 'reports',
  ) {
    return this.incidentsService.getMyReports(user.id, tab);
  }

  @Get('me/incidents/:id')
  @Roles('STUDENT')
  async getMyIncidentDetail(
    @Param('id') incidentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.incidentsService.getMyIncidentDetail(incidentId, user.id);
  }

  @Post('me/incidents/:id/notes')
  @Roles('STUDENT')
  async addFollowUpNote(
    @Param('id') incidentId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { note: string },
  ) {
    return this.incidentsService.addFollowUpNote(incidentId, user.id, body.note);
  }

  // Team workspace
  @Get('team/incidents')
  async getTeamIncidents(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('workflow') workflow?: string,
    @Query('category') category?: string,
    @Query('assigned_to_me') assignedToMe?: boolean,
  ) {
    return this.incidentsService.getTeamIncidents(user, {
      status,
      workflow,
      category,
      assigned_to_me: assignedToMe,
    });
  }

  @Get('team/incidents/:id')
  async getTeamIncidentDetail(
    @Param('id') incidentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.incidentsService.getTeamIncidentDetail(incidentId, user);
  }

  @Post('team/incidents/:id/status')
  async transitionTeamIncidentStatus(
    @Param('id') incidentId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { to_status: string; note?: string },
  ) {
    return this.incidentsService.transitionStatus(incidentId, body.to_status, user.id, body.note);
  }

  @Post('team/incidents/:id/notes')
  async addTeamNote(
    @Param('id') incidentId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { note: string },
  ) {
    return this.incidentsService.addTeamNote(incidentId, user.id, body.note);
  }

  @Post('team/incidents/:id/escalate')
  async escalateIncident(
    @Param('id') incidentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.incidentsService.escalateIncident(incidentId, user);
  }

  // Responder assignment actions
  @Get('responder/offers')
  async getOffers(@CurrentUser() user: AuthUser) {
    return this.dispatchService.getOffersForUser(user.id);
  }

  @Post('responder/offers/:assignmentId/accept')
  async acceptOffer(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.dispatchService.acceptOffer(assignmentId, user.id);
  }

  @Post('responder/offers/:assignmentId/reject')
  async rejectOffer(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { reason?: string },
  ) {
    return this.dispatchService.rejectOffer(assignmentId, user.id, body?.reason);
  }

  @Post('responder/assignments/:id/en-route')
  async markEnRoute(@Param('id') assignmentId: string, @CurrentUser() user: AuthUser) {
    return this.dispatchService.markEnRoute(assignmentId, user.id);
  }

  @Post('responder/assignments/:id/on-scene')
  async markOnScene(@Param('id') assignmentId: string, @CurrentUser() user: AuthUser) {
    return this.dispatchService.markOnScene(assignmentId, user.id);
  }

  @Post('responder/assignments/:id/complete')
  async completeAssignment(
    @Param('id') assignmentId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { resolution_summary: string },
  ) {
    return this.dispatchService.completeAssignment(assignmentId, user.id, body.resolution_summary);
  }

  // Admin endpoints
  @Get('admin/incidents')
  @Roles('CAMPUS_ADMIN')
  async getAdminIncidents(
    @Query('status') status?: string,
    @Query('workflow') workflow?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('team') team?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.incidentsService.getAdminIncidents({ status, workflow, category, from, to, team, q, limit, cursor });
  }

  @Get('admin/incidents/:id')
  @Roles('CAMPUS_ADMIN')
  async getAdminIncidentDetail(@Param('id') incidentId: string) {
    return this.incidentsService.getAdminIncidentDetail(incidentId);
  }

  @Post('admin/incidents/:id/status')
  @Roles('CAMPUS_ADMIN')
  async adminStatusChange(
    @Param('id') incidentId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { to_status: string; note?: string },
  ) {
    return this.incidentsService.transitionStatus(incidentId, body.to_status, user.id, body.note);
  }

  @Post('admin/incidents/:id/assign')
  @Roles('CAMPUS_ADMIN')
  async adminAssign(
    @Param('id') incidentId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { team_id: string; member_id?: string; responder_user_id?: string },
  ) {
    const memberId = body.member_id || body.responder_user_id;
    return this.incidentsService.adminAssign(incidentId, user.id, body.team_id, memberId);
  }

  @Post('admin/incidents/:id/reclassify')
  @Roles('CAMPUS_ADMIN')
  async adminReclassify(
    @Param('id') incidentId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { category: string },
  ) {
    return this.incidentsService.adminReclassify(incidentId, user.id, body.category);
  }
}
