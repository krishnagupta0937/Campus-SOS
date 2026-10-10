# Campus SOS — Incident Workflow & Backend Audit Report
**Date:** 2026-10-10  
**Status:** Audit Complete — Remediation in Progress

---

## 1. Executive Summary: Why Sample Reports Work But Real Submissions Fail

In the current codebase, **sample reports only appeared to work because the frontend was completely decoupled from the backend and operating in a closed in-memory mock loop**. Real student submissions never reached the backend, were never validated by the server, were never written to any database, and silently vanished on page refresh.

### Root Causes by Layer

| Layer | File / Component | Defect Found | Real Impact |
|---|---|---|---|
| **Frontend Form Intake** | [`frontend/components/incident/report-incident-modal.tsx:59-84`](file:///d:/Campus%20SOS/frontend/components/incident/report-incident-modal.tsx#L59-L84) | `handleSubmit` used `setTimeout` + random math IDs (`REP-2026-XXXXX`). Photos were converted to raw Base64 data URLs in component state. | Zero HTTP traffic was sent to `POST /api/v1/incidents`. No authorization header or idempotency key was included. |
| **Frontend State** | [`frontend/app/page.tsx:29-58`](file:///d:/Campus%20SOS/frontend/app/page.tsx#L29-L58) | React state array `const [incidents, setIncidents] = useState([...])` with 2 hardcoded sample records. | Any "submitted" report was only prepended to React memory. Refreshing destroyed it. |
| **Emergency SOS Flow** | [`frontend/components/emergency/emergency-sos-modal.tsx:87-95`](file:///d:/Campus%20SOS/frontend/components/emergency/emergency-sos-modal.tsx#L87-L95) | `handleFinalConfirm` simulated emergency creation via `setTimeout` instead of calling `/api/v1/sos/drafts` & `/api/v1/sos/drafts/:id/confirm`. | Never created a draft, never called AI classification preview, never triggered outbox dispatch. |
| **Backend Port Collision** | [`backend/.env:4`](file:///d:/Campus%20SOS/backend/.env#L4) | `PORT=3000` matches Next.js dev server port `3000`. | Starting both resulted in `EADDRINUSE: address already in use :::3000`. |
| **CORS Mismatch** | [`backend/.env:6`](file:///d:/Campus%20SOS/backend/.env#L6) | `CORS_ORIGIN=http://localhost:5173` (old Vite dev port). | Even if backend ran on 3000, browser cross-origin requests from Next.js (`:3000`) would be rejected by Fastify CORS. |
| **Database Connectivity** | [`backend/src/database/prisma.service.ts:18`](file:///d:/Campus%20SOS/backend/src/database/prisma.service.ts#L18) | Requires PostgreSQL at `localhost:5432`. Neither Docker nor native Postgres is running on host. | Every call to Prisma (`tx.incident.create`, `user.findUnique`, `breakGlassRequest.findMany`) crashed with `PrismaClientInitializationError: Can't reach database server at localhost:5432`. |
| **Redis / Queue Dependencies** | [`backend/src/modules/incidents/incidents.service.ts:16-17`](file:///d:/Campus%20SOS/backend/src/modules/incidents/incidents.service.ts#L16-L17) | BullMQ queues (`sos-critical`, `standard`) expect Redis at `localhost:6379`. | Failed attempts to connect to Redis caused connection timeouts and unhandled queue rejection errors. |
| **Attachment Storage** | [`backend/src/modules/attachments/attachments.service.ts:38-45`](file:///d:/Campus%20SOS/backend/src/modules/attachments/attachments.service.ts#L38-L45) | Relies on S3/MinIO at `localhost:9000`. | No local disk fallback. Requesting upload URLs or uploading binary files threw `ECONNREFUSED`. |

---

## 2. Step-by-Step Trace of a Real Student Submission Failure

1. **Student Action**: A logged-in student (e.g. Priya Sharma) opens "Report an Incident", selects category `INFRASTRUCTURE`, types description `"Broken handrail on exterior stairway..."`, drops a pin at `{ x: 0.32, y: 0.38 }`, attaches 1 photo (`.png`), and clicks **Submit Incident Report**.
2. **Client Execution**:
   - `handlePhotoUpload` reads the image as `data:image/png;base64,...` into a client-only state array.
   - `handleSubmit` intercepts the submit event.
   - No `fetch()` or `axios` call is invoked.
   - A random mock object is created in memory:
     ```json
     {
       "id": "REP-2026-802114",
       "public_id": "REP-2026-8021",
       "workflow": "STANDARD_REPORT",
       "category": "INFRASTRUCTURE",
       "description": "...",
       "location": "Academic Block A",
       "pin": { "x": 0.32, "y": 0.38 },
       "photos": ["data:image/png;base64,..."]
     }
     ```
   - Client calls `onReportSubmitted(newReport)`.
   - Form shows green checkmark `SUBMITTED`.
3. **Network Layer**:
   - HTTP status code: **None (no request sent)**.
   - Server logs: **Completely silent**.
4. **Backend Reality**:
   - If a client script actually sends `POST http://localhost:3000/api/v1/incidents` with payload:
     - Response: **Connection Refused or 404** (because Next.js is occupying port 3000, not NestJS).
     - If directed to NestJS on port 4000:
       - Fails JWT authentication if no `Bearer` token header is provided (`401 Unauthorized`).
       - Fails validation if `Idempotency-Key` header is missing.
       - Fails on database insert: `PrismaClientInitializationError: Can't reach database server at localhost:5432`.
5. **Dashboard Query**:
   - When the student visits "My Reports", it displays whatever was held in React state.
   - When a responder (e.g. Er. Ramesh Patel in Infrastructure) logs in from another tab or browser, their incident queue query returns an empty array or static mock data. The incident does not exist in any shared storage.

---

## 3. Remediation Plan

1. **Phase 2 — Report Submission**:
   - Build a real unified API client (`frontend/lib/api-client.ts`) connecting frontend to backend.
   - Update `ReportIncidentModal` and `EmergencySosModal` to make real authenticated HTTP calls with `Idempotency-Key` and proper payload structures (`predefined_location_id`, `kind`, `text`, `pin: { x, y }`, `attachment_ids`).
   - Implement resilient database persistence in `PrismaService` with file-backed SQLite/JSON dev engine when PostgreSQL TCP is unavailable, ensuring ACID-compliant transactions, foreign keys, and idempotency tracking.
2. **Phase 3 — Photo Attachments**:
   - Implement real file upload pipeline: request upload -> upload file -> complete upload -> attach UUID to incident.
   - Provide local file storage fallback (`backend/uploads/` and `frontend/public/uploads/`) with EXIF validation, MIME check (JPEG, PNG, WebP), max size (10 MB), and strict 2-photo limit.
3. **Phase 4 — Deterministic Routing**:
   - Execute routing engine on report creation: map categories (`INFRASTRUCTURE`, `FIRE_HAZARD`, `WOMEN_HARASSMENT`, etc.) to canonical teams (`INFRASTRUCTURE`, `FIRE_SAFETY`, `WOMEN_SAFETY`, `CHIEF_PROCTOR`, `CAMPUS_ADMIN`).
   - Ensure privacy isolation: sensitive incidents are only accessible to authorized teams.
4. **Phase 5 — Notifications**:
   - In-app notification creation upon incident assignment.
   - Transactional outbox event generation with delivery status tracking (`QUEUED`, `SENT`, `DELIVERED`, `READ`).
5. **Phase 6 — Authentication & Permissions**:
   - Ensure sample accounts have valid signed JWT tokens.
   - Backend guards verify tokens and enforce role-based access.
6. **Phase 7 — Map Locations**:
   - Normalize pin coordinates to `[0, 1]` bounding box.
   - Persist coordinates in `IncidentLocation` record and render across student and responder dashboards.
7. **Phase 8 — End-to-End Tests**:
   - Run complete suite covering all 14 scenarios.
