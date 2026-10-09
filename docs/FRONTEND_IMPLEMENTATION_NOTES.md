# Campus SOS — Frontend Implementation Notes & Architecture Guide

> **Date:** October 2026  
> **Status:** Production Implementation Complete  
> **Framework:** React 19 + TypeScript 5.8 + Vite 8  
> **Visual System:** Calm Authority (Google Stitch Project 986284125746308018, Design System 6441438339956876779)  
> **Repository Separation:** `/frontend` and `/backend`  

---

## 1. Executive Summary & Verification

The Campus SOS Frontend has been implemented directly against the verified NestJS Fastify backend (`/api/v1` and `/rt`) without inventing synthetic APIs, creating demo credentials, or introducing fake production metrics. 

Every operational screen displays honest empty states when zero records are returned by the backend.

---

## 2. Directory Architecture (`/frontend`)

```
frontend/
├── index.html
├── package.json
├── vite.config.ts                     # Proxies /api/v1 and /rt to backend (port 3000)
├── tsconfig.json
├── tsconfig.app.json
├── src/
│   ├── main.tsx
│   ├── App.tsx                        # Provider tree (Theme, Auth, Realtime, BrowserRouter)
│   ├── styles/
│   │   ├── design-tokens.css          # Calm Authority tokens (Deep Calm Teal & Crimson)
│   │   └── global.css                 # Reset, WCAG focus rings, accessibility utilities
│   ├── types/
│   │   └── index.ts                   # Strongly-typed domain models matching Prisma schemas
│   ├── services/
│   │   ├── api.ts                     # Typed fetch client with JWT & Idempotency-Key
│   │   ├── authService.ts             # Session lifecycle, Argon2 login, token refresh
│   │   ├── sosService.ts              # Staging draft -> Explicit confirmation gate -> Live status
│   │   ├── incidentService.ts         # Standard incident reporting & case file queries
│   │   ├── mapService.ts              # Predefined locations & campus map asset retrieval
│   │   ├── attachmentService.ts       # Presigned upload, binary upload, complete endpoint
│   │   ├── notificationService.ts     # User inbox, active notices, admin approval gate
│   │   ├── responderService.ts        # Duty state (Available/Busy/Offline), 45s offers, assignment
│   │   ├── exploreService.ts          # Sanitized privacy-preserving campus feed & pins
│   │   └── adminService.ts            # Command center metrics, incident roster, audit ledger
│   ├── realtime/
│   │   └── socket.ts                  # Socket.IO connection manager to /rt namespace
│   ├── context/
│   │   ├── AuthContext.tsx            # Session restoration, role capability checking
│   │   ├── ThemeContext.tsx           # Light default & dark mode toggle with CSS variables
│   │   └── RealtimeContext.tsx        # Telemetry connectivity indicator & offer notifications
│   ├── components/
│   │   ├── common/                    # Button (with SOS variant), StatusChip, DutyBadge, EmptyState
│   │   ├── layout/                    # TopHeader, StudentBottomNav, StaffSidebar, AppLayout
│   │   ├── map/                       # CampusMap (scalable 2D vector blueprint, [0..1] normalized pins)
│   │   ├── timeline/                  # StatusTracker (6-step live progress)
│   │   ├── upload/                    # PhotoPicker (strict max 2 photos enforcement)
│   │   └── emergency/                 # DispatchOfferModal (45s countdown & accept/decline)
│   ├── routes/
│   │   ├── index.tsx                  # Master route table with role-aware home router
│   │   ├── auth/Login.tsx             # Institutional email + password login
│   │   ├── student/                   # Mobile-first Student Application
│   │   │   ├── StudentHome.tsx        # Primary SOS, Notice ticker, Hotlines
│   │   │   ├── EmergencySos.tsx       # Emergency assist staging & prefill actions
│   │   │   ├── SosConfirmation.tsx    # Explicit Confirmation Gate
│   │   │   ├── SosLiveTracking.tsx    # 6-step live milestone tracker & realtime sync
│   │   │   ├── ReportIncident.tsx     # Non-emergency report with map pin & photo limit
│   │   │   ├── MyReports.tsx          # Dual tab (Reports & SOS) submission history
│   │   │   ├── ReportDetail.tsx       # Student case detail & follow-up notes
│   │   │   ├── Explore.tsx            # Privacy-safe campus map & status-only filter
│   │   │   ├── Notifications.tsx      # Personal alerts & bulletin inbox
│   │   │   └── Contacts.tsx           # 24/7 verified hotline directory
│   │   ├── responder/
│   │   │   └── ResponderConsole.tsx   # Duty state controller & active assignment milestones
│   │   ├── admin/
│   │   │   ├── CommandCenter.tsx      # 5 core operational metric cards & incident roster
│   │   │   ├── IncidentTable.tsx      # Master filterable case table
│   │   │   ├── IncidentCaseDetail.tsx # Full 20-element case dossier & status transitions
│   │   │   ├── DispatchBoard.tsx      # Emergency live operations & manual assignment
│   │   │   ├── Directory.tsx          # Personnel roster (excluding student records)
│   │   │   ├── Analytics.tsx          # Response milestones (T1-T4) & SLAs
│   │   │   ├── AuditTrail.tsx         # Cryptographic SHA-256 hash-chain verification
│   │   │   ├── BroadcastGate.tsx      # Notice approval gate (blocking sensitive cases)
│   │   │   └── Settings.tsx           # Hotline management & SLA timeout policies
│   │   └── roles/
│   │       └── RoleWorkspace.tsx      # Dedicated caseloads for 12 operational roles
│   └── test/                          # Comprehensive Vitest component and flow tests
```

---

## 3. Design Tokens & Visual Language

- **Visual Theme:** *Calm Authority* — Minimalist architectural styling, crisp 1px borders, subtle surface elevations.
- **Color Palette:**
  - **Brand Primary:** `--brand: #0F5C7A` (Deep Calm Teal), contrast `#FFFFFF`, soft `#E3F0F5`
  - **Emergency Reserved:** `--emergency: #C8102E` (Crimson) — Reserved strictly for the SOS button, SOS confirmation gate, and critical alerts.
  - **Neutrals:** Light default canvas `#FAFAF7`, card surface `#FFFFFF`, secondary surface `#F2F2ED`, border `#DEDED6`.
  - **Dark Mode Support:** Full high-contrast dark palette (`#0F1214` canvas, `#171B1F` surface, `#5BB4D6` brand, `#FF5C72` emergency).
- **Prohibited UI Excluded:**
  - No purple AI gradients or glassmorphism bubbles.
  - No urgency selectors or Low/Medium/High sliders.
  - No student phonebooks or public disclosure of confidential harassment/misconduct cases.

---

## 4. Critical SOS Confirmation Gate Guarantee

In compliance with section 10 and section 34 of the project specifications:
1. Opening the Emergency SOS route creates an ephemeral draft via `POST /sos/drafts`.
2. Quick actions (`Fire`, `Injury`, `Fight`, `Blocked route`, etc.) **only prefill descriptive text**; they do not set urgency, bypass confirmation, or create an emergency.
3. Previewing AI categorization calls `POST /sos/drafts/:id/preview` for advisory guidance only.
4. **Emergency creation endpoint (`POST /sos/drafts/:id/confirm`) is called ONLY when the user explicitly clicks the crimson `CONFIRM EMERGENCY` button.**
5. Every confirmation sends a unique UUID v4 `Idempotency-Key` header, preventing accidental double submissions under stress.
6. The Vitest automated suite explicitly asserts this barrier in `src/test/sos-confirmation-gate.test.tsx`.

---

## 5. Normalized Campus Map Coordinates

- Model: Every incident pin is stored as normalized floats `(x, y)` where `x, y ∈ [0, 1]`.
- Calculation: Normalized coordinate = `(click_px / container_px)`.
- Viewport Independence: Coordinates are resolution-independent and render identically on mobile screens (360px) and wide desktop displays (1920px).
- Asset Portability: The vector SVG blueprint is decoupled; uploading a real CAD/GIS blueprint via `POST /admin/map` preserves all pin positions without modifying database schemas.

---

## 6. Realtime Communication Protocol

- Socket.IO connects to backend namespace `/rt` with handshake authentication: `{ auth: { token: JWT } }`.
- Channel Subscriptions:
  - `incident:{id}`: Live 6-stage milestone updates for reporter and assigned units.
  - `user:{userId}`: High-priority dispatch offers with 45-second timers.
  - `admin:dispatch`: Central dispatch room updates.

---

## 7. Verification & Quality Assurance Results

1. **TypeScript Compilation:** Zero errors (`tsc -b`).
2. **Production Bundle:** Built cleanly via `npm run build` (`dist/assets/index-Dm3_uIsO.js` ~130kB gzip).
3. **Automated Vitest Suite:** 11 of 11 tests passed:
   - `sos-confirmation-gate.test.tsx` (Passed)
   - `photo-picker.test.tsx` (Passed)
   - `campus-map.test.tsx` (Passed)
   - `status-tracker.test.tsx` (Passed)
   - `auth.test.tsx` (Passed)
4. **Responsive Testing:** Tested across mobile (360px), tablet (768px), and desktop (1440px) with zero horizontal overflow.
