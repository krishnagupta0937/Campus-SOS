import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Ip,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { AccessPolicyService } from './access-policy.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthUser } from '../../common/guards/jwt-auth.guard';
import {
  RequestBreakGlassDto,
  ApproveBreakGlassDto,
  RejectBreakGlassDto,
  RevokeBreakGlassDto,
  ReviewBreakGlassDto,
} from './break-glass.dto';

@Controller('access-policy')
export class AccessPolicyController {
  constructor(@Inject(AccessPolicyService) private readonly accessPolicyService: AccessPolicyService) {}

  /**
   * POST /access-policy/break-glass/request
   * Submit an emergency break-glass request (NORMAL_OVERRIDE or CRITICAL_BREAK_GLASS).
   */
  @Post('break-glass/request')
  @HttpCode(HttpStatus.CREATED)
  async requestEmergencyAccess(
    @CurrentUser() user: AuthUser,
    @Body() body: RequestBreakGlassDto,
    @Ip() ipAddress: string,
  ) {
    return this.accessPolicyService.requestEmergencyAccess(user, body, ipAddress);
  }

  /**
   * POST /access-policy/break-glass/approve
   * Authorized approver grants emergency access.
   */
  @Post('break-glass/approve')
  @HttpCode(HttpStatus.OK)
  async approveEmergencyAccess(
    @CurrentUser() user: AuthUser,
    @Body() body: ApproveBreakGlassDto,
    @Ip() ipAddress: string,
  ) {
    return this.accessPolicyService.approveEmergencyAccess(user, body, ipAddress);
  }

  /**
   * POST /access-policy/break-glass/reject
   * Authorized approver rejects emergency access request.
   */
  @Post('break-glass/reject')
  @HttpCode(HttpStatus.OK)
  async rejectEmergencyAccess(
    @CurrentUser() user: AuthUser,
    @Body() body: RejectBreakGlassDto,
    @Ip() ipAddress: string,
  ) {
    return this.accessPolicyService.rejectEmergencyAccess(user, body, ipAddress);
  }

  /**
   * POST /access-policy/break-glass/revoke
   * Revoke active emergency access.
   */
  @Post('break-glass/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeEmergencyAccess(
    @CurrentUser() user: AuthUser,
    @Body() body: RevokeBreakGlassDto,
    @Ip() ipAddress: string,
  ) {
    return this.accessPolicyService.revokeEmergencyAccess(user, body, ipAddress);
  }

  /**
   * POST /access-policy/break-glass/review
   * Supervisor conducts mandatory review on critical break-glass actions.
   */
  @Post('break-glass/review')
  @Roles('CAMPUS_ADMIN', 'CHIEF_PROCTOR')
  @HttpCode(HttpStatus.OK)
  async reviewEmergencyAccess(
    @CurrentUser() user: AuthUser,
    @Body() body: ReviewBreakGlassDto,
    @Ip() ipAddress: string,
  ) {
    return this.accessPolicyService.reviewEmergencyAccess(user, body, ipAddress);
  }

  /**
   * GET /access-policy/break-glass/status
   * Get active break-glass grant status for current user on an incident.
   */
  @Get('break-glass/status')
  async getEmergencyAccessStatus(
    @CurrentUser() user: AuthUser,
    @Query('incident_id') incidentId: string,
  ) {
    return this.accessPolicyService.getEmergencyAccessStatus(user, incidentId);
  }

  /**
   * GET /access-policy/break-glass/requests
   * List emergency access requests (filtered by incident and/or status).
   */
  @Get('break-glass/requests')
  async listEmergencyAccessRequests(
    @CurrentUser() user: AuthUser,
    @Query('incident_id') incidentId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    return this.accessPolicyService.listEmergencyAccessRequests(user, {
      incident_id: incidentId,
      status,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /**
   * GET /access-policy/incidents/:id/reporter-contact
   * Retrieve reporter contact details under explicit REPORTER_CONTACT_VIEW scope.
   */
  @Get('incidents/:id/reporter-contact')
  async getReporterContact(
    @CurrentUser() user: AuthUser,
    @Param('id') incidentId: string,
    @Ip() ipAddress: string,
  ) {
    return this.accessPolicyService.getReporterContact(user, incidentId, ipAddress);
  }

  /**
   * POST /access-policy/break-glass/cleanup
   * Maintenance sweep for expired grants.
   */
  @Post('break-glass/cleanup')
  @Roles('CAMPUS_ADMIN')
  @HttpCode(HttpStatus.OK)
  async cleanupExpiredGrants() {
    const expiredCount = await this.accessPolicyService.cleanupExpiredGrants();
    return { expired_count: expiredCount };
  }
}
