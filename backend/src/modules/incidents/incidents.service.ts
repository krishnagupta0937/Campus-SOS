import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, ForbiddenException, HttpException, HttpStatus,
  Optional, Inject, forwardRef, Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RoutingService, RoutingDecision } from '../routing/routing.service';
import { AiService, AiClassification } from '../ai/ai.service';
import { RuleClassifier } from '../ai/rule-classifier';
import { DispatchService } from '../dispatch/dispatch.service';
import { generatePublicId, isValidStatusTransition, STATUS_LABELS } from '../../common/utils/constants';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);
  private readonly routingService?: RoutingService;
  private readonly aiService?: AiService;
  private readonly dispatchService?: DispatchService;
  private readonly sosQueue?: Queue;
  private readonly standardQueue?: Queue;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Optional() routingService?: RoutingService,
    @Optional() aiService?: AiService,
    @Optional() dispatchService?: DispatchService,
    @Optional() @InjectQueue('sos-critical') sosQueue?: Queue,
    @Optional() @InjectQueue('standard') standardQueue?: Queue,
  ) {
    // If called with legacy signature: (prisma, audit, sosQueue, standardQueue)
    if (routingService && typeof (routingService as any).add === 'function') {
      this.sosQueue = routingService as any;
      this.standardQueue = aiService as any;
      this.routingService = undefined;
      this.aiService = undefined;
      this.dispatchService = undefined;
    } else {
      this.routingService = routingService;
      this.aiService = aiService;
      this.dispatchService = dispatchService;
      this.sosQueue = sosQueue;
      this.standardQueue = standardQueue;
    }
  }

  /**
   * Create an SOS draft for staging before explicit confirmation.
   */
  async createSosDraft(reporterId: string, data: {
    description: string;
    location?: { predefined_location_id?: string; kind?: string; text?: string };
    pin?: { x: number; y: number };
    attachment_ids?: string[];
  }) {
    // Validate pin coordinates if provided
    if (data.pin) {
      if (data.pin.x < 0 || data.pin.x > 1 || data.pin.y < 0 || data.pin.y > 1) {
        throw new HttpException(
          { code: 'PIN_OUT_OF_RANGE', message: 'Pin coordinates must be between 0 and 1' },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const draft = await this.prisma.incidentDraft.create({
      data: {
        reporterId,
        workflow: 'EMERGENCY_SOS',
        payload: data as any,
        expiresAt,
      },
    });

    return {
      draft_id: draft.id,
      expires_at: draft.expiresAt.toISOString(),
    };
  }

  async getDraft(draftId: string, reporterId: string) {
    const draft = await this.prisma.incidentDraft.findFirst({
      where: { id: draftId, reporterId },
    });
    if (!draft) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'SOS draft not found' });
    }
    return draft;
  }

  async saveDraftPreview(draftId: string, classificationPreview: any, routingPreview: any) {
    try {
      return await this.prisma.incidentDraft.update({
        where: { id: draftId },
        data: {
          classificationPreview,
          routingPreview,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to save draft preview for draft ${draftId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Confirm an SOS draft — explicit confirmation step.
   * This is the critical transaction: creates the incident, audit entry, and outbox event atomically.
   * NEVER calls external services (AI, SMS, Push) in this transaction.
   */
  async confirmSosDraft(draftId: string, reporterId: string, idempotencyKey: string) {
    // Check idempotency
    const existing = await this.prisma.incident.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      return {
        incident: {
          id: existing.id,
          public_id: existing.publicId,
          status: existing.status,
          workflow: existing.workflow,
        },
        live_channel: `incident:${existing.id}`,
        idempotency_replay: true,
      };
    }

    // Find draft
    const draft = await this.prisma.incidentDraft.findFirst({
      where: { id: draftId, reporterId, workflow: 'EMERGENCY_SOS' },
    });

    if (!draft) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'SOS draft not found' });
    }

    if (draft.expiresAt < new Date()) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Draft has expired' });
    }

    const payload = draft.payload as any;

    // Generate public ID
    const count = await this.prisma.incident.count({ where: { workflow: 'EMERGENCY_SOS' } });
    const publicId = generatePublicId('EMERGENCY_SOS', count + 1);

    // 1. Classification via AiService or fallback RuleClassifier
    let classification: AiClassification;
    if (this.aiService && typeof this.aiService.classify === 'function') {
      classification = await this.aiService.classify({
        workflow: 'EMERGENCY_SOS',
        description: payload.description || '',
        student_category: null,
        location: payload.location ? { kind: payload.location.kind || null, name: payload.location.text || null } : null,
        photo_present: Boolean(payload.attachment_ids && payload.attachment_ids.length > 0),
        photo_count: payload.attachment_ids?.length || 0,
        time_of_day: 'DAY',
        language_hint: 'auto',
      });
    } else {
      const classifier = new RuleClassifier();
      classification = classifier.classify({
        workflow: 'EMERGENCY_SOS',
        description: payload.description || '',
        student_category: null,
        location: payload.location ? { kind: payload.location.kind || null, name: payload.location.text || null } : null,
        photo_present: Boolean(payload.attachment_ids && payload.attachment_ids.length > 0),
        photo_count: payload.attachment_ids?.length || 0,
        time_of_day: 'DAY',
        language_hint: 'auto',
      });
    }

    // 2. Deterministic Routing Engine
    const routingEngine = (this.routingService && typeof this.routingService.route === 'function')
      ? this.routingService
      : new RoutingService(this.prisma);
    const routingDecision: RoutingDecision = await routingEngine.route(classification, {
      workflow: 'EMERGENCY_SOS',
      student_category: null,
    });

    const isRestricted = routingDecision.restricted;
    const campusWideEligible = routingDecision.campus_wide_eligible;
    const finalCategory = classification.category || 'OTHER';

    // Atomic transaction: incident + location + classification + routing + teams + notifications + outbox + audit + draft deletion
    let result: any;
    try {
      result = await this.prisma.$transaction(async (tx: any) => {
        const incident = await tx.incident.create({
          data: {
            publicId,
            workflow: 'EMERGENCY_SOS',
            reporterId,
            createdById: reporterId,
            description: payload.description,
            studentCategory: null, // SOS never has student category
            finalCategory,
            status: 'CREATED',
            confirmedAt: new Date(),
            firstTeamNotifiedAt: null,
            isRestricted,
            immediateDanger: classification.immediate_danger ?? true,
            campusWideEligible,
            idempotencyKey,
          },
        });

        // Create location if provided
        if (payload.pin || payload.location) {
          await tx.incidentLocation.create({
            data: {
              incidentId: incident.id,
              mapId: null,
              predefinedLocationId: payload.location?.predefined_location_id || null,
              locationKind: payload.location?.kind || null,
              locationText: payload.location?.text || null,
              pinX: payload.pin?.x || null,
              pinY: payload.pin?.y || null,
            },
          });
        }

        // Link attachments if any
        if (payload.attachment_ids && payload.attachment_ids.length > 0) {
          if (payload.attachment_ids.length > 2) {
            throw new HttpException(
              { code: 'PHOTO_LIMIT_EXCEEDED', message: 'Maximum 2 photos allowed' },
              HttpStatus.UNPROCESSABLE_ENTITY,
            );
          }

          for (let i = 0; i < payload.attachment_ids.length; i++) {
            await tx.attachment.update({
              where: { id: payload.attachment_ids[i] },
              data: {
                incidentId: incident.id,
                draftId: null,
                position: i + 1,
              },
            });
          }
        }

        // Persist AI classification without swallowing errors
        const aiRecord = tx.aiClassification?.create
          ? await tx.aiClassification.create({
              data: {
                incidentId: incident.id,
                source: classification.source === 'AI' ? 'AI' : 'RULE_FALLBACK',
                category: classification.category,
                confidence: classification.confidence,
                immediateDanger: classification.immediate_danger,
                reasoning: classification.reasoning,
                inputSnapshot: { description: payload.description },
                output: classification as any,
                latencyMs: 10,
              },
            })
          : null;

        // Authoritative deterministic routing fulfillment check:
        // Check existence, enabled state, and active members for each team.
        const routedTeamCodes = routingDecision.teams.map((t) => t.team_code);
        const unfulfilledTeams: Array<{ team_code: string; role: string; reason: 'MISSING_IN_DB' | 'DISABLED' | 'NO_ACTIVE_RECIPIENTS' }> = [];
        const fulfilledTeams: Array<{ team_code: string; role: string; memberCount: number; teamId: string }> = [];

        if (tx.team?.findFirst) {
          for (const tDef of routingDecision.teams) {
            const team = await tx.team.findFirst({ where: { code: tDef.team_code } });
            if (!team) {
              unfulfilledTeams.push({ team_code: tDef.team_code, role: tDef.role, reason: 'MISSING_IN_DB' });
              continue;
            }

            if (team.isEnabled === false) {
              unfulfilledTeams.push({ team_code: tDef.team_code, role: tDef.role, reason: 'DISABLED' });
              if (tx.incidentTeam?.create) {
                await tx.incidentTeam.create({
                  data: {
                    incidentId: incident.id,
                    teamId: team.id,
                    role: tDef.role,
                    grantedBy: 'ROUTING',
                  },
                });
              }
              continue;
            }

            // Find active team members
            const rawMembers = tx.teamMember?.findMany
              ? await tx.teamMember.findMany({ where: { teamId: team.id, leftAt: null } })
              : [];

            const activeMembers: any[] = [];
            for (const m of rawMembers) {
              const u = await tx.user.findFirst({ where: { id: m.userId, isActive: true } });
              if (u) {
                activeMembers.push(m);
              }
            }

            if (activeMembers.length === 0) {
              unfulfilledTeams.push({ team_code: tDef.team_code, role: tDef.role, reason: 'NO_ACTIVE_RECIPIENTS' });
              if (tx.incidentTeam?.create) {
                await tx.incidentTeam.create({
                  data: {
                    incidentId: incident.id,
                    teamId: team.id,
                    role: tDef.role,
                    grantedBy: 'ROUTING',
                  },
                });
              }
              continue;
            }

            // Fulfilled team with active members
            fulfilledTeams.push({ team_code: tDef.team_code, role: tDef.role, memberCount: activeMembers.length, teamId: team.id });
            if (tx.incidentTeam?.create) {
              await tx.incidentTeam.create({
                data: {
                  incidentId: incident.id,
                  teamId: team.id,
                  role: tDef.role,
                  grantedBy: 'ROUTING',
                },
              });
            }

            // Deliver in-app notification to active team members with status SENT (never premature DELIVERED)
            for (const m of activeMembers) {
              if (tx.notification?.create) {
                const notif = await tx.notification.create({
                  data: {
                    recipientUserId: m.userId,
                    recipientId: m.userId,
                    incidentId: incident.id,
                    audienceType: 'RESPONDER',
                    channel: 'IN_APP',
                    deliveryStatus: 'SENT',
                    title: `Emergency SOS Alert: ${publicId}`,
                    body: `${(payload.description || 'Emergency SOS confirmed').substring(0, 100)}`,
                    payload: {
                      incident_id: incident.id,
                      public_id: publicId,
                      workflow: 'EMERGENCY_SOS',
                      team_code: tDef.team_code,
                      role: tDef.role,
                    },
                  },
                });

                if (notif?.id && tx.notificationDelivery?.create) {
                  await tx.notificationDelivery.create({
                    data: {
                      notificationId: notif.id,
                      channel: 'IN_APP',
                      status: 'SENT',
                      sentAt: new Date(),
                    },
                  });
                }
              }
            }
          }
        }

        // Determine degraded routing status
        const isDegraded = unfulfilledTeams.length > 0;
        const finalFlags = [...(routingDecision.flags || [])];
        if (isDegraded) {
          finalFlags.push('DEGRADED_ROUTING');
          for (const uf of unfulfilledTeams) {
            finalFlags.push(`UNFULFILLED_TEAM:${uf.reason}:${uf.team_code}`);
          }
        }

        // Persist authoritative deterministic routing decision
        if (tx.routingDecision?.create) {
          await tx.routingDecision.create({
            data: {
              incidentId: incident.id,
              classificationId: aiRecord?.id || incident.id,
              configVersion: routingDecision.config_version,
              matchedRules: routingDecision.matched_rules,
              teams: routingDecision.teams as any,
              restrictions: { restricted: routingDecision.restricted } as any,
              audience: { campus_wide_eligible: routingDecision.campus_wide_eligible } as any,
              flags: finalFlags,
            },
          });
        }

        // If at least one team was notified, record firstTeamNotifiedAt
        let updatedIncident = incident;
        if (fulfilledTeams.length > 0) {
          updatedIncident = await tx.incident.update({
            where: { id: incident.id },
            data: {
              firstTeamNotifiedAt: new Date(),
            },
          });
        }

        // If degraded, record auditable ESCALATED event and alert campus admins
        // Safety design: NEVER rollback emergency SOS record
        if (isDegraded) {
          await this.auditService.logWithTransaction(tx, {
            eventType: 'ESCALATED',
            incidentId: incident.id,
            actorKind: 'SYSTEM',
            details: {
              reason: 'DEGRADED_ROUTING',
              unfulfilled_teams: unfulfilledTeams,
              fulfilled_teams: fulfilledTeams,
              description: 'Emergency SOS routing unfulfilled for one or more teams',
            },
          });

          // Urgent degraded notification to Campus Admin
          const adminUsers = await tx.user.findMany({
            where: { role: 'CAMPUS_ADMIN', isActive: true },
            select: { id: true },
          });
          for (const admin of adminUsers) {
            if (tx.notification?.create) {
              const notif = await tx.notification.create({
                data: {
                  recipientUserId: admin.id,
                  recipientId: admin.id,
                  incidentId: incident.id,
                  audienceType: 'ACT',
                  channel: 'IN_APP',
                  deliveryStatus: 'SENT',
                  title: `DEGRADED ROUTING ALERT: Emergency SOS ${publicId}`,
                  body: `Emergency SOS ${publicId} routing degraded. Unfulfilled teams: ${unfulfilledTeams.map(u => `${u.team_code} (${u.reason})`).join(', ')}`,
                  payload: {
                    incident_id: incident.id,
                    public_id: publicId,
                    workflow: 'EMERGENCY_SOS',
                    unfulfilled_teams: unfulfilledTeams,
                  },
                },
              });

              if (notif?.id && tx.notificationDelivery?.create) {
                await tx.notificationDelivery.create({
                  data: {
                    notificationId: notif.id,
                    channel: 'IN_APP',
                    status: 'SENT',
                    sentAt: new Date(),
                  },
                });
              }
            }
          }
        }

        // Outbox event: guaranteed delivery to worker
        await tx.outboxEvent.create({
          data: {
            eventType: 'incident.created',
            aggregateId: incident.id,
            payload: {
              incident_id: incident.id,
              workflow: 'EMERGENCY_SOS',
              public_id: publicId,
              reporter_id: reporterId,
              routed_teams: routedTeamCodes,
              routing_decision: {
                ...routingDecision,
                flags: finalFlags,
              },
              is_degraded: isDegraded,
              unfulfilled_teams: unfulfilledTeams,
            },
          },
        });

        // Audit: SOS_CONFIRMED & ROUTING_DECISION
        await this.auditService.logWithTransaction(tx, {
          eventType: 'SOS_CONFIRMED',
          incidentId: incident.id,
          actorUserId: reporterId,
          actorKind: 'USER',
          details: { public_id: publicId, workflow: 'EMERGENCY_SOS', is_degraded: isDegraded },
        });

        await this.auditService.logWithTransaction(tx, {
          eventType: 'ROUTING_DECISION',
          incidentId: incident.id,
          actorKind: 'SYSTEM',
          details: {
            public_id: publicId,
            matched_rules: routingDecision.matched_rules,
            routed_teams: routedTeamCodes,
            restricted: isRestricted,
            flags: finalFlags,
            is_degraded: isDegraded,
          },
        });

        // Delete draft atomically inside transaction to prevent duplicate confirmations
        await tx.incidentDraft.delete({ where: { id: draftId } });

        return updatedIncident;
      });
    } catch (err: any) {
      // Concurrency check: If another concurrent transaction created with this idempotency key
      if (
        err?.code === 'P2002' ||
        err?.message?.includes('idempotency_key') ||
        err?.message?.includes('idempotencyKey')
      ) {
        const replayed = await this.prisma.incident.findUnique({
          where: { idempotencyKey },
        });
        if (replayed) {
          return {
            incident: {
              id: replayed.id,
              public_id: replayed.publicId,
              status: replayed.status,
              workflow: replayed.workflow,
            },
            live_channel: `incident:${replayed.id}`,
            idempotency_replay: true,
          };
        }
      }
      throw err;
    }

    // Initiate dispatch offers to responders for ACT teams
    if (this.dispatchService) {
      try {
        await this.dispatchService.initiateDispatch(
          result.id,
          routingDecision.teams,
          'EMERGENCY_SOS',
        );
      } catch (dispatchErr: any) {
        this.logger.warn(`Dispatch initiation warning (proceeding resiliently): ${dispatchErr?.message}`);
      }
    }

    // Enqueue for background processing (non-blocking)
    try {
      if (this.sosQueue) {
        await this.sosQueue.add('process-sos', {
          incident_id: result.id,
          workflow: 'EMERGENCY_SOS',
        }, {
          priority: 1,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        });
      }
    } catch (queueErr: any) {
      this.logger.warn(`Failed to enqueue SOS job for incident ${result.id}: ${queueErr?.message}`);
    }

    return {
      incident: {
        id: result.id,
        public_id: result.publicId,
        status: result.status,
        workflow: result.workflow,
      },
      live_channel: `incident:${result.id}`,
    };
  }

  /**
   * Create a standard report.
   */
  async createStandardReport(reporterId: string, data: {
    description: string;
    category: string;
    location: { predefined_location_id?: string; kind: string; text?: string };
    pin: { x: number; y: number };
    attachment_ids?: string[];
  }, idempotencyKey: string) {
    if (!data || !data.description || !data.category || !data.location || !data.pin) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Missing required report fields: description, category, location, and pin',
      });
    }

    // Validate pin
    if (
      typeof data.pin.x !== 'number' ||
      typeof data.pin.y !== 'number' ||
      data.pin.x < 0 ||
      data.pin.x > 1 ||
      data.pin.y < 0 ||
      data.pin.y > 1
    ) {
      throw new HttpException(
        { code: 'PIN_OUT_OF_RANGE', message: 'Pin coordinates must be between 0 and 1' },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (data.description.length < 10) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Standard report description must be at least 10 characters',
      });
    }

    // Check idempotency
    const existing = await this.prisma.incident.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return {
        incident: {
          id: existing.id,
          public_id: existing.publicId,
          status: existing.status,
          workflow: existing.workflow,
        },
        idempotency_replay: true,
      };
    }

    const count = await this.prisma.incident.count({ where: { workflow: 'STANDARD_REPORT' } });
    const publicId = generatePublicId('STANDARD_REPORT', count + 1);

    // 1. Classification via AiService or fallback RuleClassifier
    let classification: AiClassification;
    if (this.aiService && typeof this.aiService.classify === 'function') {
      classification = await this.aiService.classify({
        workflow: 'STANDARD_REPORT',
        description: data.description,
        student_category: data.category,
        location: data.location ? { kind: data.location.kind || null, name: data.location.text || null } : null,
        photo_present: Boolean(data.attachment_ids && data.attachment_ids.length > 0),
        photo_count: data.attachment_ids?.length || 0,
        time_of_day: 'DAY',
        language_hint: 'auto',
      });
    } else {
      const classifier = new RuleClassifier();
      classification = classifier.classify({
        workflow: 'STANDARD_REPORT',
        description: data.description,
        student_category: data.category,
        location: data.location ? { kind: data.location.kind || null, name: data.location.text || null } : null,
        photo_present: Boolean(data.attachment_ids && data.attachment_ids.length > 0),
        photo_count: data.attachment_ids?.length || 0,
        time_of_day: 'DAY',
        language_hint: 'auto',
      });
    }

    // 2. Deterministic Routing Engine (authoritative category union evaluation)
    const routingEngine = (this.routingService && typeof this.routingService.route === 'function')
      ? this.routingService
      : new RoutingService(this.prisma);
    const routingDecision: RoutingDecision = await routingEngine.route(classification, {
      workflow: 'STANDARD_REPORT',
      student_category: data.category,
    });

    const isRestricted = routingDecision.restricted;
    const campusWideEligible = routingDecision.campus_wide_eligible;
    const finalCategory = (classification.category && classification.category !== 'OTHER')
      ? classification.category
      : data.category;

    let result: any;
    try {
      result = await this.prisma.$transaction(async (tx: any) => {
        const incident = await tx.incident.create({
          data: {
            publicId,
            workflow: 'STANDARD_REPORT',
            reporterId,
            createdById: reporterId,
            description: data.description,
            studentCategory: data.category,
            finalCategory,
            status: 'CREATED',
            isRestricted,
            immediateDanger: classification.immediate_danger || false,
            campusWideEligible,
            firstTeamNotifiedAt: null,
            idempotencyKey,
          },
        });

        // Location is required for standard reports
        await tx.incidentLocation.create({
          data: {
            incidentId: incident.id,
            predefinedLocationId: data.location?.predefined_location_id || null,
            locationKind: data.location?.kind as any || null,
            locationText: data.location?.text || null,
            pinX: data.pin.x,
            pinY: data.pin.y,
          },
        });

        // Attachments
        if (data.attachment_ids && data.attachment_ids.length > 0) {
          if (data.attachment_ids.length > 2) {
            throw new HttpException(
              { code: 'PHOTO_LIMIT_EXCEEDED', message: 'Maximum 2 photos allowed' },
              HttpStatus.UNPROCESSABLE_ENTITY,
            );
          }
          for (let i = 0; i < data.attachment_ids.length; i++) {
            await tx.attachment.update({
              where: { id: data.attachment_ids[i] },
              data: { incidentId: incident.id, position: i + 1 },
            });
          }
        }

        // Persist AI classification without swallowing errors
        const aiRecord = tx.aiClassification?.create
          ? await tx.aiClassification.create({
              data: {
                incidentId: incident.id,
                source: classification.source === 'AI' ? 'AI' : 'RULE_FALLBACK',
                category: classification.category,
                confidence: classification.confidence,
                immediateDanger: classification.immediate_danger,
                reasoning: classification.reasoning,
                inputSnapshot: { description: data.description, category: data.category },
                output: classification as any,
                latencyMs: 10,
              },
            })
          : null;

        // Authoritative deterministic routing fulfillment check:
        // Check existence, enabled state, and active members for each team.
        const routedTeamCodes = routingDecision.teams.map((t) => t.team_code);
        const unfulfilledTeams: Array<{ team_code: string; role: string; reason: 'MISSING_IN_DB' | 'DISABLED' | 'NO_ACTIVE_RECIPIENTS' }> = [];
        const fulfilledTeams: Array<{ team_code: string; role: string; memberCount: number; teamId: string }> = [];

        // Pick up any unfulfilled/disabled teams flagged by routing engine
        for (const f of (routingDecision.flags || [])) {
          if (f.startsWith('UNFULFILLED_TEAM:')) {
            const parts = f.split(':');
            unfulfilledTeams.push({ team_code: parts[2], role: 'ACT', reason: parts[1] as any });
          }
        }

        if (tx.team?.findFirst) {
          for (const tDef of routingDecision.teams) {
            const team = await tx.team.findFirst({ where: { code: tDef.team_code } });
            if (!team) {
              unfulfilledTeams.push({ team_code: tDef.team_code, role: tDef.role, reason: 'MISSING_IN_DB' });
              continue;
            }

            if (team.isEnabled === false) {
              unfulfilledTeams.push({ team_code: tDef.team_code, role: tDef.role, reason: 'DISABLED' });
              if (tx.incidentTeam?.create) {
                await tx.incidentTeam.create({
                  data: {
                    incidentId: incident.id,
                    teamId: team.id,
                    role: tDef.role,
                    grantedBy: 'ROUTING',
                  },
                });
              }
              continue;
            }

            // Find active team members
            const rawMembers = tx.teamMember?.findMany
              ? await tx.teamMember.findMany({ where: { teamId: team.id, leftAt: null } })
              : [];

            const activeMembers: any[] = [];
            for (const m of rawMembers) {
              const u = await tx.user.findFirst({ where: { id: m.userId, isActive: true } });
              if (u) {
                activeMembers.push(m);
              }
            }

            if (activeMembers.length === 0) {
              unfulfilledTeams.push({ team_code: tDef.team_code, role: tDef.role, reason: 'NO_ACTIVE_RECIPIENTS' });
              if (tx.incidentTeam?.create) {
                await tx.incidentTeam.create({
                  data: {
                    incidentId: incident.id,
                    teamId: team.id,
                    role: tDef.role,
                    grantedBy: 'ROUTING',
                  },
                });
              }
              continue;
            }

            // Fulfilled team with active members
            fulfilledTeams.push({ team_code: tDef.team_code, role: tDef.role, memberCount: activeMembers.length, teamId: team.id });
            if (tx.incidentTeam?.create) {
              await tx.incidentTeam.create({
                data: {
                  incidentId: incident.id,
                  teamId: team.id,
                  role: tDef.role,
                  grantedBy: 'ROUTING',
                },
              });
            }

            // Deliver in-app notification to active team members with status SENT (never premature DELIVERED)
            for (const m of activeMembers) {
              if (tx.notification?.create) {
                const notif = await tx.notification.create({
                  data: {
                    recipientUserId: m.userId,
                    recipientId: m.userId,
                    incidentId: incident.id,
                    audienceType: 'RESPONDER',
                    channel: 'IN_APP',
                    deliveryStatus: 'SENT',
                    title: `New Incident Assigned: ${publicId}`,
                    body: `${data.description.substring(0, 100)}`,
                    payload: {
                      incident_id: incident.id,
                      public_id: publicId,
                      workflow: 'STANDARD_REPORT',
                      team_code: tDef.team_code,
                      role: tDef.role,
                    },
                  },
                });

                if (notif?.id && tx.notificationDelivery?.create) {
                  await tx.notificationDelivery.create({
                    data: {
                      notificationId: notif.id,
                      channel: 'IN_APP',
                      status: 'SENT',
                      sentAt: new Date(),
                    },
                  });
                }
              }
            }
          }
        }

        // Determine degraded routing status
        const isDegraded = unfulfilledTeams.length > 0;
        const finalFlags = [...(routingDecision.flags || [])];
        if (isDegraded) {
          if (!finalFlags.includes('DEGRADED_ROUTING')) {
            finalFlags.push('DEGRADED_ROUTING');
          }
          for (const uf of unfulfilledTeams) {
            const tag = `UNFULFILLED_TEAM:${uf.reason}:${uf.team_code}`;
            if (!finalFlags.includes(tag)) {
              finalFlags.push(tag);
            }
          }
        }

        // Persist authoritative deterministic routing decision
        if (tx.routingDecision?.create) {
          await tx.routingDecision.create({
            data: {
              incidentId: incident.id,
              classificationId: aiRecord?.id || incident.id,
              configVersion: routingDecision.config_version,
              matchedRules: routingDecision.matched_rules,
              teams: routingDecision.teams as any,
              restrictions: { restricted: routingDecision.restricted } as any,
              audience: { campus_wide_eligible: routingDecision.campus_wide_eligible } as any,
              flags: finalFlags,
            },
          });
        }

        // Authoritative status transition:
        // If at least one team was notified, status is TEAMS_NOTIFIED.
        // If 0 teams could be fulfilled, status remains CREATED (never falsely shown as fully routed).
        let finalStatus = 'CREATED';
        let notifiedAt: Date | null = null;
        if (fulfilledTeams.length > 0) {
          finalStatus = 'TEAMS_NOTIFIED';
          notifiedAt = new Date();
        }

        const updatedIncident = await tx.incident.update({
          where: { id: incident.id },
          data: {
            status: finalStatus,
            firstTeamNotifiedAt: notifiedAt,
          },
        });

        // Record degraded audit event and alert coordinator if degraded
        if (isDegraded) {
          await this.auditService.logWithTransaction(tx, {
            eventType: 'ESCALATED',
            incidentId: incident.id,
            actorKind: 'SYSTEM',
            details: {
              reason: 'DEGRADED_ROUTING',
              unfulfilled_teams: unfulfilledTeams,
              fulfilled_teams: fulfilledTeams,
              description: 'Standard report routing unfulfilled for one or more teams',
            },
          });

          // Alert campus admins of degraded routing
          const adminUsers = await tx.user.findMany({
            where: { role: 'CAMPUS_ADMIN', isActive: true },
            select: { id: true },
          });
          for (const admin of adminUsers) {
            if (tx.notification?.create) {
              const notif = await tx.notification.create({
                data: {
                  recipientUserId: admin.id,
                  recipientId: admin.id,
                  incidentId: incident.id,
                  audienceType: 'ACT',
                  channel: 'IN_APP',
                  deliveryStatus: 'SENT',
                  title: `DEGRADED ROUTING ALERT: ${publicId}`,
                  body: `Standard report ${publicId} routing degraded. Unfulfilled teams: ${unfulfilledTeams.map(u => `${u.team_code} (${u.reason})`).join(', ')}`,
                  payload: {
                    incident_id: incident.id,
                    public_id: publicId,
                    workflow: 'STANDARD_REPORT',
                    unfulfilled_teams: unfulfilledTeams,
                  },
                },
              });

              if (notif?.id && tx.notificationDelivery?.create) {
                await tx.notificationDelivery.create({
                  data: {
                    notificationId: notif.id,
                    channel: 'IN_APP',
                    status: 'SENT',
                    sentAt: new Date(),
                  },
                });
              }
            }
          }
        }

        // Outbox event
        await tx.outboxEvent.create({
          data: {
            eventType: 'incident.created',
            aggregateId: incident.id,
            payload: {
              incident_id: incident.id,
              workflow: 'STANDARD_REPORT',
              public_id: publicId,
              reporter_id: reporterId,
              student_category: data.category,
              final_category: finalCategory,
              routed_teams: routedTeamCodes,
              routing_decision: {
                ...routingDecision,
                flags: finalFlags,
              },
              is_degraded: isDegraded,
              unfulfilled_teams: unfulfilledTeams,
            },
          },
        });

        // Audit: INCIDENT_CREATED & ROUTING_DECISION
        await this.auditService.logWithTransaction(tx, {
          eventType: 'INCIDENT_CREATED',
          incidentId: incident.id,
          actorUserId: reporterId,
          actorKind: 'USER',
          details: { public_id: publicId, workflow: 'STANDARD_REPORT', category: data.category, final_category: finalCategory, is_degraded: isDegraded },
        });

        await this.auditService.logWithTransaction(tx, {
          eventType: 'ROUTING_DECISION',
          incidentId: incident.id,
          actorKind: 'SYSTEM',
          details: {
            public_id: publicId,
            matched_rules: routingDecision.matched_rules,
            routed_teams: routedTeamCodes,
            restricted: isRestricted,
            flags: finalFlags,
            is_degraded: isDegraded,
          },
        });

        return updatedIncident;
      });
    } catch (err: any) {
      if (
        err?.code === 'P2002' ||
        err?.message?.includes('idempotency_key') ||
        err?.message?.includes('idempotencyKey')
      ) {
        const replayed = await this.prisma.incident.findUnique({
          where: { idempotencyKey },
        });
        if (replayed) {
          return {
            incident: {
              id: replayed.id,
              public_id: replayed.publicId,
              status: replayed.status,
              workflow: replayed.workflow,
            },
            idempotency_replay: true,
          };
        }
      }
      throw err;
    }

    // Enqueue
    try {
      if (this.standardQueue) {
        await this.standardQueue.add('process-standard', {
          incident_id: result.id,
          workflow: 'STANDARD_REPORT',
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        });
      }
    } catch (queueErr: any) {
      this.logger.warn(`Failed to enqueue standard report job for incident ${result.id}: ${queueErr?.message}`);
    }

    return {
      incident: {
        id: result.id,
        public_id: result.publicId,
        status: result.status,
        workflow: result.workflow,
      },
    };
  }

  /**
   * Get SOS live status for student tracking.
   */
  async getSosLiveStatus(incidentId: string, reporterId: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, reporterId, workflow: 'EMERGENCY_SOS' },
      include: {
        assignments: {
          where: { status: { in: ['ACCEPTED', 'EN_ROUTE', 'ON_SCENE'] } },
          include: {
            member: {
              include: {
                user: { select: { fullName: true } },
                team: { select: { name: true } },
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!incident) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
    }

    const steps = [
      { key: 'EMERGENCY_CREATED', label: 'Emergency Created', at: incident.createdAt?.toISOString(), done: true },
      { key: 'TEAMS_NOTIFIED', label: 'Teams Notified', at: incident.firstTeamNotifiedAt?.toISOString() || null, done: !!incident.firstTeamNotifiedAt },
      { key: 'RESPONDER_ASSIGNED', label: 'Responder Assigned', at: incident.firstAcceptedAt?.toISOString() || null, done: !!incident.firstAcceptedAt },
      { key: 'RESPONDER_ON_THE_WAY', label: 'Responder On the Way', at: null, done: ['RESPONDER_ON_THE_WAY', 'RESPONDER_AT_LOCATION', 'RESOLVED'].includes(incident.status) },
      { key: 'RESPONDER_AT_LOCATION', label: 'Responder At Location', at: incident.responderArrivedAt?.toISOString() || null, done: ['RESPONDER_AT_LOCATION', 'RESOLVED'].includes(incident.status) },
      { key: 'RESOLVED', label: 'Resolved', at: incident.resolvedAt?.toISOString() || null, done: incident.status === 'RESOLVED' },
    ];

    const responderPublic = incident.assignments[0] && !incident.isRestricted
      ? {
          first_name: incident.assignments[0].member.user.fullName.split(' ')[0],
          team: incident.assignments[0].member.team.name,
        }
      : undefined;

    return {
      incident_id: incident.id,
      public_id: incident.publicId,
      steps,
      current: incident.status,
      responder_public: responderPublic,
    };
  }

  /**
   * Get student's reports (My Reports).
   */
  async getMyReports(reporterId: string, tab: 'reports' | 'sos') {
    const workflow = tab === 'sos' ? 'EMERGENCY_SOS' : 'STANDARD_REPORT';

    return this.prisma.incident.findMany({
      where: { reporterId, workflow },
      select: {
        id: true,
        publicId: true,
        workflow: true,
        status: true,
        finalCategory: true,
        description: true,
        createdAt: true,
        resolvedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get reporter's own incident detail.
   */
  async getMyIncidentDetail(incidentId: string, reporterId: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, reporterId },
      include: {
        location: {
          include: { predefinedLocation: true, map: true },
        },
        attachments: { orderBy: { position: 'asc' } },
        incidentTeams: {
          where: { revokedAt: null },
          include: { team: { select: { name: true, code: true } } },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!incident) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
    }

    return {
      id: incident.id,
      public_id: incident.publicId,
      workflow: incident.workflow,
      status: incident.status,
      status_label: STATUS_LABELS[incident.status] || incident.status,
      category_label: incident.finalCategory,
      description: incident.description,
      created_at: incident.createdAt,
      resolved_at: incident.resolvedAt,
      location: incident.location ? {
        predefined: incident.location.predefinedLocation
          ? { kind: incident.location.predefinedLocation.kind, name: incident.location.predefinedLocation.name }
          : null,
        pin: incident.location.pinX
          ? { x: Number(incident.location.pinX), y: Number(incident.location.pinY) }
          : null,
        text: incident.location.locationText,
      } : null,
      assigned_teams: (incident.incidentTeams || []).map((it: any) => ({
        team_name: it.team?.name || 'Campus Team',
      })),
      photos: (incident.attachments || []).map((a: any) => ({
        id: a.id,
        position: a.position,
        url_endpoint: `/attachments/${a.id}/url`,
      })),
      timeline: (incident.statusHistory || []).map((sh: any) => ({
        from: sh.fromStatus,
        to: sh.toStatus,
        at: sh.createdAt,
        note: sh.note,
      })),
    };
  }

  /**
   * Transition incident status with validation.
   */
  async transitionStatus(
    incidentId: string,
    toStatus: string,
    changedBy: string,
    note?: string,
  ) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
    }

    if (!isValidStatusTransition(incident.status, toStatus)) {
      throw new ConflictException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from ${incident.status} to ${toStatus}`,
      });
    }

    const updateData: any = { status: toStatus };

    // Set milestone timestamps
    if (toStatus === 'TEAMS_NOTIFIED' && !incident.firstTeamNotifiedAt) {
      updateData.firstTeamNotifiedAt = new Date();
    }
    if (toStatus === 'RESPONDER_ASSIGNED' && !incident.firstAcceptedAt) {
      updateData.firstAcceptedAt = new Date();
    }
    if (toStatus === 'RESPONDER_AT_LOCATION' && !incident.responderArrivedAt) {
      updateData.responderArrivedAt = new Date();
    }
    if (toStatus === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const result = await tx.incident.update({
        where: { id: incidentId },
        data: updateData,
      });

      await tx.incidentStatusHistory.create({
        data: {
          incidentId,
          fromStatus: incident.status,
          toStatus,
          changedBy,
          note,
        },
      });

      await this.auditService.logWithTransaction(tx, {
        eventType: 'STATUS_CHANGED',
        incidentId,
        actorUserId: changedBy,
        actorKind: 'USER',
        details: { from: incident.status, to: toStatus, note },
      });

      return result;
    });

    return updated;
  }

  /**
   * Get admin full case view (20-field View button).
   */
  async getAdminIncidentDetail(incidentId: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        reporter: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        location: {
          include: { predefinedLocation: true, map: true },
        },
        attachments: { orderBy: { position: 'asc' } },
        aiClassifications: { orderBy: { createdAt: 'desc' }, take: 1 },
        routingDecisions: { orderBy: { createdAt: 'desc' }, take: 1 },
        incidentTeams: {
          where: { revokedAt: null },
          include: { team: { select: { id: true, code: true, name: true } } },
        },
        assignments: {
          include: {
            member: {
              include: {
                user: { select: { fullName: true } },
                team: { select: { name: true } },
              },
            },
          },
          orderBy: { offeredAt: 'desc' },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        notifications: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            deliveries: true,
            recipient: { select: { fullName: true } },
          },
        },
        auditEvents: { orderBy: { occurredAt: 'desc' }, take: 50 },
      },
    });

    if (!incident) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
    }

    const classification = incident.aiClassifications[0];
    const routing = incident.routingDecisions[0];

    return {
      id: incident.id,
      public_id: incident.publicId,
      report_type: incident.workflow === 'EMERGENCY_SOS' ? 'Emergency SOS' : 'Standard Report',
      workflow: incident.workflow,
      full_description: incident.description,
      category: {
        final: incident.finalCategory,
        student_selected: incident.studentCategory,
      },
      location: incident.location ? {
        predefined: incident.location.predefinedLocation
          ? { kind: incident.location.predefinedLocation.kind, name: incident.location.predefinedLocation.name }
          : null,
        pin: incident.location.pinX
          ? { x: Number(incident.location.pinX), y: Number(incident.location.pinY) }
          : null,
        map: incident.location.map
          ? { id: incident.location.map.id, image_url: `/attachments/map/${incident.location.map.id}` }
          : null,
      } : null,
      created_at: incident.createdAt,
      reporter: {
        id: incident.reporter.id,
        name: incident.reporter.fullName,
        email: incident.reporter.email,
        phone: incident.reporter.phone,
      },
      ai_classification: classification ? {
        source: classification.source,
        model: classification.model || (classification.source === 'AI' ? 'gemini-1.5-flash' : 'campus-sos-rules-v1'),
        provider: classification.source === 'AI' ? 'gemini' : 'rule',
        category: classification.category,
        confidence: Number(classification.confidence),
        immediate_danger: classification.immediateDanger,
        structured: classification.output,
      } : null,
      ai_reasoning: classification?.reasoning || null,
      routing_decision: routing ? {
        matched_rules: routing.matchedRules,
        teams: routing.teams,
        flags: routing.flags,
        config_version: routing.configVersion,
      } : null,
      assigned_teams: incident.incidentTeams.map(it => ({
        team_id: it.team.id,
        team_code: it.team.code,
        team_name: it.team.name,
        role: it.role,
      })),
      assigned_responders: incident.assignments.map(a => ({
        member: a.member.user.fullName,
        team: a.member.team.name,
        status: a.status,
        offered_at: a.offeredAt,
        accepted_at: a.acceptedAt,
      })),
      photos: incident.attachments.map(a => ({
        id: a.id,
        position: a.position,
        url_endpoint: `/attachments/${a.id}/url`,
      })),
      notification_history: incident.notifications.map(n => ({
        at: n.createdAt,
        audience: n.audienceType,
        recipient: n.recipient?.fullName || 'broadcast',
        deliveries: n.deliveries.map(d => ({
          channel: d.channel,
          status: d.status,
        })),
      })),
      response_timeline: incident.statusHistory.map(sh => ({
        from: sh.fromStatus,
        to: sh.toStatus,
        at: sh.createdAt,
        by: sh.changedBy,
        note: sh.note,
      })),
      status_history: incident.statusHistory,
      resolution: {
        code: incident.resolutionCode,
        summary: incident.resolutionSummary,
        resolved_at: incident.resolvedAt,
      },
      audit_history: incident.auditEvents.map(ae => ({
        id: Number(ae.id),
        event: ae.eventType,
        at: ae.occurredAt,
        actor: ae.actorKind,
        details: ae.details,
      })),
      is_restricted: incident.isRestricted,
      is_drill: incident.isDrill,
    };
  }

  /**
   * Admin incidents list with filters.
   */
  async getAdminIncidents(filters: {
    status?: string;
    workflow?: string;
    category?: string;
    from?: string;
    to?: string;
    team?: string;
    q?: string;
    limit?: number;
    cursor?: string;
  }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.workflow) where.workflow = filters.workflow;
    if (filters.category) where.finalCategory = filters.category;
    if (filters.from) where.createdAt = { ...where.createdAt, gte: new Date(filters.from) };
    if (filters.to) where.createdAt = { ...where.createdAt, lte: new Date(filters.to) };
    if (filters.q) {
      where.OR = [
        { publicId: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(filters.limit || 25, 100);
    const queryArgs: any = {
      where,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        publicId: true,
        workflow: true,
        finalCategory: true,
        status: true,
        createdAt: true,
        isRestricted: true,
        location: {
          select: {
            locationText: true,
            predefinedLocation: { select: { name: true } },
          },
        },
      },
    };

    if (filters.cursor) {
      queryArgs.cursor = { id: filters.cursor };
      queryArgs.skip = 1;
    }

    const incidents = await this.prisma.incident.findMany(queryArgs);

    const hasMore = incidents.length > take;
    const data = hasMore ? incidents.slice(0, take) : incidents;

    return {
      data: data.map(i => ({
        id: i.id,
        public_id: i.publicId,
        type: i.workflow === 'EMERGENCY_SOS' ? 'Emergency SOS' : 'Standard Report',
        category: i.finalCategory,
        workflow_label: i.workflow,
        location: (i as any).location?.predefinedLocation?.name || (i as any).location?.locationText || null,
        status: i.status,
        created_at: i.createdAt,
        is_restricted: i.isRestricted,
      })),
      next_cursor: hasMore ? data[data.length - 1].id : null,
    };
  }

  /**
   * Get team-specific incidents based on user role and team membership.
   */
  async getTeamIncidents(
    user: any,
    query: { status?: string; workflow?: string; category?: string; assigned_to_me?: boolean },
  ) {
    const isAdmin = user.role === 'CAMPUS_ADMIN';
    const isProctor = user.role === 'CHIEF_PROCTOR';
    const userTeamIds = (user.teamMemberships || []).map((tm: any) => tm.teamId);

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.workflow) where.workflow = query.workflow;

    if (!isAdmin && !isProctor) {
      where.OR = [
        { incidentTeams: { some: { teamId: { in: userTeamIds }, revokedAt: null } } },
        { assignedTeam: { id: { in: userTeamIds } } },
      ];
    }

    return this.prisma.incident.findMany({
      where,
      include: {
        location: true,
        attachments: true,
        incidentTeams: { include: { team: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get team-specific incident detail with access control.
   */
  async getTeamIncidentDetail(incidentId: string, user: any) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        reporter: {
          select: { id: true, fullName: true, email: true },
        },
        location: true,
        attachments: true,
        incidentTeams: { include: { team: true } },
        statusHistory: true,
      },
    });

    if (!incident) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
    }

    const isAdmin = user.role === 'CAMPUS_ADMIN';
    const isProctor = user.role === 'CHIEF_PROCTOR';
    const isReporter = incident.reporterId === user.id;
    const userTeamIds = (user.teamMemberships || []).map((tm: any) => tm.teamId);
    const isAssigned = incident.incidentTeams?.some((it: any) => userTeamIds.includes(it.teamId));

    if (!isAdmin && !isProctor && !isReporter && !isAssigned) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You are not authorized to view this confidential incident',
      });
    }

    return incident;
  }

  async addFollowUpNote(incidentId: string, userId: string, note: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
    }
    if (incident.reporterId !== userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You can only add notes to your own incidents' });
    }

    const history = await this.prisma.incidentStatusHistory.create({
      data: {
        incidentId,
        fromStatus: incident.status,
        toStatus: incident.status,
        changedBy: userId,
        note: `[Student Follow-up Note]: ${note}`,
      },
    });

    await this.auditService.log({
      eventType: 'ACCESS_EVENT',
      incidentId,
      actorUserId: userId,
      actorKind: 'USER',
      details: { action: 'ADD_STUDENT_NOTE', note },
    });

    return { added: true, id: history.id };
  }

  async addTeamNote(incidentId: string, userId: string, note: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
    }

    const history = await this.prisma.incidentStatusHistory.create({
      data: {
        incidentId,
        fromStatus: incident.status,
        toStatus: incident.status,
        changedBy: userId,
        note: `[Team Note]: ${note}`,
      },
    });

    await this.auditService.log({
      eventType: 'ACCESS_EVENT',
      incidentId,
      actorUserId: userId,
      actorKind: 'USER',
      details: { action: 'ADD_TEAM_NOTE', note },
    });

    return { added: true, id: history.id, incident_id: incidentId };
  }

  async escalateIncident(incidentId: string, user: any) {
    const incident = await this.prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
    }

    await this.auditService.log({
      eventType: 'ESCALATED',
      incidentId,
      actorUserId: user.id,
      actorKind: 'USER',
      details: { escalatedBy: user.email, role: user.role },
    });

    // Notify campus admin
    const admins = await this.prisma.user.findMany({
      where: { role: 'CAMPUS_ADMIN', isActive: true },
      select: { id: true },
    });
    for (const admin of admins) {
      try {
        const notif = await this.prisma.notification.create({
          data: {
            recipientUserId: admin.id,
            recipientId: admin.id,
            incidentId,
            audienceType: 'ACT',
            channel: 'IN_APP',
            deliveryStatus: 'SENT',
            title: `Incident Escalation Alert: ${incident.publicId}`,
            body: `Incident ${incident.publicId} has been escalated by ${user.fullName || user.email}. Immediate review requested.`,
          },
        });
        if (notif?.id && this.prisma.notificationDelivery?.create) {
          await this.prisma.notificationDelivery.create({
            data: {
              notificationId: notif.id,
              channel: 'IN_APP',
              status: 'SENT',
              sentAt: new Date(),
            },
          });
        }
      } catch (err: any) {
        this.logger.error(`Failed to deliver escalation notification to admin ${admin.id}: ${err.message}`);
      }
    }

    return { escalated: true, incident_id: incidentId };
  }

  async adminAssign(incidentId: string, adminUserId: string, teamId: string, memberId?: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
    }

    await this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.incidentTeam.findFirst({
        where: { incidentId, teamId },
      });
      if (!existing) {
        await tx.incidentTeam.create({
          data: {
            incidentId,
            teamId,
            role: 'ACT',
          },
        });
      }

      if (memberId) {
        let targetMemberId = memberId;
        const tm = await tx.teamMember.findFirst({
          where: {
            OR: [
              { id: memberId },
              { userId: memberId, teamId },
            ],
          },
        });
        if (tm) {
          targetMemberId = tm.id;
        }

        await tx.assignment.create({
          data: {
            incidentId,
            teamId,
            memberId: targetMemberId,
            status: 'OFFERED',
            offeredAt: new Date(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
            slotNo: 1,
            attemptNo: 1,
          },
        });
        await tx.incident.update({
          where: { id: incidentId },
          data: { status: 'RESPONDER_ASSIGNED' },
        });
      }

      await tx.incidentStatusHistory.create({
        data: {
          incidentId,
          fromStatus: incident.status,
          toStatus: memberId ? 'RESPONDER_ASSIGNED' : incident.status,
          changedBy: adminUserId,
          note: `Admin assigned to team ${teamId}${memberId ? ` (member: ${memberId})` : ''}`,
        },
      });
    });

    await this.auditService.log({
      eventType: 'ADMIN_ACTION',
      incidentId,
      actorUserId: adminUserId,
      actorKind: 'USER',
      details: { action: 'ASSIGN', teamId, memberId },
    });

    return { assigned: true, incident_id: incidentId };
  }

  async adminReclassify(incidentId: string, adminUserId: string, newCategory: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id: incidentId } });
    if (!incident) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Incident not found' });
    }

    const isRestricted = ['WOMEN_HARASSMENT', 'MEN_HARASSMENT', 'FACULTY_STAFF_MISCONDUCT'].includes(newCategory);
    await this.prisma.incident.update({
      where: { id: incidentId },
      data: {
        finalCategory: newCategory,
        isRestricted,
      },
    });

    await this.auditService.log({
      eventType: 'ADMIN_ACTION',
      incidentId,
      actorUserId: adminUserId,
      actorKind: 'USER',
      details: { action: 'RECLASSIFY', fromCategory: incident.finalCategory, toCategory: newCategory },
    });

    return { reclassified: true, category: newCategory };
  }

  async updateDraft(draftId: string, userId: string, payload: any) {
    const draft = await this.prisma.incidentDraft.findFirst({
      where: { id: draftId, reporterId: userId },
    });
    if (!draft) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Draft not found' });
    }
    const updated = await this.prisma.incidentDraft.update({
      where: { id: draftId },
      data: { payload: { ...(draft.payload as any), ...payload } },
    });
    return { updated: true, draft_id: updated.id };
  }

  async deleteDraft(draftId: string, userId: string) {
    const draft = await this.prisma.incidentDraft.findFirst({
      where: { id: draftId, reporterId: userId },
    });
    if (!draft) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Draft not found' });
    }
    await this.prisma.incidentDraft.delete({
      where: { id: draftId },
    });
    return { deleted: true, draft_id: draftId };
  }
}
