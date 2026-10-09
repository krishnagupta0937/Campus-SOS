# Campus SOS — API Specification

Base URL: `/api/v1`. JSON over HTTPS. The machine-readable contract lives in `contracts/openapi.yaml` (OpenAPI 3.1) and `contracts/events/*.json`; this document is the human-readable specification and must stay in sync (CI contract check).

## 1. Conventions
- Content type `application/json; charset=utf-8`. Timestamps ISO-8601 UTC. IDs are UUIDs; incidents also have `public_id` (e.g., `SOS-2027-000123`).
- `Idempotency-Key` header **required** on `POST /sos/drafts/{id}/confirm` and `POST /incidents`.
- `X-Request-Id` returned on every response.
- Field naming: `snake_case`.
- Pins: `pin: { x: number, y: number }` normalized `0..1`.

## 2. Authentication
| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | `{email, password}` → `{access_token, expires_in, mfa_required?}`; sets refresh cookie |
| POST | `/auth/mfa/verify` | `{code}` |
| POST | `/auth/refresh` | Rotates refresh cookie |
| POST | `/auth/logout` | Revokes session |
| POST | `/auth/password/forgot`, `/auth/password/reset` | Signed one-time tokens |
| GET | `/auth/sso/{provider}/start`, `/callback` | Optional college SSO |
| GET | `/me` | Profile, role, teams, `notifications_enabled`, capabilities |
| PATCH | `/me/settings` | `{notifications_enabled}` |
| POST | `/me/push-subscriptions` | Register Web Push/FCM |
Dev only (`APP_ENV=development`): `POST /dev/role-switch` — **not present** in production builds (CI check).

## 3. Authorization
Bearer access token. Every endpoint lists allowed roles. Beyond role checks, `AccessPolicy` enforces team membership and incident-level access. Responses never include fields the caller is not entitled to (field-level filtering). Unauthorized → `403`; unknown or inaccessible resource id → `404` (to avoid leaking existence of restricted cases).

## 4. Error Model
```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Human readable", "details": [{"field":"photos","issue":"MAX_2"}], "request_id": "…" } }
```
| HTTP | code | Meaning |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Body/query invalid |
| 401 | `UNAUTHENTICATED` / `TOKEN_EXPIRED` | |
| 403 | `FORBIDDEN` | Role/team policy denied |
| 404 | `NOT_FOUND` | Also for inaccessible incidents |
| 409 | `CONFLICT` / `INVALID_STATUS_TRANSITION` / `IDEMPOTENCY_REPLAY` | |
| 413 | `FILE_TOO_LARGE` | |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | |
| 422 | `PHOTO_LIMIT_EXCEEDED` / `PIN_OUT_OF_RANGE` | |
| 429 | `RATE_LIMITED` | `Retry-After` header |
| 503 | `DEPENDENCY_UNAVAILABLE` | Never returned by SOS confirm for AI/SMS/push failures |

## 5. Pagination, Filtering, Sorting
Cursor pagination: `?limit=25&cursor=<opaque>` → `{ "data": [...], "next_cursor": "…|null" }`. Max `limit` 100. Sorting `?sort=-created_at`. Filters are listed per endpoint. **No urgency filter exists anywhere** (PRD §15).

## 6. Emergency SOS (Student)
| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/sos/drafts` | STUDENT | Create/replace draft: `{description, location?: {predefined_location_id?, kind?, text?}, pin?: {x,y}, attachment_ids?: []}` → `201 {draft_id, expires_at}` |
| PATCH | `/sos/drafts/{id}` | STUDENT (owner) | Update draft fields |
| POST | `/sos/drafts/{id}/preview` | STUDENT (owner) | Runs classification (AI or fallback) + routing → `{classification: {category_label, immediate_danger}, teams_to_alert: [{team_code, display_name}], restricted_notice: boolean, first_aid?: …}`. Restricted categories return generic "Relevant authorized team". Never fails because AI is down |
| POST | `/sos/drafts/{id}/confirm` | STUDENT (owner) | **Explicit confirmation**; header `Idempotency-Key` → `201 {incident: {id, public_id, status:"CREATED", workflow:"EMERGENCY_SOS"}, live_channel:"incident:{id}"}` |
| DELETE | `/sos/drafts/{id}` | STUDENT (owner) | Discard draft |
| GET | `/sos/{incident_id}/live` | STUDENT (reporter) | Live status snapshot (see below) |

Live status payload:
```json
{ "incident_id":"…", "public_id":"SOS-2027-000123",
  "steps":[{"key":"EMERGENCY_CREATED","label":"Emergency Created","at":"…","done":true},
           {"key":"TEAMS_NOTIFIED","label":"Teams Notified","at":"…","done":true},
           {"key":"RESPONDER_ASSIGNED","label":"Responder Assigned","at":null,"done":false},
           {"key":"RESPONDER_ON_THE_WAY","label":"Responder On the Way","done":false},
           {"key":"RESPONDER_AT_LOCATION","label":"Responder At Location","done":false},
           {"key":"RESOLVED","label":"Resolved","done":false}],
  "current":"TEAMS_NOTIFIED",
  "responder_public":{"first_name":"…","team":"Medical"}   // omitted for restricted cases
}
```
Server rules: confirm persists the incident, audit `SOS_CONFIRMED`, enqueues outbox events, and returns **without** waiting on AI, SMS, push, or dispatch.

## 7. Standard Reports and My Reports
| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/incidents` | STUDENT | Create `STANDARD_REPORT`: `{description, category, location:{predefined_location_id?, kind, text?}, pin:{x,y}, attachment_ids?:[≤2]}`; `Idempotency-Key` required |
| POST | `/incidents/preview` | STUDENT | Classification + teams preview (same privacy rules as SOS preview) |
| GET | `/me/reports?tab=reports` | STUDENT | Student's normal reports |
| GET | `/me/reports?tab=sos` | STUDENT | Student's Emergency SOS submissions |
| GET | `/me/incidents/{id}` | STUDENT | Reporter view: `{public_id, workflow, status, category_label, assigned_teams[team names only], timeline[], location, pin, photos[], relevant_case_info}` |
| POST | `/me/incidents/{id}/notes` | STUDENT | Add a note/follow-up (audited) |
Student "relevant case information" excludes AI reasoning, routing internals, other teams' notes, and responder personal details for restricted cases.

## 8. Map and Locations
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/map` | Any authenticated | Active map `{id, image_url, width_px, height_px, version}` |
| GET | `/locations` | Any authenticated | Predefined locations `[{id, kind, name, anchor?}]`; filter `?kind=` |
| POST | `/admin/map` | ADMIN | Upload/replace map (multipart); validates image; creates new version |
| POST/PATCH/DELETE | `/admin/locations` … | ADMIN | Manage predefined locations |
Validation: `pin.x`, `pin.y` ∈ `[0,1]`, otherwise `422 PIN_OUT_OF_RANGE`.

## 9. File Uploads (Photos)
Two-step secure upload:
1. `POST /attachments/uploads` `{draft_id? | incident_id?, mime_type, size_bytes}` → `{attachment_id, upload_url, headers, expires_in}`. Rejects if the draft/incident already has 2 photos (`422 PHOTO_LIMIT_EXCEEDED`).
2. Client PUTs the file to `upload_url` (private bucket). Then `POST /attachments/{id}/complete` → backend validates magic bytes, decodes image, re-encodes (strips EXIF/GPS), scans, sets `scan_status`.

| Rule | Value |
|---|---|
| Maximum photos per incident | **2** (DB trigger + API) |
| Allowed types | JPEG, PNG, WebP, HEIC (converted) |
| Max size | 10 MB each |
| Access | `GET /attachments/{id}/url` → `{url, expires_in: 60}`; allowed for Campus Administration, every team/person assigned to the incident, and the reporter; each fetch audited `PHOTO_VIEWED`. Not public by default |
| Delete | Reporter may remove before confirm; after confirm only admin |
Unknown-person incidents: Security members assigned to the incident receive photo URLs plus description, pin, time, category, status. No endpoint performs identification.

## 10. Notifications and Inbox
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/notifications` | Any | Inbox `?unread=true` (cursor) |
| POST | `/notifications/{id}/read` | Any | |
| POST | `/notifications/read-all` | Any | |
| GET | `/notices/active` | Any authenticated | Active **published** campus-wide notices (sanitized) |
| GET | `/admin/notices?status=PENDING_APPROVAL` | ADMIN | Drafts awaiting approval |
| POST | `/admin/notices/{id}/approve` | ADMIN | Publish (optionally edited sanitized body) |
| POST | `/admin/notices/{id}/reject` | ADMIN | |
| POST | `/admin/notices` | ADMIN | Manual campus notice |
| GET | `/admin/notifications/history` | ADMIN | All deliveries with status |
Rule: server rejects any notice linked to a deny-list category with `403 NOTICE_CATEGORY_RESTRICTED`.

## 11. Team Workspace and Responder Endpoints
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/team/incidents` | Team members | Incidents routed to the member's team(s); filters `status`, `workflow`, `category`, `assigned_to_me` |
| GET | `/team/incidents/{id}` | Team members with access | Case file (team view) |
| POST | `/team/incidents/{id}/status` | Assigned/team | `{to_status, note?}` valid transitions only |
| POST | `/team/incidents/{id}/notes` | Team members | Internal case note |
| POST | `/team/incidents/{id}/escalate` | Team members | Escalate to coordinator/admin |
| GET | `/responder/me` | Responder | `{duty_state, current_assignments[]}` |
| PUT | `/responder/me/duty-state` | Responder | `{duty_state: AVAILABLE|BUSY|OFFLINE}` (BUSY set automatically on accept) |
| GET | `/responder/offers` | Responder | Pending offers |
| POST | `/responder/offers/{assignment_id}/accept` | Responder | |
| POST | `/responder/offers/{assignment_id}/reject` | Responder | `{reason?}` |
| POST | `/responder/assignments/{id}/en-route`, `/on-scene`, `/complete` | Responder | `complete` `{resolution_summary}` → responder returns to Available |
| GET | `/team/members` | Coordinator | Team roster with duty states |
| PUT | `/team/members/{id}/duty-state` | Coordinator/ADMIN | Override |
Women/Men Safety endpoints return restricted cases only for members with `can_view_restricted`.

## 12. Realtime Events
Transport: Socket.IO namespace `/rt`. Auth: access token at connect; subscribe via `subscribe {channel}`; server authorizes with `AccessPolicy`. Payload envelope: `{ "event": "...", "seq": 123, "at": "…", "data": {…} }`.

| Channel | Event | Audience | Data |
|---|---|---|---|
| `incident:{id}` | `incident.status_changed` | Reporter (filtered), routed teams, admin | `{status, label, at}` |
| `incident:{id}` | `incident.timeline_added` | Authorized | timeline entry |
| `incident:{id}` | `responder.assigned` / `responder.en_route` / `responder.on_scene` | Reporter (non-restricted limited fields), teams, admin | |
| `team:{id}` | `incident.routed` | Team | summary within authorization |
| `team:{id}` | `assignment.offered` | Specific responder | offer details + deadline |
| `team:{id}` | `assignment.timed_out` / `assignment.rejected` | Team coordinator/admin | |
| `admin:dispatch` | `dispatch.escalated`, `dispatch.unassigned`, `channel.failure` | Admin | |
| `user:{id}` | `notification.created` | Recipient | inbox item |
| `user:{id}` | `notice.published` | All | sanitized notice |
| `responders` | `duty_state.changed` | Admin, coordinators | |
Reconnect: `resume {last_seq}` replays up to 24 h of events the caller may see.

## 13. Admin Endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/admin/overview` | `{total_incidents, active_emergencies, resolved_incidents, average_response_time: {t3_seconds, t2_seconds, t4_seconds}, by_category:[{category, count}]}` — computed from real records only |
| GET | `/admin/incidents` | Table rows `{id, public_id, type, category, workflow_label, location, status, created_at}`; filters `status`, `workflow`, `category`, `from`, `to`, `team`, `q` |
| GET | `/admin/incidents/{id}` | **Full case file** for the **View** button (below) |
| GET | `/admin/dispatch` | Active emergencies/dispatch board |
| GET | `/admin/incidents?status=RESOLVED` | Resolved Incidents page data |
| POST | `/admin/incidents/{id}/assign` | Manual team/responder assignment (audited `TEAM_ASSIGNMENT_CHANGED`/`REASSIGNED`) |
| POST | `/admin/incidents/{id}/status` | Change status (incl. reopen, cancel with reason) |
| POST | `/admin/incidents/{id}/reclassify` | Override category → re-run routing (audited) |
| GET | `/admin/analytics/summary` | Total incidents statistics and history |
| GET | `/admin/analytics/response` | Detailed response analytics (T1–T4, by team/category/time) |
| GET | `/admin/analytics/categories` | Incidents by domain/category |
| GET/POST/PATCH | `/admin/teams`, `/admin/teams/{id}/members` | Team and membership management |
| GET/POST/PATCH | `/admin/responders` | Responders and duty states |
| GET | `/admin/audit` | Global audit trail (filters `incident_id`, `event_type`, `actor`, `from`, `to`) |
| GET/PUT | `/admin/settings/*` | Settings (§16) |

### 13.1 `GET /admin/incidents/{id}` response (View button)
```json
{
 "id":"…","public_id":"SOS-2027-000123","report_type":"Emergency SOS","workflow":"EMERGENCY_SOS",
 "full_description":"<complete student text, unmodified>",
 "category":{"final":"…","student_selected":null},
 "location":{"predefined":{"kind":"LABORATORY","name":"Block C — Lab 3"},"pin":{"x":0.412,"y":0.673},"map":{"id":"…","image_url":"…"}},
 "created_at":"…",
 "reporter":{"id":"…","name":"…","email":"…","phone":"…"},     // authorized reporter information (admin)
 "ai_classification":{"source":"AI|RULE_FALLBACK","category":"…","confidence":0.91,"immediate_danger":true,"structured":{…}},
 "ai_reasoning":"…",
 "routing_decision":{"matched_rules":["R-FIRE-001"],"teams":[…],"flags":[…],"config_version":3},
 "assigned_teams":[…],"assigned_responders":[{"member":"…","team":"…","status":"…"}],
 "photos":[{"id":"…","position":1,"url_endpoint":"/attachments/{id}/url"}],
 "notification_history":[{"at":"…","audience":"ACT","channel":"PUSH","recipient":"…","status":"DELIVERED"}],
 "response_timeline":[…],"status_history":[…],
 "resolution":{"code":"…","summary":"…","resolved_at":"…"},
 "audit_history":[…]
}
```
This payload covers all 20 required View elements (PRD §13.2).
Viewing a restricted incident logs `ACCESS_RESTRICTED_CASE`.

## 14. Explore and Home
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/explore/incidents` | Authenticated | Sanitized pins: `{id (opaque), pin, category_label_public, status, time}`; **no** urgency field; sensitive excluded; `?status=` and `?area=` filters only |
| GET | `/explore/recent` | Authenticated | Recent campus incidents (sanitized) and recent campus activity |
| GET | `/home` | Authenticated | `{on_duty_teams:[{team, available_count}], recent_activity:[…], hotlines:[…], notices:[…]}` — real data or empty arrays; never fabricated |
| GET | `/hotlines` | Authenticated | Configured 24/7 emergency contacts |
Teams/Admin viewing Explore receive the same sanitized layer; full detail is via their own incident pages.

## 15. User Directory
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/directory` | ADMIN (and optionally team coordinators for own team) | Personnel only: `{name, team, designation, role, phone, email?, availability?}`; filters `team`, `role`, `availability`, `q` |
Server guarantee: query is restricted to `user_type IN ('personnel')` or active `team_members`; students are never returned. `email` and `availability` included where appropriate (email only for admin; availability only for responders).

## 16. Settings
`/admin/settings/hotlines`, `/map`, `/teams`, `/routing-rules` (versioned, with dry-run `POST /admin/routing-rules/test`), `/timeouts`, `/notice-policy` (`auto_publish_categories`), `/ai` (enable/disable, timeouts), `/retention`. All changes audited `ADMIN_ACTION`.

## 17. Audit
| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/incidents/{id}/timeline` | Anyone with incident access | Chronological case history, event types filtered to those the caller may see |
| GET | `/admin/audit` | ADMIN | Full audit with export `?format=csv` |
| GET | `/admin/audit/verify` | ADMIN | Hash-chain verification |

## 18. Validation Summary
| Field | Rule |
|---|---|
| description | 1–5000 chars (SOS); 10–5000 (standard) |
| category (standard) | one of configured student categories |
| pin | `x,y ∈ [0,1]`, 6 decimals; required for standard |
| photos | ≤ 2; types/size per §9 |
| duty_state | enum; `INACTIVITY` source rejected |
| status transitions | per state machine in `ARCHITECTURE.md` §6 |

## 19. Rate Limits
Per user: SOS drafts 10/min, SOS confirms 5/10 min (soft; a flagged but never hard-blocked emergency path), standard reports 10/hour, uploads 20/hour, login 5/min/IP. Responses `429` with `Retry-After`; SOS confirm falls back to flag-for-review instead of blocking when a pattern is genuine.

## 20. Versioning
URI versioned (`/api/v1`); additive changes only within a version; breaking changes require `/v2` and a published migration note. Realtime events are versioned in their `event` name suffix (`.v1`) when changed.

## 21. Emergency Access / Break-Glass
| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/access-policy/break-glass/request` | Personnel only | Submit emergency override or critical break-glass request (`type`: `NORMAL_OVERRIDE` or `CRITICAL_BREAK_GLASS`). Scopes: `INCIDENT_VIEW`, `LOCATION_VIEW`, `EVIDENCE_VIEW`, `REPORTER_CONTACT_VIEW`, `REALTIME_ACCESS`, `INCIDENT_UPDATE`, `TEMPORARY_TEAM_ASSIGNMENT`. |
| POST | `/access-policy/break-glass/approve` | Supervisors, Coordinators | Approve emergency request. Restricts approved scopes to requested scopes subset. Duration configurable (default 60 min). |
| POST | `/access-policy/break-glass/reject` | Supervisors, Coordinators | Reject emergency request with justification. |
| POST | `/access-policy/break-glass/revoke` | Supervisors, Requester | Immediately terminate active grant. |
| POST | `/access-policy/break-glass/review` | CAMPUS_ADMIN, CHIEF_PROCTOR | Mandatory post-hoc supervisor review for critical break-glass actions (`REVIEWED` or `FLAGGED`). |
| GET | `/access-policy/break-glass/status` | Authenticated | Query active grant status for current user on `?incident_id=`. Evaluates dynamic expiration. |
| GET | `/access-policy/break-glass/requests` | Supervisors, Personnel | List requests filtered by `?incident_id=` and `?status=`. Supervisors see all; personnel see own. |
| GET | `/access-policy/incidents/{id}/reporter-contact` | Authenticated | Protected reporter contact retrieval requiring `REPORTER_CONTACT_VIEW` scope. Audited as `ACCESS_RESTRICTED_CASE`. |
| POST | `/access-policy/break-glass/cleanup` | CAMPUS_ADMIN | Maintenance sweep to mark expired grants and record `BREAK_GLASS_EXPIRED` audit events. |

