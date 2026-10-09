import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Roles, CurrentUser } from '../../common/decorators';

/**
 * Settings controller for admin system configuration.
 */
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ── Hotlines (public) ─────────────────────────────────────────────

  /**
   * GET /hotlines — Active emergency hotlines (any authenticated user).
   */
  @Get('hotlines')
  async getHotlines() {
    return this.settingsService.getActiveHotlines();
  }

  // ── Admin: Settings ───────────────────────────────────────────────

  /**
   * GET /admin/settings — All system settings.
   */
  @Get('admin/settings')
  @Roles('CAMPUS_ADMIN')
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  /**
   * PATCH /admin/settings/:key — Update a setting.
   */
  @Patch('admin/settings/:key')
  @Roles('CAMPUS_ADMIN')
  async updateSetting(
    @Param('key') key: string,
    @Body() body: { value: any },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.settingsService.updateSetting(key, body.value, adminUserId);
  }

  // ── Admin: Hotlines ───────────────────────────────────────────────

  /**
   * GET /admin/hotlines — All hotlines including inactive.
   */
  @Get('admin/hotlines')
  @Roles('CAMPUS_ADMIN')
  async getAllHotlines() {
    return this.settingsService.getAllHotlines();
  }

  /**
   * POST /admin/hotlines — Create a hotline.
   */
  @Post('admin/hotlines')
  @Roles('CAMPUS_ADMIN')
  async createHotline(
    @Body() body: {
      label: string;
      phone: string;
      description?: string;
      sort_order?: number;
      is_24x7?: boolean;
    },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.settingsService.createHotline(
      { label: body.label, phone: body.phone, description: body.description, sortOrder: body.sort_order, is24x7: body.is_24x7 },
      adminUserId,
    );
  }

  /**
   * PATCH /admin/hotlines/:id — Update a hotline.
   */
  @Patch('admin/hotlines/:id')
  @Roles('CAMPUS_ADMIN')
  async updateHotline(
    @Param('id') id: string,
    @Body() body: {
      label?: string;
      phone?: string;
      description?: string;
      sort_order?: number;
      is_24x7?: boolean;
      is_active?: boolean;
    },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.settingsService.updateHotline(
      id,
      { label: body.label, phone: body.phone, description: body.description, sortOrder: body.sort_order, is24x7: body.is_24x7, isActive: body.is_active },
      adminUserId,
    );
  }

  /**
   * DELETE /admin/hotlines/:id — Deactivate a hotline.
   */
  @Delete('admin/hotlines/:id')
  @Roles('CAMPUS_ADMIN')
  async deleteHotline(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    await this.settingsService.deleteHotline(id, adminUserId);
    return { message: 'Hotline deactivated' };
  }

  // ── Admin: Routing Rules ──────────────────────────────────────────

  /**
   * GET /admin/routing-rules — All routing rules.
   */
  @Get('admin/routing-rules')
  @Roles('CAMPUS_ADMIN')
  async getRoutingRules() {
    return this.settingsService.getRoutingRules();
  }

  /**
   * PATCH /admin/routing-rules/:id — Update a routing rule.
   */
  @Patch('admin/routing-rules/:id')
  @Roles('CAMPUS_ADMIN')
  async updateRoutingRule(
    @Param('id') id: string,
    @Body() body: { enabled?: boolean; priority?: number; condition?: any; actions?: any },
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.settingsService.updateRoutingRule(id, body, adminUserId);
  }
}
