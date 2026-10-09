# Campus SOS — Frontend Implementation Plan

## 1. Executive Summary & Architecture Foundation
The Campus SOS frontend is a mission-critical, operational campus safety and emergency response web application. It connects students, 12 specialized operational teams, field responders, and central campus administration. 

This implementation plan is directly grounded in:
1. The **verified backend API specification** (`docs/API_SPECIFICATION.md`) and verified NestJS architecture.
2. The **Google Stitch Design System** (`Campus SOS Design System`, Asset ID: `assets/6441438339956876779`) in Stitch Project `Campus SOS` (ID: `986284125746308018`).
3. The **Calm Authority** visual identity, eliminating consumer marketing fluff, purple AI gradients, glassmorphism, and fake data in favor of split-second legibility, cryptographic auditability, and clear operational hierarchy.

---

## 2. Design System Token Mapping (Stitch to CSS/Tailwind)

### 2.1 Color Tokens
| Semantic Role | Token Name | Light Value | Dark Value | Usage Rule |
|---|---|---|---|---|
| Background Canvas | `--color-bg` | `#FAFAF7` | `#121417` | Root viewport canvas |
| Surface Elev-1 | `--color-surface` | `#FFFFFF` | `#1A1D21` | Base cards, tables, panels |
| Surface Elev-2 | `--color-surface-subtle` | `#F2F2ED` | `#22262B` | Hover states, table headers, drawers |
| Structural Border | `--color-border` | `#DEDED6` | `#30363D` | 1px clean crisp boundaries (preferred over heavy shadows) |
| Primary Text | `--color-text` | `#14171A` | `#F0F3F6` | High-contrast body, headers |
| Muted Text | `--color-text-muted` | `#5B6168` | `#8B949E` | Timestamps, metadata, labels |
| Brand Primary | `--color-primary` | `#0F5C7A` | `#2989AC` | Deep Calm Teal; primary navigation, primary buttons |
| Brand Soft | `--color-primary-soft` | `#E3F0F5` | `#1A3340` | Active tab background, selected row tint |
| **Emergency Accent** | `--color-emergency` | **`#C8102E`** | **`#FF4D6A`** | **Reserved strictly** for SOS button, SOS confirmation gate, Code Red alerts |
| Status Success | `--color-status-success`| `#1F7A4D` | `#34A853` | Available responder, resolved case, SHA-256 intact |
| Status Warning | `--color-status-warning`| `#A15C00` | `#F59E0B` | In-progress timer, unassigned warning, review needed |
| Status Info | `--color-status-info` | `#1B5FAA` | `#3B82F6` | En route status, telemetry connected |
| Status Offline | `--color-status-offline`| `#6B7077` | `#9CA3AF` | Inactive responder, archived case |

### 2.2 Typography Tokens (Inter Sans-Serif)
- `display-lg`: `32px` / line-height `40px` (Weight 700) — Case Numbers, Critical Telemetry
- `h1`: `24px` / line-height `32px` (Weight 650) — Page Titles, Screen Headers
- `h2`: `20px` / line-height `28px` (Weight 600) — Section Titles, Card Groups
- `h3`: `16px` / line-height `24px` (Weight 600) — Card Headers, Table Columns
- `body-default`: `15px` / line-height `22px` (Weight 400) — Descriptions, Narrative Text
- `body-sm`: `13px` / line-height `18px` (Weight 400) — Metadata, Captions, Timestamps
- `mono-code`: `12px` / line-height `16px` (JetBrains Mono / monospace) — SHA-256 hashes, Pin coordinates `[0..1]`, UUIDs

### 2.3 Roundness & Elevation Tokens
- `--radius-control`: `8px` (Buttons, input boxes, dropdowns)
- `--radius-card`: `12px` (Cards, dialog modals, map viewports)
- `--radius-pill`: `999px` (Status chips, duty indicators, category badges)
- `--shadow-card`: `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` (No exaggerated floating shadows)

---

## 3. Technology Stack & Directory Architecture

### 3.1 Technology Stack
- **Framework**: Vite + React 18 / 19 + TypeScript (Strict mode `noImplicitAny: true`)
- **Routing**: React Router v6
- **Styling**: Vanilla CSS Modules / Tailwind CSS configured strictly with Stitch tokens (no ad-hoc arbitrary utility colors)
- **State & Server Cache**: TanStack React Query v5 (deduping, automated invalidation on Socket.IO events)
- **Realtime**: `socket.io-client` connected to backend namespace `/rt`
- **Icons**: Lucide React (clean, consistent line iconography matching Stitch designs)
- **Forms**: React Hook Form + Zod (client validation synchronized with backend schemas)
- **Testing**: Vitest + React Testing Library + Playwright

### 3.2 Directory Structure (`/frontend`)
```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   │   ├── index.tsx                  # Root router with role & session guards
│   │   ├── auth/                      # Login, password reset
│   │   ├── student/                   # Student portal (mobile-first)
│   │   │   ├── Home.tsx
│   │   │   ├── EmergencySos.tsx
│   │   │   ├── SosConfirmation.tsx
│   │   │   ├── SosLiveTracking.tsx
│   │   │   ├── EmergencyAssist.tsx
│   │   │   ├── ReportIncident.tsx
│   │   │   ├── MyReports.tsx
│   │   │   ├── Explore.tsx
│   │   │   ├── Notifications.tsx
│   │   │   └── Contacts.tsx
│   │   ├── admin/                     # Campus Administration (desktop-first)
│   │   │   ├── CommandCenter.tsx
│   │   │   ├── IncidentTable.tsx
│   │   │   ├── IncidentCaseDetail.tsx
│   │   │   ├── EmergencyOperations.tsx
│   │   │   ├── Responders.tsx
│   │   │   ├── Teams.tsx
│   │   │   ├── Directory.tsx
│   │   │   ├── BroadcastGate.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── AuditTrail.tsx
│   │   │   └── Settings.tsx
│   │   ├── responder/                 # Field responder interface
│   │   │   ├── ActiveDuty.tsx
│   │   │   ├── DispatchOffer.tsx
│   │   │   └── AssignmentDetail.tsx
│   │   ├── roles/                     # Dedicated dashboards for 12 operational roles
│   │   │   ├── ChiefProctor.tsx
│   │   │   ├── Security.tsx
│   │   │   ├── Medical.tsx
│   │   │   ├── FireSafety.tsx
│   │   │   ├── WomenSafety.tsx
│   │   │   ├── MenSafety.tsx
│   │   │   ├── StudentCouncil.tsx
│   │   │   ├── Infrastructure.tsx
│   │   │   ├── Transportation.tsx
│   │   │   └── DigitalSafety.tsx
│   │   └── system/                    # Error boundaries, 401, 403, 404, offline
│   ├── components/
│   │   ├── common/                    # Button, Input, Modal, Badge, StatusChip, Toast
│   │   ├── layout/                    # MobileNav, DesktopSidebar, TopHeader, RoleShell
│   │   ├── map/                       # CampusMap (stylized 2D static SVG/Canvas with [0..1] normalized pins)
│   │   ├── timeline/                  # IncidentTimeline (6-step live progress)
│   │   ├── emergency/                 # ConfirmationGateModal, BreakGlassBanner, CountdownTimer
│   │   ├── audit/                     # HashChainedLedgerTable, SignatureStamp
│   │   └── upload/                    # SecurePhotoUpload (Max 2 photos, client validation)
│   ├── services/                      # Axios/Fetch API client layer (JWT rotation, Idempotency-Key)
│   ├── realtime/                      # Socket.IO connection manager, channel subscriptions
│   ├── context/                       # AuthContext, ThemeContext, RealtimeContext
│   ├── hooks/                         # useAuth, useIncidentLive, useCountdown, useDutyState
│   ├── types/                         # TypeScript interfaces mirroring API contracts
│   └── styles/                        # design-tokens.css, global.css
```

---

## 4. Route Architecture & Role-Permission Matrix

| Path | Purpose | Primary Device | Allowed Roles | Backend Endpoints Linked |
|---|---|---|---|---|
| `/auth/login` | Secure staff/student login | Responsive | All (Public) | `POST /auth/login`, `GET /me` |
| `/student` | Student Safety Home | Mobile | `STUDENT` | `GET /home`, `GET /hotlines`, `GET /notices/active` |
| `/student/sos` | SOS Draft creation | Mobile | `STUDENT` | `POST /sos/drafts`, `POST /sos/drafts/:id/preview` |
| `/student/sos/:draftId/confirm` | **SOS Confirmation Gate** | Mobile | `STUDENT` | `POST /sos/drafts/:id/confirm` (`Idempotency-Key`) |
| `/student/sos/:id/live` | Live SOS tracking | Mobile | `STUDENT` (Owner) | `GET /sos/:id/live`, Realtime: `incident:{id}` |
| `/student/report` | Standard incident submission | Mobile | `STUDENT` | `POST /incidents` (`Idempotency-Key`), `/incidents/preview` |
| `/student/my-reports` | Tabs: Reports & SOS | Mobile | `STUDENT` | `GET /me/reports?tab=reports`, `GET /me/reports?tab=sos` |
| `/student/explore` | Sanitized campus map & pins | Mobile | `STUDENT` | `GET /explore/incidents`, `GET /map` |
| `/student/contacts` | Verified 24/7 hotline directory | Mobile | `STUDENT` | `GET /hotlines` |
| `/admin` | Admin Command Center | Desktop | `CAMPUS_ADMIN` | `GET /admin/overview`, `GET /admin/incidents` |
| `/admin/incidents/:id` | Full 20-element case dossier | Desktop | `CAMPUS_ADMIN`, Auth Team | `GET /admin/incidents/:id`, `GET /attachments/:id/url` |
| `/admin/dispatch` | Live Emergency Operations | Desktop | `CAMPUS_ADMIN`, `SECURITY` | `GET /admin/dispatch`, `POST /admin/incidents/:id/assign` |
| `/admin/alerts` | Campus Notice Broadcast Gate | Desktop | `CAMPUS_ADMIN` | `GET /admin/notices`, `POST /admin/notices/:id/approve` |
| `/admin/directory` | Personnel / Responder Roster | Desktop | `CAMPUS_ADMIN`, Coord | `GET /directory` (Students excluded) |
| `/admin/analytics` | Incident metrics & response SLAs | Desktop | `CAMPUS_ADMIN` | `GET /admin/analytics/summary`, `/response`, `/categories` |
| `/admin/audit` | Cryptographic SHA-256 Ledger | Desktop | `CAMPUS_ADMIN` | `GET /admin/audit`, `GET /admin/audit/verify` |
| `/responder` | Duty State & Live Dispatch Offers | Mobile | Field Responders | `GET /responder/me`, `PUT /responder/me/duty-state` |
| `/responder/offers/:id` | 45s countdown dispatch offer | Mobile | Assigned Responder | `POST /responder/offers/:id/accept`, `/reject` |
| `/responder/active/:id` | Active incident action & map | Mobile | Assigned Responder | `POST /responder/assignments/:id/en-route`, `/on-scene` |
| `/portal/chief-proctor`| Disciplinary & Misconduct Queue | Desktop | `CHIEF_PROCTOR` | `GET /team/incidents`, Case masking active |
| `/portal/security` | Physical patrol & dispatch queue | Desktop/Mobile | `SECURITY` | `GET /team/incidents`, Patrol tracking |
| `/portal/medical` | Medical emergency queue | Desktop/Mobile | `MEDICAL` | `GET /team/incidents` (Restricted medical notes) |
| `/portal/fire-safety` | Fire & hazard incident board | Desktop/Mobile | `FIRE_AND_SAFETY` | `GET /team/incidents` |
| `/portal/women-safety` | Confidential women safety cases | Desktop | `WOMEN_SAFETY` | `GET /team/incidents` (`can_view_restricted`) |
| `/portal/men-safety` | Confidential men harassment | Desktop | `MEN_SAFETY` | `GET /team/incidents` (`can_view_restricted`) |
| `/portal/student-council`| Student-related coordination | Desktop | `STUDENT_COUNCIL` | `GET /team/incidents` (Permitted categories only) |
| `/portal/infrastructure`| Physical hazards & repairs | Desktop | `INFRASTRUCTURE` | `GET /team/incidents` |
| `/portal/transportation`| Blocked routes & traffic queue | Desktop | `TRANSPORTATION` | `GET /team/incidents` |
| `/portal/digital-safety`| Cyber incident investigation | Desktop | `IT_DIGITAL_SAFETY` | `GET /team/incidents` |

---

## 5. Core Component System Specifications

### 5.1 `CampusMap` Component
- **Location Model**: Accepts `pins: Array<{ x: number, y: number, id: string, type: 'emergency' | 'standard' | 'responder', label?: string }>` where `x, y ∈ [0, 1]`.
- **Stylized Vector Blueprint**: Renders the campus architectural SVG vector floorplan. Coordinates are dynamically scaled via viewBox aspect ratio calculation, ensuring screen-size independence from mobile viewport (360px) to ultra-wide desktop (1920px).
- **Interactive Mode**: Allows 1-tap/click pin placement when reporting, returning normalized `{ x, y }` floats with 6-decimal precision.
- **Portability**: Map image source is decoupled (`GET /map`). The vector blueprint can be replaced with real CAD/GIS assets with zero changes to data models.

### 5.2 `EmergencyConfirmationGate`
- **Deliberate Barrier**: Embedded in `/student/sos/:draftId/confirm`.
- **Zero Sliders**: Absolutely no sliders, urgency selectors, or low/med/high dropdowns.
- **Confirmation Action**: Full-width `#C8102E` crimson button with label `CONFIRM EMERGENCY`.
- **Idempotency Protection**: Generates a cryptographically random UUID v4 `Idempotency-Key` header on confirmation dispatch, preventing duplicate incidents if pressed under stress.

### 5.3 `IncidentTimeline`
- **6-State Stepper**:
  1. `EMERGENCY_CREATED`
  2. `TEAMS_NOTIFIED`
  3. `RESPONDER_ASSIGNED`
  4. `RESPONDER_ON_THE_WAY` (Active pulsing indicator with ETA)
  5. `RESPONDER_AT_LOCATION`
  6. `RESOLVED`
- **Field Redaction**: Automatically suppresses internal responder identities when category is flagged confidential/restricted.

### 5.4 `SecurePhotoUpload`
- **Constraint Enforcement**: Strictly enforces a maximum of 2 photos client-side before initiation.
- **Two-Step Secure Flow**:
  1. Calls `POST /attachments/uploads` with `mime_type` and `size_bytes`.
  2. Direct PUT to signed `upload_url`.
  3. Calls `POST /attachments/{id}/complete` to trigger server-side EXIF/GPS scrubbing and malware validation.
- **Photo Integrity**: Renders SHA-256 asset hash badges for administrators.

### 5.5 `BreakGlassBanner` & Temporary Access
- Renders an authoritative amber/crimson ribbon when emergency cross-team override is engaged.
- Shows granted permission set (`INCIDENT_VIEW`, `EVIDENCE_VIEW`, `REPORTER_CONTACT_VIEW`), authorizing officer, and live countdown timer (`useCountdown`).
- Disables access instantly upon timer expiration or revocation.

---

## 6. Realtime Communication Architecture (`/rt`)

```
   [ Browser Client ]
         │
         ├── Connect to Socket.IO Namespace: /rt (Bearer Token Auth)
         │
         ├── Subscribe: incident:{incident_id}
         │     ├── event: incident.status_changed  ──> Updates Timeline State
         │     ├── event: responder.en_route       ──> Updates ETA & approach vector
         │     └── event: incident.timeline_added  ──> Appends audit entry
         │
         ├── Subscribe: team:{team_id} (Responders & Coordinators)
         │     ├── event: assignment.offered       ──> Triggers 45s countdown modal
         │     └── event: assignment.timed_out     ──> Auto-clears offer window
         │
         ├── Subscribe: admin:dispatch (Central Command)
         │     ├── event: dispatch.escalated       ──> High-priority toast alert
         │     └── event: duty_state.changed       ──> Updates active roster counts
         │
         └── Reconnection Recovery:
               └── Emits resume { last_seq } to replay missed events safely
```

---

## 7. Quality Assurance & Test Strategy

### 7.1 Unit & Component Tests (Vitest + RTL)
- **SOS Confirmation Gate**: Asserts no API dispatch occurs until explicit `CONFIRM EMERGENCY` click.
- **Idempotency Key**: Verifies unique key generation per confirmation attempt.
- **Photo Upload Boundary**: Asserts third photo selection is blocked with clear validation message.
- **Map Coordinate Normalization**: Verifies clicks on varying viewport widths (360px vs 1440px) correctly yield floats in `[0, 1]`.
- **Role Guarding**: Confirms that non-admin accounts accessing `/admin` or restricted team pages receive the proper `403 Forbidden` shell.
- **Explore Privacy**: Ensures that confidential categories (harassment, misconduct) and reporter contact info are never rendered in explore mode.

### 7.2 End-to-End Tests (Playwright)
1. **Critical Student SOS Flow**:
   - Login as student -> Open Emergency SOS -> Enter details -> Pick location -> Preview screen -> Confirm Emergency -> Live tracking screen updates state to `RESPONDER_ON_THE_WAY`.
2. **Responder Dispatch & Timeout Flow**:
   - Dispatch offer arrives -> 45s countdown begins -> Responder clicks Accept -> Duty state toggles to `BUSY` -> Responder marks `En Route` -> Incident status updates on Admin Command Center in realtime.
3. **Admin Incident Review Flow**:
   - Admin logs in -> Views Incident Operational Table -> Clicks `VIEW` -> Full 20-element case dossier renders unedited student narrative, SHA-256 evidence, AI extraction confidence, and audit trail table.
4. **Responsive Viewport Matrix**:
   - Tests all core screens at `360px`, `375px`, `390px`, `768px`, `1280px`, `1440px`, and `1920px`. Verifies zero horizontal overflow.

---

## 8. Implementation Sequence & Next Steps

1. **Step 1: Frontend Workspace Initialization**
   - Initialize `/frontend` using Vite + React + TypeScript in non-interactive mode.
   - Configure CSS design tokens matching Stitch Design System `Campus SOS Design System` (`assets/6441438339956876779`).
2. **Step 2: API Client & Auth Provider Layer**
   - Implement typed Axios/Fetch service layer (`/frontend/src/services/api.ts`).
   - Implement `AuthContext` with JWT storage, automatic refresh rotation, and capability checks.
3. **Step 3: Core Design System Components**
   - Implement `Button`, `Input`, `StatusChip`, `Modal`, `CampusMap`, and `SecurePhotoUpload`.
4. **Step 4: Student Emergency SOS & Reporting Engine**
   - Build Student Home, Emergency SOS form, Confirmation Gate, Live Status Tracking, and My Reports.
5. **Step 5: Admin Command Center & Incident Dossier**
   - Build Admin Overview, high-density Incident Table, 20-element Case Detail, and Alert Broadcast Gate.
6. **Step 6: Responder Interface & 45s Dispatch Flow**
   - Build Responder duty status controller, parallel offer countdown card, and active assignment workflow.
7. **Step 7: Role-Specific Dashboards (All 12 Roles)**
   - Implement purpose-built operational interfaces for Chief Proctor, Security, Medical, Fire, Women Safety, Men Safety, etc.
8. **Step 8: Realtime Integration & Reconnection Handling**
   - Connect Socket.IO client to `/rt` namespace with channel subscriptions and sequence resumption.
9. **Step 9: End-to-End Verification & Accessibility Audit**
   - Run Vitest suite, Playwright scenarios, screen-reader contrast checks, and responsive validation.

---

## 9. Implementation Status Summary

- **Frontend Workspace**: Initialized in `/frontend` (Vite 8, React 19, TypeScript). Clean separation from `/backend`.
- **Design Tokens & System**: Implemented in `src/styles/design-tokens.css` and `src/styles/global.css` (Calm Authority, Deep Calm Teal `#0F5C7A`, Crimson Emergency `#C8102E`, Light default, Dark mode supported).
- **API Client & Auth Layer**: Strongly-typed layer in `src/services/api.ts` with JWT authentication and Idempotency-Key support.
- **Student Portal**: Home, Emergency SOS staging, Confirmation Gate (`SosConfirmation.tsx`), Live Status Tracker (`SosLiveTracking.tsx`), Incident Reporting, My Reports, Detail, Explore, Notifications, Hotlines.
- **Confirmation Gate**: Enforced with Idempotency-Key. No pre-mature incident creation.
- **Admin Command Center**: Overview (5 core metrics), Master Incident Table, 20-element Case Dossier, Live Dispatch Board, Directory (personnel only), Analytics, SHA-256 Audit Ledger, Notice Broadcast Gate, Settings.
- **12 Operational Roles**: Purpose-built workspaces configured for Student, Admin, Chief Proctor, Security, Medical, Fire & Safety, Women Safety, Men Safety, Student Council, Infrastructure, Transportation, IT/Digital.
- **Field Responder Mode**: Available/Busy/Offline duty toggle (inactivity never changes state), 45-second offer countdown, and T2-T4 milestone transitions.
- **Testing & Quality**: 11 unit & component tests passing cleanly (`npm test`), production bundle built cleanly (`npm run build`).
