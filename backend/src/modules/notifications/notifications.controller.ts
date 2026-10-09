import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { Roles, CurrentUser } from '../../common/decorators';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  async getInbox(
    @CurrentUser() user: AuthUser,
    @Query('unread') unread?: boolean,
  ) {
    return this.notificationsService.getInbox(user.id, unread);
  }

  @Post('notifications/:id/read')
  async markRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Post('notifications/read-all')
  async markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Get('notices/active')
  async getActiveNotices() {
    return this.notificationsService.getActiveNotices();
  }

  @Get('admin/notices')
  @Roles('CAMPUS_ADMIN')
  async getPendingNotices(@Query('status') status?: string) {
    return this.notificationsService.getPendingNotices();
  }

  @Post('admin/notices/:id/approve')
  @Roles('CAMPUS_ADMIN')
  async approveNotice(
    @Param('id') noticeId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notificationsService.approveNotice(noticeId, user.id);
  }

  @Post('admin/notices/:id/reject')
  @Roles('CAMPUS_ADMIN')
  async rejectNotice(@Param('id') noticeId: string) {
    return this.notificationsService.rejectNotice(noticeId);
  }
}
