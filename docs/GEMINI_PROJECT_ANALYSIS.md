# Campus SOS — Gemini Deep Project Analysis

> **Analysis Author:** Gemini Agent (Analysis & Preparation Phase)  
> **Target:** System Understanding & Architectural Synthesis  
> **Source Documents:** `docs/CAMPUS_SOS_MASTER_GENERATION_SPEC.json`, `docs/PRD.md`, `docs/TECH_STACK.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_SCHEMA.md`, `docs/API_SPECIFICATION.md`, `docs/UI_UX_SPECIFICATION.md`, `docs/AI_ROUTING_SPECIFICATION.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/REQUIREMENTS_TRACEABILITY.md`, `README.md`.

---

## 1. Executive Summary & What the System Does

**Campus SOS** is a real-time, mission-critical campus safety and emergency-response platform for university and college campuses. It bridges the critical minutes between a campus incident occurring and trained response personnel arriving on the scene.

### Key Capabilities
- **Two Distinct Reporting Pathways:**
  - **Emergency SOS:** A rapid, high-priority emergency reporting workflow for immediate hazards (fires, major accidents, physical altercations, serious security threats, road blockages). It features structured intake, map pinning, optional photo evidence, AI analysis, and an **explicit confirmation step** that immediately triggers automated multi-team dispatch.
  - **Report an Incident:** A standard, non-emergency reporting lane for general campus maintenance, low-level infractions, welfare concerns, and student grievances.
- **AI-Assisted Classification with Deterministic Routing:** AI parses natural language descriptions (supporting English, Hindi, and Hinglish transliterations) to extract structured features (hazard type, injury presence, crowd risk, immediate danger). However, routing authority belongs strictly to a **deterministic, configurable rules engine** that maps categories and flags to specialized campus teams.
- **Automated Dispatch & Availability Management:** Responders hold explicit operational duty states (`AVAILABLE`, `BUSY`, `OFFLINE`). The system dispatches incidents directly to individual responders with automated timers, parallel offering for emergencies, fallback reassignments, and coordinator escalations. **Inactivity never causes a responder to become offline.**
- **Strict Privacy & Notification Partitioning:** Sensitive matters (sexual harassment, disciplinary investigations, teacher misconduct, personal medical issues) are quarantined from campus-wide broadcasts and unauthorized teams. Public safety alerts require administrative approval.
- **Zero Fake Data Principle:** Foundation architecture and database migrations contain no fabricated statistics, dummy response times, or fake demo accounts.

---

## 2. All User Roles & Interface Scopes

The specification defines **12 distinct roles** (with dedicated purpose-built interfaces) plus one operational working mode:

| # | Role Code | Role Name | Operational Scope & Boundary |
|---|---|---|---|
| 1 | `STUDENT` | Student | Primary reporter. Interfaces: Home, Emergency SOS, Emergency Assist, Report an Incident, Campus Explore, My Reports, Notifications, Emergency Contacts. |
| 2 | `CAMPUS_ADMIN` | Campus Administration | Campus-wide authority. Full visibility into every incident. Manages dispatch board, analytics, personnel directory, settings, audit trails, and campus-wide notice approvals. |
| 3 | `CHIEF_PROCTOR` | Chief Proctor | Disciplinary and student conduct matters: fights, quarrels, student misconduct, teacher/staff misconduct, student-teacher disputes, harassment. *Excluded by default from routine medical, routine facilities, and transport cases.* |
| 4 | `SECURITY` | Security Team | Physical safety, unauthorized access, unknown persons, suspicious activity, perimeter defense, active violence, and immediate danger backup. |
| 5 | `MEDICAL` | Medical Response | Accidents, collapse, injuries, medical emergencies, bee stings. Delivers basic, conservative first-aid guidance (non-diagnostic). |
| 6 | `FIRE_SAFETY` | Fire & Safety | Active fires, smoke, gas leaks, electrical fire hazards, hazard mitigation. |
| 7 | `WOMEN_SAFETY` | Women Safety / Club | Confidential handling of harassment and safety matters affecting female students/staff. Strictly restricted access. |
| 8 | `MEN_SAFETY` | Men Safety Team | Confidential handling of harassment and safety matters affecting male students/staff. Strictly restricted access. |
| 9 | `STUDENT_COUNCIL` | Student Council | Student welfare, campus grievances, and academic/faculty disputes (active only when enabled by administration). |
| 10 | `INFRASTRUCTURE` | Facilities & Maintenance | Physical infrastructure hazards: electrical faults, water leaks, structural damage, broken glass, maintenance hazards. |
| 11 | `TRANSPORTATION` | Transport & Traffic | Campus traffic congestion, parking violations, road and gate blockages, vehicle accidents. |
| 12 | `IT_DIGITAL` | IT & Digital Safety | Cyber threats, account takeovers, network compromises, digital harassment on campus groups. |
| - | *Responder Mode* | Operational Working Mode | Embedded within all 10 specialized team workspaces: duty state toggle (`AVAILABLE`, `BUSY`, `OFFLINE`), dispatch offer sheet with countdown timer, active transit tracking (`EN_ROUTE`, `ON_SCENE`, `COMPLETED`). |

---

## 3. End-to-End System Workflows

### 3.1 Emergency SOS Workflow (14 Mandatory Steps)
1. **Initiation:** Student taps the prominent "Emergency SOS" button.
2. **Intake Prompt:** "Emergency Assist" asks what is happening.
3. **Description:** Student enters free-text description (or uses quick chips to pre-fill text).
4. **Photo Evidence:** Student optionally attaches up to 2 photographs.
5. **Predefined Location:** Student selects a known location if helpful (e.g., "Block C - Lab 3").
6. **Map Pinning:** Student places an exact point pin on the static 2D campus map image.
7. **AI Intake Analysis:** AI classifies description and extracts hazard entities (timeout 4s; fallback to rule engine).
8. **Routing Evaluation:** Deterministic engine determines responding teams and notification scopes.
9. **Confirmation Screen:** Student reviews summary of report, location pin, photos, and alerted teams.
10. **Explicit Confirmation:** Student taps "Confirm Emergency". No incident is dispatched prior to this step.
11. **Incident Creation:** Database transaction persists incident with `workflow = EMERGENCY_SOS`.
12. **Team Notification:** Relevant teams receive real-time push and in-app alerts.
13. **Automated Dispatch:** Parallel dispatch offers sent to available responders with countdown timers.
14. **Live Status Tracking:** Student receives a 6-stage real-time progress screen:
    `Emergency Created` → `Teams Notified` → `Responder Assigned` → `Responder On the Way` → `Responder At Location` → `Resolved`.

### 3.2 Standard Incident Report Workflow
1. Student opens "Report an Incident".
2. Fills description, selects category from list, chooses predefined location, sets map pin, attaches <= 2 photos.
3. Review screen shows preview of AI classification and teams to be notified.
4. If immediate danger is detected, system displays a prompt offering to switch to Emergency SOS.
5. Student submits; incident created with `workflow = STANDARD_REPORT`.
6. Enters standard dispatch queue with longer timeouts (default 10 minutes) or team coordinator queue.
7. Tracked in "My Reports → Reports".

### 3.3 Unknown-Person Security Workflow
1. Student reports unknown/suspicious person and attaches photo (max 2).
2. Routed to Security and Campus Administration.
3. Security workspace displays: photo, description, map pin, timestamp, category, status.
4. **Strict Boundary:** The platform **never performs facial recognition or identity guessing**. Photographs serve solely as visual evidence for human guards.

### 3.4 Responder Dispatch & Escalation Workflow
1. System identifies `AVAILABLE` responders in the assigned `ACT` team.
2. Sorts candidates by skill match, lowest active case count, and oldest `last_assigned_at`.
3. Offers case (parallel to top 2 for SOS; sequentially for standard).
4. Countdown timer starts (SOS: 45s; Standard: 10m).
5. If accepted: Responder becomes `BUSY`, other pending offers cancel, status advances.
6. If rejected or timed out: System audits event, moves to next candidate.
7. If candidate pool exhausted: System triggers escalation to Team Coordinator and Campus Administration.

---

## 4. Major Modules & Architecture Breakdown

### 4.1 Backend Modules (`backend/src/modules/`)
- `auth`: Credentials, Argon2id, JWT session rotation, MFA (TOTP), login rate-limiting.
- `users`: User profiles, personnel directory querying with strict student exclusion.
- `teams`: Team records, membership associations, coordinator assignments, team-level switches.
- `incidents`: Draft lifecycle, confirmation idempotency, state transitions, resolution codes.
- `attachments`: Presigned S3 upload, magic byte validation, EXIF/GPS stripping, 2-photo database constraint.
- `locations`: Static 2D map metadata, predefined locations, normalized coordinate bounds checking.
- `ai`: Multi-provider `AiClassifier` interface, LLM client with Zod JSON Schema, `RuleClassifier` fallback.
- `routing`: Pure deterministic routing function, JSON rule versioning, rule matrix evaluator.
- `dispatch`: Responder candidate selection, parallel offer manager, BullMQ dispatch timers, auto-escalation.
- `notifications`: Audience resolver (`ACT`, `KNOW`, `REPORTER`, `CAMPUS_WIDE`, `AREA`), privacy filters, channel delivery planners.
- `realtime`: Socket.IO gateways, topic authorization, reconnection replay buffer.
- `explore`: Sanitized public incident feed and map pin projection.
- `analytics`: Dynamic computation of response metrics (T1 to T4) and category breakdowns.
- `audit`: Append-only audit writer, cryptographic SHA-256 hash chain generator, verify endpoint.
- `settings`: Administrative configuration (hotlines, timeout durations, map files, routing rules).
- `access-policy`: Centralized ABAC/RBAC access policy engine.

### 4.2 Frontend Modules (`frontend/src/features/`)
- `design-system`: Custom tokens (colors, typography, spacing) and primitives (buttons, chips, dialogs). Built from scratch; zero legacy UI reuse.
- `shell`: Role-based route guard, offline banner, service worker PWA manager, WebSocket client.
- `student`: Mobile-first screens (Home, SOS Assist, Report, Map Pin Picker, Live Tracker, My Reports, Explore, Notifications).
- `admin`: Desktop-first console (Overview cards, Incident table, 20-element View modal, Dispatch board, Map manager, Teams/Responders manager, Directory, Audit explorer).
- `workspaces`: 10 specialized workspace views tailored to each responder discipline, embedding the shared Responder Mode.

---

## 5. Security & Privacy Requirements

### 5.1 Security Requirements
- **Authentication:** Password hashing via Argon2id. Dual-token JWT architecture (15-min access JWT + 7-day rotating refresh cookie). Mandatory MFA for administrative and responder accounts.
- **Authorization:** Multi-layered access policy (Role + Team Membership + Incident Grant). PostgreSQL Row-Level Security (RLS) enabled as secondary defense.
- **Tamper-Evident Audit Trail:** Hash-chained append-only log (`audit_events`). Any tampering with past events breaks the cryptographic chain. Direct updates or deletes are revoked at the database role level.
- **Network & API Security:** Strict CORS, CSP headers, rate-limiting on SOS confirm (soft-flagging rather than blocking), presigned S3 URLs with 60-second validity.

### 5.2 Privacy Requirements
- **Quarantine of Sensitive Incidents:** Teacher misconduct, student misconduct, harassment (women/men), individual medical emergencies, and disciplinary grievances are categorized as `restricted`. They are never published campus-wide and are completely concealed from Campus Explore.
- **Photo Evidence Protection:** Photographs are private evidence. Accessible exclusively to Campus Administration, assigned incident teams, and the reporter. Download URLs are audited (`PHOTO_VIEWED`).
- **No Person Identification:** Zero AI facial recognition or automated identity matching.
- **User Directory Privacy:** The User Directory is strictly a **Campus SOS personnel directory**. It never functions as a student phonebook. Student phone numbers are excluded from directory queries.
- **Reporter Masking:** In restricted cases, reporter identity details are hidden behind an explicit "Reveal" action in the Admin console, which triggers an `ACCESS_RESTRICTED_CASE` audit log.

---

## 6. AI & Routing Requirements

### 6.1 AI Boundaries
1. AI structures, normalizes, and extracts features.
2. AI is **never** the sole routing authority.
3. AI **never** decides whether an incident should be made public.
4. AI **never** matches faces or identifies individuals.
5. System prompt enforces strict JSON output adhering to a Zod schema. If the output fails schema validation, the system falls back to the `RuleClassifier`.
6. SOS classification timeout is 4 seconds; standard classification timeout is 10 seconds. AI down or timing out is invisible to the student.

### 6.2 Deterministic Routing Matrix
- **Pure Function:** Same input + same rule version = identical routing decision.
- **Rule Union:** The engine evaluates both the AI category and the student-chosen category, applying the union of all matched team actions.
- **Administration Rule:** Campus Administration (`CAMPUS_ADMIN`) is automatically included in every incident (`R-ADM-000`).
- **Default Multi-Team Mappings:**
  - Fire / Fire Hazard → `FIRE_SAFETY` (ACT), `SECURITY` (ACT), `CAMPUS_ADMIN` (KNOW).
  - Medical / Accident → `MEDICAL` (ACT), `CAMPUS_ADMIN` (KNOW), + `SECURITY` conditionally (if immediate danger, violence, or crowd risk).
  - Fight / Altercation → `SECURITY` (ACT), `CHIEF_PROCTOR` (ACT), `CAMPUS_ADMIN` (KNOW), + `MEDICAL` (if injury flag).
  - Teacher / Student Misconduct → `CHIEF_PROCTOR` (ACT), `CAMPUS_ADMIN` (KNOW), + `STUDENT_COUNCIL` (if enabled).
  - Women Harassment → `WOMEN_SAFETY` (ACT), `CHIEF_PROCTOR` (ACT), `CAMPUS_ADMIN` (KNOW), + `SECURITY` (if immediate danger).
  - Men Harassment → `MEN_SAFETY` (ACT), `CHIEF_PROCTOR` (ACT), `CAMPUS_ADMIN` (KNOW), + `SECURITY` (if immediate danger).
  - Unknown Person → `SECURITY` (ACT), `CAMPUS_ADMIN` (KNOW).
  - Blocked Route → `TRANSPORTATION` (ACT), `SECURITY` (ACT), `CAMPUS_ADMIN` (KNOW), + `INFRASTRUCTURE` (if physical blockage/hazard).
  - Infrastructure Hazard → `INFRASTRUCTURE` (ACT), `CAMPUS_ADMIN` (KNOW), + `SECURITY` (if safety risk).
  - Cyber / Digital → `IT_DIGITAL` (ACT), `CAMPUS_ADMIN` (KNOW), + `CHIEF_PROCTOR` (if disciplinary/harassment).

---

## 7. Notification Rules & Audience Architecture

| Audience Type | Scope | Information Delivered | Delivery Channels |
|---|---|---|---|
| `ACT` | Assigned Responders & Coordinators | Full unfiltered case details, pin, photos, notes. | Push + SMS + Voice (for SOS). |
| `KNOW` | Campus Administration & Awareness Teams | Incident summary, location, operational status. | In-app + Push. |
| `REPORTER` | Reporting Student | Real-time status milestones, reassurance messages. | In-app + Push. |
| `CAMPUS_WIDE` | All Logged-in Campus Users | Sanitized hazard summary and avoidance instructions. **Zero reporter data, zero photos.** | In-app + Push (SMS for extreme emergencies). |
| `AREA` | Users in Affected Campus Zone | Sanitized zone advisory (e.g., "Avoid Block B"). | In-app + Push. |

### Campus-Wide Notice Policy
- **Eligible Only:** Major fires, major route blockages, major security threats, environmental hazards, area avoidance.
- **Strict Deny List:** Misconduct, harassment, individual medical emergencies, personal grievances, disciplinary cases.
- **Approval Gate:** Notices are staged in `PENDING_APPROVAL` status and require explicit administrative sign-off before transmission.

---

## 8. Data Entities & Schema Summary

Key PostgreSQL tables:
1. `users`: Base accounts, role, contact info, MFA flags.
2. `teams`: Campus safety units, dispatch timeout settings, restricted flags.
3. `team_members`: Associates users with teams, coordinator flags, restricted case permissions.
4. `responder_profiles`: Live duty state (`AVAILABLE`, `BUSY`, `OFFLINE`), skills, assignment tracking.
5. `campus_maps`: Uploaded 2D static images, dimensions.
6. `predefined_locations`: Named campus buildings/rooms with anchor suggestions.
7. `incidents`: Central incident record, workflow type, status, T1-T4 timestamps.
8. `incident_drafts`: Staging area for reports prior to confirmation (24h TTL).
9. `incident_locations`: Pin coordinates (`pin_x`, `pin_y` as normalized decimals $0 \le x, y \le 1$).
10. `attachments`: Photo evidence records (strictly capped at 2 per incident).
11. `ai_classifications`: Immutable snapshots of AI inputs, raw outputs, and reasoning.
12. `routing_decisions`: Immutable records of rules fired and teams assigned.
13. `incident_teams`: Access control table mapping incidents to teams (`ACT` / `KNOW`).
14. `assignments`: Responder dispatch lifecycle (`OFFERED`, `ACCEPTED`, `REJECTED`, `TIMED_OUT`, `EN_ROUTE`, `ON_SCENE`, `COMPLETED`).
15. `incident_status_history`: Chronological status audit trail.
16. `notifications`: In-app inbox notifications per user.
17. `notification_deliveries`: Detailed per-channel dispatch status and logs.
18. `campus_notices`: Administrative campus-wide safety alerts.
19. `routing_rules`: Editable, versioned rule sets.
20. `hotlines`: Configured 24/7 campus emergency contact numbers.
21. `audit_events`: Tamper-evident append-only hash chain audit log.

---

## 9. API Domains & Real-Time Specifications

- **`/api/v1/auth`:** Authentication, MFA verification, session token rotation.
- **`/api/v1/sos`:** Emergency drafts, classification preview, explicit confirmation, live status snapshot.
- **`/api/v1/incidents`:** Standard reports, reporter view, notes.
- **`/api/v1/attachments`:** Presigned photo upload URLs, EXIF sanitization completion, signed download URLs.
- **`/api/v1/map` & `/locations`:** Static map metadata, predefined locations.
- **`/api/v1/team`:** Team incident queues, status updates, team notes, escalation requests.
- **`/api/v1/responder`:** Duty status toggles, offer accept/reject, transit updates (`en-route`, `on-scene`, `complete`).
- **`/api/v1/admin`:** Overview metrics, 20-field case View, dispatch board, audit query, settings.
- **`/api/v1/explore`:** Sanitized public pins and recent activity feed.
- **`/api/v1/directory`:** Personnel-only directory.
- **WebSocket Gateway (`/rt`):**
  - `incident:{id}`: Broadcasts status changes and responder progress to authorized subscribers.
  - `team:{id}`: Delivers new incident alerts and dispatch offers to team members.
  - `admin:dispatch`: Feeds live operational board with escalations and unassigned cases.
  - `user:{id}`: In-app notifications and campus notices.

---

## 10. Specification Inconsistencies & Resolution Summary

During rigorous cross-checking of the specification package, the following nuances and apparent conflicts were identified and resolved with safe, non-destructive rules:

1. **Map Pin Requirement on SOS:**
   - *Issue:* Master spec lists placing map pin in the 14-step SOS flow, but PRD §5.3 establishes a "fast path" where description alone is sufficient so a student in panic is never blocked.
   - *Resolution:* `pin_x` and `pin_y` in `incident_locations` are nullable for `EMERGENCY_SOS` fast-path submissions, but strictly required (`NOT NULL`) for `STANDARD_REPORT`.
2. **Category Selection in SOS:**
   - *Issue:* UI flow shows quick chips (Fire, Injury, etc.) on the SOS screen.
   - *Resolution:* Chips merely pre-fill the textarea description for typing speed; they do **not** set a category dropdown or urgency selector. `student_category` remains `NULL` for SOS in the database.
3. **Admin Visibility vs. Restricted Cases:**
   - *Issue:* Admin has visibility into "everything on campus", but Women/Men safety cases are "restricted".
   - *Resolution:* Admin retains access to guarantee campus-wide safety and legal accountability, but every access to a restricted case explicitly triggers an `ACCESS_RESTRICTED_CASE` audit entry and reporter contact information is masked until explicitly unmasked.
4. **Responder Inactivity:**
   - *Issue:* Common industry pattern is auto-logging out idle responders.
   - *Resolution:* Specification strictly forbids auto-offline (`no_inactivity_auto_offline = true`). Database enforces `CHECK (change_reason <> 'INACTIVITY')`.

---

## 11. Implementation Dependencies & Next Steps

The project is structured with clean, unidirectional dependencies:
1. **Core Contracts & Data Schema:** OpenAPI 3.1 contract and PostgreSQL migrations must be established first.
2. **Identity & Access Management:** Auth, sessions, and `AccessPolicy` service.
3. **Core Incident Engine:** Draft staging, confirmation transactions, and photo upload infrastructure.
4. **Intelligence Tier:** `AiClassifier` client with `RuleClassifier` fallback and deterministic routing engine.
5. **Operational Worker Tier:** BullMQ worker handling dispatch timers, parallel offers, and notifications.
6. **Real-time & Admin Dashboards:** Socket.IO gateway, Admin 20-field case viewer, and audit verification.

*The specification package is completely analyzed, fully consistent, and 100% prepared for Claude to begin backend implementation.*
