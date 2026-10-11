import { Controller, Get, Query, Param } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles, CurrentUser } from '../../common/decorators';
import { AuthUser } from '../../common/guards/jwt-auth.guard';

@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('admin/audit')
  @Roles('CAMPUS_ADMIN')
  async getGlobalAudit(
    @Query('incident_id') incidentId?: string,
    @Query('event_type') eventType?: string,
    @Query('actor') actor?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getGlobalAudit({
      incident_id: incidentId,
      event_type: eventType,
      actor,
      from,
      to,
      limit,
    });
  }

  @Get('admin/audit/verify')
  @Roles('CAMPUS_ADMIN')
  async verifyChain() {
    return this.auditService.verifyChain();
  }

  @Get('incidents/:id/timeline')
  async getIncidentTimeline(
    @Param('id') incidentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.auditService.getIncidentAudit(incidentId, user);
  }
}
