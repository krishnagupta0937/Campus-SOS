import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttachmentsService } from './attachments.service';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('AttachmentsService (Photo Security & 2-Photo Enforcement)', () => {
  let service: AttachmentsService;
  let mockPrisma: any;
  let mockConfig: any;
  let mockAudit: any;

  beforeEach(() => {
    mockPrisma = {
      attachment: {
        count: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    mockConfig = {
      get: vi.fn((key: string, def?: any) => {
        if (key === 'S3_BUCKET_NAME') return 'test-bucket';
        if (key === 'S3_ENDPOINT') return 'http://localhost:9000';
        return def;
      }),
    };
    mockAudit = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new AttachmentsService(
      mockPrisma as PrismaService,
      mockConfig as ConfigService,
      mockAudit as AuditService,
    );
  });

  describe('Photo Limit Enforcement (PRD §8, API §9)', () => {
    it('should permit first photo upload (0 existing)', async () => {
      mockPrisma.attachment.count.mockResolvedValue(0);
      mockPrisma.attachment.create.mockResolvedValue({ id: 'att-1' });

      const result = await service.requestUpload({
        uploaderId: 'user-1',
        incidentId: 'inc-1',
        mimeType: 'image/jpeg',
        sizeBytes: 1024 * 1024, // 1 MB
        position: 1,
      });

      expect(result.attachment_id).toBe('att-1');
      expect(result.upload_url).toBeDefined();
    });

    it('should permit second photo upload (1 existing)', async () => {
      mockPrisma.attachment.count.mockResolvedValue(1);
      mockPrisma.attachment.create.mockResolvedValue({ id: 'att-2' });

      const result = await service.requestUpload({
        uploaderId: 'user-1',
        incidentId: 'inc-1',
        mimeType: 'image/png',
        sizeBytes: 2 * 1024 * 1024, // 2 MB
        position: 2,
      });

      expect(result.attachment_id).toBe('att-2');
    });

    it('should REJECT third photo upload with 422 PHOTO_LIMIT_EXCEEDED (2 existing)', async () => {
      mockPrisma.attachment.count.mockResolvedValue(2); // Already at maximum!

      await expect(
        service.requestUpload({
          uploaderId: 'user-1',
          incidentId: 'inc-1',
          mimeType: 'image/jpeg',
          sizeBytes: 1024 * 1024,
          position: 1,
        }),
      ).rejects.toThrow(HttpException);

      try {
        await service.requestUpload({
          uploaderId: 'user-1',
          incidentId: 'inc-1',
          mimeType: 'image/jpeg',
          sizeBytes: 1024 * 1024,
          position: 1,
        });
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(err.getResponse()).toMatchObject({ code: 'PHOTO_LIMIT_EXCEEDED' });
      }
    });

    it('should REJECT unsupported file MIME types with 415 UNSUPPORTED_MEDIA_TYPE', async () => {
      await expect(
        service.requestUpload({
          uploaderId: 'user-1',
          incidentId: 'inc-1',
          mimeType: 'application/pdf', // PDF not allowed for photo attachments
          sizeBytes: 50000,
          position: 1,
        }),
      ).rejects.toThrow(HttpException);

      try {
        await service.requestUpload({
          uploaderId: 'user-1',
          incidentId: 'inc-1',
          mimeType: 'application/x-msdownload',
          sizeBytes: 50000,
          position: 1,
        });
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        expect(err.getResponse()).toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' });
      }
    });

    it('should REJECT files larger than 10MB with 413 FILE_TOO_LARGE', async () => {
      await expect(
        service.requestUpload({
          uploaderId: 'user-1',
          incidentId: 'inc-1',
          mimeType: 'image/jpeg',
          sizeBytes: 11 * 1024 * 1024, // 11 MB > 10 MB limit
          position: 1,
        }),
      ).rejects.toThrow(HttpException);

      try {
        await service.requestUpload({
          uploaderId: 'user-1',
          incidentId: 'inc-1',
          mimeType: 'image/jpeg',
          sizeBytes: 15 * 1024 * 1024,
          position: 1,
        });
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
        expect(err.getResponse()).toMatchObject({ code: 'FILE_TOO_LARGE' });
      }
    });
  });

  describe('Audited Signed Download URLs', () => {
    it('should emit PHOTO_VIEWED audit event on download URL retrieval', async () => {
      mockPrisma.attachment.findUnique.mockResolvedValue({
        id: 'att-1',
        incidentId: 'inc-1',
        incident: { id: 'inc-1', reporterId: 'viewer-user-1', incidentTeams: [] },
        storageKey: 'attachments/inc-1/photo1.jpg',
      });

      const result = await service.getSignedDownloadUrl('att-1', 'viewer-user-1', 'CAMPUS_ADMIN', []);

      expect(result.url).toBeDefined();
      expect(result.expires_in).toBe(60); // 60 seconds per API §9
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PHOTO_VIEWED',
          incidentId: 'inc-1',
          actorUserId: 'viewer-user-1',
        }),
      );
    });
  });
});
