import { Controller, Get, Query } from '@nestjs/common';
import { ExploreService } from './explore.service';

/**
 * Campus Explore API.
 * PRD §15, API §14
 * All endpoints require authentication but are role-agnostic (any authenticated user).
 */
@Controller('explore')
export class ExploreController {
  constructor(private readonly exploreService: ExploreService) {}

  /**
   * GET /explore/incidents — Sanitized campus incident feed.
   * Status filter only. No urgency filter.
   */
  @Get('incidents')
  async getIncidents(
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.exploreService.getExploreIncidents({ status, limit, cursor });
  }

  /**
   * GET /explore/map-pins — Active incident pins for explore map.
   */
  @Get('map-pins')
  async getMapPins() {
    return this.exploreService.getMapPins();
  }

  /**
   * GET /explore/activity — Recent campus activity summary.
   */
  @Get('activity')
  async getActivity() {
    return this.exploreService.getRecentActivity();
  }
}
