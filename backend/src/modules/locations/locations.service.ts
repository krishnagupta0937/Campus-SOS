import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

/**
 * Locations service for campus map and predefined location management.
 * PRD §7, API §8, DATABASE_SCHEMA.md §8
 * - Static 2D campus map image metadata
 * - Predefined locations (rooms, blocks, labs, etc.)
 * - Normalized coordinate validation (0.0 <= x,y <= 1.0)
 */
@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /map — Active campus map metadata + signed URL.
   */
  async getActiveMap() {
    const map = await this.prisma.campusMap.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        storageKey: true,
        widthPx: true,
        heightPx: true,
        createdAt: true,
      },
    });

    if (!map) {
      return null;
    }

    return {
      id: map.id,
      name: map.name,
      image_url: this.buildMapUrl(map.storageKey),
      width_px: map.widthPx,
      height_px: map.heightPx,
      created_at: map.createdAt,
    };
  }

  /**
   * GET /locations — All active predefined campus locations.
   */
  async getPredefinedLocations(mapId?: string) {
    const where: any = { isActive: true };
    if (mapId) where.mapId = mapId;

    const locations = await this.prisma.predefinedLocation.findMany({
      where,
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        kind: true,
        name: true,
        anchorX: true,
        anchorY: true,
        mapId: true,
      },
    });

    return locations.map(loc => ({
      id: loc.id,
      kind: loc.kind,
      name: loc.name,
      anchor_x: loc.anchorX ? Number(loc.anchorX) : null,
      anchor_y: loc.anchorY ? Number(loc.anchorY) : null,
      map_id: loc.mapId,
    }));
  }

  /**
   * Admin: Upload a new campus map.
   * POST /admin/map
   * Deactivates previous map and sets new one as active.
   */
  async uploadMap(params: {
    name: string;
    storageKey: string;
    widthPx: number;
    heightPx: number;
    uploadedBy: string;
  }) {
    // Deactivate all existing maps
    await this.prisma.campusMap.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    return this.prisma.campusMap.create({
      data: {
        name: params.name,
        storageKey: params.storageKey,
        widthPx: params.widthPx,
        heightPx: params.heightPx,
        isActive: true,
        uploadedBy: params.uploadedBy,
      },
    });
  }

  /**
   * Admin: Create a predefined location.
   * POST /admin/locations
   */
  async createPredefinedLocation(params: {
    mapId: string;
    kind: string;
    name: string;
    anchorX?: number;
    anchorY?: number;
  }) {
    // Validate normalized coordinates if provided
    this.validateNormalizedCoordinates(params.anchorX, params.anchorY);

    // Verify map exists
    const map = await this.prisma.campusMap.findUnique({
      where: { id: params.mapId },
    });
    if (!map) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Campus map not found',
      });
    }

    return this.prisma.predefinedLocation.create({
      data: {
        mapId: params.mapId,
        kind: params.kind as any,
        name: params.name,
        anchorX: params.anchorX,
        anchorY: params.anchorY,
      },
    });
  }

  /**
   * Admin: Update a predefined location.
   * PATCH /admin/locations/:id
   */
  async updatePredefinedLocation(
    locationId: string,
    updates: {
      name?: string;
      kind?: string;
      anchorX?: number;
      anchorY?: number;
      isActive?: boolean;
    },
  ) {
    this.validateNormalizedCoordinates(updates.anchorX, updates.anchorY);

    return this.prisma.predefinedLocation.update({
      where: { id: locationId },
      data: {
        name: updates.name,
        kind: updates.kind as any,
        anchorX: updates.anchorX,
        anchorY: updates.anchorY,
        isActive: updates.isActive,
      },
    });
  }

  /**
   * Admin: Delete (soft-deactivate) a predefined location.
   * DELETE /admin/locations/:id
   */
  async deletePredefinedLocation(locationId: string) {
    return this.prisma.predefinedLocation.update({
      where: { id: locationId },
      data: { isActive: false },
    });
  }

  /**
   * Validate that pin coordinates are within normalized range [0, 1].
   */
  validateNormalizedCoordinates(x?: number, y?: number) {
    if (x !== undefined && (x < 0 || x > 1)) {
      throw new HttpException(
        {
          code: 'PIN_OUT_OF_RANGE',
          message: 'Pin X coordinate must be between 0.0 and 1.0',
          details: [{ field: 'pin_x', issue: 'OUT_OF_RANGE' }],
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (y !== undefined && (y < 0 || y > 1)) {
      throw new HttpException(
        {
          code: 'PIN_OUT_OF_RANGE',
          message: 'Pin Y coordinate must be between 0.0 and 1.0',
          details: [{ field: 'pin_y', issue: 'OUT_OF_RANGE' }],
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private buildMapUrl(storageKey: string): string {
    const endpoint = this.configService.get<string>('S3_ENDPOINT', 'http://localhost:9000');
    const bucket = this.configService.get<string>('S3_BUCKET_NAME', 'campus-sos-attachments');
    return `${endpoint}/${bucket}/${storageKey}`;
  }
}
