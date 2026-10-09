import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../../common/decorators';

/**
 * Analytics controller — Admin only.
 * API §13, PRD A-07
 */
@Controller('admin/analytics')
@Roles('CAMPUS_ADMIN')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /admin/analytics/overview — Dashboard summary metrics.
   */
  @Get('overview')
  async getOverview(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getOverview({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  /**
   * GET /admin/analytics/response-times — T1-T4 metrics.
   */
  @Get('response-times')
  async getResponseTimes(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getResponseTimes({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  /**
   * GET /admin/analytics/categories — Category breakdown.
   */
  @Get('categories')
  async getCategories(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getCategoryBreakdown({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  /**
   * GET /admin/analytics/team-performance — Per-team metrics.
   */
  @Get('team-performance')
  async getTeamPerformance(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getTeamPerformance({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  /**
   * GET /admin/analytics/timeline — Daily incident timeline.
   */
  @Get('timeline')
  async getTimeline(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    return this.analyticsService.getTimeline({ from: fromDate, to: toDate });
  }
}
