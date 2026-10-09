import { Controller, Post, Get, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';
import { GeminiService } from './gemini.service';
import { AiAnalyzeRequestSchema, AiAnalyzeRequestDto } from './ai.schema';
import { CurrentUser } from '../../common/decorators';
import { JwtAuthGuard, AuthUser } from '../../common/guards/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly geminiService: GeminiService,
  ) {}

  /**
   * POST /api/v1/ai/analyze
   * Live Assistive Incident Understanding via Google Gemini with deterministic fallback.
   * Authenticated endpoint.
   */
  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  async analyze(
    @Body() body: any,
    @CurrentUser() user: AuthUser,
    @Req() req: any,
  ) {
    const parseResult = AiAnalyzeRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Invalid incident analysis request payload',
        details: parseResult.error.errors,
      });
    }

    const ipAddress = req.ip || req.headers?.['x-forwarded-for'];
    return this.aiService.analyzeIncident(parseResult.data, user?.id, ipAddress);
  }

  /**
   * GET /api/v1/ai/status
   * Telemetry status of assistive AI engine.
   * Does NOT expose any keys or secrets.
   */
  @Get('status')
  async getStatus() {
    const configured = this.geminiService.isConfigured();
    return {
      status: 'ok',
      configured,
      activeProvider: configured ? 'gemini' : 'rule_fallback',
      model: this.geminiService.getModel(),
      features: {
        multilingual: true,
        languagesSupported: ['en', 'hi', 'hinglish'],
        deterministicRoutingGated: true,
      },
    };
  }
}
