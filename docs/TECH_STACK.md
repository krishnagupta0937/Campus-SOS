# Campus SOS — Technology Stack

> The master specification does **not** mandate technologies (see PRD ambiguity A-16). This document recommends a stack optimized for: a small team, a mobile-first PWA, reliable real-time dispatch, strict separation of frontend and backend, and easy handover to a second developer. Every choice has a listed alternative so the build tool (Antigravity) or the team can substitute without changing contracts.

## 1. Decision Summary

| Layer | Recommendation | Why |
|---|---|---|
| Frontend app | React 18 + TypeScript + Vite, installable **PWA** | Mobile-first, fast, offline queue for SOS, one codebase for all role interfaces |
| Frontend routing | TanStack Router (or React Router 6) with role-scoped route trees | Purpose-built interface per role |
| Frontend data | TanStack Query + generated typed API client | Cache, retries, offline mutation queue |
| Styling | Tailwind CSS + CSS variables as design tokens + Radix UI primitives | Consistent, accessible components built from scratch (no template reuse) |
| Map UI | Custom image-based map viewer (pan/zoom/pin) on `<canvas>`/SVG overlay | Static 2D image; normalized coordinates; no GPS tiles needed |
| Backend app | Node.js 20 + TypeScript + **NestJS** (modular) on Fastify | Strong module boundaries (auth, incidents, ai, routing, dispatch, notifications, audit) |
| API style | REST (OpenAPI 3.1) + WebSocket events (Socket.IO) + SSE fallback | Documented contracts; realtime for live SOS status and dispatch |
| Database | **PostgreSQL 16** | Relational integrity, row-level security, JSONB for AI payloads |
| ORM/migrations | Prisma (or Drizzle) + SQL migrations | Typed schema, reviewable migrations |
| Cache / queues | Redis 7 + **BullMQ** | Notification fan-out, dispatch timers, retries, rate limits |
| Object storage | S3-compatible private bucket (AWS S3 / Cloudflare R2 / MinIO on-prem) | Secure photo storage, signed URLs |
| Auth | Email/password + optional college SSO (OIDC/SAML), short-lived JWT access + rotating refresh in httpOnly cookies, MFA for staff/admin | Secure authentication, role/team claims |
| AI | Provider-agnostic `AiClassifier` interface; default implementation calls an LLM API with strict JSON-schema output; rule-based fallback always present | AI structures; rules decide |
| Push | Web Push (VAPID) + FCM for installed PWA/Android; in-app realtime | Free, no vendor lock for core path |
| SMS / voice | Provider-agnostic `SmsGateway` / `VoiceGateway` (e.g., MSG91, Twilio, Exotel) | Redundant responder alerting |
| Email | SMTP / SES via `EmailGateway` | Non-urgent notices, digests |
| Validation | Zod (shared schema package) | Same schemas for frontend forms and API validation |
| Testing | Vitest, Testing Library, Supertest, Playwright, k6 | See §11 |
| CI/CD | GitHub Actions | Lint, test, build, contract check, container build |
| Deployment | Docker containers; Docker Compose (campus server) or managed container platform; Nginx/Caddy reverse proxy with TLS | Fits college infra |
| Observability | OpenTelemetry, Pino JSON logs, Prometheus + Grafana, Sentry, uptime checks | Detect failed channels quickly |

## 2. Frontend

### 2.1 Application
- **Single frontend application** (`frontend/`) containing role-scoped feature modules (`student`, `admin`, `proctor`, `security`, `medical`, `fire`, `women-safety`, `men-safety`, `council`, `facilities`, `transport`, `digital`). The shell loads only the route tree and navigation for the signed-in role. The repository may later split per-role apps without contract changes.
- **PWA**: web manifest, service worker (Workbox), install prompt, offline shell, background sync for queued SOS confirmations, Web Push.
- **State**: server state in TanStack Query; local UI state in React; draft SOS persisted in IndexedDB.
- **Forms**: React Hook Form + shared Zod schemas.
- **i18n**: i18next (English first; Hindi-ready).
- **Accessibility**: Radix primitives, axe-core in CI, manual screen-reader pass for SOS and map pinning.

### 2.2 Design system implementation
- Design tokens (color, type, spacing, radius, elevation, motion) as CSS variables defined in `UI_UX_SPECIFICATION.md` §3.
- Component library in `frontend/src/design-system/` built from scratch; **no** components imported from the previous project.
- Storybook for component states and visual review.

### 2.3 Map viewer
- Custom component `CampusMap` renders the uploaded image with pan/pinch-zoom, an SVG pin layer using normalized coordinates, and a keyboard/numeric fallback (x/y nudge controls) for accessibility.
- Alternative: Leaflet with `L.CRS.Simple` if advanced zoom/clustering is wanted.

## 3. Backend

### 3.1 Application
- `backend/` is an independent NestJS application. Modules mirror the domain: `auth`, `users`, `teams`, `incidents`, `attachments`, `locations`, `ai`, `routing`, `dispatch`, `notifications`, `realtime`, `analytics`, `audit`, `settings`, `explore`, `health`.
- Every module owns its controllers, services, DTOs, and repository; cross-module calls go through exported service interfaces only.
- Background workers run in the same codebase but as a separate process (`backend/src/worker.ts`) so API latency is unaffected by notification fan-out.

### 3.2 Authorization
- RBAC (role) + team membership + incident-level access, evaluated in a single `AccessPolicy` service (see `ARCHITECTURE.md` §7).
- PostgreSQL row-level security as defense-in-depth for `incidents`, `attachments`, and `audit_events`.

### 3.3 Reliability patterns
- Transactional outbox for domain events → BullMQ jobs.
- Idempotency keys on `POST /sos/confirm` and `POST /incidents`.
- Circuit breakers and per-channel timeouts for AI, SMS, voice, push, email.
- Dead-letter queue with an admin-visible failure view.

## 4. Database
- PostgreSQL 16; UUID v7 primary keys; `timestamptz` everywhere; snake_case.
- Human-readable incident IDs (`SOS-2027-000123`, `INC-2027-000456`) generated from sequences.
- JSONB for AI request/response snapshots and routing decision snapshots.
- Append-only `audit_events` enforced by revoking UPDATE/DELETE and via trigger.
- Backups: daily full + WAL archiving (PITR). See `DATABASE_SCHEMA.md`.

## 5. Authentication
- Password hashing: Argon2id.
- Sessions: 15-min access JWT, 7-day rotating refresh token (httpOnly, Secure, SameSite=Lax), device-bound; revoke on password change/role change.
- MFA (TOTP/WebAuthn) mandatory for Campus Administration and all team roles; optional for students.
- Student onboarding: college email verification or SSO; accounts are created only in the final phase (PRD §21).
- Rate limiting and lockout on login; password-reset via signed one-time tokens.

## 6. AI Layer
- Interface `AiClassifier.classify(input): Promise<AiClassification>`; implementations: `LlmClassifier` (default), `RuleClassifier` (fallback), `NullClassifier` (testing).
- LLM call uses a strict JSON schema; output is validated with Zod; invalid output → fallback.
- 4-second timeout for SOS, 10 seconds for standard reports; never blocks incident creation.
- Prompt + model version stored per classification for audit and evaluation.
- No image-based person identification; images are **not** sent to AI for identity. (Optional later: non-identifying image captioning behind a feature flag, disabled for unknown-person photos.)
- Evaluation harness with the test cases in `AI_ROUTING_SPECIFICATION.md` §13 runs in CI against a mocked and (nightly) real provider.

## 7. Realtime
- Socket.IO over WebSocket with SSE/long-poll fallback.
- Channels: `user:{id}`, `incident:{id}`, `team:{id}`, `admin:dispatch`.
- Server-side authorization on every subscription (same `AccessPolicy`).
- Redis adapter for horizontal scale; event schemas documented in `API_SPECIFICATION.md` §12.

## 8. Notifications
- Channels: in-app (realtime + inbox), Web Push/FCM, SMS, voice call (SOS responders only), email.
- Redundancy policy per audience (see `ARCHITECTURE.md` §10): responders get push + SMS (+ voice for SOS after timeout); administrators get push + in-app (+ SMS for SOS).
- Delivery receipts and failure reasons stored in `notification_deliveries`.

## 9. Storage
- Private bucket; keys `incidents/{incident_id}/{attachment_id}.{ext}`; server-side encryption; no public ACLs.
- Upload: backend issues presigned PUT with content-length and content-type constraints, then validates after upload (magic bytes, size, image decode, re-encode to strip EXIF).
- Download: backend authorizes then returns a short-lived (60 s) signed URL; each access is audited.

## 10. Maps
- Admin uploads one static 2D map image (PNG/JPEG/WebP/SVG-rasterized); stored in the same bucket (`maps/`), served via signed/CDN URL (the map itself is not sensitive).
- Pin coordinates stored as `numeric(7,6)` normalized x/y.

## 11. Testing Strategy
| Level | Tools | Focus |
|---|---|---|
| Unit | Vitest | Routing engine rules, dispatch selection, policy checks, schema validation |
| Component | Testing Library, Storybook | Design-system and role screens (all states) |
| API/integration | Supertest + Testcontainers (Postgres, Redis, MinIO) | Auth, access control, incident lifecycle, uploads |
| Contract | OpenAPI diff + Schemathesis / Dredd | Frontend–backend contract compliance |
| E2E | Playwright (mobile + desktop viewports) | SOS flow, report flow, dispatch fallbacks, My Reports, admin View |
| AI evaluation | Dataset runner | Classification accuracy; fallback behaviour |
| Resilience | Chaos toggles (kill AI/SMS/push), k6 load | SOS persists and notifies when one service fails |
| Accessibility | axe-core, Lighthouse CI | WCAG 2.2 AA |
| Security | ZAP baseline, `npm audit`, Semgrep, authorization matrix tests | Access-control regression |

## 12. Deployment
- Containers: `frontend` (static assets via Nginx/CDN), `backend-api`, `backend-worker`, `postgres`, `redis`, `minio` (or cloud S3).
- Environments: `dev` (role switcher + mocks), `staging` (real services, no real accounts), `production`.
- Config via environment variables + secrets manager; no secrets in repo.
- Zero-downtime deploys (rolling); DB migrations backward-compatible.

## 13. Observability
- Structured logs with `incident_id`, `request_id`; PII-minimized.
- Metrics: SOS creation latency, AI latency/failure rate, notification delivery success per channel, dispatch time-to-accept, queue depth.
- Alerts: SOS pipeline failure, notification channel failure rate, queue backlog, DB replication lag.
- Synthetic SOS probe (flagged `is_drill=true`, excluded from analytics) every 5 minutes.

## 14. Alternatives Considered
| Choice | Alternative | When to prefer the alternative |
|---|---|---|
| NestJS | Fastify + modular folders, FastAPI (Python), Django | Team prefers Python |
| Postgres | MySQL | Existing college infra |
| Socket.IO | Native WebSocket + SSE | Fewer dependencies |
| Prisma | Drizzle, TypeORM | Preference |
| React | Vue / SvelteKit | Team skill |
| Web Push + SMS | OneSignal / Firebase only | Faster start, vendor dependency |

## 15. Open Decisions (to confirm before the build)
1. College SSO availability (OIDC/SAML) vs. email-password only.
2. SMS/voice provider and DLT/sender-ID registration (India).
3. Hosting: campus server vs. cloud region in India.
4. LLM provider/model and data-residency policy.
5. Retention periods.
