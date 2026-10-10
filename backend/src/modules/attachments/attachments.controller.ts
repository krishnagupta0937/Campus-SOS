import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { CurrentUser } from '../../common/decorators';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';

@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  /**
   * POST /attachments/uploads
   * Request a presigned upload URL for a photo attachment.
   */
  @Post('uploads')
  async requestUpload(
    @CurrentUser() user: AuthUser,
    @Body() body: {
      incident_id?: string;
      draft_id?: string;
      mime_type: string;
      size_bytes: number;
      position: number;
    },
  ) {
    return this.attachmentsService.requestUpload({
      uploaderId: user.id,
      incidentId: body.incident_id,
      draftId: body.draft_id,
      mimeType: body.mime_type,
      sizeBytes: body.size_bytes,
      position: body.position,
    });
  }

  /**
   * POST /attachments/:id/upload
   * Direct file upload (base64 payload) for dev / fallback mode.
   */
  @Post(':id/upload')
  @HttpCode(HttpStatus.OK)
  async directUpload(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { data_base64: string; mime_type?: string },
  ) {
    const buffer = Buffer.from(body.data_base64, 'base64');
    return this.attachmentsService.handleDirectUpload(
      id,
      userId,
      buffer,
      body.mime_type || 'image/jpeg',
    );
  }

  /**
   * POST /attachments/:id/complete
   * Finalize upload after client uploads to presigned URL.
   */
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeUpload(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.attachmentsService.completeUpload(id, userId);
  }

  /**
   * GET /attachments/:id/url
   * Get a short-lived signed download URL. Audited as PHOTO_VIEWED.
   */
  @Get(':id/url')
  async getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const teamIds = user.teamMemberships.map(tm => tm.teamId);
    return this.attachmentsService.getSignedDownloadUrl(
      id,
      user.id,
      user.role,
      teamIds,
    );
  }
}
