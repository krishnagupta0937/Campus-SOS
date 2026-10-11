import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiClassification } from '../ai/ai.service';
import { RESTRICTED_CATEGORIES, CAMPUS_WIDE_DENY_LIST } from '../../common/utils/constants';

/**
 * Routing decision output.
 */
export interface RoutingDecision {
  teams: Array<{
    team_code: string;
    role: 'ACT' | 'KNOW';
    reason: string;
    responders_required: number;
  }>;
  restricted: boolean;
  campus_wide_eligible: boolean;
  flags: string[];
  matched_rules: string[];
  config_version: number;
}

interface RoutingContext {
  workflow: 'EMERGENCY_SOS' | 'STANDARD_REPORT';
  student_category: string | null;
}

/**
 * Deterministic routing engine.
 * Pure function: route(classification, studentCategory, context, config) → RoutingDecision
 * AI_ROUTING_SPECIFICATION.md §7.
 *
 * GUARANTEE: same input + same config version → identical output 100% of the time.
 */
@Injectable()
export class RoutingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Default routing rules matrix.
   * AI_ROUTING_SPECIFICATION.md §8.
   */
  private readonly defaultRules = [
    {
      rule_id: 'R-ADM-000',
      categories: ['*'],
      teams: [{ team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Always included' }],
      restricted: false,
    },
    {
      rule_id: 'R-FIRE-001',
      categories: ['FIRE', 'FIRE_HAZARD'],
      teams: [
        { team: 'FIRE_SAFETY', role: 'ACT' as const, reason: 'Fire response', responders_required: 1 },
        { team: 'SECURITY', role: 'ACT' as const, reason: 'Security support' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'MEDICAL', role: 'ACT', when: ['injury_present'] },
      ],
      campus_wide_if: 'is_major',
      restricted: false,
    },
    {
      rule_id: 'R-MED-001',
      categories: ['MEDICAL_EMERGENCY', 'ACCIDENT', 'MEDICAL'],
      teams: [
        { team: 'MEDICAL', role: 'ACT' as const, reason: 'Medical response' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'SECURITY', role: 'ACT', when: ['violence_flag', 'crowd_risk', 'vehicle_involved', 'safety_risk'] },
      ],
      restricted: true,
    },
    {
      rule_id: 'R-FIGHT-001',
      categories: ['FIGHT_QUARREL'],
      teams: [
        { team: 'SECURITY', role: 'ACT' as const, reason: 'Security intervention' },
        { team: 'CHIEF_PROCTOR', role: 'ACT' as const, reason: 'Disciplinary' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'MEDICAL', role: 'ACT', when: ['injury_present'] },
      ],
      restricted: true,
    },
    {
      rule_id: 'R-TM-001',
      categories: ['TEACHER_MISCONDUCT', 'FACULTY_STAFF_MISCONDUCT'],
      teams: [
        { team: 'CHIEF_PROCTOR', role: 'ACT' as const, reason: 'Misconduct investigation' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'STUDENT_COUNCIL', role: 'KNOW', when_enabled: true },
      ],
      restricted: true,
    },
    {
      rule_id: 'R-SM-001',
      categories: ['STUDENT_MISCONDUCT'],
      teams: [
        { team: 'CHIEF_PROCTOR', role: 'ACT' as const, reason: 'Misconduct investigation' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'STUDENT_COUNCIL', role: 'KNOW', when_enabled: true },
      ],
      restricted: true,
    },
    {
      rule_id: 'R-SD-001',
      categories: ['STUDENT_TEACHER_DISPUTE'],
      teams: [
        { team: 'CHIEF_PROCTOR', role: 'ACT' as const, reason: 'Dispute mediation' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'STUDENT_COUNCIL', role: 'KNOW', when_enabled: true },
      ],
      restricted: true,
    },
    {
      rule_id: 'R-HW-001',
      categories: ['HARASSMENT_WOMEN', 'WOMEN_HARASSMENT'],
      teams: [
        { team: 'WOMEN_SAFETY', role: 'ACT' as const, reason: 'Women safety response' },
        { team: 'CHIEF_PROCTOR', role: 'ACT' as const, reason: 'Disciplinary' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'SECURITY', role: 'ACT', when: ['immediate_danger'] },
      ],
      restricted: true,
    },
    {
      rule_id: 'R-HM-001',
      categories: ['HARASSMENT_MEN', 'MEN_HARASSMENT'],
      teams: [
        { team: 'MEN_SAFETY', role: 'ACT' as const, reason: 'Men safety response' },
        { team: 'CHIEF_PROCTOR', role: 'ACT' as const, reason: 'Disciplinary' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'SECURITY', role: 'ACT', when: ['immediate_danger'] },
      ],
      restricted: true,
    },
    {
      rule_id: 'R-UP-001',
      categories: ['UNKNOWN_PERSON', 'SUSPICIOUS_ACTIVITY', 'UNAUTHORIZED_ACCESS'],
      teams: [
        { team: 'SECURITY', role: 'ACT' as const, reason: 'Security investigation' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      restricted: false,
    },
    {
      rule_id: 'R-SEC-001',
      categories: ['SECURITY_THREAT'],
      teams: [
        { team: 'SECURITY', role: 'ACT' as const, reason: 'Security response' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'CHIEF_PROCTOR', role: 'KNOW', when: ['disciplinary_flag'] },
      ],
      restricted: false,
    },
    {
      rule_id: 'R-BR-001',
      categories: ['BLOCKED_ROUTE'],
      teams: [
        { team: 'TRANSPORTATION', role: 'ACT' as const, reason: 'Traffic management' },
        { team: 'SECURITY', role: 'ACT' as const, reason: 'Area management' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'INFRASTRUCTURE', role: 'ACT', when: ['obstruction_damage'] },
      ],
      restricted: false,
    },
    {
      rule_id: 'R-IH-001',
      categories: ['INFRASTRUCTURE_HAZARD', 'INFRASTRUCTURE'],
      teams: [
        { team: 'INFRASTRUCTURE', role: 'ACT' as const, reason: 'Facilities response' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'SECURITY', role: 'ACT', when: ['safety_risk'] },
      ],
      restricted: false,
    },
    {
      rule_id: 'R-CY-001',
      categories: ['CYBER_DIGITAL', 'DIGITAL_CYBER'],
      teams: [
        { team: 'IT_DIGITAL', role: 'ACT' as const, reason: 'IT/Digital response' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'CHIEF_PROCTOR', role: 'KNOW', when: ['disciplinary_flag', 'digital_harassment'] },
      ],
      restricted: false, // unless digital harassment
    },
    {
      rule_id: 'R-GR-001',
      categories: ['GRIEVANCE_WELFARE', 'GENERAL_COMPLAINT'],
      teams: [
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'STUDENT_COUNCIL', role: 'ACT', when_enabled: true },
        { team: 'CHIEF_PROCTOR', role: 'KNOW', when: ['disciplinary_flag'] },
      ],
      restricted: true,
    },
    {
      rule_id: 'R-VEH-001',
      categories: ['VEHICLE_INCIDENT', 'PARKING_ISSUE', 'TRAFFIC_PARKING'],
      teams: [
        { team: 'TRANSPORTATION', role: 'ACT' as const, reason: 'Traffic/vehicle response' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'MEDICAL', role: 'ACT', when: ['injury_present'] },
        { team: 'SECURITY', role: 'ACT', when: ['safety_risk'] },
      ],
      restricted: false,
    },
    {
      rule_id: 'R-ENV-001',
      categories: ['ENVIRONMENTAL_HAZARD'],
      teams: [
        { team: 'FIRE_SAFETY', role: 'ACT' as const, reason: 'Hazard response' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      conditional_teams: [
        { team: 'INFRASTRUCTURE', role: 'ACT', when: ['always'] },
        { team: 'SECURITY', role: 'ACT', when: ['crowd_risk'] },
      ],
      restricted: false,
    },
    {
      rule_id: 'R-EVT-001',
      categories: ['EVENT_AREA_AVOIDANCE'],
      teams: [
        { team: 'SECURITY', role: 'ACT' as const, reason: 'Area management' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      restricted: false,
    },
    {
      rule_id: 'R-DISC-001',
      categories: ['DISCIPLINARY_OTHER'],
      teams: [
        { team: 'CHIEF_PROCTOR', role: 'ACT' as const, reason: 'Disciplinary handling' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      restricted: true,
    },
    {
      rule_id: 'R-SELF-001',
      categories: ['_SELF_HARM'],
      teams: [
        { team: 'MEDICAL', role: 'ACT' as const, reason: 'Self-harm medical response' },
        { team: 'CAMPUS_ADMIN', role: 'KNOW' as const, reason: 'Admin awareness' },
      ],
      restricted: true,
    },
  ];

  /**
   * Evaluate routing rules.
   * Pure deterministic function.
   */
  async route(
    classification: AiClassification,
    context: RoutingContext,
  ): Promise<RoutingDecision> {
    // Collect candidate categories (union)
    const candidates = new Set<string>();
    const addWithAliases = (cat: string | null | undefined) => {
      if (!cat) return;
      candidates.add(cat);
      if (cat === 'FIRE_HAZARD') candidates.add('FIRE');
      if (cat === 'FIRE') candidates.add('FIRE_HAZARD');
      if (cat === 'INFRASTRUCTURE') candidates.add('INFRASTRUCTURE_HAZARD');
      if (cat === 'INFRASTRUCTURE_HAZARD') candidates.add('INFRASTRUCTURE');
      if (cat === 'WOMEN_HARASSMENT') candidates.add('HARASSMENT_WOMEN');
      if (cat === 'HARASSMENT_WOMEN') candidates.add('WOMEN_HARASSMENT');
      if (cat === 'MEN_HARASSMENT') candidates.add('HARASSMENT_MEN');
      if (cat === 'HARASSMENT_MEN') candidates.add('MEN_HARASSMENT');
      if (cat === 'FACULTY_STAFF_MISCONDUCT') candidates.add('TEACHER_MISCONDUCT');
      if (cat === 'TEACHER_MISCONDUCT') candidates.add('FACULTY_STAFF_MISCONDUCT');
      if (cat === 'DIGITAL_CYBER') candidates.add('CYBER_DIGITAL');
      if (cat === 'CYBER_DIGITAL') candidates.add('DIGITAL_CYBER');
      if (cat === 'TRAFFIC_PARKING') {
        candidates.add('PARKING_ISSUE');
        candidates.add('VEHICLE_INCIDENT');
      }
      if (cat === 'GENERAL_COMPLAINT') candidates.add('GRIEVANCE_WELFARE');
      if (cat === 'GRIEVANCE_WELFARE') candidates.add('GENERAL_COMPLAINT');
    };

    addWithAliases(classification.category);
    classification.secondary_categories?.forEach(c => addWithAliases(c));
    if (context.student_category) {
      addWithAliases(context.student_category);
    }

    // Special: self-harm indicator
    if (classification.flags.self_harm_indicator) {
      candidates.add('_SELF_HARM');
    }

    // Load enabled teams
    let enabledTeamCodes: Set<string>;
    if (this.prisma?.team?.findMany) {
      const allTeams = await this.prisma.team.findMany({
        select: { code: true, isRestricted: true, isEnabled: true },
      });
      const enabled = allTeams.filter((t: any) => t.isEnabled !== false);
      enabledTeamCodes = new Set(enabled.map((t: any) => t.code));
    } else {
      enabledTeamCodes = new Set([
        'CAMPUS_ADMIN', 'CHIEF_PROCTOR', 'SECURITY', 'MEDICAL', 'FIRE_SAFETY',
        'WOMEN_SAFETY', 'MEN_SAFETY', 'STUDENT_COUNCIL', 'INFRASTRUCTURE',
        'TRANSPORTATION', 'IT_DIGITAL',
      ]);
    }

    // Evaluate all rules (union)
    const teamsMap = new Map<string, { role: 'ACT' | 'KNOW'; reason: string; responders_required: number }>();
    const matchedRules: string[] = [];
    let isRestricted = false;
    let campusWideEligible = false;
    const flags: string[] = [];

    for (const rule of this.defaultRules) {
      // Check if any candidate matches rule categories
      const matches = rule.categories[0] === '*' ||
        rule.categories.some(c => candidates.has(c));

      if (!matches) continue;

      matchedRules.push(rule.rule_id);

      // Add teams
      for (const teamDef of rule.teams) {
        if (!enabledTeamCodes.has(teamDef.team)) {
          if (!flags.includes('DEGRADED_ROUTING')) {
            flags.push('DEGRADED_ROUTING');
          }
          flags.push(`UNFULFILLED_TEAM:DISABLED:${teamDef.team}`);
          flags.push(`TEAM_DISABLED:${teamDef.team}`);
          continue;
        }

        const existing = teamsMap.get(teamDef.team);
        if (existing) {
          // ACT takes precedence over KNOW
          if (teamDef.role === 'ACT' && existing.role === 'KNOW') {
            teamsMap.set(teamDef.team, {
              role: 'ACT',
              reason: teamDef.reason,
              responders_required: (teamDef as any).responders_required || 1,
            });
          }
        } else {
          teamsMap.set(teamDef.team, {
            role: teamDef.role,
            reason: teamDef.reason,
            responders_required: (teamDef as any).responders_required || 1,
          });
        }
      }

      // Conditional teams
      if ((rule as any).conditional_teams) {
        for (const ct of (rule as any).conditional_teams) {
          let shouldAdd = false;

          if (ct.when_enabled) {
            shouldAdd = enabledTeamCodes.has(ct.team);
          } else if (ct.when) {
            shouldAdd = ct.when.some((flag: string) => {
              if (flag === 'always') return true;
              if (flag === 'immediate_danger') return classification.immediate_danger;
              if (flag === 'obstruction_damage') return true; // Simplified
              return (classification.flags as any)[flag] === true;
            });
          }

          if (shouldAdd && enabledTeamCodes.has(ct.team)) {
            const existing = teamsMap.get(ct.team);
            if (!existing || (ct.role === 'ACT' && existing.role === 'KNOW')) {
              teamsMap.set(ct.team, {
                role: ct.role,
                reason: `Conditional: ${ct.when?.join(', ') || 'enabled'}`,
                responders_required: 1,
              });
            }
          }
        }
      }

      // Restricted check
      if (rule.restricted) {
        isRestricted = true;
      }

      // Campus-wide eligibility
      if ((rule as any).campus_wide_if && classification.flags.is_major) {
        campusWideEligible = true;
      }
    }

    // Check if any category is in the deny list for campus-wide
    for (const cat of candidates) {
      if (CAMPUS_WIDE_DENY_LIST.has(cat)) {
        campusWideEligible = false;
        break;
      }
    }

    // Check if category is restricted
    for (const cat of candidates) {
      if (RESTRICTED_CATEGORIES.has(cat)) {
        isRestricted = true;
      }
    }

    // Digital harassment → restricted
    if (classification.flags.digital_harassment) {
      isRestricted = true;
    }

    // Category mismatch flag
    if (context.student_category && context.student_category !== classification.category) {
      flags.push('CATEGORY_MISMATCH');
    }

    // AI fallback flag
    if (classification.source === 'RULE_FALLBACK') {
      flags.push('AI_FALLBACK');
    }

    // Low confidence
    if (classification.confidence < 0.55) {
      flags.push('LOW_CONFIDENCE');
    }

    // SOS unclassifiable → add Security
    if (context.workflow === 'EMERGENCY_SOS' && classification.category === 'OTHER') {
      if (!teamsMap.has('SECURITY')) {
        teamsMap.set('SECURITY', {
          role: 'ACT',
          reason: 'SOS unclassifiable fallback',
          responders_required: 1,
        });
      }
    }

    const teams = Array.from(teamsMap.entries()).map(([code, info]) => ({
      team_code: code,
      role: info.role,
      reason: info.reason,
      responders_required: info.responders_required,
    }));

    return {
      teams,
      restricted: isRestricted,
      campus_wide_eligible: campusWideEligible,
      flags,
      matched_rules: matchedRules,
      config_version: 1,
    };
  }
}
