import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Settings service for admin-configurable system parameters.
 * Manages: hotlines, dispatch timeouts, routing rules, campus map config, etc.
 * IMPLEMENTATION_PLAN.md Phase 3.21, PRD §24
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── Key-Value Settings ───────────────────────────────────────────────

  /**
   * Get a setting by key.
   */
  async getSetting(key: string) {
    const setting = await this.prisma.setting.findUnique({
      where: { key },
    });
    return setting?.value ?? null;
  }

  /**
   * Get all settings.
   */
  async getAllSettings() {
    return this.prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Update a setting.
   */
  async updateSetting(key: string, value: any, updatedBy: string) {
    const setting = await this.prisma.setting.upsert({
      where: { key },
      update: { value, updatedBy, updatedAt: new Date() },
      create: { key, value, updatedBy },
    });

    await this.auditService.log({
      eventType: 'ADMIN_ACTION',
      actorUserId: updatedBy,
      actorKind: 'USER',
      targetType: 'setting',
      targetId: key,
      details: { action: 'UPDATE_SETTING', key, value },
    });

    return setting;
  }

  // ── Hotlines ─────────────────────────────────────────────────────────

  /**
   * GET /hotlines — Active emergency hotlines (public).
   */
  async getActiveHotlines() {
    return this.prisma.hotline.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        label: true,
        phone: true,
        description: true,
        is24x7: true,
      },
    });
  }

  /**
   * Admin: Get all hotlines (including inactive).
   */
  async getAllHotlines() {
    return this.prisma.hotline.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Admin: Create a hotline.
   */
  async createHotline(params: {
    label: string;
    phone: string;
    description?: string;
    sortOrder?: number;
    is24x7?: boolean;
  }, adminUserId: string) {
    const hotline = await this.prisma.hotline.create({
      data: {
        label: params.label,
        phone: params.phone,
        description: params.description,
        sortOrder: params.sortOrder || 0,
        is24x7: params.is24x7 || false,
      },
    });

    await this.auditService.log({
      eventType: 'ADMIN_ACTION',
      actorUserId: adminUserId,
      actorKind: 'USER',
      targetType: 'hotline',
      targetId: hotline.id,
      details: { action: 'CREATE_HOTLINE', label: params.label },
    });

    return hotline;
  }

  /**
   * Admin: Update a hotline.
   */
  async updateHotline(
    hotlineId: string,
    updates: {
      label?: string;
      phone?: string;
      description?: string;
      sortOrder?: number;
      is24x7?: boolean;
      isActive?: boolean;
    },
    adminUserId: string,
  ) {
    const hotline = await this.prisma.hotline.update({
      where: { id: hotlineId },
      data: {
        label: updates.label,
        phone: updates.phone,
        description: updates.description,
        sortOrder: updates.sortOrder,
        is24x7: updates.is24x7,
        isActive: updates.isActive,
      },
    });

    await this.auditService.log({
      eventType: 'ADMIN_ACTION',
      actorUserId: adminUserId,
      actorKind: 'USER',
      targetType: 'hotline',
      targetId: hotlineId,
      details: { action: 'UPDATE_HOTLINE', updates },
    });

    return hotline;
  }

  /**
   * Admin: Delete a hotline.
   */
  async deleteHotline(hotlineId: string, adminUserId: string) {
    await this.prisma.hotline.update({
      where: { id: hotlineId },
      data: { isActive: false },
    });

    await this.auditService.log({
      eventType: 'ADMIN_ACTION',
      actorUserId: adminUserId,
      actorKind: 'USER',
      targetType: 'hotline',
      targetId: hotlineId,
      details: { action: 'DELETE_HOTLINE' },
    });
  }

  // ── Routing Rules ────────────────────────────────────────────────────

  /**
   * Get all routing rules.
   */
  async getRoutingRules() {
    return this.prisma.routingRule.findMany({
      orderBy: { priority: 'asc' },
    });
  }

  /**
   * Update a routing rule.
   */
  async updateRoutingRule(
    ruleId: string,
    updates: { enabled?: boolean; priority?: number; condition?: any; actions?: any },
    adminUserId: string,
  ) {
    const rule = await this.prisma.routingRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Routing rule not found',
      });
    }

    const updated = await this.prisma.routingRule.update({
      where: { id: ruleId },
      data: {
        enabled: updates.enabled,
        priority: updates.priority,
        condition: updates.condition,
        actions: updates.actions,
        version: { increment: 1 },
        updatedBy: adminUserId,
      },
    });

    await this.auditService.log({
      eventType: 'ADMIN_ACTION',
      actorUserId: adminUserId,
      actorKind: 'USER',
      targetType: 'routing_rule',
      targetId: ruleId,
      details: { action: 'UPDATE_ROUTING_RULE', rule_id: rule.ruleId, updates },
    });

    return updated;
  }
}
