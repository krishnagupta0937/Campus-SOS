import { Injectable } from '@nestjs/common';
import { AiClassification, AiInput } from './ai.service';

/**
 * Rule-based fallback classifier.
 * AI_ROUTING_SPECIFICATION.md §6.
 *
 * Used when AI is disabled, times out, errors, or returns invalid output.
 * Supports English, Hindi, and Hinglish keywords.
 */
@Injectable()
export class RuleClassifier {
  // Keyword families (configurable)
  private readonly keywordFamilies: Record<string, { category: string; keywords: string[]; danger: boolean }> = {
    fire: {
      category: 'FIRE',
      keywords: [
        'fire', 'smoke', 'burning', 'spark', 'short circuit', 'gas leak', 'flame', 'blaze',
        'आग', 'धुआं', 'जल रहा', 'aag', 'dhuan', 'jalraha',
      ],
      danger: true,
    },
    fire_hazard: {
      category: 'FIRE_HAZARD',
      keywords: ['fire hazard', 'fire risk', 'smoke smell', 'blocked exit', 'extinguisher'],
      danger: false,
    },
    medical: {
      category: 'MEDICAL_EMERGENCY',
      keywords: [
        'fainted', 'unconscious', 'bleeding', 'injured', 'bee sting', 'chest pain', 'seizure',
        'collapsed', 'heart attack', 'vomiting', 'fracture', 'allergic', 'breathing',
        'बेहोश', 'खून', 'चोट', 'behosh', 'khoon',
      ],
      danger: true,
    },
    fight: {
      category: 'FIGHT_QUARREL',
      keywords: [
        'fight', 'quarrel', 'beating', 'attack', 'hitting', 'punch', 'slap',
        'लड़ाई', 'मारपीट', 'ladai', 'maarpeet',
      ],
      danger: true,
    },
    unknown_person: {
      category: 'UNKNOWN_PERSON',
      keywords: [
        'stranger', 'unknown person', 'trespass', 'unfamiliar', 'suspicious person',
        'अजनबी', 'अनजान', 'ajnabi',
      ],
      danger: false,
    },
    suspicious: {
      category: 'SUSPICIOUS_ACTIVITY',
      keywords: ['suspicious', 'loitering', 'peeping', 'stalking'],
      danger: false,
    },
    blocked_route: {
      category: 'BLOCKED_ROUTE',
      keywords: [
        'blocked', 'road blocked', 'gate blocked', 'jam', 'blockage', 'fallen tree',
        'रास्ता बंद', 'rasta band',
      ],
      danger: false,
    },
    infrastructure: {
      category: 'INFRASTRUCTURE_HAZARD',
      keywords: [
        'leak', 'wire', 'broken', 'collapse', 'exposed wire', 'plumbing', 'electrical',
        'water leaking', 'ceiling', 'crack',
        'बिजली', 'पानी', 'bijli', 'paani',
      ],
      danger: false,
    },
    cyber: {
      category: 'CYBER_DIGITAL',
      keywords: [
        'hacked', 'phishing', 'account', 'online harassment', 'cyberbully', 'cyber',
        'password stolen', 'digital',
      ],
      danger: false,
    },
    harassment_women: {
      category: 'HARASSMENT_WOMEN',
      keywords: [
        'harassment women', 'harassing girl', 'eve teasing', 'molest', 'stalk', 'stalking',
        'follow kar raha', 'follow kar rahi', 'pichha kar raha', 'ladki ko follow',
        'छेड़खानी', 'chedkhani', 'chhedkhani',
      ],
      danger: true,
    },
    harassment_men: {
      category: 'HARASSMENT_MEN',
      keywords: ['harassment men', 'harassing boy', 'bullying male'],
      danger: false,
    },
    teacher_misconduct: {
      category: 'TEACHER_MISCONDUCT',
      keywords: ['teacher misconduct', 'professor misconduct', 'teacher misbehaved', 'faculty abuse'],
      danger: false,
    },
    student_misconduct: {
      category: 'STUDENT_MISCONDUCT',
      keywords: ['student misconduct', 'ragging', 'bullying', 'hazing'],
      danger: false,
    },
    security_threat: {
      category: 'SECURITY_THREAT',
      keywords: ['weapon', 'gun', 'knife', 'bomb', 'threat', 'violent threat', 'armed'],
      danger: true,
    },
    vehicle: {
      category: 'VEHICLE_INCIDENT',
      keywords: ['car accident', 'bike accident', 'vehicle crash', 'collision', 'hit and run'],
      danger: false,
    },
    parking: {
      category: 'PARKING_ISSUE',
      keywords: ['parking issue', 'wrong parking', 'double parked', 'blocked parking', 'illegal parking', 'tow car'],
      danger: false,
    },
    environmental: {
      category: 'ENVIRONMENTAL_HAZARD',
      keywords: ['chemical leak', 'flooding', 'gas smell', 'toxic', 'hazardous material'],
      danger: true,
    },
    self_harm: {
      category: 'MEDICAL_EMERGENCY',
      keywords: ['suicide', 'self harm', 'kill myself', 'end my life', 'suicidal', 'cutting myself'],
      danger: true,
    },
  };

  classify(input: AiInput): AiClassification {
    const text = input.description.toLowerCase();
    let bestMatch: { category: string; danger: boolean; keywords: string[] } | null = null;
    let bestScore = 0;
    const secondaryCategories: string[] = [];

    // Check each keyword family
    for (const [key, family] of Object.entries(this.keywordFamilies)) {
      const matchCount = family.keywords.filter(kw => text.includes(kw)).length;
      if (matchCount > 0) {
        if (matchCount > bestScore) {
          if (bestMatch) secondaryCategories.push(bestMatch.category);
          bestMatch = family;
          bestScore = matchCount;
        } else {
          secondaryCategories.push(family.category);
        }
      }
    }

    // Self-harm special handling
    const isSelfHarm = this.keywordFamilies.self_harm.keywords.some(kw => text.includes(kw));

    // Default if no match
    if (!bestMatch) {
      // SOS with no match → OTHER + immediate_danger=true + Security
      if (input.workflow === 'EMERGENCY_SOS') {
        return this.buildClassification('OTHER', [], true, {
          summary: 'Unclassifiable emergency report — flagged for immediate review',
        }, isSelfHarm);
      }

      // Use student category if available
      if (input.student_category) {
        return this.buildClassification(input.student_category, [], false, {
          summary: `Classified by student-selected category: ${input.student_category}`,
        }, isSelfHarm);
      }

      return this.buildClassification('OTHER', [], false, {
        summary: 'Could not determine category from description',
      }, isSelfHarm);
    }

    const immediateDanger = bestMatch.danger ||
      ['weapon', 'gun', 'knife', 'bomb', 'unconscious', 'bleeding', 'attack', 'fire', 'smoke'].some(kw => text.includes(kw));

    return this.buildClassification(
      bestMatch.category,
      [...new Set(secondaryCategories)],
      immediateDanger,
      {
        summary: `Rule-based classification: ${bestMatch.category}`,
        violence: text.includes('fight') || text.includes('attack') || text.includes('beat'),
        injury: text.includes('injur') || text.includes('bleed') || text.includes('fracture'),
        crowdRisk: text.includes('crowd') || text.includes('group') || text.includes('many'),
        safetyRisk: text.includes('danger') || text.includes('unsafe') || text.includes('risk'),
        isMajor: text.includes('major') || text.includes('huge') || text.includes('big'),
        vehicleInvolved: text.includes('car') || text.includes('bike') || text.includes('vehicle'),
      },
      isSelfHarm,
    );
  }

  private buildClassification(
    category: string,
    secondaryCategories: string[],
    immediateDanger: boolean,
    meta: {
      summary: string;
      violence?: boolean;
      injury?: boolean;
      crowdRisk?: boolean;
      safetyRisk?: boolean;
      isMajor?: boolean;
      vehicleInvolved?: boolean;
    },
    isSelfHarm: boolean,
  ): AiClassification {
    return {
      schema_version: '1.0',
      category,
      secondary_categories: secondaryCategories,
      confidence: 0.75,
      immediate_danger: immediateDanger,
      flags: {
        injury_present: meta.injury || false,
        violence_flag: meta.violence || false,
        safety_risk: meta.safetyRisk || false,
        crowd_risk: meta.crowdRisk || false,
        disciplinary_flag: ['STUDENT_MISCONDUCT', 'TEACHER_MISCONDUCT', 'STUDENT_TEACHER_DISPUTE'].includes(category),
        is_major: meta.isMajor || false,
        area_to_avoid: null,
        weapon_mentioned: false,
        digital_harassment: category === 'CYBER_DIGITAL' && (meta.summary || '').includes('harassment'),
        self_harm_indicator: isSelfHarm,
      },
      extracted: {
        hazard_type: null,
        people_involved_count: null,
        symptoms: [],
        location_hint: null,
        time_reference: null,
        vehicle_involved: meta.vehicleInvolved || false,
        persons_described: null,
      },
      summary_for_staff: meta.summary,
      reasoning: `Rule-based classification matched category ${category}`,
      language: 'en',
      source: 'RULE_FALLBACK',
    };
  }
}
