import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocationsService } from './locations.service';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('LocationsService (Campus Map & Pin Coordinate Validation)', () => {
  let service: LocationsService;
  let mockPrisma: any;
  let mockConfig: any;

  beforeEach(() => {
    mockPrisma = {
      campusMap: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      predefinedLocation: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
    };
    mockConfig = {
      get: vi.fn().mockReturnValue('http://localhost:9000'),
    };
    service = new LocationsService(mockPrisma as PrismaService, mockConfig as ConfigService);
  });

  describe('Normalized Pin Coordinate Validation (0.0 <= x,y <= 1.0)', () => {
    it('should accept valid boundary and internal coordinates', () => {
      expect(() => service.validateNormalizedCoordinates(0, 0)).not.toThrow();
      expect(() => service.validateNormalizedCoordinates(1, 1)).not.toThrow();
      expect(() => service.validateNormalizedCoordinates(0.5, 0.5)).not.toThrow();
      expect(() => service.validateNormalizedCoordinates(0.000001, 0.999999)).not.toThrow();
      expect(() => service.validateNormalizedCoordinates(undefined, undefined)).not.toThrow();
    });

    it('should reject x < 0 with 422 PIN_OUT_OF_RANGE', () => {
      try {
        service.validateNormalizedCoordinates(-0.01, 0.5);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(err.getResponse()).toMatchObject({ code: 'PIN_OUT_OF_RANGE' });
      }
    });

    it('should reject x > 1 with 422 PIN_OUT_OF_RANGE', () => {
      try {
        service.validateNormalizedCoordinates(1.0001, 0.5);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(err.getResponse()).toMatchObject({ code: 'PIN_OUT_OF_RANGE' });
      }
    });

    it('should reject y < 0 with 422 PIN_OUT_OF_RANGE', () => {
      try {
        service.validateNormalizedCoordinates(0.5, -0.5);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(err.getResponse()).toMatchObject({ code: 'PIN_OUT_OF_RANGE' });
      }
    });

    it('should reject y > 1 with 422 PIN_OUT_OF_RANGE', () => {
      try {
        service.validateNormalizedCoordinates(0.5, 2.0);
        expect.unreachable('Should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(err.getResponse()).toMatchObject({ code: 'PIN_OUT_OF_RANGE' });
      }
    });
  });
});
