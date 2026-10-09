import { Controller, Post, Get, Delete, Patch, Body, Param, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { AiService } from '../ai/ai.service';
import { Roles, CurrentUser, IdempotencyRequired } from '../../common/decorators';
import { AuthUser } from '../../common/guards/jwt-auth.guard';

@Controller('sos')
export class SosController {
  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly aiService: AiService,
  ) {}

  @Post('drafts')
  @Roles('STUDENT')
  async createDraft(
    @CurrentUser() user: AuthUser,
    @Body() body: {
      description: string;
      location?: { predefined_location_id?: string; kind?: string; text?: string };
      pin?: { x: number; y: number };
      attachment_ids?: string[];
    },
  ) {
    return this.incidentsService.createSosDraft(user.id, body);
  }

  @Patch('drafts/:id')
  @Roles('STUDENT')
  async updateDraft(
    @Param('id') draftId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: any,
  ) {
    // Update draft payload
    return { updated: true };
  }

  @Post('drafts/:id/preview')
  @Roles('STUDENT')
  async previewClassification(
    @Param('id') draftId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const draft = await this.incidentsService.getDraft(draftId, user.id);
    const payload = (draft.payload as any) || {};
    const description = payload.description || 'Emergency SOS assistance requested';
    const locationContext = payload.location?.text || payload.location?.name || null;
    const studentCategory = payload.category || payload.student_category || null;

    const analysis = await this.aiService.analyzeIncident(
      {
        description,
        studentCategory,
        locationContext,
        draftId: draft.id,
        workflow: 'EMERGENCY_SOS',
      },
      user.id,
    );

    // Persist preview on draft
    await this.incidentsService.saveDraftPreview(
      draft.id,
      analysis.classification,
      analysis.routingPreview,
    );

    return {
      classification: {
        category_label: analysis.classification.incidentType,
        category: analysis.classification.category,
        severity: analysis.classification.severity,
        immediate_danger: analysis.classification.immediateDanger,
        confidence: analysis.classification.confidence,
        reasoning: analysis.classification.reasoning,
        location_context: analysis.classification.locationContext,
        extracted_keywords: analysis.classification.extractedKeywords,
      },
      ai_analysis: analysis.classification,
      source: analysis.source,
      provider: analysis.provider,
      model: analysis.model,
      teams_to_alert: analysis.routingPreview.teamsToAlert,
      primary_team: analysis.routingPreview.primaryTeam,
      restricted_notice: analysis.routingPreview.restrictedNotice,
      campus_wide_eligible: analysis.routingPreview.campusWideEligible,
      matched_rules: analysis.routingPreview.matchedRules,
    };
  }

  @Post('drafts/:id/confirm')
  @Roles('STUDENT')
  @HttpCode(HttpStatus.CREATED)
  async confirmDraft(
    @Param('id') draftId: string,
    @CurrentUser() user: AuthUser,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      return {
        error: { code: 'VALIDATION_FAILED', message: 'Idempotency-Key header is required' },
      };
    }
    return this.incidentsService.confirmSosDraft(draftId, user.id, idempotencyKey);
  }

  @Delete('drafts/:id')
  @Roles('STUDENT')
  async deleteDraft(@Param('id') draftId: string) {
    return { deleted: true };
  }

  @Get(':incidentId/live')
  @Roles('STUDENT')
  async getLiveStatus(
    @Param('incidentId') incidentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.incidentsService.getSosLiveStatus(incidentId, user.id);
  }
}
