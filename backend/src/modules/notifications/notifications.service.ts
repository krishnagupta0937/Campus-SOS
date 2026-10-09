import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CAMPUS_WIDE_DENY_LIST } from '../../common/utils/constants';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user's notification inbox.
   */
  async getInbox(userId: string, unreadOnly: boolean = false) {
    const where: any = { recipientUserId: userId };
    if (unreadOnly) where.readAt = null;

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        body: true,
        audienceType: true,
        createdAt: true,
        readAt: true,
        payload: true,
        incidentId: true,
      },
    });
  }

  /**
   * Mark a notification as read.
   */
  async markRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, recipientUserId: userId },
      data: { readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read.
   */
  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { recipientUserId: userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * Get active published campus notices.
   */
  async getActiveNotices() {
    return this.prisma.campusNotice.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { endsAt: null },
          { endsAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        sanitizedBody: true,
        areaText: true,
        category: true,
        createdAt: true,
      },
    });
  }

  /**
   * Admin: Get pending notices for approval.
   */
  async getPendingNotices() {
    return this.prisma.campusNotice.findMany({
      where: { status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin: Approve a campus notice.
   * Hard deny list check: certain categories can never have campus-wide notices.
   */
  async approveNotice(noticeId: string, adminUserId: string) {
    const notice = await this.prisma.campusNotice.findUnique({
      where: { id: noticeId },
    });

    if (!notice) return null;

    // Hard deny list check
    if (notice.category && CAMPUS_WIDE_DENY_LIST.has(notice.category)) {
      throw new ForbiddenException({
        code: 'NOTICE_CATEGORY_RESTRICTED',
        message: `Category ${notice.category} cannot have campus-wide notices`,
      });
    }

    return this.prisma.campusNotice.update({
      where: { id: noticeId },
      data: {
        status: 'PUBLISHED',
        approvedBy: adminUserId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Admin: Reject a campus notice.
   */
  async rejectNotice(noticeId: string) {
    return this.prisma.campusNotice.update({
      where: { id: noticeId },
      data: { status: 'REJECTED' },
    });
  }

  /**
   * Create notification for a recipient.
   */
  async createNotification(params: {
    incidentId?: string;
    audienceType: string;
    recipientUserId?: string;
    noticeId?: string;
    title: string;
    body: string;
    payload?: any;
  }) {
    return this.prisma.notification.create({
      data: {
        incidentId: params.incidentId || null,
        audienceType: params.audienceType as any,
        recipientUserId: params.recipientUserId || null,
        noticeId: params.noticeId || null,
        title: params.title,
        body: params.body,
        payload: params.payload || null,
      },
    });
  }
}
