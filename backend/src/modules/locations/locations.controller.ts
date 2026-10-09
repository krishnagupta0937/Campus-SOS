import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { Public, Roles, CurrentUser } from '../../common/decorators';
import { AuthUser } from '../../common/guards/jwt-auth.guard';

@Controller()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  /**
   * GET /map — Active campus map metadata.
   * Accessible to all authenticated users.
   */
  @Get('map')
  async getActiveMap() {
    return this.locationsService.getActiveMap();
  }

  /**
   * GET /locations — All predefined campus locations.
   */
  @Get('locations')
  async getPredefinedLocations(@Query('map_id') mapId?: string) {
    return this.locationsService.getPredefinedLocations(mapId);
  }

  // ── Admin Endpoints ──────────────────────────────────────────────────

  /**
   * POST /admin/map — Upload new campus map.
   */
  @Post('admin/map')
  @Roles('CAMPUS_ADMIN')
  async uploadMap(
    @CurrentUser('id') userId: string,
    @Body() body: {
      name: string;
      storage_key: string;
      width_px: number;
      height_px: number;
    },
  ) {
    return this.locationsService.uploadMap({
      name: body.name,
      storageKey: body.storage_key,
      widthPx: body.width_px,
      heightPx: body.height_px,
      uploadedBy: userId,
    });
  }

  /**
   * POST /admin/locations — Create a predefined location.
   */
  @Post('admin/locations')
  @Roles('CAMPUS_ADMIN')
  async createLocation(
    @Body() body: {
      map_id: string;
      kind: string;
      name: string;
      anchor_x?: number;
      anchor_y?: number;
    },
  ) {
    return this.locationsService.createPredefinedLocation({
      mapId: body.map_id,
      kind: body.kind,
      name: body.name,
      anchorX: body.anchor_x,
      anchorY: body.anchor_y,
    });
  }

  /**
   * PATCH /admin/locations/:id — Update a predefined location.
   */
  @Patch('admin/locations/:id')
  @Roles('CAMPUS_ADMIN')
  async updateLocation(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      kind?: string;
      anchor_x?: number;
      anchor_y?: number;
      is_active?: boolean;
    },
  ) {
    return this.locationsService.updatePredefinedLocation(id, {
      name: body.name,
      kind: body.kind,
      anchorX: body.anchor_x,
      anchorY: body.anchor_y,
      isActive: body.is_active,
    });
  }

  /**
   * DELETE /admin/locations/:id — Soft-delete a predefined location.
   */
  @Delete('admin/locations/:id')
  @Roles('CAMPUS_ADMIN')
  async deleteLocation(@Param('id') id: string) {
    return this.locationsService.deletePredefinedLocation(id);
  }
}
