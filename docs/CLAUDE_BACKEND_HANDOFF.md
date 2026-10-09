# Campus SOS — Claude Backend Implementation Handoff

> **Target Model:** Claude (Next Stage)  
> **Status:** SPECIFICATION ANALYZED & ARCHITECTURE PREPARED — IMPLEMENTATION NOT STARTED  
> **Source of Truth:** `docs/CAMPUS_SOS_MASTER_GENERATION_SPEC.json`, `docs/PRD.md`, `docs/TECH_STACK.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_SCHEMA.md`, `docs/API_SPECIFICATION.md`, `docs/AI_ROUTING_SPECIFICATION.md`, `docs/UI_UX_SPECIFICATION.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/REQUIREMENTS_TRACEABILITY.md`.

---

## 1. Project Understanding

Campus SOS is a dedicated campus safety and emergency-response platform designed for higher education institutions. It is **not** a generic dashboard, a social reporting feed, or an unconstrained conversational chatbot. It is a mission-critical, life-safety operations system designed around high-reliability incident intake, deterministic multi-team dispatch, strict privacy partitioning, and fail-safe operation.

### Core Philosophy
1. **Emergency SOS is the Highest-Priority Workflow:** Emergency SOS handles immediate dangers (major fire, major accident/injury, physical fights, serious security threats, road blockages). It requires a streamlined, low-friction reporting flow culminating in an **explicit confirmation step** before dispatch triggers.
2. **Normal Incident Report is Strictly Separate:** Non-emergency campus grievances, facilities issues, routine complaints, and non-immediate concerns follow the `STANDARD_REPORT` workflow.
3. **No Urgency Selectors:** There is **no** user-facing urgency dropdown (e.g., Low / Medium / High). The workflow choice (`EMERGENCY_SOS` vs. `STANDARD_REPORT`) and deterministic routing rules govern operational priority.
4. **AI Structures, Rules Route, Humans Respond:** AI assists by parsing free text, classifying categories, extracting structured flags/entities, and providing assistive summaries. AI is **never** the sole authority for dispatching responders, creating authority policy, or deciding whether sensitive incidents become public. Deterministic, configurable rules drive routing.
5. **Privacy and Sensitive Case Partitioning:** Incidents involving harassment (Women/Men), disciplinary disputes, teacher/student misconduct, and individual medical emergencies are strictly classified as **restricted**. They are never broadcast campus-wide and are concealed from student feeds and non-routed teams.
6. **No Inactivity Auto-Offline:** Responders hold explicit duty states (`AVAILABLE`, `BUSY`, `OFFLINE`). The system never marks a responder offline due to client idle time or lack of interaction.
7. **No Fake Data or Pre-seeded Demo Accounts:** No fake incidents, fabricated response metrics, or demo users are to be created during backend foundation building. Real and demo accounts are provisioned exclusively at the final deployment stage.

---

## 2. System Architecture

The overall system architecture follows a clean decoupling between the client tier, the backend API tier, the background worker process, and external gateways.

```
                      +---------------------------------------+
                      |   Frontend Applications (React PWA)   |
                      |  (Student, Admin, 10 Team Workspaces) |
                      +-------------------+-------------------+
                                          |
                      HTTPS REST API (v1) | WebSocket / Socket.IO (/rt)
                                          |
+-----------------------------------------v-----------------------------------------+
|                                NestJS Backend API                                 |
|  +-----------------------------------------------------------------------------+  |
|  | Modules: Auth, Users, Teams, Incidents, Attachments, Locations, AI,         |  |
|  | Routing, Dispatch, Notifications, Realtime, Analytics, Audit, Settings      |  |
|  +--------------------------------------+--------------------------------------+  |
+-----------------------------------------|-----------------------------------------+
       |                  |               |                     |
       v                  v               v                     v
+--------------+  +---------------+  +----------+  +--------------------------------+
|  PostgreSQL  |  |  Redis 7 /    |  | S3/MinIO |  |         Worker Process         |
|  Database    |  |  BullMQ       |  | Storage  |  | (Queues: sos-critical,        |
|  (16 + RLS)  |  |  (Queues/Pub) |  | (Photos) |  |  standard, notify, dispatch)  |
+--------------+  +---------------+  +----------+  +--------------------------------+
                                                                |
                                             +------------------+------------------+
                                             |                  |                  |
                                             v                  v                  v
                                        +---------+        +---------+        +---------+
                                        |   AI    |        |  Push/  |        |  SMS /  |
                                        | LLM API |        |   FCM   |        |  Voice  |
                                        +---------+        +---------+        +---------+
```

### Component Responsibilities
- **Backend API (`backend-api`):** Synchronous HTTP request handling, session validation, payload validation (Zod/DTOs), database persistence, presigned photo URL generation, transactional outbox emission.
- **Worker Process (`backend-worker`):** Asynchronous processing decoupled from the HTTP cycle: AI classification orchestration, fallback execution, routing matrix evaluation, responder dispatch timers, escalation handling, multi-channel notification fan-out.
- **Transactional Outbox Pattern:** Ensures that when an incident is confirmed in Postgres, domain events (`incident.created`, `sos.confirmed`) are guaranteed to reach BullMQ without distributed transaction dual-write failure.
- **Circuit Breakers and Timeouts:** External services (AI LLM, SMS, Voice, Push) have hard timeouts (SOS AI timeout: 4s; Standard AI timeout: 10s) and fallback paths.

---

## 3. Backend Architecture

### Directory and Module Structure (`backend/`)
The backend is structured as an independent NestJS application with strict boundary isolation:

```
backend/
├── src/
│   ├── main.ts                     # API application bootstrap
│   ├── worker.ts                   # BullMQ worker process bootstrap
│   ├── app.module.ts               # Root module
│   ├── common/                     # Interceptors, filters, guards, decorators
│   │   ├── guards/                 # JwtAuthGuard, RolesGuard, AccessPolicyGuard
│   │   ├── filters/                # GlobalHttpExceptionFilter (Standard JSON envelope)
│   │   ├── interceptors/           # LoggingInterceptor, IdempotencyInterceptor
│   │   └── utils/                  # Coordinate math, sanitizers, hash chain helpers
│   ├── database/                   # Database connection, Prisma/Drizzle schema, migrations
│   │   ├── migrations/
│   │   └── schema.prisma (or SQL)
│   └── modules/
│       ├── auth/                   # Password hashing, JWT, MFA, refresh tokens, sessions
│       ├── users/                  # User accounts, profiles, user directory
│       ├── teams/                  # Teams, team memberships, coordinator assignments
│       ├── incidents/              # Drafts, incident lifecycle, status machine, notes
│       ├── attachments/            # Photo upload presigning, validation, 2-photo constraint
│       ├── locations/              # Static map metadata, predefined locations, pin validation
│       ├── ai/                     # AiClassifier interface, LlmClassifier, RuleClassifier
│       ├── routing/                # Deterministic rule engine, routing matrix, rule storage
│       ├── dispatch/               # Automatic responder assignment, timers, escalations
│       ├── notifications/          # Audience resolution, privacy filters, channel delivery
│       ├── realtime/               # Socket.IO gateways, channel auth, event broadcasting
│       ├── explore/                # Sanitized public incident feed & pins
│       ├── analytics/              # T1-T4 metrics calculations, category aggregations
│       ├── audit/                  # Append-only audit logger, hash chain, timeline queries
│       ├── settings/               # Hotlines, campus map config, routing rules, timeouts
│       └── access-policy/          # Unified ABAC/RBAC decision engine (CanView, CanEdit)
```

### Module Boundaries
1. Controllers must **only** interact with their own module's services or public service interfaces from other modules.
2. Direct database table manipulation across modules is forbidden.
3. Every mutating action triggers an outbox event and an audit entry.

---

## 4. Database Architecture

PostgreSQL 16 is the relational database. Primary keys are UUID v7 (or UUID v4), timestamps are `timestamptz` in UTC, and schema naming is `snake_case`.

### Entity Relationship Model
- **`users`**: Base account table (`id`, `user_type` [student, staff, personnel], `role` [user_role enum], `full_name`, `email`, `phone`, `password_hash`, `mfa_enabled`, `notifications_enabled`, `is_active`). Student phone numbers are private profile data and never exposed via public/directory queries.
- **`teams`**: Campus safety and operational units (`id`, `code` [UNIQUE: `SECURITY`, `MEDICAL`, `FIRE_SAFETY`, `CHIEF_PROCTOR`, `WOMEN_SAFETY`, `MEN_SAFETY`, `STUDENT_COUNCIL`, `INFRASTRUCTURE`, `TRANSPORTATION`, `IT_DIGITAL`, `CAMPUS_ADMIN`], `name`, `is_restricted`, `is_enabled`, `assignment_mode`, `offer_timeout_sos_seconds`, `offer_timeout_standard_seconds`, `sos_parallel_offer`, `coordinator_member_id`).
- **`team_members`**: Join between `users` and `teams` (`id`, `team_id`, `user_id`, `designation`, `is_coordinator`, `can_view_restricted`, `is_directory_visible`). UNIQUE `(team_id, user_id)`.
- **`responder_profiles`**: Linked 1:1 with `team_members` (`member_id` PK/FK, `duty_state` [`AVAILABLE`, `BUSY`, `OFFLINE`], `duty_state_changed_at`, `duty_state_changed_by`, `change_reason`, `skills`, `last_assigned_at`, `current_assignment_count`).
  - **Constraint:** `CHECK (change_reason <> 'INACTIVITY')`.
- **`campus_maps`**: Uploaded 2D static images (`id`, `name`, `storage_key`, `width_px`, `height_px`, `is_active`, `uploaded_by`).
- **`predefined_locations`**: Named campus zones (`id`, `map_id`, `kind` [enum: `ROOM`, `CLASSROOM`, `LABORATORY`, `BLOCK`, `LIBRARY`, `CANTEEN`, `PARKING`, `GROUND`, `HOSTEL`, `OTHER`], `name`, `anchor_x`, `anchor_y`).
- **`incidents`**: Main incident record (`id`, `public_id` [e.g., `SOS-2027-000123`, `INC-2027-000456`], `workflow` [`EMERGENCY_SOS`, `STANDARD_REPORT`], `reporter_id`, `created_by_id`, `description`, `student_category`, `final_category`, `status`, `is_restricted`, `immediate_danger`, `campus_wide_eligible`, `explore_visible`, `confirmed_at`, `first_team_notified_at` [T1], `first_accepted_at` [T2], `responder_arrived_at` [T3], `resolved_at` [T4], `resolution_summary`, `resolution_code`, `idempotency_key`).
  - **Constraint:** `workflow = 'EMERGENCY_SOS' -> student_category IS NULL`.
- **`incident_drafts`**: Temporary staging records before explicit confirmation (`id`, `reporter_id`, `workflow`, `payload jsonb`, `classification_preview jsonb`, `routing_preview jsonb`, `expires_at`). Auto-purged after 24h.
- **`incident_locations`**: 1:1 with `incidents` (`incident_id` PK/FK, `map_id`, `predefined_location_id`, `location_kind`, `location_text`, `pin_x`, `pin_y`, `gps_lat`, `gps_lng`). `pin_x` and `pin_y` are `numeric(7,6)` with `CHECK (pin_x >= 0 AND pin_x <= 1)` and `CHECK (pin_y >= 0 AND pin_y <= 1)`.
- **`attachments`**: Evidence photos (`id`, `incident_id`, `draft_id`, `uploader_id`, `storage_key`, `mime_type`, `size_bytes`, `position` [1 or 2], `scan_status`).
  - **Constraints:** `CHECK (position IN (1, 2))`, UNIQUE `(incident_id, position)`. Database trigger strictly blocks insertion of a 3rd photo.
- **`ai_classifications`**: Immutable AI execution snapshots (`id`, `incident_id`, `source` [`AI`, `RULE_FALLBACK`], `model`, `prompt_version`, `input_snapshot jsonb`, `output jsonb`, `category`, `confidence`, `immediate_danger`, `reasoning`, `latency_ms`).
- **`routing_decisions`**: Immutable routing outputs (`id`, `incident_id`, `classification_id`, `config_version`, `matched_rules text[]`, `teams jsonb`, `restrictions jsonb`, `audience jsonb`, `flags text[]`).
- **`incident_teams`**: Incident-level access grants (`incident_id`, `team_id`, `role` [`ACT`, `KNOW`], `granted_by`, `granted_at`, `revoked_at`). Primary Key `(incident_id, team_id)`.
- **`assignments`**: Responder dispatch records (`id`, `incident_id`, `team_id`, `member_id`, `status` [`OFFERED`, `ACCEPTED`, `REJECTED`, `TIMED_OUT`, `CANCELLED`, `EN_ROUTE`, `ON_SCENE`, `COMPLETED`], `offered_at`, `responded_at`, `expires_at`, `accepted_at`, `en_route_at`, `on_scene_at`, `completed_at`, `reject_reason`, `attempt_no`, `slot_no`).
- **`incident_status_history`**: Audit trail of incident status changes (`id`, `incident_id`, `from_status`, `to_status`, `changed_by`, `note`, `created_at`).
- **`notifications`**: User notification inbox items (`id`, `incident_id`, `audience_type` [`ACT`, `KNOW`, `REPORTER`, `CAMPUS_WIDE`, `AREA`], `recipient_user_id`, `notice_id`, `title`, `body`, `payload jsonb`, `read_at`).
- **`notification_deliveries`**: Delivery dispatch per channel (`id`, `notification_id`, `channel` [`IN_APP`, `PUSH`, `SMS`, `VOICE`, `EMAIL`], `status` [`QUEUED`, `SENT`, `DELIVERED`, `READ`, `FAILED`, `SKIPPED`], `error_code`, `sent_at`, `delivered_at`).
- **`campus_notices`**: Sanitized campus-wide / area safety notices (`id`, `incident_id`, `status` [`DRAFT`, `PENDING_APPROVAL`, `PUBLISHED`, `REJECTED`, `WITHDRAWN`], `title`, `sanitized_body`, `area_text`, `drafted_by`, `approved_by`, `approved_at`, `auto_published`, `category`).
  - **Constraint:** Hard-coded deny check preventing sensitive/restricted categories from having campus notices.
- **`routing_rules`**: Versioned rule table (`id`, `rule_id`, `version`, `enabled`, `priority`, `condition jsonb`, `actions jsonb`, `description`).
- **`hotlines`**: 24/7 campus emergency hotlines (`id`, `label`, `phone`, `description`, `sort_order`, `is_24x7`, `is_active`).
- **`audit_events`**: Append-only tamper-evident audit log (`id bigserial`, `occurred_at`, `event_type`, `incident_id`, `actor_user_id`, `actor_kind`, `target_type`, `target_id`, `details jsonb`, `ip_address`, `prev_hash bytea`, `hash bytea`).
  - Application role has `INSERT, SELECT` only. `UPDATE`, `DELETE`, `TRUNCATE` revoked.

---

## 5. API Architecture

Base URL: `/api/v1`. Standards: JSON request/response bodies, ISO-8601 UTC timestamps, UUID identifiers, standardized error envelopes.

### Standard Request Envelope & Headers
- `Content-Type: application/json; charset=utf-8`
- `Authorization: Bearer <access_token>`
- `Idempotency-Key: <string>` (Mandatory on `POST /sos/drafts/{id}/confirm` and `POST /incidents`)
- `X-Request-Id: <uuid>` (Propagated through all logs and responses)

### Standard Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable error description",
    "details": [
      { "field": "photos", "issue": "MAX_2" }
    ],
    "request_id": "c1f7b889-b7b5-4f46-9d32-d17e75cf3981"
  }
}
```

### Core API Endpoints Summary
1. **Auth:** `POST /auth/login`, `POST /auth/mfa/verify`, `POST /auth/refresh`, `POST /auth/logout`, `GET /me`, `PATCH /me/settings`, `POST /me/push-subscriptions`.
2. **Emergency SOS:**
   - `POST /sos/drafts` -> Create draft
   - `PATCH /sos/drafts/{id}` -> Update draft
   - `POST /sos/drafts/{id}/preview` -> Run classification preview & return expected teams (generic label for sensitive)
   - `POST /sos/drafts/{id}/confirm` -> **Explicit confirmation**, returns incident ID, enqueues dispatch
   - `GET /sos/{incident_id}/live` -> Live status snapshot (6 steps + responder state)
   - `DELETE /sos/drafts/{id}` -> Discard draft
3. **Standard Reports:**
   - `POST /incidents` -> Create standard report
   - `POST /incidents/preview` -> Preview classification & teams
   - `GET /me/reports?tab=reports|sos` -> Reporter submissions
   - `GET /me/incidents/{id}` -> Reporter detailed case view
   - `POST /me/incidents/{id}/notes` -> Add follow-up note
4. **Attachments (Photos):**
   - `POST /attachments/uploads` -> Request presigned upload URL (validates <= 2 count)
   - `POST /attachments/{id}/complete` -> Finalize upload, strip EXIF, validate magic bytes
   - `GET /attachments/{id}/url` -> Generate short-lived signed download URL (audited: `PHOTO_VIEWED`)
5. **Maps & Locations:**
   - `GET /map` -> Active map image URL and dimensions
   - `GET /locations` -> Predefined campus locations
   - `POST /admin/map` -> Upload new map image
   - `POST/PATCH/DELETE /admin/locations` -> Manage predefined locations
6. **Notifications & Notices:**
   - `GET /notifications` -> In-app inbox
   - `POST /notifications/{id}/read` -> Mark read
   - `GET /notices/active` -> Published sanitized notices
   - `GET /admin/notices?status=PENDING_APPROVAL` -> Notice drafts awaiting admin
   - `POST /admin/notices/{id}/approve` -> Publish notice
   - `POST /admin/notices/{id}/reject` -> Reject notice
7. **Team Workspace & Responder Actions:**
   - `GET /team/incidents` -> Incidents routed to current member's team
   - `GET /team/incidents/{id}` -> Case file (team view)
   - `POST /team/incidents/{id}/status` -> Transition status
   - `POST /team/incidents/{id}/notes` -> Add internal case note
   - `POST /team/incidents/{id}/escalate` -> Manual escalation
   - `GET /responder/me` -> Duty status and active assignments
   - `PUT /responder/me/duty-state` -> Set Available / Busy / Offline
   - `GET /responder/offers` -> Pending assignment offers
   - `POST /responder/offers/{id}/accept` -> Accept dispatch offer
   - `POST /responder/offers/{id}/reject` -> Reject dispatch offer
   - `POST /responder/assignments/{id}/en-route` -> Update status
   - `POST /responder/assignments/{id}/on-scene` -> Update status
   - `POST /responder/assignments/{id}/complete` -> Complete assignment
8. **Admin Operations:**
   - `GET /admin/overview` -> 5 summary metrics (computed from real data only)
   - `GET /admin/incidents` -> Table rows with filters
   - `GET /admin/incidents/{id}` -> Complete 20-field case file for View modal/page
   - `POST /admin/incidents/{id}/assign` -> Manual override assignment
   - `POST /admin/incidents/{id}/status` -> Manual status override
   - `POST /admin/incidents/{id}/reclassify` -> Override category & re-route
   - `GET /admin/dispatch` -> Live dispatch board
   - `GET /admin/audit` -> Global filterable audit log
   - `GET /admin/audit/verify` -> Verify cryptographic hash chain
   - `GET /directory` -> Personnel directory (Admin & Coordinators only; **no students**)
   - `GET/PUT /admin/settings/*` -> Hotlines, timeouts, routing rules, AI settings

---

## 6. Authentication Architecture

- **Credentials:** Email and Argon2id password hash (`salt` + `memoryCost` 65536 + `iterations` 3).
- **Session Tokens:**
  - Short-lived Access Token: JWT (15-minute expiration) signed via RS256 or ED25519. Payload includes `sub` (userId), `role`, `teams: string[]`, `is_personnel: boolean`.
  - Long-lived Refresh Token: Cryptographically secure random 256-bit string stored in an `httpOnly`, `Secure`, `SameSite=Lax` cookie. Stored hashed (SHA-256) in `sessions` table. Rotated on each `/auth/refresh` request. Revoked on logout or password change.
- **MFA:** Time-based One-Time Password (TOTP, RFC 6238). Mandatory for all administrative and team responder roles. Optional for students.
- **Lockout & Rate Limiting:** Maximum 5 failed login attempts per IP/account before temporary 15-minute lockout.

---

## 7. Authorization & Access Control

Access control uses a unified `AccessPolicy` evaluation layer combining RBAC, Team-Based Authorization, and Incident-Level Access Grants.

### Access Evaluation Logic (`canViewIncident`)
```typescript
async function canViewIncident(user: AuthUser, incidentId: string): Promise<boolean> {
  // 1. Campus Administration has visibility into all incidents
  if (user.role === UserRole.CAMPUS_ADMIN) {
    const inc = await getIncident(incidentId);
    if (inc.is_restricted) {
      await auditLog('ACCESS_RESTRICTED_CASE', { userId: user.id, incidentId });
    }
    return true;
  }

  // 2. Incident Reporter can view their own submission
  const incident = await getIncident(incidentId);
  if (incident.reporter_id === user.id) {
    return true;
  }

  // 3. Team-Level Access: Check active grant in incident_teams
  const teamGrant = await getActiveIncidentTeamGrant(incidentId, user.teams);
  if (teamGrant) {
    // If incident is restricted, member must possess can_view_restricted flag
    if (incident.is_restricted) {
      return user.can_view_restricted === true;
    }
    return true;
  }

  // 4. Assigned Responder has direct access
  const assignment = await getActiveAssignment(incidentId, user.id);
  if (assignment) {
    return true;
  }

  return false;
}
```

### Inaccessible Incident Behavior
If a user requests an incident ID they are not authorized to view, the API returns **`404 Not Found`** (rather than `403 Forbidden`) to prevent probing the existence of confidential or sensitive cases.

---

## 8. Role Model

The system supports **12 distinct roles**, each with explicit operational scopes:

1. **`STUDENT`:** Reporting via Emergency SOS & Standard Report, personal report tracking (My Reports), public map viewing, sanitized campus notices, emergency hotlines.
2. **`CAMPUS_ADMIN`:** Full campus visibility, all incidents, active dispatch board, audit trail, personnel directory, system settings, notice approvals, manual routing/assignment overrides.
3. **`CHIEF_PROCTOR`:** Disciplinary cases, student misconduct, teacher misconduct, student-teacher disputes, fights, harassment. **Never** receives routine medical, routine facilities, or routine transport cases by default.
4. **`SECURITY`:** Physical security threats, unknown persons, suspicious activity, unauthorized access, fights, immediate danger support for medical/harassment.
5. **`MEDICAL`:** Medical emergencies, collapse, illness, injury, accidents, bee stings. Basic first-aid delivery.
6. **`FIRE_SAFETY`:** Active fires, fire hazards, smoke, gas leaks, safety drills.
7. **`WOMEN_SAFETY`:** Restricted cases involving harassment of women, women's welfare. Strict privacy boundaries.
8. **`MEN_SAFETY`:** Restricted cases involving harassment of men, men's welfare. Strict privacy boundaries.
9. **`STUDENT_COUNCIL`:** Student welfare, grievances, student concerns (active only when enabled by administration).
10. **`INFRASTRUCTURE`:** Electrical, plumbing, water, structural, building maintenance hazards.
11. **`TRANSPORTATION`:** Road blockage, traffic congestion, parking violations, campus vehicle accidents.
12. **`IT_DIGITAL`:** Cyber incidents, digital harassment, account compromises, digital network safety.

---

## 9. Incident Model & State Lifecycle

### Incident States (`incident_status`)
- `DRAFT`: Local and temporary staging state before explicit confirmation.
- `CREATED`: Confirmed by student, incident record persisted.
- `TEAMS_NOTIFIED`: Outbox events dispatched to initial team queues.
- `RESPONDER_ASSIGNED`: First responder accepts assignment offer.
- `RESPONDER_ON_THE_WAY`: Responder signals transit toward scene.
- `RESPONDER_AT_LOCATION`: Responder confirms on-scene arrival.
- `RESOLVED`: Incident completed and verified.
- `REOPENED`: Administrator reopens resolved case.
- `CANCELLED`: Closed by administrator (false alarm / duplicate / test).

### State Transition Validation
All status updates must conform strictly to the state transition graph in `ARCHITECTURE.md` §6.1. Invalid transitions return `409 INVALID_STATUS_TRANSITION`.

---

## 10. Emergency SOS Lifecycle

The Emergency SOS flow follows a rigid sequence:
1. **Intake:** Student opens SOS, enters free text description.
2. **Optional Context:** Attaches up to 2 photos; selects predefined location; drops pin on 2D map.
3. **Preview & Classification:** Backend runs `AiClassifier` (timeout 4s; fallback to `RuleClassifier`).
4. **Confirmation Screen:** Student reviews description, pin, photo thumbnails, and the target teams to be notified.
5. **Explicit Confirmation:** Student taps "Confirm Emergency".
6. **Creation Transaction:**
   - Atomic insert into `incidents` (`workflow = EMERGENCY_SOS`).
   - Insertion into `incident_locations`.
   - Attachment linking (up to 2).
   - Audit event `SOS_CONFIRMED`.
   - Outbox insert `incident.created`.
   - Response returns `201 Created` immediately with `live_channel` subscription key.
7. **Background Worker Execution:**
   - Outbox event enqueued to `sos-critical` queue.
   - Evaluates deterministic routing engine.
   - Broadcasts team notifications.
   - Initiates parallel responder dispatch offers.
   - Updates student live tracker via WebSocket.

---

## 11. AI Classification Pipeline

- **Interface:** `AiClassifier.classify(input: AiInput): Promise<AiClassification>`
- **Implementations:**
  - `LlmClassifier`: Calls external LLM API enforcing strict JSON Schema output. Validated with Zod.
  - `RuleClassifier`: Deterministic regex/keyword classifier matching multilingual patterns (English, Hindi, Hinglish).
- **Timeout:** 4 seconds for `EMERGENCY_SOS`; 10 seconds for `STANDARD_REPORT`. On timeout, error, or invalid JSON, automatically falls back to `RuleClassifier`.
- **Confidence Threshold:** If AI confidence is `< 0.55`, category defaults to `OTHER` with flag `LOW_CONFIDENCE`.
- **Strict Boundaries:**
  - **No Face / Identity Recognition:** Photographs are never analyzed for identity.
  - **No Free-form Medical Diagnosis:** Medical advice is restricted to static first-aid card IDs from a verified lookup.
  - **No Sole Authority:** AI output is purely input into the deterministic routing engine.

---

## 12. Deterministic Routing Engine

The routing engine is a pure, deterministic function:
`route(classification: Classification, studentCategory: string | null, context: IncidentContext, config: RoutingConfig): RoutingDecision`

### Rules Matrix Logic
1. **Union of Rules:** Candidate categories include the AI category, secondary categories, and the student-selected category (if standard report). Rules matching *any* candidate category fire.
2. **Always-Rule (`R-ADM-000`):** `CAMPUS_ADMIN` is included on **every** incident.
3. **Multi-Team Assignment:** Multiple teams can be assigned simultaneously (e.g., Major Fire -> `FIRE_SAFETY` [ACT], `SECURITY` [ACT], `CAMPUS_ADMIN` [KNOW]). If a team is listed as both `ACT` and `KNOW`, `ACT` takes precedence.
4. **Conditional Inclusions:**
   - Security added to Medical when `violence_flag`, `crowd_risk`, or `safety_risk` is present.
   - Infrastructure added to Blocked Route when physical obstruction/tree/damage is detected.
   - Chief Proctor added to Cyber when `disciplinary_flag` or `digital_harassment` is detected.
5. **Restricted Tagging:** If any fired rule flags restricted, `is_restricted` is set to `true`, suppressing campus-wide broadcast eligibility and locking visibility.
6. **Disabled Team Handling:** If a team is disabled (e.g., Student Council), it is omitted and an audit note is recorded.
7. **Determinism Guarantee:** Given identical inputs and rule configuration version, output is identical 100% of the time.

---

## 13. Notification Engine & Audience Partitioning

### Audience Classification
- **`ACT`:** Teams and responders tasked with operational intervention. Receives full case details.
- **`KNOW`:** Teams requiring awareness (e.g., Campus Administration, Chief Proctor on disciplinary matters). Receives case summary.
- **`REPORTER`:** The reporting student. Receives live status milestone updates.
- **`CAMPUS_WIDE`:** All authenticated campus users with notifications enabled. Receives **sanitized** safety alerts.
- **`AREA`:** Users in specific campus blocks/zones. Receives sanitized area avoidance notices.

### Campus-Wide Eligibility & Approval Gate
- **Eligible Categories:** Major fire, major fire hazard, major route blockage, major security threat, environmental hazard, area avoidance event.
- **Hard-Coded Deny List:** Harassment (women/men), student misconduct, teacher misconduct, personal grievances, individual medical cases, student-teacher disputes, disciplinary matters. These categories **cannot** generate campus-wide notices under any configuration.
- **Sanitization:** Campus-wide notices contain only fixed template text (hazard description, location, avoidance advice). Reporter identity, student names, and photos are strictly excluded.
- **Approval Flow:** System creates notice in `PENDING_APPROVAL`. Campus Administration must explicitly approve before broadcast (unless pre-configured in `auto_publish_categories`).

---

## 14. Responder Dispatch & Availability System

### Responder Duty States
1. **`AVAILABLE`:** On duty, eligible for dispatch.
2. **`BUSY`:** Handling an active assigned incident.
3. **`OFFLINE`:** Off duty.

### Dispatch Algorithm
1. Retrieve eligible members of the `ACT` team who are in `AVAILABLE` state and possess required skills.
2. Sort candidates by:
   - Skill match score.
   - Lowest current active assignments.
   - Least recent assignment timestamp (`last_assigned_at`).
3. **SOS Parallel Offering:** For SOS incidents, offer simultaneously to top 2 eligible candidates (`sos_parallel_offer = true`).
4. **Offer Expiration:** Start timer (`offer_timeout_sos_seconds`, default 45s; standard default 600s).
5. **State Transition on Accept:** First responder to accept transitions to `BUSY`. Pending offers to others are cancelled.
6. **Reject / Timeout Handling:** If rejected or timed out, audit event logged, and dispatch attempts next candidate.
7. **Escalation Trigger:** If candidate pool is exhausted without acceptance, dispatch escalates to Team Coordinator and Campus Administration.
8. **Completion:** Upon marking incident resolved/completed, responder transitions back to `AVAILABLE`.
9. **No Inactivity Auto-Offline:** Inactivity never transitions a responder to `OFFLINE`. Offline transitions require explicit user action, administrative override, or duty schedule cron.

---

## 15. Escalation & Reassignment Logic

- **Auto-Escalation on Unavailability:** When no responders accept within the timeout window or all eligible responders are offline/busy, the worker raises an `ESCALATED` event, alerting the team coordinator and triggering an alert on the Admin Dispatch console.
- **Manual Reassignment:** Campus Administration can reassign an incident to a different team or responder at any time. Reassignment logs `REASSIGNED` and `TEAM_ASSIGNMENT_CHANGED` audit records.
- **Mutual Aid Backup:** Configurable failover allowing Security to receive dispatch alerts if Fire or Transport teams have zero available responders during an SOS.

---

## 16. Audit Logging & Tamper-Evident Hash Chain

- **Table:** `audit_events`.
- **Enforcement:** Append-only. Database permissions revoke `UPDATE`, `DELETE`, and `TRUNCATE`.
- **Logged Events:** `INCIDENT_CREATED`, `SOS_CONFIRMED`, `AI_CLASSIFICATION`, `ROUTING_DECISION`, `NOTIFICATION_SENT`, `RESPONDER_ASSIGNED`, `RESPONDER_ACCEPTED`, `RESPONDER_REJECTED`, `REASSIGNED`, `STATUS_CHANGED`, `RESOLVED`, `ADMIN_ACTION`, `TEAM_ASSIGNMENT_CHANGED`, `ACCESS_EVENT`, `ACCESS_RESTRICTED_CASE`, `PHOTO_VIEWED`, `AI_FALLBACK_USED`, `ESCALATED`, `DUTY_STATE_CHANGED`.
- **Tamper-Evident Hash Chain:**
  Each audit row calculates:
  `hash = SHA-256(prev_hash + id + occurred_at + event_type + actor_user_id + details_json)`
  The `GET /admin/audit/verify` endpoint recalculates the chain from genesis to verify log integrity.

---

## 17. Photo & Evidence Storage Architecture

- **Maximum Photos:** Exactly **2 photos** per incident.
- **Upload Flow:**
  1. Client calls `POST /attachments/uploads` with MIME type and size.
  2. Backend validates current attachment count < 2; generates presigned S3 PUT URL (60-second expiry) with strict size limit (<= 10MB) and content type restrictions (`image/jpeg`, `image/png`, `image/webp`).
  3. Client uploads directly to private storage bucket.
  4. Client calls `POST /attachments/{id}/complete`. Backend downloads image stream, validates magic bytes, decodes image, strips EXIF metadata (clearing GPS coordinates and camera serial numbers), re-encodes, and marks `scan_status = CLEAN`.
- **Access Control:** No public URLs. Download URLs are presigned S3 GET links with 60-second expiration. Every URL generation logs a `PHOTO_VIEWED` audit entry.

---

## 18. Campus Map Coordinate System

- **Static 2D Map Image:** The campus map is an uploaded static raster image (PNG/JPEG/WebP) stored in object storage.
- **Normalized Coordinates:** Coordinates are floating-point numbers relative to image dimensions:
  $$pin\_x = \frac{x_{pixel}}{width_{image}} \in [0.0, 1.0], \quad pin\_y = \frac{y_{pixel}}{height_{image}} \in [0.0, 1.0]$$
- **Database Storage:** Stored as `numeric(7,6)` with strict constraints `CHECK (pin_x >= 0 AND pin_x <= 1)` and `CHECK (pin_y >= 0 AND pin_y <= 1)`.
- **Resolution Independence:** Because coordinates are normalized ratios, pins render at identical relative locations across mobile screens, desktop monitors, and varied image display scaling.

---

## 19. Analytics & Operational Reporting

- **Source of Truth:** All metrics are dynamically computed from real database records (`incidents`, `assignments`, `audit_events`). **No synthetic, hardcoded, or random statistics.**
- **Response Metrics (T1 - T4):**
  - **T1:** Incident creation to first team notified (`first_team_notified_at - created_at`).
  - **T2:** Incident creation to first responder acceptance (`first_accepted_at - created_at`).
  - **T3 (Headline Average Response Time):** Incident creation to responder arrival at location (`responder_arrived_at - created_at`).
  - **T4:** Incident creation to resolution (`resolved_at - created_at`).
- **Admin Overview Cards:**
  1. Total Incidents (Count of all non-test records).
  2. Active Emergencies (Active SOS count).
  3. Resolved Incidents (Resolved count).
  4. Average Response Time (Average T3 duration in minutes/seconds).
  5. Incidents by Category (Aggregated breakdown by taxonomy code).
- **Synthetic Probe Exclusion:** Any drill/synthetic test incidents (`is_drill = true`) are strictly filtered out from all analytics queries.

---

## 20. Security & Privacy Hardening

- **Principle of Least Privilege:** Users receive minimum required permissions; team members only access incidents routed to their respective teams.
- **Row-Level Security (RLS):** Enabled on `incidents`, `attachments`, and `audit_events` in PostgreSQL as defense-in-depth behind application policy checks.
- **Sensitive Case Masking:** Reporter contact details on restricted cases (e.g., Harassment) are masked on the Admin console until explicitly unmasked via "Reveal Reporter" (audited: `ACCESS_RESTRICTED_CASE`).
- **Data Minimization:** AI prompts strip reporter identity and substitute personal names with `[PERSON]` tokens.
- **Header Security:** Strict CORS, Content-Security-Policy (CSP), HSTS, and X-Content-Type-Options.

---

## 21. Environment Configuration & Variables

```env
# Application
NODE_ENV=development
APP_ENV=development
PORT=3000
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:5173

# Database
DATABASE_URL=postgresql://campus_sos_app:secret@localhost:5432/campus_sos?schema=public

# Redis & Queues
REDIS_URL=redis://localhost:6379

# JWT & Authentication
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_REFRESH_EXPIRY=7d
COOKIE_SECRET=your-cookie-signing-secret

# Object Storage (S3 / MinIO)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET_NAME=campus-sos-attachments
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_FORCE_PATH_STYLE=true

# AI Provider
AI_PROVIDER=llm # llm | rule | null
AI_API_KEY=your-llm-api-key
AI_API_ENDPOINT=https://api.openai.com/v1/chat/completions
AI_MODEL_NAME=gpt-4o-mini
AI_TIMEOUT_SOS_MS=4000
AI_TIMEOUT_STANDARD_MS=10000

# Push Notifications (Web Push / VAPID)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@campussos.edu

# SMS / Voice Gateway (Provider-agnostic interface)
SMS_GATEWAY_PROVIDER=mock # mock | twilio | msg91
SMS_API_KEY=
VOICE_GATEWAY_PROVIDER=mock # mock | twilio | exotel
VOICE_API_KEY=
```

---

## 22. External Services & Dependencies

1. **AI Classifier:** OpenAI / Anthropic / Google Gemini API (pluggable via `AiClassifier` interface).
2. **Object Storage:** AWS S3, Cloudflare R2, or local MinIO.
3. **Push Delivery:** Web Push (VAPID protocol) and Firebase Cloud Messaging (FCM).
4. **SMS & Voice Gateway:** Mock adapter in development; Twilio, Exotel, or MSG91 in production.
5. **Realtime Engine:** Socket.IO with Redis adapter for multi-node horizontal scaling.

---

## 23. Testing Strategy

| Level | Tooling | Focus Areas |
|---|---|---|
| **Unit Tests** | Vitest | Routing rules matrix evaluation, dispatch candidate ranking, AI Zod validation, coordinate normalization math, hash chain hashing. |
| **Integration Tests** | Supertest + Testcontainers | Authentication endpoints, MFA flow, draft-to-confirm lifecycle, attachment upload completion, outbox worker processing. |
| **Contract Tests** | OpenAPI CLI / Schemathesis | Verifying backend API implementation matches `contracts/openapi.yaml`. |
| **Resilience Tests** | Vitest Chaos harnesses | AI timeout simulation -> fallback verification; SMS/Push failure -> retry queue; responder timeout -> auto-escalation. |
| **Security Tests** | Custom test suites | Verifying non-routed team receives 404 on restricted case; verifying third photo rejection; verifying inactivity does not change duty state. |

---

## 24. Backend Implementation Sequence (Recommended for Claude)

Claude should build the backend modules in this precise, step-by-step order:

1. **Phase 1: Project Skeleton & Contracts (`contracts/`)**
   - Initialize NestJS project structure, setup Zod schemas, write `openapi.yaml`.
2. **Phase 2: Database Schema & Migrations (`database/`)**
   - Implement PostgreSQL schema, enums, triggers (2-photo limit, hash chain, inactivity check), and RLS rules.
3. **Phase 3: Auth & User Management (`modules/auth`, `modules/users`)**
   - Argon2id hashing, JWT access/refresh token rotation, MFA, user directory scoping (no student phones).
4. **Phase 4: Teams & Responder Profiles (`modules/teams`, `modules/dispatch`)**
   - Team setups, member links, duty states (`AVAILABLE`, `BUSY`, `OFFLINE`), inactivity constraint verification.
5. **Phase 5: Map & Attachment Infrastructure (`modules/locations`, `modules/attachments`)**
   - Predefined locations, normalized pin checks `[0,1]`, presigned S3 upload, EXIF sanitization.
6. **Phase 6: Incident Lifecycle & Draft Engine (`modules/incidents`)**
   - SOS draft creation, idempotency key checks, explicit confirmation transaction, status state machine.
7. **Phase 7: AI Classification & Rule Fallback (`modules/ai`)**
   - `AiClassifier` interface, LLM client with Zod JSON validation, `RuleClassifier` multilingual regex engine.
8. **Phase 8: Deterministic Routing Engine (`modules/routing`)**
   - Matrix rules `R-FIRE-001` through `R-DISC-001`, union logic, Admin always-inclusion, sensitive case tagging.
9. **Phase 9: Responder Dispatch & Escalation Worker (`modules/dispatch`, `worker.ts`)**
   - BullMQ queues, parallel SOS offers, countdown timers, rejection/timeout retry, coordinator escalation.
10. **Phase 10: Notification Engine & Campus Notices (`modules/notifications`)**
    - Audience resolver (`ACT`, `KNOW`, `REPORTER`, `CAMPUS_WIDE`), privacy filtering, deny-list validation, admin approval gate.
11. **Phase 11: Realtime Gateways (`modules/realtime`)**
    - Socket.IO gateway, channel subscription authorization, live SOS milestone broadcasting.
12. **Phase 12: Admin Operations & Analytics (`modules/analytics`, `modules/audit`)**
    - 20-field View Incident serializer, T1-T4 metrics calculations, append-only hash chain audit logger.

---

## 25. Frontend/Backend Integration Contract

- **Contract Single Source of Truth:** `contracts/openapi.yaml` and `contracts/events/*.json`.
- **Channel Naming:**
  - `incident:{id}`: Status transitions and responder progress.
  - `team:{id}`: New routed case notifications and dispatch offers.
  - `admin:dispatch`: Escalation alerts and live incident board updates.
  - `user:{id}`: Personal notifications and published campus notices.
- **Field Serialization Rules:**
  - Student views receive sanitized team names without individual responder identities on restricted cases.
  - Admin view receives complete unfiltered case details.
  - Explore feed receives sanitized location and status; sensitive cases completely excluded.

---

## 26. Known Ambiguities & Established Safe Rules

| ID | Issue | Established Safe Implementation Rule |
|---|---|---|
| **A-01** | Fast SOS vs. Confirmation Screen | Draft holds initial input; confirmation screen requires 1 explicit tap to issue dispatch. Fast-path allows submitting with description only. |
| **A-02** | Admin vs. Sensitive Cases | Admin has complete visibility for campus safety accountability, but every access to a restricted incident is recorded as `ACCESS_RESTRICTED_CASE`. |
| **A-03** | Student Category vs. AI Category | Both categories are recorded; the routing engine evaluates the union of all matching rules; category mismatch flags admin review. |
| **A-04** | Campus-Wide Notification Authorization | Routing engine flags eligibility; system generates a sanitized draft; Campus Administration must approve before dispatch. |
| **A-05** | Student Council Integration | Evaluated only if team is marked enabled in configuration; skipped with audit note if disabled. |
| **A-06** | "Security when appropriate" | Encoded as deterministic Boolean conditions (`immediate_danger`, `violence_flag`, `safety_risk`, `crowd_risk`). |
| **A-07** | Average Response Time Definition | Defined as T3 (Time from creation to responder arrival on scene). |
| **A-08** | Priority / Workflow Field | Strictly `EMERGENCY_SOS` or `STANDARD_REPORT`. No arbitrary urgency dropdowns. |
| **A-10** | Dispatch Timeout Duration | Defaults: SOS 45 seconds; Standard 10 minutes. Configurable in settings. |
| **A-11** | Responder Inactivity Offline | Inactivity auto-offline is prohibited by database check constraint and architecture rule. |

---

## 27. Specification Conflicts Found & Resolved

1. **Map Pin in Fast-Path vs. Database Constraint:**
   - *Conflict:* Master spec says student places exact pin on map, but PRD §5.3 states description alone is sufficient for panic SOS so student is not delayed.
   - *Resolution:* In `incident_locations`, `pin_x` and `pin_y` are nullable for SOS fast-path submissions, but strictly required (`NOT NULL`) for standard reports.
2. **Category Selection in SOS:**
   - *Conflict:* UI mockups showed quick-action chips on SOS screen.
   - *Resolution:* Quick-action chips (Fire, Injury, Fight, etc.) merely pre-fill the text description for speed; they do **not** set a category or priority selector.
3. **User Directory Scope:**
   - *Conflict:* Legacy code contained student phone lists.
   - *Resolution:* User Directory strictly queries `user_type = 'personnel'`. Student phone numbers are excluded from directory endpoints by SQL projection.

---

## 28. Decisions to Be Confirmed Before Deployment

*(These do not block backend foundation building; safe defaults are implemented)*
1. College SSO integration protocol (OIDC vs SAML).
2. Production SMS / Voice gateway provider selection (Twilio vs Exotel vs MSG91 in India).
3. Cloud hosting region (data residency compliance under Indian DPDP Act 2023).
4. Production LLM model and token quota.
5. Organization retention periods for photos and incident logs.

---

## 29. Requirements Traceability

All 189 sub-requirements across groups `REQ-G-001` through `REQ-G-023` in `docs/REQUIREMENTS_TRACEABILITY.md` have been mapped to their respective backend modules and database schemas. Current status across all requirements remains **`ANALYZED / NOT IMPLEMENTED`**.

---

## 30. Definition of Done for Backend

The backend build will be considered complete when:
1. All 12 module domains are implemented in NestJS with clean boundaries.
2. PostgreSQL migrations execute cleanly with all constraints, enums, triggers, and RLS policies.
3. OpenAPI specification (`contracts/openapi.yaml`) matches all controllers and passes validation.
4. AI classification pipeline with fallback to `RuleClassifier` passes test cases `TC-A-001` through `TC-A-008`.
5. Deterministic routing engine passes test matrix `TC-R-001` through `TC-R-025`.
6. Dispatch worker handles parallel offers, timeouts, rejections, and escalations (`TC-D-001` to `TC-D-007`).
7. Notification audience engine enforces sensitive case deny-list and admin approval gates (`TC-N-001` to `TC-N-007`).
8. Photo attachment pipeline strictly rejects third photo and restricts access via signed URLs.
9. Append-only audit logger correctly computes tamper-evident hash chain.
10. All automated unit, integration, and contract test suites pass with zero failures.
11. No fake data, fake statistics, or mock user accounts are seeded in production migrations.
