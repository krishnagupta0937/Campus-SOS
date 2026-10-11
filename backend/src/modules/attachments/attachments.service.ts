import { Injectable, BadRequestException, NotFoundException, ForbiddenException, HttpException, HttpStatus, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AccessPolicyService } from '../access-policy/access-policy.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

/**
 * Attachments service for photo evidence management.
 * - Presigned upload URLs (S3/MinIO)
 * - EXIF stripping via sharp
 * - Max 2 photos per incident (database constraint + application check)
 * - Signed download URLs with access auditing
 * PRD §8, API §9, CLAUDE_BACKEND_HANDOFF.md §11
 */
@Injectable()
export class AttachmentsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly maxPhotos = 2;
  private readonly maxSizeBytes = 10 * 1024 * 1024; // 10 MB
  private readonly allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @Optional() @Inject(AccessPolicyService) private readonly accessPolicyService?: AccessPolicyService,
  ) {
    this.bucket = this.configService.get<string>('S3_BUCKET_NAME', 'campus-sos-attachments');
    this.s3 = new S3Client({
      endpoint: this.configService.get<string>('S3_ENDPOINT', 'http://localhost:9000'),
      region: this.configService.get<string>('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: this.configService.get<string>('S3_SECRET_KEY', 'minioadmin'),
      },
      forcePathStyle: this.configService.get<boolean>('S3_FORCE_PATH_STYLE', true),
    });
  }

  /**
   * Request a presigned upload URL.
   * POST /attachments/uploads
   * Validates <= 2 photo constraint before granting.
   */
  async requestUpload(params: {
    uploaderId: string;
    incidentId?: string;
    draftId?: string;
    mimeType: string;
    sizeBytes: number;
    position: number;
  }) {
    // Validate MIME type
    if (!this.allowedMimeTypes.has(params.mimeType)) {
      throw new HttpException(
        {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: `Unsupported file type: ${params.mimeType}. Allowed: JPEG, PNG, WebP`,
          details: [{ field: 'mime_type', issue: 'UNSUPPORTED_TYPE' }],
        },
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }

    // Validate size
    if (params.sizeBytes > this.maxSizeBytes) {
      throw new HttpException(
        {
          code: 'FILE_TOO_LARGE',
          message: 'File too large. Maximum 10 MB.',
          details: [{ field: 'size_bytes', issue: 'MAX_SIZE_EXCEEDED' }],
        },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    // Validate position (1 or 2)
    if (params.position < 1 || params.position > 2) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Position must be 1 or 2',
        details: [{ field: 'position', issue: 'INVALID_POSITION' }],
      });
    }

    // Check existing photo count
    const existingCount = await this.prisma.attachment.count({
      where: {
        OR: [
          params.incidentId ? { incidentId: params.incidentId } : {},
          params.draftId ? { draftId: params.draftId } : {},
        ].filter(c => Object.keys(c).length > 0),
      },
    });

    if (existingCount >= this.maxPhotos) {
      throw new HttpException(
        {
          code: 'PHOTO_LIMIT_EXCEEDED',
          message: 'Maximum 2 photos allowed per incident',
          details: [{ field: 'photos', issue: 'MAX_2' }],
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Generate storage key
    const attachmentId = uuidv4();
    const ext = params.mimeType.split('/')[1] || 'jpg';
    const storageKey = `attachments/${params.incidentId || params.draftId}/${attachmentId}.${ext}`;

    // Create attachment record (pending upload)
    const attachment = await this.prisma.attachment.create({
      data: {
        id: attachmentId,
        incidentId: params.incidentId || null,
        draftId: params.draftId || null,
        uploaderId: params.uploaderId,
        storageKey,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        position: params.position,
        scanStatus: 'PENDING',
      },
    });

    // Generate presigned PUT URL (5 minutes) or fallback to backend direct upload
    let uploadUrl = '';
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        ContentType: params.mimeType,
        ContentLength: params.sizeBytes,
      });
      uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    } catch {
      uploadUrl = `http://localhost:4000/api/v1/attachments/${attachment.id}/upload`;
    }

    if (!uploadUrl || uploadUrl.includes('localhost:9000')) {
      uploadUrl = `http://localhost:4000/api/v1/attachments/${attachment.id}/upload`;
    }

    return {
      attachment_id: attachment.id,
      upload_url: uploadUrl,
      storage_key: storageKey,
      expires_in: 300,
    };
  }

  /**
   * Validate magic bytes against allowed image formats (JPEG, PNG, WebP).
   */
  validateMagicBytes(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
    if (!buffer || buffer.length < 12) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'image/png';
    }

    // WebP: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'image/webp';
    }

    return null;
  }

  /**
   * Sanitize image buffer by stripping EXIF metadata, normalizing orientation,
   * and extracting dimensions and SHA-256 hash.
   */
  async sanitizeImage(buffer: Buffer, mimeType: 'image/jpeg' | 'image/png' | 'image/webp') {
    let pipeline = sharp(buffer).rotate();
    if (mimeType === 'image/jpeg') {
      pipeline = pipeline.jpeg({ quality: 85 });
    } else if (mimeType === 'image/png') {
      pipeline = pipeline.png({ compressionLevel: 8 });
    } else if (mimeType === 'image/webp') {
      pipeline = pipeline.webp({ quality: 85 });
    }

    const cleanBuffer = await pipeline.toBuffer();
    const meta = await sharp(cleanBuffer).metadata();
    const sha256 = crypto.createHash('sha256').update(cleanBuffer).digest('hex');

    return {
      cleanBuffer,
      sha256,
      widthPx: meta.width ?? null,
      heightPx: meta.height ?? null,
      sizeBytes: cleanBuffer.length,
    };
  }

  /**
   * Handle direct file upload (dev / local storage fallback).
   */
  async handleDirectUpload(
    attachmentId: string,
    uploaderId: string,
    buffer: Buffer,
    claimedMimeType?: string,
  ) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Attachment not found',
      });
    }

    if (attachment.uploaderId !== uploaderId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not the uploader of this attachment',
      });
    }

    if (buffer.length > this.maxSizeBytes) {
      throw new HttpException(
        { code: 'FILE_TOO_LARGE', message: 'File too large. Maximum 10 MB.' },
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }

    // 1. Validate real file content magic bytes
    const detectedMime = this.validateMagicBytes(buffer);
    if (!detectedMime) {
      throw new HttpException(
        {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'File content does not match allowed image signatures (JPEG, PNG, WebP)',
          details: [{ field: 'file', issue: 'INVALID_MAGIC_BYTES' }],
        },
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }

    // 2. Strip EXIF and sanitize
    let sanitized: {
      cleanBuffer: Buffer;
      sha256: string;
      widthPx: number | null;
      heightPx: number | null;
      sizeBytes: number;
    };

    try {
      sanitized = await this.sanitizeImage(buffer, detectedMime);
    } catch {
      throw new BadRequestException({
        code: 'CORRUPTED_IMAGE',
        message: 'Unable to decode or sanitize image payload',
      });
    }

    const ext = detectedMime.split('/')[1] || 'jpg';
    const uploadDirs = [
      path.resolve(__dirname, '../../../../uploads'),
      path.resolve(__dirname, '../../../../frontend/public/uploads'),
    ];

    for (const dir of uploadDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path.join(dir, `${attachmentId}.${ext}`), sanitized.cleanBuffer);
    }

    await this.prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        scanStatus: 'CLEAN',
        sha256: sanitized.sha256,
        widthPx: sanitized.widthPx,
        heightPx: sanitized.heightPx,
        sizeBytes: sanitized.sizeBytes,
        mimeType: detectedMime,
      },
    });

    return {
      attachment_id: attachmentId,
      status: 'CLEAN',
      url: `/uploads/${attachmentId}.${ext}`,
      sha256: sanitized.sha256,
      width_px: sanitized.widthPx,
      height_px: sanitized.heightPx,
    };
  }

  /**
   * Complete upload: validate magic bytes, strip EXIF.
   * POST /attachments/{id}/complete
   */
  async completeUpload(attachmentId: string, uploaderId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Attachment not found',
      });
    }

    if (attachment.uploaderId !== uploaderId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not the uploader of this attachment',
      });
    }

    // Locate stored file on disk or in S3
    let buffer: Buffer | null = null;
    const possiblePaths = [
      path.resolve(__dirname, `../../../../uploads/${attachmentId}.jpg`),
      path.resolve(__dirname, `../../../../uploads/${attachmentId}.jpeg`),
      path.resolve(__dirname, `../../../../uploads/${attachmentId}.png`),
      path.resolve(__dirname, `../../../../uploads/${attachmentId}.webp`),
      path.resolve(__dirname, `../../../../frontend/public/uploads/${attachmentId}.jpg`),
      path.resolve(__dirname, `../../../../frontend/public/uploads/${attachmentId}.jpeg`),
      path.resolve(__dirname, `../../../../frontend/public/uploads/${attachmentId}.png`),
      path.resolve(__dirname, `../../../../frontend/public/uploads/${attachmentId}.webp`),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        buffer = fs.readFileSync(p);
        break;
      }
    }

    if (!buffer) {
      try {
        const getCmd = new GetObjectCommand({
          Bucket: this.bucket,
          Key: attachment.storageKey,
        });
        const res = await this.s3.send(getCmd);
        if (res.Body) {
          const chunks: any[] = [];
          for await (const chunk of res.Body as any) chunks.push(chunk);
          buffer = Buffer.concat(chunks);
        }
      } catch {
        // S3 fetch skipped
      }
    }

    let sha256 = attachment.sha256;
    let widthPx = attachment.widthPx;
    let heightPx = attachment.heightPx;
    let detectedMime = attachment.mimeType as 'image/jpeg' | 'image/png' | 'image/webp';

    if (buffer) {
      const detected = this.validateMagicBytes(buffer);
      if (!detected) {
        throw new HttpException(
          {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: 'File content does not match allowed image signatures (JPEG, PNG, WebP)',
          },
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        );
      }
      detectedMime = detected;

      try {
        const sanitized = await this.sanitizeImage(buffer, detectedMime);
        sha256 = sanitized.sha256;
        widthPx = sanitized.widthPx;
        heightPx = sanitized.heightPx;

        // Re-write sanitized buffer back to disk
        const ext = detectedMime.split('/')[1] || 'jpg';
        const uploadDirs = [
          path.resolve(__dirname, '../../../../uploads'),
          path.resolve(__dirname, '../../../../frontend/public/uploads'),
        ];
        for (const dir of uploadDirs) {
          if (fs.existsSync(dir)) {
            fs.writeFileSync(path.join(dir, `${attachmentId}.${ext}`), sanitized.cleanBuffer);
          }
        }
      } catch {
        throw new BadRequestException({
          code: 'CORRUPTED_IMAGE',
          message: 'Unable to decode or sanitize image payload',
        });
      }
    } else if (attachment.scanStatus === 'CLEAN') {
      return { attachment_id: attachmentId, status: 'CLEAN' };
    } else {
      throw new BadRequestException({
        code: 'FILE_NOT_FOUND',
        message: 'No uploaded file content found for verification',
      });
    }

    await this.prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        scanStatus: 'CLEAN',
        sha256,
        widthPx,
        heightPx,
        mimeType: detectedMime,
      },
    });

    return {
      attachment_id: attachmentId,
      status: 'CLEAN',
      sha256,
      width_px: widthPx,
      height_px: heightPx,
    };
  }

  /**
   * Generate a short-lived signed download URL.
   * GET /attachments/{id}/url
   * Access is audited with PHOTO_VIEWED event.
   */
  async getSignedDownloadUrl(
    attachmentId: string,
    requesterId: string,
    requesterRole: string,
    requesterTeamIds: string[],
  ) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        incident: {
          select: {
            id: true,
            reporterId: true,
            isRestricted: true,
            incidentTeams: {
              where: { revokedAt: null },
              select: { teamId: true },
            },
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Attachment not found',
      });
    }

    // Access control: reporter, admin, assigned team, or active break-glass with EVIDENCE_VIEW
    const incident = attachment.incident;
    const isReporter = incident?.reporterId === requesterId;
    const isAdmin = requesterRole === 'CAMPUS_ADMIN';
    const isAssignedTeam = incident?.incidentTeams.some(
      it => requesterTeamIds.includes(it.teamId),
    );

    let isBreakGlassEvidence = false;
    let breakGlassRequestId: string | undefined;

    if (!isReporter && !isAdmin && !isAssignedTeam) {
      if (this.accessPolicyService && (incident?.id || attachment.incidentId)) {
        const targetIncidentId = (incident?.id || attachment.incidentId)!;
        const grant = await this.accessPolicyService.getActiveGrant(requesterId, targetIncidentId);
        if (grant && grant.approvedScopes.includes('EVIDENCE_VIEW')) {
          isBreakGlassEvidence = true;
          breakGlassRequestId = grant.id;
        }
      }

      if (!isBreakGlassEvidence) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: 'You do not have access to this photo',
        });
      }
    }

    // Audit: PHOTO_VIEWED (includes break-glass correlation if applicable)
    await this.auditService.log({
      eventType: 'PHOTO_VIEWED',
      incidentId: attachment.incidentId || incident?.id,
      actorUserId: requesterId,
      actorKind: 'USER',
      targetType: 'attachment',
      targetId: attachmentId,
      details: isBreakGlassEvidence
        ? { breakGlass: true, requestId: breakGlassRequestId, scope: 'EVIDENCE_VIEW' }
        : undefined,
    });

    // Generate short-lived signed GET URL (60 seconds per API §9)
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: attachment.storageKey,
    });

    const downloadUrl = await getSignedUrl(this.s3, command, { expiresIn: 60 });

    return {
      url: downloadUrl,
      mime_type: attachment.mimeType,
      expires_in: 60,
    };
  }

  /**
   * Link draft attachments to a confirmed incident.
   */
  async linkDraftAttachments(draftId: string, incidentId: string) {
    await this.prisma.attachment.updateMany({
      where: { draftId },
      data: { incidentId, draftId: null },
    });
  }
}
