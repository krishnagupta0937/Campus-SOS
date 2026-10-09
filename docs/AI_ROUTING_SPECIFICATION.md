# Campus SOS — AI and Routing Specification

**Core rule:** *AI classifies and structures; deterministic, configurable routing rules decide teams and notification audiences.* AI is never the sole routing authority, never invents campus authority policy, never identifies people from photographs, and never decides public disclosure of sensitive cases.

## 1. Pipeline Overview
```
student input → input sanitizer → AI classifier (or rule fallback) → normalized classification
→ routing engine (deterministic rules + config) → routing decision (teams, restrictions, audiences, flags)
→ notification audience resolver → dispatch
```
Each stage writes an audit event (`AI_CLASSIFICATION`, `ROUTING_DECISION`, `AI_FALLBACK_USED` when relevant).

## 2. AI Input Contract
```json
{
  "workflow": "EMERGENCY_SOS | STANDARD_REPORT",
  "description": "string (student text, max 5000)",
  "student_category": "code | null",
  "location": {"kind": "LABORATORY", "name": "Block C — Lab 3"},
  "photo_present": true,
  "photo_count": 1,
  "time_of_day": "ISO-8601",
  "language_hint": "en|hi|…"
}
```
Rules:
- **Photos are never sent to the AI for identification.** Only `photo_present`/`photo_count` are provided. Optional future non-identifying scene description is behind a flag and **disabled for unknown-person incidents**.
- No reporter name/phone/email is sent. Names mentioned in the description are replaced by `[PERSON]` placeholders in the minimized input snapshot; the original stays in the incident record.
- Location names are included because they affect routing (e.g., hostel, parking).

## 3. Taxonomy (category codes)

| Code | Description | Sensitive/restricted | `deny_campus_wide` |
|---|---|---|---|
| `FIRE` | Active fire, smoke | No | No |
| `FIRE_HAZARD` | Fire risk (sparks, gas smell, blocked exits) | No | No |
| `MEDICAL_EMERGENCY` | Collapse, injury, illness, bee sting, other medical | **Yes** (individual medical case) | **Yes** |
| `ACCIDENT` | Accident with possible injury | Yes (individual) | **Yes** (area notice possible via `EVENT_AREA_AVOIDANCE`) |
| `FIGHT_QUARREL` | Fights, quarrels | Yes (disciplinary) | **Yes** |
| `TEACHER_MISCONDUCT` | Teacher/staff misconduct | **Yes** | **Yes** |
| `STUDENT_MISCONDUCT` | Student misconduct | **Yes** | **Yes** |
| `STUDENT_TEACHER_DISPUTE` | Student–teacher dispute | **Yes** | **Yes** |
| `HARASSMENT_WOMEN` | Harassment of women | **Restricted** | **Yes** |
| `HARASSMENT_MEN` | Harassment of men | **Restricted** | **Yes** |
| `UNKNOWN_PERSON` | Unknown/unfamiliar person | Evidence-based | No (never auto) |
| `SUSPICIOUS_ACTIVITY` | Suspicious behaviour | No | No |
| `UNAUTHORIZED_ACCESS` | Trespass/forced entry | No | No |
| `SECURITY_THREAT` | Weapon, violent threat, major threat | No | No (eligible when major) |
| `BLOCKED_ROUTE` | Road/path blockage | No | No (eligible when major) |
| `VEHICLE_INCIDENT` | Vehicle collision/breakdown hazards | No | No |
| `PARKING_ISSUE` | Parking problem | No | No |
| `INFRASTRUCTURE_HAZARD` | Electrical, water, building, facility hazard | No | No |
| `ENVIRONMENTAL_HAZARD` | Chemical leak, flooding, smoke, gas | No | No (eligible when major) |
| `CYBER_DIGITAL` | Cyber incident, digital harassment, account/network | Yes (digital harassment) | **Yes** for digital harassment sub-type |
| `GRIEVANCE_WELFARE` | Personal grievance, welfare | **Yes** | **Yes** |
| `EVENT_AREA_AVOIDANCE` | Event requiring students to avoid an area | No | No |
| `DISCIPLINARY_OTHER` | Other disciplinary matter | **Yes** | **Yes** |
| `OTHER` | Unclassified | – | Yes by default until classified |

Student-facing category list maps to codes (PRD §6.2). Codes are configuration, not code.

## 4. AI Output Contract (strict JSON, validated with Zod)
```json
{
  "schema_version": "1.0",
  "category": "FIRE_HAZARD",
  "secondary_categories": ["INFRASTRUCTURE_HAZARD"],
  "confidence": 0.0,
  "immediate_danger": false,
  "flags": {
    "injury_present": false,
    "violence_flag": false,
    "safety_risk": true,
    "crowd_risk": false,
    "disciplinary_flag": false,
    "is_major": false,
    "area_to_avoid": null,
    "weapon_mentioned": false,
    "digital_harassment": false,
    "self_harm_indicator": false
  },
  "extracted": {
    "hazard_type": "string|null",
    "people_involved_count": "integer|null",
    "symptoms": ["string"],
    "location_hint": "string|null",
    "time_reference": "string|null",
    "vehicle_involved": false,
    "persons_described": "free text description of behaviour only; never identity"
  },
  "summary_for_staff": "one–two sentences, neutral",
  "reasoning": "short rationale for authorized personnel; assistive only",
  "language": "en"
}
```
Validation: unknown fields rejected; `category` must be in taxonomy; `confidence ∈ [0,1]`. Invalid/timeout → **RuleClassifier** fallback. A classification with `confidence < 0.55` is treated as `OTHER` plus a flag `LOW_CONFIDENCE` (admin review) but rule keywords can still lift it.

### 4.1 Prompting constraints (system prompt requirements)
- Output JSON only; no policy invention; no identity inference; no advice other than conservative first-aid card ids from a fixed library (medical only).
- Self-harm or suicide indications → `MEDICAL_EMERGENCY` with `immediate_danger=true` and `self_harm_indicator=true` (safe default pending college policy — see PRD A-22).
- Multilingual input (English/Hindi/Hinglish) supported.

### 4.2 First-aid card (Medical)
`first_aid_card_id` from a **fixed, reviewed library** (e.g., "bleeding", "bee sting", "fainting", "burn", "choking", "seizure") shown to the student with the banner: "Help is on the way. This is basic guidance and does not replace professional care." The AI never generates free-form medical advice; no diagnosis; never delays professional care.

## 5. AI Boundaries (enforced)
| Boundary | Enforcement |
|---|---|
| Not sole routing authority | Routing engine is a separate pure module; AI only supplies inputs; engine also reads student category and keywords |
| Cannot invent policy | Prompt forbids; output schema has no "recommended team" field |
| No person identification | Photos not sent; no face-matching libraries; contract tests assert no such endpoint/field |
| No public disclosure decision | Output has no disclosure field; campus-wide eligibility derived from rules + admin approval |
| Reasoning visibility | Stored in `ai_classifications.reasoning`; hidden from students and non-authorized teams |

## 6. Rule-Based Fallback Classifier
Used when AI is disabled, times out, errors, returns invalid output, or confidence is below threshold *and* rules match.
- Inputs: description text (normalized lowercase, English + Hindi transliteration keyword lists), student category, location kind.
- Output: same schema (`source = RULE_FALLBACK`).
- Keyword families (configurable): fire (fire, smoke, burning, spark, short circuit, gas leak, आग, धुआं), medical (fainted, unconscious, bleeding, injured, bee sting, chest pain, seizure), fight (fight, quarrel, beating, attack), unknown person (stranger, unknown person, trespass), blocked route (blocked, road, gate, jam), infrastructure (leak, wire, broken, collapse), cyber (hacked, phishing, account, online harassment).
- Student category is authoritative for the fallback label when keywords are absent.
- `immediate_danger = true` when strong danger keywords match (fire/smoke/unconscious/weapon/bleeding/attack).
- SOS with no match → `OTHER` + `immediate_danger=true` + route to Campus Administration and Security (safe default for unclassifiable emergencies; A-21).

## 7. Routing Engine
**Pure function:** `route(classification, student_category, incident_context, config) → RoutingDecision`.

### 7.1 Rule format (versioned JSON in `routing_rules`)
```json
{
  "rule_id": "R-FIRE-001",
  "enabled": true,
  "priority": 100,
  "when": { "any_category": ["FIRE","FIRE_HAZARD"] },
  "then": {
    "teams": [
      {"team":"FIRE_SAFETY","role":"ACT","responders_required":1},
      {"team":"SECURITY","role":"ACT"},
      {"team":"CAMPUS_ADMIN","role":"KNOW"}
    ],
    "campus_wide_eligible_if": {"flags.is_major": true},
    "restricted": false
  }
}
```
Operators: `any_category`, `flags.*` equality, `workflow`, `location_kind in`, `confidence >=`, `team_enabled(...)`.

### 7.2 Evaluation order
1. Collect candidate categories = `{final student category, AI category, secondary categories}`.
2. Evaluate **all** enabled rules; **union** teams (multi-team assignment). If the same team appears with `ACT` and `KNOW`, `ACT` wins.
3. Apply always-rule `R-ADM-000`: **Campus Administration is always included** (visibility into every incident).
4. Apply restrictions: if any matched category is restricted/sensitive → `restricted=true`, `no_campus_wide=true`, teams limited to those named by rules (no extra "convenience" teams).
5. Remove disabled teams (e.g., Student Council not configured) and write an audit note.
6. Flags: `CATEGORY_MISMATCH` (student vs AI differ), `AI_FALLBACK`, `LOW_CONFIDENCE`, `ESCALATE_ADMIN`.
7. Determinism: same input + same config version → identical output (property-tested).

## 8. Routing Matrix (default rules; configurable)

| Rule | Categories | ACT teams | KNOW teams | Conditional additions | Restricted |
|---|---|---|---|---|---|
| R-FIRE-001 | FIRE, FIRE_HAZARD | Fire & Safety, Security | Campus Administration | — | No |
| R-MED-001 | MEDICAL_EMERGENCY, ACCIDENT | Medical | Campus Administration | **Security** when `violence_flag` or `crowd_risk` or `vehicle_involved` or `safety_risk` or ACCIDENT with `immediate_danger` | Yes (individual medical) |
| R-FIGHT-001 | FIGHT_QUARREL | Security, Chief Proctor | Campus Administration | Medical if `injury_present` | Yes |
| R-TM-001 | TEACHER_MISCONDUCT | Chief Proctor | Campus Administration | **Student Council** when team enabled | Yes |
| R-SM-001 | STUDENT_MISCONDUCT | Chief Proctor | Campus Administration | **Student Council** when team enabled | Yes |
| R-SD-001 | STUDENT_TEACHER_DISPUTE | Chief Proctor | Campus Administration | Student Council when enabled | Yes |
| R-HW-001 | HARASSMENT_WOMEN | Women Safety/Women Club, Chief Proctor | Campus Administration | **Security** if `immediate_danger` | Yes (restricted) |
| R-HM-001 | HARASSMENT_MEN | Men Safety/Men Harassment Team, Chief Proctor | Campus Administration | **Security** if `immediate_danger` | Yes (restricted) |
| R-UP-001 | UNKNOWN_PERSON, SUSPICIOUS_ACTIVITY, UNAUTHORIZED_ACCESS | Security | Campus Administration | — | No (photo workflow §12) |
| R-SEC-001 | SECURITY_THREAT | Security | Campus Administration | Chief Proctor if `disciplinary_flag` | No |
| R-BR-001 | BLOCKED_ROUTE | Transportation/Traffic, Security | Campus Administration | **Infrastructure & Facilities** when `hazard_type` indicates obstruction/damage/construction | No |
| R-IH-001 | INFRASTRUCTURE_HAZARD | Infrastructure & Facilities | Campus Administration | **Security** when `safety_risk` | No |
| R-CY-001 | CYBER_DIGITAL | IT/Digital Safety | Campus Administration | **Chief Proctor** when `disciplinary_flag`/`digital_harassment` | Yes if digital harassment |
| R-GR-001 | GRIEVANCE_WELFARE | Student Council (if enabled) | Campus Administration | Chief Proctor only if `disciplinary_flag` | Yes |
| R-VEH-001 | VEHICLE_INCIDENT, PARKING_ISSUE | Transportation/Traffic | Campus Administration | Medical if `injury_present`; Security if `safety_risk` | No |
| R-ENV-001 | ENVIRONMENTAL_HAZARD | Fire & Safety | Campus Administration | Infrastructure & Facilities; Security if `crowd_risk` | No |
| R-EVT-001 | EVENT_AREA_AVOIDANCE | Security | Campus Administration | Transportation if route-related | No |
| R-DISC-001 | DISCIPLINARY_OTHER | Chief Proctor | Campus Administration | — | Yes |
| R-ADM-000 | **All** | — | **Campus Administration (always)** | — | — |
| R-OTHER-001 | OTHER / LOW_CONFIDENCE | — | Campus Administration (triage) | SOS → also Security (A-21) | Treated as restricted until classified |
| R-ESC-001 | STANDARD with `immediate_danger` | — | — | Flag admin + "Is this an emergency?" prompt to student | — |
| R-SELF-001 | `self_harm_indicator` | Medical | Campus Administration | Chief Proctor/Women/Men not auto-added | Yes |

Chief Proctor is **not** added to routine medical, routine infrastructure, unrelated technical, or unrelated transportation cases (no rule adds it for those categories).

## 9. Notification Audience Matrix

| Category group | ACT (details) | KNOW (summary) | Reporter | Campus-wide | Explore |
|---|---|---|---|---|---|
| Fire / Fire hazard | Fire & Safety, Security | Administration | Status | **Eligible when `is_major`** → admin approval | Sanitized if approved notice |
| Environmental hazard | Fire & Safety (+Facilities) | Administration | Status | **Eligible when `is_major`** | Sanitized if approved |
| Blocked route | Transportation, Security | Administration (+Facilities) | Status | **Eligible when `is_major`** (campus route blockage) | Sanitized if approved |
| Security threat | Security | Administration | Status | **Eligible when `is_major`** (major security threat/campus-wide danger) | Sanitized if approved |
| Event area avoidance | Security | Administration | Status | **Eligible** (area avoidance) | Sanitized |
| Unknown person / suspicious / access | Security | Administration | Status | No (never auto) | Hidden |
| Medical / Accident | Medical (+Security) | Administration | Status | **Never** (individual case) | Hidden |
| Fight / quarrel | Security, Chief Proctor | Administration | Status | **Never** | Hidden |
| Teacher/Student misconduct, dispute, disciplinary | Chief Proctor (+Council) | Administration | Status | **Never** | Hidden |
| Harassment (women/men) | Women/Men Safety, Chief Proctor | Administration | Status | **Never** | Hidden |
| Grievance / welfare | Student Council | Administration | Status | **Never** | Hidden |
| Infrastructure hazard | Facilities (+Security) | Administration | Status | No by default; eligible only if `area_to_avoid` is set | Sanitized if admin marks visible |
| Cyber / digital | IT/Digital Safety (+Proctor) | Administration | Status | **Never** for harassment; otherwise admin-only notice | Hidden |
| Other / unclassified | Administration | – | Status | No | Hidden |

Rules:
1. Campus-wide notices are generated from fixed templates with sanitized fields (hazard type, general area, instruction such as "avoid Block C road"). **No student free text, no names, no photos.**
2. Notices require **Campus Administration approval** unless the category is in `auto_publish_categories` (default empty).
3. Hard deny list (not overridable): any category with `deny_campus_wide = true` in §3.
4. **Notify people who need to act and people who need to know; never those who should not receive the information.**
5. Logged-in users receive campus-wide notices only if `notifications_enabled`; critical notices also appear on the Home banner regardless of push permission.

## 10. Dispatch and Escalation Rules

### 10.1 Eligibility
A responder is eligible for an incident if: member of an ACT team in the decision; `duty_state = AVAILABLE`; not excluded (rejected this incident earlier); (restricted incident) `can_view_restricted = true`; skills satisfy `required_skills` when set.

### 10.2 Ordering
Skill match → fewest current assignments → least recent `last_assigned_at` → stable id. (Optional zone proximity later.)

### 10.3 Offering
- Workflow SOS: offers to top *N* (default 2) eligible candidates **in parallel** per slot; first accept wins; others cancelled. Timeout default 45 s.
- Standard: sequential offers (or team queue) with 10 min timeout.
- Multi-responder: `responders_required` (default 1; configurable per rule, e.g., major fire 2) creates that many slots.

### 10.4 Reject or timeout
Audit `RESPONDER_REJECTED` or `TIMED_OUT`; try next eligible candidate; continue until slots filled.

### 10.5 Nobody available
1. Notify team coordinator (push + SMS + voice for SOS).
2. Notify Campus Administration (`ESCALATED`, dispatch board alert).
3. Optionally widen to mutual-aid team per config (e.g., Security backs up Fire).
4. Team-level notification stays active; any team member can still pick up via "Take case" (coordinator-approved).

### 10.6 Availability transitions
| Trigger | Transition |
|---|---|
| Offer accepted | Available → **Busy** |
| Assignment completed/cancelled | Busy → **Available** (if on duty) |
| Responder/admin toggles; duty schedule | Any → Available/Offline |
| **Inactivity** | **No change** (`no_inactivity_auto_offline`) |
| Reject/timeout | Unchanged (reject does not set Offline) |
Example: Dr. Mahika (Medical) accepts → Busy → completes → Available → ends shift → Offline.

## 11. Multi-Team Rules
- All teams in the decision are granted incident-level access (`incident_teams`) and receive notifications at their `ACT`/`KNOW` level.
- Each ACT team runs its **own dispatch** in parallel; incident status advances on the **first** accepted responder; the timeline records every team's progress.
- Resolution requires all ACT teams to mark complete **or** admin closes with a reason.
- Team-level awareness persists after individual assignment (everyone on a routed team sees the case within their authorization).
- Adding/removing a team after routing (admin or reclassification) is audited `TEAM_ASSIGNMENT_CHANGED`; removed teams lose access (`revoked_at`).

## 12. Photos and the Unknown-Person Workflow
- A student may upload a photo (max 2) in an unknown-person report.
- Routing: `UNKNOWN_PERSON → Security + Campus Administration`.
- Security sees: **photo, description, map pin, time, category, status**.
- **Do not automatically identify the person**: no face recognition, no AI identity guess, no search by image, no matching against student/staff records. The `persons_described` field is behaviour-only text.
- Photo access = Campus Administration + every assigned team/person + reporter; all views audited.

## 13. Test Cases

### 13.1 Routing (expected = ACT ∪ KNOW teams)
| ID | Input (summary) | Expected |
|---|---|---|
| TC-R-001 | "Smoke coming from lab 3" (FIRE_HAZARD) | Fire & Safety, Security, Admin |
| TC-R-002 | "Fire in canteen kitchen" (FIRE, major) | Fire & Safety, Security, Admin; campus-wide eligible |
| TC-R-003 | "Student fainted in class" (MEDICAL) | Medical, Admin; no Security |
| TC-R-004 | "Bike accident at main gate, crowd gathered" (ACCIDENT, crowd_risk) | Medical, Security, Admin |
| TC-R-005 | "Two groups fighting near hostel" (FIGHT) | Security, Chief Proctor, Admin |
| TC-R-006 | "Teacher misbehaved with students" (TEACHER_MISCONDUCT), Council enabled | Chief Proctor, Student Council, Admin |
| TC-R-007 | Same, Council **disabled** | Chief Proctor, Admin; audit note |
| TC-R-008 | "Senior harassing a girl in hostel" (HARASSMENT_WOMEN, not immediate) | Women Safety, Chief Proctor, Admin |
| TC-R-009 | Same + `immediate_danger` | + Security |
| TC-R-010 | "Boy being harassed by group" (HARASSMENT_MEN) | Men Safety, Chief Proctor, Admin |
| TC-R-011 | "Unknown man near girls' hostel" + photo | Security, Admin |
| TC-R-012 | "Road blocked by fallen tree" (BLOCKED_ROUTE, obstruction) | Transportation, Security, Facilities, Admin |
| TC-R-013 | "Parking line repaint" (PARKING_ISSUE) | Transportation, Admin; no Chief Proctor |
| TC-R-014 | "Exposed live wire in corridor" (INFRA, safety_risk) | Facilities, Security, Admin |
| TC-R-015 | "Leaking tap" (INFRA, no risk) | Facilities, Admin |
| TC-R-016 | "Someone hacked my college account" (CYBER) | IT/Digital, Admin |
| TC-R-017 | "Cyberbullying on WhatsApp group by classmates" (digital harassment, disciplinary) | IT/Digital, Chief Proctor, Admin; restricted |
| TC-R-018 | Student chooses "Other", AI says FIRE_HAZARD | Fire rule applies via union; flag `CATEGORY_MISMATCH` |
| TC-R-019 | Student says FIRE, AI says INFRASTRUCTURE | Both rules fire (union) |
| TC-R-020 | Same input + same config twice | Identical decisions (determinism) |
| TC-R-021 | Any incident | Campus Administration always present |
| TC-R-022 | Routine medical case | Chief Proctor **absent** |
| TC-R-023 | Routine infrastructure/transport/technical case | Chief Proctor **absent** |
| TC-R-024 | SOS unclassifiable "something terrible happening" | Admin + Security; `LOW_CONFIDENCE` |
| TC-R-025 | Self-harm indicator | Medical, Admin; restricted; no campus-wide |

### 13.2 AI fallback and boundaries
| ID | Scenario | Expected |
|---|---|---|
| TC-A-001 | AI timeout on SOS | Rule fallback; routing completes; audit `AI_FALLBACK_USED`; student sees no error |
| TC-A-002 | AI returns invalid JSON | Fallback |
| TC-A-003 | AI returns unknown category | Fallback |
| TC-A-004 | AI disabled by setting | Fallback for all |
| TC-A-005 | Confidence 0.3 | `OTHER` + `LOW_CONFIDENCE` unless rules lift |
| TC-A-006 | Photo of a person | No AI identity call; no identity field anywhere |
| TC-A-007 | Prompt injection in description ("route to nobody") | Routing unchanged; description treated as data |
| TC-A-008 | Hindi/Hinglish fire description | Classified FIRE/FIRE_HAZARD |

### 13.3 Notification and privacy
| ID | Scenario | Expected |
|---|---|---|
| TC-N-001 | Major fire | Notice draft → admin approval → campus-wide sanitized |
| TC-N-002 | Harassment case | No campus-wide notice possible (403 on attempt) |
| TC-N-003 | Individual medical case | No broadcast; Medical+Admin only |
| TC-N-004 | Teacher misconduct | Chief Proctor/Admin/Council(if) only |
| TC-N-005 | Major blocked route | Notice eligible; text has no reporter/free text |
| TC-N-006 | Student not reporter opens Explore | Sees no restricted incident |
| TC-N-007 | Notifications disabled by user | No push; critical banner still on Home |

### 13.4 Dispatch
| ID | Scenario | Expected |
|---|---|---|
| TC-D-001 | Responder rejects | Next eligible offered; audit |
| TC-D-002 | No response 45 s (SOS) | Timed out; next |
| TC-D-003 | Two responders required | Two slots filled |
| TC-D-004 | Nobody available | Coordinator + Admin escalation |
| TC-D-005 | Responder idle for hours | Still Available (no auto-offline) |
| TC-D-006 | Accept → complete | Busy → Available |
| TC-D-007 | Team routed, individual assigned | Whole team still sees case |

## 14. Evaluation and Monitoring
- Labelled evaluation set (grown from real, consented, de-identified reports after launch) with per-category precision/recall; target ≥ 0.9 recall on FIRE, MEDICAL, FIGHT, SECURITY_THREAT.
- Dashboards: fallback rate, AI latency, category-mismatch rate, admin reclassification rate (feedback loop).
- Rule changes: dry-run endpoint, review, version bump, audit.
- Human override: Campus Administration can reclassify; re-routing is audited.

## 15. Configuration and Versioning
- Routing rules, taxonomy mapping, keyword lists, thresholds, and teams are stored as versioned configuration; every `routing_decisions` row stores `config_version`.
- Final college routing policies (a future input) are loaded as configuration changes, not code changes.
