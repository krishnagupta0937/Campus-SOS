# Campus SOS — Requirements Traceability Matrix

Maps **every** requirement in `CAMPUS_SOS_MASTER_GENERATION_SPEC.json` to the exact documentation sections that satisfy it, with validation status.

## 1. How to Read This Matrix

- **Group IDs** (`REQ-G-001` … `REQ-G-023`) are the `requirement_id_groups` from the master spec.
- **Sub-IDs** (`REQ-G-004.03`) split each group into individually testable statements; the wording is identical in `PRD.md` (requirement tables) and here.
- **Documentation sections** list file + section number + title. Section numbers are validated against the actual headings in each file.
- **Doc status** — `Documented ✔` means the mapped sections exist and the content checks in §5 passed. **Build status** is `Not started` for all rows because this release is documentation-first; the build agent updates it per `IMPLEMENTATION_PLAN.md` (`Not started → In progress → Implemented → Verified`).

## 2. Group Summary

| Group | Spec section | Sub-requirements | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-001` | `project` | 3 | Documented ✔ | Not started |
| `REQ-G-002` | `global_rules` | 6 | Documented ✔ | Not started |
| `REQ-G-003` | `product_principles` | 11 | Documented ✔ | Not started |
| `REQ-G-004` | `reporting` | 6 | Documented ✔ | Not started |
| `REQ-G-005` | `location` | 7 | Documented ✔ | Not started |
| `REQ-G-006` | `photos` | 7 | Documented ✔ | Not started |
| `REQ-G-007` | `ai_and_routing` | 6 | Documented ✔ | Not started |
| `REQ-G-008` | `notification_rules` | 5 | Documented ✔ | Not started |
| `REQ-G-009` | `roles` | 17 | Documented ✔ | Not started |
| `REQ-G-010` | `dispatch` | 8 | Documented ✔ | Not started |
| `REQ-G-011` | `admin` | 6 | Documented ✔ | Not started |
| `REQ-G-012` | `user_directory` | 3 | Documented ✔ | Not started |
| `REQ-G-013` | `campus_explore` | 3 | Documented ✔ | Not started |
| `REQ-G-014` | `homepage` | 5 | Documented ✔ | Not started |
| `REQ-G-015` | `ui_ux` | 5 | Documented ✔ | Not started |
| `REQ-G-016` | `audit` | 3 | Documented ✔ | Not started |
| `REQ-G-017` | `security_privacy` | 9 | Documented ✔ | Not started |
| `REQ-G-018` | `frontend_backend` | 4 | Documented ✔ | Not started |
| `REQ-G-019` | `accounts` | 4 | Documented ✔ | Not started |
| `REQ-G-020` | `required_output_files` | 11 | Documented ✔ | Not started |
| `REQ-G-021` | `implementation_sequence` | 22 | Documented ✔ | Not started |
| `REQ-G-022` | `future_inputs` | 9 | Documented ✔ | Not started |
| `REQ-G-023` | `final_validation` | 29 | Documented ✔ | Not started |

**Totals:** 23 groups · 189 sub-requirements.

## 3. Requirement-Level Matrix


### REQ-G-001 — `project`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-001.01` | Generation mode is DOCUMENTATION_FIRST: generate the specification package first; do not implement the production application yet. | `PRD.md` §1.1 — In scope for this documentation package<br>`PRD.md` §1.2 — Out of scope for this package<br>`IMPLEMENTATION_PLAN.md` §1 — Purpose and Build Approach | Documented ✔ (structure + content check) | Not started |
| `REQ-G-001.02` | The source project (CampusSOS-master (2).zip) is a functional reference only. | `PRD.md` §1.3 — Source project policy<br>`IMPLEMENTATION_PLAN.md` §1 — Purpose and Build Approach | Documented ✔ (structure + content check) | Not started |
| `REQ-G-001.03` | Must not copy from the source project: existing UI, visual design, architecture, demo accounts, fake incidents, fake statistics, fake notifications, fake audit records. | `PRD.md` §1.3 — Source project policy<br>`PRD.md` §27 — Non-Goals<br>`UI_UX_SPECIFICATION.md` §21 — Removed and Prohibited UI<br>`DATABASE_SCHEMA.md` §10 — Initial Migration Content (allowed)<br>`IMPLEMENTATION_PLAN.md` §1 — Purpose and Build Approach<br>`IMPLEMENTATION_PLAN.md` §5 — Testing Gates and Final Validation Checklist | Documented ✔ (structure + content check) | Not started |

### REQ-G-002 — `global_rules`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-002.01` | Preserve every requirement. | `PRD.md` §1 — Purpose, Scope, and Status<br>`PRD.md` §25 — Ambiguities and Safe Implementation Rules<br>`IMPLEMENTATION_PLAN.md` §1.2 — Ground rules for every mission | Documented ✔ (structure + content check) | Not started |
| `REQ-G-002.02` | Do not silently omit or reinterpret any requirement. | `PRD.md` §25 — Ambiguities and Safe Implementation Rules<br>`IMPLEMENTATION_PLAN.md` §1.2 — Ground rules for every mission | Documented ✔ (structure + content check) | Not started |
| `REQ-G-002.03` | If ambiguous, document the ambiguity and propose a safe implementation rule without deleting the original requirement. | `PRD.md` §25 — Ambiguities and Safe Implementation Rules | Documented ✔ (structure + content check) | Not started |
| `REQ-G-002.04` | Every requirement must be mapped to generated documentation (traceability). | `PRD.md` §1 — Purpose, Scope, and Status<br>`IMPLEMENTATION_PLAN.md` §5 — Testing Gates and Final Validation Checklist | Documented ✔ (structure + content check) | Not started |
| `REQ-G-002.05` | Validate before zip. | `IMPLEMENTATION_PLAN.md` §5 — Testing Gates and Final Validation Checklist | Documented ✔ (structure + content check) | Not started |
| `REQ-G-002.06` | No fake production data. | `PRD.md` §2 — Product Principles<br>`PRD.md` §21 — Accounts and Demo Data<br>`PRD.md` §27 — Non-Goals<br>`DATABASE_SCHEMA.md` §10 — Initial Migration Content (allowed)<br>`UI_UX_SPECIFICATION.md` §1 — Design Intent<br>`IMPLEMENTATION_PLAN.md` §1 — Purpose and Build Approach | Documented ✔ (structure + content check) | Not started |

### REQ-G-003 — `product_principles`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-003.01` | Campus SOS is a campus safety and emergency-response platform, not a generic AI dashboard. | `PRD.md` §2 — Product Principles<br>`UI_UX_SPECIFICATION.md` §1 — Design Intent | Documented ✔ (structure + content check) | Not started |
| `REQ-G-003.02` | Emergency SOS is the highest-priority workflow for major immediate emergencies. | `PRD.md` §2 — Product Principles<br>`PRD.md` §5.2 — Priority<br>`API_SPECIFICATION.md` §6 — Emergency SOS (Student)<br>`AI_ROUTING_SPECIFICATION.md` §10.3 — Offering | Documented ✔ (structure + content check) | Not started |
| `REQ-G-003.03` | Report an Incident is for normal/non-immediate campus issues and concerns. | `PRD.md` §2 — Product Principles<br>`PRD.md` §6 — Report an Incident Workflow<br>`API_SPECIFICATION.md` §7 — Standard Reports and My Reports | Documented ✔ (structure + content check) | Not started |
| `REQ-G-003.04` | AI classifies and structures the report; deterministic routing rules decide teams and notification audiences. | `PRD.md` §9 — AI Classification and Routing<br>`ARCHITECTURE.md` §8 — AI and Routing Architecture<br>`AI_ROUTING_SPECIFICATION.md` §1 — Pipeline Overview<br>`AI_ROUTING_SPECIFICATION.md` §5 — AI Boundaries (enforced)<br>`AI_ROUTING_SPECIFICATION.md` §7 — Routing Engine | Documented ✔ (structure + content check) | Not started |
| `REQ-G-003.05` | Campus Administration has visibility into every incident. | `PRD.md` §11.2 — Campus Administration<br>`ARCHITECTURE.md` §7.2 — Access decision (pseudo)<br>`ARCHITECTURE.md` §7.3 — Role capability matrix (summary)<br>`API_SPECIFICATION.md` §13 — Admin Endpoints<br>`AI_ROUTING_SPECIFICATION.md` §7.2 — Evaluation order | Documented ✔ (structure + content check) | Not started |
| `REQ-G-003.06` | Specialized teams receive relevant cases. | `PRD.md` §11 — Role Scopes and Interfaces<br>`ARCHITECTURE.md` §7.3 — Role capability matrix (summary)<br>`AI_ROUTING_SPECIFICATION.md` §8 — Routing Matrix (default rules; configurable) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-003.07` | Sensitive incidents are not automatically broadcast to students. | `PRD.md` §10 — Notification and Disclosure Rules<br>`ARCHITECTURE.md` §10.3 — Campus-wide eligibility and approval<br>`AI_ROUTING_SPECIFICATION.md` §9 — Notification Audience Matrix | Documented ✔ (structure + content check) | Not started |
| `REQ-G-003.08` | Photos are evidence and are available to Campus Administration and all teams assigned to the incident. | `PRD.md` §8 — Photo Evidence<br>`DATABASE_SCHEMA.md` §3.11 — attachments<br>`API_SPECIFICATION.md` §9 — File Uploads (Photos) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-003.09` | Emergency workflows remain operational when one external service or responder fails. | `PRD.md` §5.3 — Behavioural rules (safe interpretations)<br>`PRD.md` §12 — Dispatch and Responder Availability<br>`ARCHITECTURE.md` §12 — Resilience Matrix<br>`AI_ROUTING_SPECIFICATION.md` §10 — Dispatch and Escalation Rules | Documented ✔ (structure + content check) | Not started |
| `REQ-G-003.10` | Frontend and backend are completely separated for maintainability. | `PRD.md` §20 — Frontend / Backend Separation<br>`ARCHITECTURE.md` §3 — Repository and Module Map<br>`TECH_STACK.md` §2 — Frontend<br>`TECH_STACK.md` §3 — Backend | Documented ✔ (structure + content check) | Not started |
| `REQ-G-003.11` | Real/demo accounts are created only at the final stage. | `PRD.md` §21 — Accounts and Demo Data<br>`IMPLEMENTATION_PLAN.md` §3 — Phased Plan (follows the mandated 22-step sequence)<br>`IMPLEMENTATION_PLAN.md` §8 — Final Account Phase — Required Future Inputs | Documented ✔ (structure + content check) | Not started |

### REQ-G-004 — `reporting`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-004.01` | Emergency SOS purpose: major campus emergencies such as serious fire hazards, major accidents, major blocked routes, serious security threats, major fights/quarrels, and other immediate emergencies. | `PRD.md` §5 — Emergency SOS Workflow<br>`UI_UX_SPECIFICATION.md` §7.2 — Emergency SOS flow (mobile-first) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-004.02` | Emergency SOS flow (14 steps): select SOS; Emergency Assist asks what happened; enter description; attach up to 2 photos; select predefined location when useful; place exact pin on static 2D map; AI classifies; routing engine determines teams and audience; confirmation screen; explicit confirmation; emergency created; relevant teams/responders notified; automatic responder assignment begins; live status screen. | `PRD.md` §5.1 — Step-by-step flow<br>`API_SPECIFICATION.md` §6 — Emergency SOS (Student)<br>`UI_UX_SPECIFICATION.md` §7.2 — Emergency SOS flow (mobile-first)<br>`UI_UX_SPECIFICATION.md` §7.3 — Live SOS Status<br>`ARCHITECTURE.md` §5 — Incident Creation Data Flow | Documented ✔ (structure + content check) | Not started |
| `REQ-G-004.03` | Emergency SOS is always the highest-priority workflow; the student has no priority selection. | `PRD.md` §5.2 — Priority<br>`DATABASE_SCHEMA.md` §3.8 — incidents<br>`API_SPECIFICATION.md` §6 — Emergency SOS (Student)<br>`AI_ROUTING_SPECIFICATION.md` §10.3 — Offering | Documented ✔ (structure + content check) | Not started |
| `REQ-G-004.04` | Student sees a confirmation screen and must explicitly confirm before the emergency is created. | `PRD.md` §5.1 — Step-by-step flow<br>`PRD.md` §5.3 — Behavioural rules (safe interpretations)<br>`PRD.md` §26 — Acceptance Criteria (summary)<br>`API_SPECIFICATION.md` §6 — Emergency SOS (Student)<br>`UI_UX_SPECIFICATION.md` §7.2 — Emergency SOS flow (mobile-first)<br>`ARCHITECTURE.md` §5 — Incident Creation Data Flow | Documented ✔ (structure + content check) | Not started |
| `REQ-G-004.05` | Report an Incident purpose: normal campus reports, complaints, concerns, and non-immediate incidents. | `PRD.md` §6 — Report an Incident Workflow<br>`API_SPECIFICATION.md` §7 — Standard Reports and My Reports<br>`UI_UX_SPECIFICATION.md` §7.4 — Report an Incident | Documented ✔ (structure + content check) | Not started |
| `REQ-G-004.06` | Report an Incident fields: incident description, category, predefined campus location, exact map pin, optional maximum 2 photos. | `PRD.md` §6.1 — Fields<br>`API_SPECIFICATION.md` §7 — Standard Reports and My Reports<br>`API_SPECIFICATION.md` §18 — Validation Summary<br>`UI_UX_SPECIFICATION.md` §7.4 — Report an Incident<br>`DATABASE_SCHEMA.md` §3.8 — incidents<br>`DATABASE_SCHEMA.md` §3.10 — incident_locations | Documented ✔ (structure + content check) | Not started |

### REQ-G-005 — `location`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-005.01` | Map type is an uploaded static 2D college campus map image. | `PRD.md` §7 — Location and Campus Map<br>`DATABASE_SCHEMA.md` §3.6 — campus_maps<br>`API_SPECIFICATION.md` §8 — Map and Locations<br>`TECH_STACK.md` §10 — Maps<br>`UI_UX_SPECIFICATION.md` §8.5 — Campus Map | Documented ✔ (structure + content check) | Not started |
| `REQ-G-005.02` | GPS is not the primary location mechanism. | `PRD.md` §7 — Location and Campus Map<br>`DATABASE_SCHEMA.md` §3.10 — incident_locations | Documented ✔ (structure + content check) | Not started |
| `REQ-G-005.03` | Student can tap/click the map to place the exact incident pin. | `PRD.md` §5.1 — Step-by-step flow<br>`PRD.md` §7 — Location and Campus Map<br>`UI_UX_SPECIFICATION.md` §4 — Core Components<br>`UI_UX_SPECIFICATION.md` §7.2 — Emergency SOS flow (mobile-first)<br>`API_SPECIFICATION.md` §6 — Emergency SOS (Student)<br>`API_SPECIFICATION.md` §7 — Standard Reports and My Reports | Documented ✔ (structure + content check) | Not started |
| `REQ-G-005.04` | Store normalized relative X/Y coordinates so the pin remains accurate at different screen sizes. | `DATABASE_SCHEMA.md` §3.10 — incident_locations<br>`DATABASE_SCHEMA.md` §8 — Map Coordinate Storage Rules<br>`API_SPECIFICATION.md` §1 — Conventions<br>`API_SPECIFICATION.md` §18 — Validation Summary<br>`PRD.md` §7 — Location and Campus Map | Documented ✔ (structure + content check) | Not started |
| `REQ-G-005.05` | Administration and teams see the same exact pin. | `PRD.md` §7 — Location and Campus Map<br>`UI_UX_SPECIFICATION.md` §8.2 — View Incident (full case file)<br>`UI_UX_SPECIFICATION.md` §8.5 — Campus Map<br>`UI_UX_SPECIFICATION.md` §10 — Security Workspace<br>`UI_UX_SPECIFICATION.md` §19 — Responder Mode (shared pattern inside every team workspace)<br>`ARCHITECTURE.md` §7.3 — Role capability matrix (summary) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-005.06` | Campus Explore displays incident pins on the same campus map. | `PRD.md` §15 — Campus Explore<br>`UI_UX_SPECIFICATION.md` §7.5 — Campus Explore (focused Campus Incident Explorer)<br>`API_SPECIFICATION.md` §14 — Explore and Home | Documented ✔ (structure + content check) | Not started |
| `REQ-G-005.07` | Predefined locations: room, classroom, laboratory, block, library, canteen, parking, ground, hostel, other. | `PRD.md` §7 — Location and Campus Map<br>`DATABASE_SCHEMA.md` §2 — Enumerations<br>`DATABASE_SCHEMA.md` §3.7 — predefined_locations<br>`API_SPECIFICATION.md` §8 — Map and Locations<br>`UI_UX_SPECIFICATION.md` §7.2 — Emergency SOS flow (mobile-first) | Documented ✔ (structure + content check) | Not started |

### REQ-G-006 — `photos`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-006.01` | Photos are optional with a maximum of 2 per incident. | `PRD.md` §8 — Photo Evidence<br>`DATABASE_SCHEMA.md` §3.11 — attachments<br>`API_SPECIFICATION.md` §9 — File Uploads (Photos)<br>`UI_UX_SPECIFICATION.md` §4 — Core Components | Documented ✔ (structure + content check) | Not started |
| `REQ-G-006.02` | Photos are usable for fire hazard, blocked road/path, unknown person/security alert, accident, infrastructure hazard, and other evidence-based incidents. | `PRD.md` §8 — Photo Evidence<br>`AI_ROUTING_SPECIFICATION.md` §12 — Photos and the Unknown-Person Workflow<br>`UI_UX_SPECIFICATION.md` §12 — Fire & Safety Workspace<br>`UI_UX_SPECIFICATION.md` §16 — Infrastructure & Facilities Workspace | Documented ✔ (structure + content check) | Not started |
| `REQ-G-006.03` | Photo access: Campus Administration and every team/person assigned to the incident. | `API_SPECIFICATION.md` §9 — File Uploads (Photos)<br>`ARCHITECTURE.md` §7.2 — Access decision (pseudo)<br>`DATABASE_SCHEMA.md` §5 — Row-Level Security (defense in depth)<br>`PRD.md` §8 — Photo Evidence | Documented ✔ (structure + content check) | Not started |
| `REQ-G-006.04` | Photos are not public by default. | `API_SPECIFICATION.md` §9 — File Uploads (Photos)<br>`DATABASE_SCHEMA.md` §3.11 — attachments<br>`TECH_STACK.md` §9 — Storage<br>`PRD.md` §8 — Photo Evidence | Documented ✔ (structure + content check) | Not started |
| `REQ-G-006.05` | Unknown-person workflow: student can upload a photo. | `AI_ROUTING_SPECIFICATION.md` §12 — Photos and the Unknown-Person Workflow<br>`UI_UX_SPECIFICATION.md` §10 — Security Workspace<br>`PRD.md` §8 — Photo Evidence | Documented ✔ (structure + content check) | Not started |
| `REQ-G-006.06` | Security sees photo, description, map pin, time, category, and status in the unknown-person workflow. | `UI_UX_SPECIFICATION.md` §10 — Security Workspace<br>`AI_ROUTING_SPECIFICATION.md` §12 — Photos and the Unknown-Person Workflow<br>`API_SPECIFICATION.md` §9 — File Uploads (Photos) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-006.07` | Do not automatically identify the person in the photo. | `AI_ROUTING_SPECIFICATION.md` §2 — AI Input Contract<br>`AI_ROUTING_SPECIFICATION.md` §5 — AI Boundaries (enforced)<br>`AI_ROUTING_SPECIFICATION.md` §12 — Photos and the Unknown-Person Workflow<br>`TECH_STACK.md` §6 — AI Layer<br>`PRD.md` §8 — Photo Evidence<br>`PRD.md` §27 — Non-Goals | Documented ✔ (structure + content check) | Not started |

### REQ-G-007 — `ai_and_routing`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-007.01` | AI duties: understand the student description, classify category, extract structured information, produce structured routing input, provide reasoning/metadata for authorized personnel where appropriate. | `AI_ROUTING_SPECIFICATION.md` §1 — Pipeline Overview<br>`AI_ROUTING_SPECIFICATION.md` §2 — AI Input Contract<br>`AI_ROUTING_SPECIFICATION.md` §4 — AI Output Contract (strict JSON, validated with Zod)<br>`PRD.md` §9 — AI Classification and Routing | Documented ✔ (structure + content check) | Not started |
| `REQ-G-007.02` | AI must not: invent campus authority policy, be the sole routing authority, automatically identify people from photographs, decide public disclosure of sensitive cases. | `AI_ROUTING_SPECIFICATION.md` §5 — AI Boundaries (enforced)<br>`PRD.md` §9 — AI Classification and Routing<br>`TECH_STACK.md` §6 — AI Layer | Documented ✔ (structure + content check) | Not started |
| `REQ-G-007.03` | Routing engine is deterministic and configurable. | `AI_ROUTING_SPECIFICATION.md` §7 — Routing Engine<br>`AI_ROUTING_SPECIFICATION.md` §15 — Configuration and Versioning<br>`ARCHITECTURE.md` §8 — AI and Routing Architecture<br>`DATABASE_SCHEMA.md` §3.20 — routing_rules | Documented ✔ (structure + content check) | Not started |
| `REQ-G-007.04` | Routing engine supports multi-team assignment. | `AI_ROUTING_SPECIFICATION.md` §7.2 — Evaluation order<br>`AI_ROUTING_SPECIFICATION.md` §11 — Multi-Team Rules<br>`DATABASE_SCHEMA.md` §3.14 — incident_teams (incident-level access + team awareness)<br>`ARCHITECTURE.md` §9.1 — Algorithm | Documented ✔ (structure + content check) | Not started |
| `REQ-G-007.05` | If AI is unavailable, use the configured rule-based classification/routing fallback. | `AI_ROUTING_SPECIFICATION.md` §6 — Rule-Based Fallback Classifier<br>`AI_ROUTING_SPECIFICATION.md` §13.2 — AI fallback and boundaries<br>`ARCHITECTURE.md` §12 — Resilience Matrix<br>`TECH_STACK.md` §6 — AI Layer | Documented ✔ (structure + content check) | Not started |
| `REQ-G-007.06` | Routing examples: fire/fire hazard; accident/medical; fight/quarrel; teacher misconduct; student misconduct; women harassment; men harassment; unknown person; blocked route; infrastructure hazard; cyber/digital. | `AI_ROUTING_SPECIFICATION.md` §8 — Routing Matrix (default rules; configurable)<br>`AI_ROUTING_SPECIFICATION.md` §13.1 — Routing (expected = ACT ∪ KNOW teams)<br>`PRD.md` §9 — AI Classification and Routing | Documented ✔ (structure + content check) | Not started |

### REQ-G-008 — `notification_rules`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-008.01` | Logged-in users can receive appropriate campus safety notifications when notifications are enabled. | `PRD.md` §10 — Notification and Disclosure Rules<br>`API_SPECIFICATION.md` §10 — Notifications and Inbox<br>`UI_UX_SPECIFICATION.md` §7.7 — Notifications<br>`ARCHITECTURE.md` §10 — Notification Architecture<br>`DATABASE_SCHEMA.md` §3.1 — users | Documented ✔ (structure + content check) | Not started |
| `REQ-G-008.02` | Campus-wide when relevant: major fire, major fire hazard, major campus route blockage, major security threat, campus-wide safety danger, major environmental/safety hazard, event requiring students to avoid an area. | `PRD.md` §10 — Notification and Disclosure Rules<br>`AI_ROUTING_SPECIFICATION.md` §9 — Notification Audience Matrix<br>`ARCHITECTURE.md` §10.3 — Campus-wide eligibility and approval | Documented ✔ (structure + content check) | Not started |
| `REQ-G-008.03` | Restricted examples: teacher misconduct, student misconduct, harassment, individual medical case, personal grievance, student-teacher dispute, disciplinary matter. | `PRD.md` §10 — Notification and Disclosure Rules<br>`AI_ROUTING_SPECIFICATION.md` §3 — Taxonomy (category codes)<br>`AI_ROUTING_SPECIFICATION.md` §9 — Notification Audience Matrix<br>`ARCHITECTURE.md` §10.3 — Campus-wide eligibility and approval | Documented ✔ (structure + content check) | Not started |
| `REQ-G-008.04` | Principle: notify people who need to act and people who need to know; do not notify people who should not receive the information. | `PRD.md` §10 — Notification and Disclosure Rules<br>`AI_ROUTING_SPECIFICATION.md` §9 — Notification Audience Matrix<br>`ARCHITECTURE.md` §10.2 — Audience types | Documented ✔ (structure + content check) | Not started |
| `REQ-G-008.05` | Never broadcast sensitive case details to all students by default. | `AI_ROUTING_SPECIFICATION.md` §9 — Notification Audience Matrix<br>`ARCHITECTURE.md` §10.3 — Campus-wide eligibility and approval<br>`ARCHITECTURE.md` §10.4 — Visibility matrix (Explore and notices)<br>`API_SPECIFICATION.md` §10 — Notifications and Inbox<br>`DATABASE_SCHEMA.md` §3.19 — campus_notices (campus-wide/area notices) | Documented ✔ (structure + content check) | Not started |

### REQ-G-009 — `roles`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-009.01` | Student interface: Home, Emergency SOS, Emergency Assist, Report an Incident, Campus Explore, My Reports, Notifications, Emergency Contacts. | `PRD.md` §11.1 — Student<br>`UI_UX_SPECIFICATION.md` §7 — Student Interface | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.02` | My Reports has tabs Reports (normal incident submissions) and Emergency SOS (SOS submissions) showing status, assigned teams, timeline, location, category, relevant case information. | `UI_UX_SPECIFICATION.md` §7.6 — My Reports<br>`API_SPECIFICATION.md` §7 — Standard Reports and My Reports<br>`PRD.md` §11.1 — Student | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.03` | Live SOS status: Emergency Created, Teams Notified, Responder Assigned, Responder On the Way, Responder At Location, Resolved. | `UI_UX_SPECIFICATION.md` §7.3 — Live SOS Status<br>`API_SPECIFICATION.md` §6 — Emergency SOS (Student)<br>`ARCHITECTURE.md` §6.1 — Incident status<br>`DATABASE_SCHEMA.md` §7 — Status Reference<br>`PRD.md` §11.1 — Student | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.04` | Campus Administration scope is everything on campus with interface: Overview, All Incidents, Active Emergencies/Dispatch, Resolved Incidents, Campus Map, Teams, Responders, User Directory, Analytics/Statistics, Notifications, Audit Trail, Settings. | `UI_UX_SPECIFICATION.md` §8 — Campus Administration Console<br>`PRD.md` §11.2 — Campus Administration | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.05` | Campus Administration has full incident visibility. | `ARCHITECTURE.md` §7.2 — Access decision (pseudo)<br>`ARCHITECTURE.md` §7.3 — Role capability matrix (summary)<br>`API_SPECIFICATION.md` §13 — Admin Endpoints<br>`AI_ROUTING_SPECIFICATION.md` §7.2 — Evaluation order<br>`PRD.md` §11.2 — Campus Administration | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.06` | Chief Proctor scope: disciplinary/conduct matters; receives student misconduct, teacher/staff misconduct, student-teacher disputes, fights, quarrels, harassment, other configured disciplinary cases. | `UI_UX_SPECIFICATION.md` §9 — Chief Proctor Workspace<br>`PRD.md` §11.3 — Chief Proctor<br>`AI_ROUTING_SPECIFICATION.md` §8 — Routing Matrix (default rules; configurable) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.07` | Chief Proctor should not receive by default: routine medical, routine infrastructure, unrelated technical issues, unrelated transportation cases. | `AI_ROUTING_SPECIFICATION.md` §8 — Routing Matrix (default rules; configurable)<br>`AI_ROUTING_SPECIFICATION.md` §13.1 — Routing (expected = ACT ∪ KNOW teams)<br>`UI_UX_SPECIFICATION.md` §9 — Chief Proctor Workspace<br>`PRD.md` §11.3 — Chief Proctor | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.08` | Security scope: physical security; receives unknown person, suspicious activity, unauthorized access, fights, security threats, campus safety alerts. | `UI_UX_SPECIFICATION.md` §10 — Security Workspace<br>`PRD.md` §11.4 — Security<br>`AI_ROUTING_SPECIFICATION.md` §8 — Routing Matrix (default rules; configurable) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.09` | Medical scope: medical emergencies and accidents; receives collapse, injury, accident, illness, bee sting, other medical emergency. | `UI_UX_SPECIFICATION.md` §11 — Medical Workspace<br>`PRD.md` §11.5 — Medical<br>`AI_ROUTING_SPECIFICATION.md` §8 — Routing Matrix (default rules; configurable) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.10` | Medical first aid enabled: only conservative basic first-aid guidance while professional medical help is responding; never diagnose or delay professional care. | `AI_ROUTING_SPECIFICATION.md` §4.2 — First-aid card (Medical)<br>`UI_UX_SPECIFICATION.md` §7.3 — Live SOS Status<br>`UI_UX_SPECIFICATION.md` §11 — Medical Workspace<br>`PRD.md` §11.5 — Medical | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.11` | Fire & Safety scope: fire and safety hazards. | `UI_UX_SPECIFICATION.md` §12 — Fire & Safety Workspace<br>`PRD.md` §11.6 — Fire & Safety · 11.7 Women Safety (restricted) · 11.8 Men Safety (restricted) · 11.9 Student Council · 11.10 Infrastructure & Facilities · 11.11 Transportation · 11.12 IT / Digital Safety<br>`AI_ROUTING_SPECIFICATION.md` §8 — Routing Matrix (default rules; configurable) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.12` | Women Safety scope: women safety and women harassment; restricted. | `UI_UX_SPECIFICATION.md` §13 — Women Safety Workspace (restricted)<br>`PRD.md` §11.6 — Fire & Safety · 11.7 Women Safety (restricted) · 11.8 Men Safety (restricted) · 11.9 Student Council · 11.10 Infrastructure & Facilities · 11.11 Transportation · 11.12 IT / Digital Safety<br>`AI_ROUTING_SPECIFICATION.md` §8 — Routing Matrix (default rules; configurable) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.13` | Men Safety scope: men safety and men harassment; restricted. | `UI_UX_SPECIFICATION.md` §14 — Men Safety Workspace (restricted)<br>`PRD.md` §11.6 — Fire & Safety · 11.7 Women Safety (restricted) · 11.8 Men Safety (restricted) · 11.9 Student Council · 11.10 Infrastructure & Facilities · 11.11 Transportation · 11.12 IT / Digital Safety<br>`AI_ROUTING_SPECIFICATION.md` §8 — Routing Matrix (default rules; configurable) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.14` | Student Council scope: student grievances, welfare, and configured student-teacher/student-campus concerns. | `UI_UX_SPECIFICATION.md` §15 — Student Council Workspace<br>`PRD.md` §11.6 — Fire & Safety · 11.7 Women Safety (restricted) · 11.8 Men Safety (restricted) · 11.9 Student Council · 11.10 Infrastructure & Facilities · 11.11 Transportation · 11.12 IT / Digital Safety<br>`AI_ROUTING_SPECIFICATION.md` §8 — Routing Matrix (default rules; configurable) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.15` | Infrastructure & Facilities scope: infrastructure, electrical, water, building, maintenance, and facility hazards. | `UI_UX_SPECIFICATION.md` §16 — Infrastructure & Facilities Workspace<br>`PRD.md` §11.6 — Fire & Safety · 11.7 Women Safety (restricted) · 11.8 Men Safety (restricted) · 11.9 Student Council · 11.10 Infrastructure & Facilities · 11.11 Transportation · 11.12 IT / Digital Safety<br>`AI_ROUTING_SPECIFICATION.md` §8 — Routing Matrix (default rules; configurable) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.16` | Transportation scope: road blockage, transport, traffic, parking, vehicle incidents. | `UI_UX_SPECIFICATION.md` §17 — Transportation Workspace<br>`PRD.md` §11.6 — Fire & Safety · 11.7 Women Safety (restricted) · 11.8 Men Safety (restricted) · 11.9 Student Council · 11.10 Infrastructure & Facilities · 11.11 Transportation · 11.12 IT / Digital Safety<br>`AI_ROUTING_SPECIFICATION.md` §8 — Routing Matrix (default rules; configurable) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-009.17` | IT/Digital Safety scope: cyber incidents, digital harassment, account/security, network/digital safety. | `UI_UX_SPECIFICATION.md` §18 — IT / Digital Safety Workspace<br>`PRD.md` §11.6 — Fire & Safety · 11.7 Women Safety (restricted) · 11.8 Men Safety (restricted) · 11.9 Student Council · 11.10 Infrastructure & Facilities · 11.11 Transportation · 11.12 IT / Digital Safety<br>`AI_ROUTING_SPECIFICATION.md` §8 — Routing Matrix (default rules; configurable) | Documented ✔ (structure + content check) | Not started |

### REQ-G-010 — `dispatch`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-010.01` | Dispatch mode: automatically assign a specific available responder and notify the relevant team. | `ARCHITECTURE.md` §9 — Dispatch Architecture<br>`AI_ROUTING_SPECIFICATION.md` §10 — Dispatch and Escalation Rules<br>`API_SPECIFICATION.md` §11 — Team Workspace and Responder Endpoints<br>`PRD.md` §12 — Dispatch and Responder Availability | Documented ✔ (structure + content check) | Not started |
| `REQ-G-010.02` | Responder states: Available (on duty, eligible), Busy (handling an assigned case), Offline (off duty/unavailable). | `DATABASE_SCHEMA.md` §2 — Enumerations<br>`DATABASE_SCHEMA.md` §3.4 — responder_profiles<br>`AI_ROUTING_SPECIFICATION.md` §10.6 — Availability transitions<br>`UI_UX_SPECIFICATION.md` §8.7 — Responders<br>`UI_UX_SPECIFICATION.md` §19 — Responder Mode (shared pattern inside every team workspace)<br>`PRD.md` §12 — Dispatch and Responder Availability | Documented ✔ (structure + content check) | Not started |
| `REQ-G-010.03` | Example lifecycle: Dr. Mahika is assigned a medical case, becomes Busy, becomes Available after finishing, and is Offline when off duty. | `AI_ROUTING_SPECIFICATION.md` §10.6 — Availability transitions<br>`PRD.md` §12 — Dispatch and Responder Availability<br>`ARCHITECTURE.md` §6.3 — Responder availability | Documented ✔ (structure + content check) | Not started |
| `REQ-G-010.04` | If a responder rejects or does not respond within a configured period, try another eligible responder. | `ARCHITECTURE.md` §9.1 — Algorithm<br>`AI_ROUTING_SPECIFICATION.md` §10.4 — Reject or timeout<br>`AI_ROUTING_SPECIFICATION.md` §13.4 — Dispatch<br>`API_SPECIFICATION.md` §11 — Team Workspace and Responder Endpoints<br>`DATABASE_SCHEMA.md` §3.2 — teams | Documented ✔ (structure + content check) | Not started |
| `REQ-G-010.05` | If multiple responders are required, assign multiple responders. | `AI_ROUTING_SPECIFICATION.md` §10.3 — Offering<br>`AI_ROUTING_SPECIFICATION.md` §11 — Multi-Team Rules<br>`ARCHITECTURE.md` §9.1 — Algorithm<br>`DATABASE_SCHEMA.md` §3.15 — assignments | Documented ✔ (structure + content check) | Not started |
| `REQ-G-010.06` | If nobody is available, escalate to the relevant team coordinator/administration. | `AI_ROUTING_SPECIFICATION.md` §10.5 — Nobody available<br>`ARCHITECTURE.md` §9.1 — Algorithm<br>`UI_UX_SPECIFICATION.md` §8.3 — Active Emergencies / Dispatch | Documented ✔ (structure + content check) | Not started |
| `REQ-G-010.07` | Team-level awareness remains active after individual assignment. | `AI_ROUTING_SPECIFICATION.md` §11 — Multi-Team Rules<br>`ARCHITECTURE.md` §9.1 — Algorithm<br>`DATABASE_SCHEMA.md` §3.14 — incident_teams (incident-level access + team awareness) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-010.08` | No inactivity auto-offline. | `DATABASE_SCHEMA.md` §3.4 — responder_profiles<br>`AI_ROUTING_SPECIFICATION.md` §10.6 — Availability transitions<br>`ARCHITECTURE.md` §6.3 — Responder availability<br>`PRD.md` §12 — Dispatch and Responder Availability<br>`PRD.md` §25 — Ambiguities and Safe Implementation Rules<br>`UI_UX_SPECIFICATION.md` §8.7 — Responders | Documented ✔ (structure + content check) | Not started |

### REQ-G-011 — `admin`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-011.01` | Overview cards: Total Incidents, Active Emergencies, Resolved Incidents, Average Response Time, Incidents by Domain/Category. | `UI_UX_SPECIFICATION.md` §8.1 — Overview<br>`API_SPECIFICATION.md` §13 — Admin Endpoints<br>`PRD.md` §13.1 — Overview cards | Documented ✔ (structure + content check) | Not started |
| `REQ-G-011.02` | Click actions: Total Incidents opens all incident statistics/history; Active Emergencies opens dispatch page; Resolved Incidents opens resolved page; Average Response Time opens detailed response analytics. | `UI_UX_SPECIFICATION.md` §8.1 — Overview<br>`PRD.md` §13.1 — Overview cards<br>`API_SPECIFICATION.md` §13 — Admin Endpoints | Documented ✔ (structure + content check) | Not started |
| `REQ-G-011.03` | Category analytics are provided. | `UI_UX_SPECIFICATION.md` §8.1 — Overview<br>`UI_UX_SPECIFICATION.md` §8.9 — Analytics / Statistics<br>`API_SPECIFICATION.md` §13 — Admin Endpoints | Documented ✔ (structure + content check) | Not started |
| `REQ-G-011.04` | Incident table columns: ID, Type, Category, Priority/Workflow, Location, Status, Time, Action. | `UI_UX_SPECIFICATION.md` §8.1 — Overview<br>`API_SPECIFICATION.md` §13 — Admin Endpoints<br>`PRD.md` §13.2 — Incident table | Documented ✔ (structure + content check) | Not started |
| `REQ-G-011.05` | A View button is required on each incident. | `UI_UX_SPECIFICATION.md` §8.2 — View Incident (full case file)<br>`API_SPECIFICATION.md` §13.1 — GET /admin/incidents/{id} response (View button)<br>`PRD.md` §13.2 — Incident table | Documented ✔ (structure + content check) | Not started |
| `REQ-G-011.06` | View must show: full student description, incident ID, report type, category, workflow, predefined location, exact map pin, date/time, authorized reporter information, AI classification, AI reasoning where appropriate, routing decision, assigned teams, assigned responders, photos, notification history, response timeline, status history, resolution details, audit history. | `API_SPECIFICATION.md` §13.1 — GET /admin/incidents/{id} response (View button)<br>`UI_UX_SPECIFICATION.md` §8.2 — View Incident (full case file)<br>`PRD.md` §13.2 — Incident table | Documented ✔ (structure + content check) | Not started |

### REQ-G-012 — `user_directory`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-012.01` | User Directory must not be a directory of every student's phone number. | `PRD.md` §14 — User Directory<br>`API_SPECIFICATION.md` §15 — User Directory<br>`UI_UX_SPECIFICATION.md` §8.8 — User Directory<br>`DATABASE_SCHEMA.md` §3.1 — users | Documented ✔ (structure + content check) | Not started |
| `REQ-G-012.02` | User Directory includes Campus SOS administrators, team members, responders, and relevant department/team contacts. | `PRD.md` §14 — User Directory<br>`API_SPECIFICATION.md` §15 — User Directory<br>`UI_UX_SPECIFICATION.md` §8.8 — User Directory | Documented ✔ (structure + content check) | Not started |
| `REQ-G-012.03` | User Directory fields: name, department/team, designation, role, phone, email where appropriate, availability where appropriate. | `API_SPECIFICATION.md` §15 — User Directory<br>`UI_UX_SPECIFICATION.md` §8.8 — User Directory | Documented ✔ (structure + content check) | Not started |

### REQ-G-013 — `campus_explore`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-013.01` | Campus Explore is a focused Campus Incident Explorer with static 2D campus map, incident pins, recent campus incidents, status, recent campus activity. | `PRD.md` §15 — Campus Explore<br>`UI_UX_SPECIFICATION.md` §7.5 — Campus Explore (focused Campus Incident Explorer)<br>`API_SPECIFICATION.md` §14 — Explore and Home | Documented ✔ (structure + content check) | Not started |
| `REQ-G-013.02` | Remove from Explore: urgency filter, Low/Medium/High urgency system, generic system urgency filter, unnecessary response protocol section, generic AI distress-analysis marketing section. | `PRD.md` §15 — Campus Explore<br>`UI_UX_SPECIFICATION.md` §7.5 — Campus Explore (focused Campus Incident Explorer)<br>`UI_UX_SPECIFICATION.md` §21 — Removed and Prohibited UI<br>`API_SPECIFICATION.md` §5 — Pagination, Filtering, Sorting<br>`API_SPECIFICATION.md` §14 — Explore and Home | Documented ✔ (structure + content check) | Not started |
| `REQ-G-013.03` | Sensitive incidents are sanitized or excluded according to access permissions. | `ARCHITECTURE.md` §10.4 — Visibility matrix (Explore and notices)<br>`API_SPECIFICATION.md` §14 — Explore and Home<br>`AI_ROUTING_SPECIFICATION.md` §9 — Notification Audience Matrix<br>`PRD.md` §15 — Campus Explore | Documented ✔ (structure + content check) | Not started |

### REQ-G-014 — `homepage`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-014.01` | Homepage is rebuilt from scratch. | `PRD.md` §16 — Homepage<br>`UI_UX_SPECIFICATION.md` §7.1 — Home (rebuilt from scratch) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-014.02` | Homepage primary actions: Emergency SOS and Report an Incident. | `PRD.md` §16 — Homepage<br>`UI_UX_SPECIFICATION.md` §7.1 — Home (rebuilt from scratch) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-014.03` | Homepage sections: primary actions, on-duty teams, recent campus activity, emergency contacts, appropriate safety notifications. | `PRD.md` §16 — Homepage<br>`UI_UX_SPECIFICATION.md` §7.1 — Home (rebuilt from scratch)<br>`API_SPECIFICATION.md` §14 — Explore and Home | Documented ✔ (structure + content check) | Not started |
| `REQ-G-014.04` | Remove from Homepage: generic Live Campus Dispatch section, generic AI marketing, fake statistics, fake activity, fake operational data. | `PRD.md` §16 — Homepage<br>`UI_UX_SPECIFICATION.md` §7.1 — Home (rebuilt from scratch)<br>`UI_UX_SPECIFICATION.md` §21 — Removed and Prohibited UI | Documented ✔ (structure + content check) | Not started |
| `REQ-G-014.05` | Emergency hotlines are configurable 24/7 campus emergency contacts. | `PRD.md` §16 — Homepage<br>`DATABASE_SCHEMA.md` §3.21 — hotlines<br>`API_SPECIFICATION.md` §14 — Explore and Home<br>`API_SPECIFICATION.md` §16 — Settings<br>`UI_UX_SPECIFICATION.md` §7.1 — Home (rebuilt from scratch)<br>`UI_UX_SPECIFICATION.md` §7.8 — Emergency Contacts<br>`UI_UX_SPECIFICATION.md` §8.12 — Settings | Documented ✔ (structure + content check) | Not started |

### REQ-G-015 — `ui_ux`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-015.01` | UI/UX is designed from scratch. | `UI_UX_SPECIFICATION.md` §1 — Design Intent<br>`UI_UX_SPECIFICATION.md` §3 — Design System<br>`PRD.md` §17 — UI/UX Requirements | Documented ✔ (structure + content check) | Not started |
| `REQ-G-015.02` | UI quality: clean, elegant, modern, professional, minimal, interactive where useful, clear visual hierarchy, consistent spacing, consistent typography, purposeful motion, accessible, mobile-first, responsive, fast, uncluttered. | `UI_UX_SPECIFICATION.md` §1 — Design Intent<br>`UI_UX_SPECIFICATION.md` §3 — Design System<br>`UI_UX_SPECIFICATION.md` §5 — Responsive and Mobile-First Rules<br>`UI_UX_SPECIFICATION.md` §6 — Accessibility, States, and Content<br>`PRD.md` §17 — UI/UX Requirements<br>`PRD.md` §22 — Non-Functional Requirements (proposed targets) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-015.03` | Avoid: generic AI dashboard, excessive gradients, excessive glassmorphism, unnecessary cards, visual clutter, decorative emergency distractions, inconsistent components, fake metrics, template-like AI UI. | `UI_UX_SPECIFICATION.md` §1 — Design Intent<br>`UI_UX_SPECIFICATION.md` §21 — Removed and Prohibited UI | Documented ✔ (structure + content check) | Not started |
| `REQ-G-015.04` | Mobile priority: Emergency SOS, Emergency Assist, map pinning, photo upload, notifications, live SOS status, My Reports. | `UI_UX_SPECIFICATION.md` §5 — Responsive and Mobile-First Rules<br>`UI_UX_SPECIFICATION.md` §7 — Student Interface<br>`PRD.md` §17 — UI/UX Requirements | Documented ✔ (structure + content check) | Not started |
| `REQ-G-015.05` | Each role has its own purpose-built interface rather than one generic dashboard with random widgets hidden. | `UI_UX_SPECIFICATION.md` §1 — Design Intent<br>`UI_UX_SPECIFICATION.md` §2 — Interface Map<br>`UI_UX_SPECIFICATION.md` §7 — Student Interface<br>`UI_UX_SPECIFICATION.md` §8 — Campus Administration Console<br>`UI_UX_SPECIFICATION.md` §9 — Chief Proctor Workspace<br>`UI_UX_SPECIFICATION.md` §10 — Security Workspace<br>`UI_UX_SPECIFICATION.md` §11 — Medical Workspace<br>`UI_UX_SPECIFICATION.md` §12 — Fire & Safety Workspace<br>`UI_UX_SPECIFICATION.md` §13 — Women Safety Workspace (restricted)<br>`UI_UX_SPECIFICATION.md` §14 — Men Safety Workspace (restricted)<br>`UI_UX_SPECIFICATION.md` §15 — Student Council Workspace<br>`UI_UX_SPECIFICATION.md` §16 — Infrastructure & Facilities Workspace<br>`UI_UX_SPECIFICATION.md` §17 — Transportation Workspace<br>`UI_UX_SPECIFICATION.md` §18 — IT / Digital Safety Workspace<br>`UI_UX_SPECIFICATION.md` §19 — Responder Mode (shared pattern inside every team workspace)<br>`PRD.md` §11 — Role Scopes and Interfaces | Documented ✔ (structure + content check) | Not started |

### REQ-G-016 — `audit`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-016.01` | Audit logging is required. | `PRD.md` §18 — Audit Trail<br>`DATABASE_SCHEMA.md` §3.23 — audit_events (append-only)<br>`ARCHITECTURE.md` §13 — Security Architecture<br>`API_SPECIFICATION.md` §17 — Audit | Documented ✔ (structure + content check) | Not started |
| `REQ-G-016.02` | Audited events: incident created, SOS confirmed, AI classification, routing decision, notification sent, responder assigned, responder accepted, responder rejected, reassignment, status changes, resolution, admin actions, team assignment changes, relevant permission/access events. | `DATABASE_SCHEMA.md` §2 — Enumerations<br>`DATABASE_SCHEMA.md` §3.23 — audit_events (append-only)<br>`PRD.md` §18 — Audit Trail<br>`ARCHITECTURE.md` §13 — Security Architecture | Documented ✔ (structure + content check) | Not started |
| `REQ-G-016.03` | Timeline: chronological case history visible to authorized personnel. | `API_SPECIFICATION.md` §17 — Audit<br>`UI_UX_SPECIFICATION.md` §8.2 — View Incident (full case file)<br>`UI_UX_SPECIFICATION.md` §20 — Cross-Cutting Patterns<br>`PRD.md` §18 — Audit Trail | Documented ✔ (structure + content check) | Not started |

### REQ-G-017 — `security_privacy`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-017.01` | Role-based access control. | `ARCHITECTURE.md` §7.1 — Layers<br>`API_SPECIFICATION.md` §3 — Authorization<br>`DATABASE_SCHEMA.md` §6 — Permissions Matrix (database roles) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-017.02` | Team-based authorization. | `ARCHITECTURE.md` §7.1 — Layers<br>`DATABASE_SCHEMA.md` §3.3 — team_members<br>`DATABASE_SCHEMA.md` §3.14 — incident_teams (incident-level access + team awareness) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-017.03` | Incident-level access. | `ARCHITECTURE.md` §7.2 — Access decision (pseudo)<br>`DATABASE_SCHEMA.md` §3.14 — incident_teams (incident-level access + team awareness)<br>`DATABASE_SCHEMA.md` §5 — Row-Level Security (defense in depth) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-017.04` | Secure photo storage. | `TECH_STACK.md` §9 — Storage<br>`API_SPECIFICATION.md` §9 — File Uploads (Photos)<br>`ARCHITECTURE.md` §13 — Security Architecture | Documented ✔ (structure + content check) | Not started |
| `REQ-G-017.05` | Audit logging. | `ARCHITECTURE.md` §13 — Security Architecture<br>`DATABASE_SCHEMA.md` §3.23 — audit_events (append-only)<br>`PRD.md` §18 — Audit Trail | Documented ✔ (structure + content check) | Not started |
| `REQ-G-017.06` | Secure authentication. | `TECH_STACK.md` §5 — Authentication<br>`API_SPECIFICATION.md` §2 — Authentication | Documented ✔ (structure + content check) | Not started |
| `REQ-G-017.07` | Least privilege. | `ARCHITECTURE.md` §7 — Authorization Architecture<br>`DATABASE_SCHEMA.md` §6 — Permissions Matrix (database roles) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-017.08` | Privacy-aware notification rules. | `ARCHITECTURE.md` §10 — Notification Architecture<br>`AI_ROUTING_SPECIFICATION.md` §9 — Notification Audience Matrix | Documented ✔ (structure + content check) | Not started |
| `REQ-G-017.09` | No public sensitive incident details. | `ARCHITECTURE.md` §10.4 — Visibility matrix (Explore and notices)<br>`API_SPECIFICATION.md` §14 — Explore and Home<br>`AI_ROUTING_SPECIFICATION.md` §9 — Notification Audience Matrix | Documented ✔ (structure + content check) | Not started |

### REQ-G-018 — `frontend_backend`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-018.01` | Frontend and backend are independent applications (required). | `PRD.md` §20 — Frontend / Backend Separation<br>`ARCHITECTURE.md` §3 — Repository and Module Map<br>`TECH_STACK.md` §2 — Frontend<br>`TECH_STACK.md` §3 — Backend | Documented ✔ (structure + content check) | Not started |
| `REQ-G-018.02` | Documentation lives in a separate docs directory. | `PRD.md` §20 — Frontend / Backend Separation<br>`ARCHITECTURE.md` §3 — Repository and Module Map<br>`README.md` (file present) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-018.03` | Documented API/data contracts between frontend and backend. | `API_SPECIFICATION.md` §1 — Conventions<br>`ARCHITECTURE.md` §3 — Repository and Module Map<br>`TECH_STACK.md` §12 — Deployment<br>`IMPLEMENTATION_PLAN.md` §3.1 — Phase 3.1 — Architecture and contracts | Documented ✔ (structure + content check) | Not started |
| `REQ-G-018.04` | A second developer can locate UI, API, AI, routing, notifications, dispatch, database, authentication, and audit code without navigating an unstructured monolith. | `ARCHITECTURE.md` §3 — Repository and Module Map<br>`ARCHITECTURE.md` §4 — Component Responsibilities<br>`PRD.md` §20 — Frontend / Backend Separation | Documented ✔ (structure + content check) | Not started |

### REQ-G-019 — `accounts`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-019.01` | Current phase: build all interfaces and role architecture now. | `IMPLEMENTATION_PLAN.md` §3.4 — Phase 3.4 — All role interfaces<br>`UI_UX_SPECIFICATION.md` §2 — Interface Map<br>`PRD.md` §21 — Accounts and Demo Data | Documented ✔ (structure + content check) | Not started |
| `REQ-G-019.02` | Temporary preview: use development-only role switching/mocking if required to preview each role. | `UI_UX_SPECIFICATION.md` §22 — Development-Only Role Switcher<br>`ARCHITECTURE.md` §16 — Environments and Dev-Only Tools<br>`PRD.md` §21 — Accounts and Demo Data<br>`PRD.md` §25 — Ambiguities and Safe Implementation Rules<br>`API_SPECIFICATION.md` §2 — Authentication | Documented ✔ (structure + content check) | Not started |
| `REQ-G-019.03` | Real accounts are created at the end after the user provides final names, teams, contacts, duty statuses, and roles. | `IMPLEMENTATION_PLAN.md` §3.22 — Phase 3.22 — Demo accounts and demo data — last<br>`IMPLEMENTATION_PLAN.md` §8 — Final Account Phase — Required Future Inputs<br>`PRD.md` §21 — Accounts and Demo Data<br>`PRD.md` §24 — Future Inputs | Documented ✔ (structure + content check) | Not started |
| `REQ-G-019.04` | Do not seed fake production data during foundational development. | `DATABASE_SCHEMA.md` §10 — Initial Migration Content (allowed)<br>`PRD.md` §21 — Accounts and Demo Data<br>`IMPLEMENTATION_PLAN.md` §3.22 — Phase 3.22 — Demo accounts and demo data — last | Documented ✔ (structure + content check) | Not started |

### REQ-G-020 — `required_output_files`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-020.01` | Required file docs/PRD.md: complete product requirements, scope, personas, workflows, requirements, acceptance criteria. | `docs/PRD.md` (file present)<br>`PRD.md` §1 — Purpose, Scope, and Status<br>`PRD.md` §3 — Personas and Roles<br>`PRD.md` §5 — Emergency SOS Workflow<br>`PRD.md` §26 — Acceptance Criteria (summary) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-020.02` | Required file docs/TECH_STACK.md: frontend, backend, database, auth, AI, realtime, notification, storage, testing, deployment, observability. | `docs/TECH_STACK.md` (file present)<br>`TECH_STACK.md` §1 — Decision Summary<br>`TECH_STACK.md` §2 — Frontend<br>`TECH_STACK.md` §3 — Backend<br>`TECH_STACK.md` §4 — Database<br>`TECH_STACK.md` §5 — Authentication<br>`TECH_STACK.md` §6 — AI Layer<br>`TECH_STACK.md` §7 — Realtime<br>`TECH_STACK.md` §8 — Notifications<br>`TECH_STACK.md` §9 — Storage<br>`TECH_STACK.md` §11 — Testing Strategy<br>`TECH_STACK.md` §12 — Deployment<br>`TECH_STACK.md` §13 — Observability | Documented ✔ (structure + content check) | Not started |
| `REQ-G-020.03` | Required file docs/ARCHITECTURE.md: system architecture, module boundaries, data flows, security, realtime, AI/routing, dispatch, notification architecture, Mermaid diagrams. | `docs/ARCHITECTURE.md` (file present)<br>`ARCHITECTURE.md` §2 — System Context<br>`ARCHITECTURE.md` §3 — Repository and Module Map<br>`ARCHITECTURE.md` §5 — Incident Creation Data Flow<br>`ARCHITECTURE.md` §8 — AI and Routing Architecture<br>`ARCHITECTURE.md` §9 — Dispatch Architecture<br>`ARCHITECTURE.md` §10 — Notification Architecture<br>`ARCHITECTURE.md` §11 — Realtime Architecture<br>`ARCHITECTURE.md` §13 — Security Architecture | Documented ✔ (structure + content check) | Not started |
| `REQ-G-020.04` | Required file docs/DATABASE_SCHEMA.md: entities, fields, types, constraints, relationships, indexes, permissions, statuses, incidents, attachments, map coordinates, notifications, assignments, audit. | `docs/DATABASE_SCHEMA.md` (file present)<br>`DATABASE_SCHEMA.md` §1 — Entity Relationship Overview<br>`DATABASE_SCHEMA.md` §3 — Tables<br>`DATABASE_SCHEMA.md` §6 — Permissions Matrix (database roles)<br>`DATABASE_SCHEMA.md` §7 — Status Reference<br>`DATABASE_SCHEMA.md` §8 — Map Coordinate Storage Rules | Documented ✔ (structure + content check) | Not started |
| `REQ-G-020.05` | Required file docs/API_SPECIFICATION.md: endpoints, authentication, authorization, requests, responses, validation, errors, pagination, file uploads, realtime events. | `docs/API_SPECIFICATION.md` (file present)<br>`API_SPECIFICATION.md` §2 — Authentication<br>`API_SPECIFICATION.md` §3 — Authorization<br>`API_SPECIFICATION.md` §4 — Error Model<br>`API_SPECIFICATION.md` §5 — Pagination, Filtering, Sorting<br>`API_SPECIFICATION.md` §9 — File Uploads (Photos)<br>`API_SPECIFICATION.md` §12 — Realtime Events<br>`API_SPECIFICATION.md` §18 — Validation Summary | Documented ✔ (structure + content check) | Not started |
| `REQ-G-020.06` | Required file docs/UI_UX_SPECIFICATION.md: from-scratch design system and all role-specific screens, navigation, components, responsive/mobile behavior, states and interactions. | `docs/UI_UX_SPECIFICATION.md` (file present)<br>`UI_UX_SPECIFICATION.md` §3 — Design System<br>`UI_UX_SPECIFICATION.md` §4 — Core Components<br>`UI_UX_SPECIFICATION.md` §5 — Responsive and Mobile-First Rules<br>`UI_UX_SPECIFICATION.md` §6 — Accessibility, States, and Content<br>`UI_UX_SPECIFICATION.md` §7 — Student Interface<br>`UI_UX_SPECIFICATION.md` §8 — Campus Administration Console | Documented ✔ (structure + content check) | Not started |
| `REQ-G-020.07` | Required file docs/AI_ROUTING_SPECIFICATION.md: AI input/output contract, taxonomy, routing matrix, audience matrix, fallback, escalation, multi-team rules, test cases. | `docs/AI_ROUTING_SPECIFICATION.md` (file present)<br>`AI_ROUTING_SPECIFICATION.md` §2 — AI Input Contract<br>`AI_ROUTING_SPECIFICATION.md` §3 — Taxonomy (category codes)<br>`AI_ROUTING_SPECIFICATION.md` §4 — AI Output Contract (strict JSON, validated with Zod)<br>`AI_ROUTING_SPECIFICATION.md` §6 — Rule-Based Fallback Classifier<br>`AI_ROUTING_SPECIFICATION.md` §8 — Routing Matrix (default rules; configurable)<br>`AI_ROUTING_SPECIFICATION.md` §9 — Notification Audience Matrix<br>`AI_ROUTING_SPECIFICATION.md` §10 — Dispatch and Escalation Rules<br>`AI_ROUTING_SPECIFICATION.md` §11 — Multi-Team Rules<br>`AI_ROUTING_SPECIFICATION.md` §13 — Test Cases | Documented ✔ (structure + content check) | Not started |
| `REQ-G-020.08` | Required file docs/IMPLEMENTATION_PLAN.md: phased Antigravity build plan, dependencies, milestones, testing gates, integration, UI review, final account phase. | `docs/IMPLEMENTATION_PLAN.md` (file present)<br>`IMPLEMENTATION_PLAN.md` §3 — Phased Plan (follows the mandated 22-step sequence)<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph<br>`IMPLEMENTATION_PLAN.md` §5 — Testing Gates and Final Validation Checklist<br>`IMPLEMENTATION_PLAN.md` §6 — Antigravity Working Instructions<br>`IMPLEMENTATION_PLAN.md` §7 — Integration and UI Review<br>`IMPLEMENTATION_PLAN.md` §8 — Final Account Phase — Required Future Inputs | Documented ✔ (structure + content check) | Not started |
| `REQ-G-020.09` | Required file docs/REQUIREMENTS_TRACEABILITY.md: every requirement ID mapped to exact documentation sections with validation status. | `docs/REQUIREMENTS_TRACEABILITY.md` (file present) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-020.10` | Required file README.md: master index and instructions for using all generated documentation. | `README.md` (file present) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-020.11` | Zip output campus_sos_specification_package.zip containing every required output file plus the JSON source specification at docs/CAMPUS_SOS_MASTER_GENERATION_SPEC.json; no missing files; no unrequested clutter. | `docs/CAMPUS_SOS_MASTER_GENERATION_SPEC.json` (file present)<br>`campus_sos_specification_package.zip` (verified at packaging) | Documented ✔ (structure + content check) | Not started |

### REQ-G-021 — `implementation_sequence`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-021.01` | Implementation sequence step 1: Architecture and contracts. | `IMPLEMENTATION_PLAN.md` §3.1 — Phase 3.1 — Architecture and contracts<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.02` | Implementation sequence step 2: Database and security model. | `IMPLEMENTATION_PLAN.md` §3.2 — Phase 3.2 — Database and security model<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.03` | Implementation sequence step 3: Authentication and role model. | `IMPLEMENTATION_PLAN.md` §3.3 — Phase 3.3 — Authentication and role model<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.04` | Implementation sequence step 4: All role interfaces. | `IMPLEMENTATION_PLAN.md` §3.4 — Phase 3.4 — All role interfaces<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.05` | Implementation sequence step 5: Student Emergency SOS. | `IMPLEMENTATION_PLAN.md` §3.5 — Phase 3.5 — Student Emergency SOS<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.06` | Implementation sequence step 6: Student Report Incident. | `IMPLEMENTATION_PLAN.md` §3.6 — Phase 3.6 — Student Report an Incident<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.07` | Implementation sequence step 7: Campus static map and pinning. | `IMPLEMENTATION_PLAN.md` §3.7 — Phase 3.7 — Campus static map and pinning<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.08` | Implementation sequence step 8: Photo upload/storage/access. | `IMPLEMENTATION_PLAN.md` §3.8 — Phase 3.8 — Photo upload, storage, access<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.09` | Implementation sequence step 9: AI classification. | `IMPLEMENTATION_PLAN.md` §3.9 — Phase 3.9 — AI classification<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.10` | Implementation sequence step 10: Deterministic routing. | `IMPLEMENTATION_PLAN.md` §3.10 — Phase 3.10 — Deterministic routing<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.11` | Implementation sequence step 11: Automatic responder dispatch. | `IMPLEMENTATION_PLAN.md` §3.11 — Phase 3.11 — Automatic responder dispatch<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.12` | Implementation sequence step 12: Responder availability. | `IMPLEMENTATION_PLAN.md` §3.12 — Phase 3.12 — Responder availability<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.13` | Implementation sequence step 13: Notifications. | `IMPLEMENTATION_PLAN.md` §3.13 — Phase 3.13 — Notifications<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.14` | Implementation sequence step 14: Admin incident management. | `IMPLEMENTATION_PLAN.md` §3.14 — Phase 3.14 — Admin incident management<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.15` | Implementation sequence step 15: Campus Explore. | `IMPLEMENTATION_PLAN.md` §3.15 — Phase 3.15 — Campus Explore<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.16` | Implementation sequence step 16: Analytics. | `IMPLEMENTATION_PLAN.md` §3.16 — Phase 3.16 — Analytics<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.17` | Implementation sequence step 17: Audit trail. | `IMPLEMENTATION_PLAN.md` §3.17 — Phase 3.17 — Audit trail<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.18` | Implementation sequence step 18: Security/privacy hardening. | `IMPLEMENTATION_PLAN.md` §3.18 — Phase 3.18 — Security/privacy hardening<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.19` | Implementation sequence step 19: Mobile/responsive polish. | `IMPLEMENTATION_PLAN.md` §3.19 — Phase 3.19 — Mobile/responsive polish<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.20` | Implementation sequence step 20: Testing. | `IMPLEMENTATION_PLAN.md` §3.20 — Phase 3.20 — Testing<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.21` | Implementation sequence step 21: Real campus/team configuration. | `IMPLEMENTATION_PLAN.md` §3.21 — Phase 3.21 — Real campus/team configuration<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |
| `REQ-G-021.22` | Implementation sequence step 22: Demo accounts and demo data last. | `IMPLEMENTATION_PLAN.md` §3.22 — Phase 3.22 — Demo accounts and demo data — last<br>`IMPLEMENTATION_PLAN.md` §4 — Milestones and Dependency Graph | Documented ✔ (structure + content check) | Not started |

### REQ-G-022 — `future_inputs`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-022.01` | Future input: actual college 2D campus map. | `PRD.md` §24 — Future Inputs<br>`IMPLEMENTATION_PLAN.md` §8 — Final Account Phase — Required Future Inputs | Documented ✔ (structure + content check) | Not started |
| `REQ-G-022.02` | Future input: Campus SOS team member names. | `PRD.md` §24 — Future Inputs<br>`IMPLEMENTATION_PLAN.md` §8 — Final Account Phase — Required Future Inputs | Documented ✔ (structure + content check) | Not started |
| `REQ-G-022.03` | Future input: administrator details. | `PRD.md` §24 — Future Inputs<br>`IMPLEMENTATION_PLAN.md` §8 — Final Account Phase — Required Future Inputs | Documented ✔ (structure + content check) | Not started |
| `REQ-G-022.04` | Future input: responder details. | `PRD.md` §24 — Future Inputs<br>`IMPLEMENTATION_PLAN.md` §8 — Final Account Phase — Required Future Inputs | Documented ✔ (structure + content check) | Not started |
| `REQ-G-022.05` | Future input: department/team assignments. | `PRD.md` §24 — Future Inputs<br>`IMPLEMENTATION_PLAN.md` §8 — Final Account Phase — Required Future Inputs | Documented ✔ (structure + content check) | Not started |
| `REQ-G-022.06` | Future input: duty schedules. | `PRD.md` §24 — Future Inputs<br>`IMPLEMENTATION_PLAN.md` §8 — Final Account Phase — Required Future Inputs<br>`DATABASE_SCHEMA.md` §3.5 — duty_schedules | Documented ✔ (structure + content check) | Not started |
| `REQ-G-022.07` | Future input: emergency hotline numbers. | `PRD.md` §24 — Future Inputs<br>`IMPLEMENTATION_PLAN.md` §8 — Final Account Phase — Required Future Inputs<br>`DATABASE_SCHEMA.md` §3.21 — hotlines | Documented ✔ (structure + content check) | Not started |
| `REQ-G-022.08` | Future input: final college routing policies. | `PRD.md` §24 — Future Inputs<br>`IMPLEMENTATION_PLAN.md` §8 — Final Account Phase — Required Future Inputs<br>`AI_ROUTING_SPECIFICATION.md` §15 — Configuration and Versioning | Documented ✔ (structure + content check) | Not started |
| `REQ-G-022.09` | Future input: final demo account list. | `PRD.md` §24 — Future Inputs<br>`IMPLEMENTATION_PLAN.md` §8 — Final Account Phase — Required Future Inputs | Documented ✔ (structure + content check) | Not started |

### REQ-G-023 — `final_validation`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-023.01` | Final validation: every confirmed feature is documented. | `PRD.md` §26 — Acceptance Criteria (summary)<br>`IMPLEMENTATION_PLAN.md` §5 — Testing Gates and Final Validation Checklist | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.02` | Final validation: every role has a dedicated interface specification. | `UI_UX_SPECIFICATION.md` §7 — Student Interface<br>`UI_UX_SPECIFICATION.md` §8 — Campus Administration Console<br>`UI_UX_SPECIFICATION.md` §9 — Chief Proctor Workspace<br>`UI_UX_SPECIFICATION.md` §10 — Security Workspace<br>`UI_UX_SPECIFICATION.md` §11 — Medical Workspace<br>`UI_UX_SPECIFICATION.md` §12 — Fire & Safety Workspace<br>`UI_UX_SPECIFICATION.md` §13 — Women Safety Workspace (restricted)<br>`UI_UX_SPECIFICATION.md` §14 — Men Safety Workspace (restricted)<br>`UI_UX_SPECIFICATION.md` §15 — Student Council Workspace<br>`UI_UX_SPECIFICATION.md` §16 — Infrastructure & Facilities Workspace<br>`UI_UX_SPECIFICATION.md` §17 — Transportation Workspace<br>`UI_UX_SPECIFICATION.md` §18 — IT / Digital Safety Workspace<br>`UI_UX_SPECIFICATION.md` §19 — Responder Mode (shared pattern inside every team workspace) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.03` | Final validation: all 10 required documentation files exist. | `PRD.md` §1 — Purpose, Scope, and Status<br>`IMPLEMENTATION_PLAN.md` §5 — Testing Gates and Final Validation Checklist<br>`README.md` (file present) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.04` | Final validation: every requirement is traceable. | `IMPLEMENTATION_PLAN.md` §5 — Testing Gates and Final Validation Checklist<br>`PRD.md` §1 — Purpose, Scope, and Status | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.05` | Final validation: Emergency SOS confirmation flow is documented. | `PRD.md` §5.1 — Step-by-step flow<br>`PRD.md` §5.3 — Behavioural rules (safe interpretations)<br>`UI_UX_SPECIFICATION.md` §7.2 — Emergency SOS flow (mobile-first)<br>`API_SPECIFICATION.md` §6 — Emergency SOS (Student)<br>`ARCHITECTURE.md` §5 — Incident Creation Data Flow | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.06` | Final validation: normal incident flow is documented. | `PRD.md` §6.3 — Flow<br>`UI_UX_SPECIFICATION.md` §7.4 — Report an Incident<br>`API_SPECIFICATION.md` §7 — Standard Reports and My Reports | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.07` | Final validation: live student SOS status is documented. | `UI_UX_SPECIFICATION.md` §7.3 — Live SOS Status<br>`API_SPECIFICATION.md` §6 — Emergency SOS (Student)<br>`ARCHITECTURE.md` §6.1 — Incident status | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.08` | Final validation: My Reports has separate Reports and Emergency SOS views. | `UI_UX_SPECIFICATION.md` §7.6 — My Reports<br>`API_SPECIFICATION.md` §7 — Standard Reports and My Reports<br>`PRD.md` §11.1 — Student | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.09` | Final validation: static 2D map and exact pinning are documented. | `PRD.md` §7 — Location and Campus Map<br>`UI_UX_SPECIFICATION.md` §4 — Core Components<br>`UI_UX_SPECIFICATION.md` §7.2 — Emergency SOS flow (mobile-first)<br>`DATABASE_SCHEMA.md` §8 — Map Coordinate Storage Rules<br>`API_SPECIFICATION.md` §8 — Map and Locations | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.10` | Final validation: maximum two photos are documented. | `PRD.md` §8 — Photo Evidence<br>`DATABASE_SCHEMA.md` §3.11 — attachments<br>`API_SPECIFICATION.md` §9 — File Uploads (Photos) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.11` | Final validation: photo permissions are documented. | `API_SPECIFICATION.md` §9 — File Uploads (Photos)<br>`ARCHITECTURE.md` §7.2 — Access decision (pseudo)<br>`DATABASE_SCHEMA.md` §5 — Row-Level Security (defense in depth) | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.12` | Final validation: unknown-person security photo workflow is documented. | `AI_ROUTING_SPECIFICATION.md` §12 — Photos and the Unknown-Person Workflow<br>`UI_UX_SPECIFICATION.md` §10 — Security Workspace<br>`PRD.md` §8 — Photo Evidence | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.13` | Final validation: AI classification and deterministic routing are documented. | `AI_ROUTING_SPECIFICATION.md` §4 — AI Output Contract (strict JSON, validated with Zod)<br>`AI_ROUTING_SPECIFICATION.md` §7 — Routing Engine<br>`ARCHITECTURE.md` §8 — AI and Routing Architecture | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.14` | Final validation: multi-team assignment is documented. | `AI_ROUTING_SPECIFICATION.md` §11 — Multi-Team Rules<br>`ARCHITECTURE.md` §9.1 — Algorithm | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.15` | Final validation: automatic responder assignment is documented. | `ARCHITECTURE.md` §9 — Dispatch Architecture<br>`AI_ROUTING_SPECIFICATION.md` §10 — Dispatch and Escalation Rules | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.16` | Final validation: Available/Busy/Offline states are documented. | `DATABASE_SCHEMA.md` §3.4 — responder_profiles<br>`AI_ROUTING_SPECIFICATION.md` §10.6 — Availability transitions<br>`PRD.md` §12 — Dispatch and Responder Availability | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.17` | Final validation: responder fallback/reassignment is documented. | `AI_ROUTING_SPECIFICATION.md` §10.4 — Reject or timeout<br>`AI_ROUTING_SPECIFICATION.md` §10.5 — Nobody available<br>`ARCHITECTURE.md` §9.1 — Algorithm | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.18` | Final validation: campus-wide versus restricted notifications are documented. | `AI_ROUTING_SPECIFICATION.md` §9 — Notification Audience Matrix<br>`ARCHITECTURE.md` §10.3 — Campus-wide eligibility and approval<br>`PRD.md` §10 — Notification and Disclosure Rules | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.19` | Final validation: admin View Incident exposes the complete student description and case details. | `API_SPECIFICATION.md` §13.1 — GET /admin/incidents/{id} response (View button)<br>`UI_UX_SPECIFICATION.md` §8.2 — View Incident (full case file)<br>`PRD.md` §13.2 — Incident table | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.20` | Final validation: User Directory contains Campus SOS personnel/responders rather than a student phone directory. | `API_SPECIFICATION.md` §15 — User Directory<br>`UI_UX_SPECIFICATION.md` §8.8 — User Directory<br>`PRD.md` §14 — User Directory | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.21` | Final validation: audit trail is documented. | `PRD.md` §18 — Audit Trail<br>`DATABASE_SCHEMA.md` §3.23 — audit_events (append-only)<br>`API_SPECIFICATION.md` §17 — Audit | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.22` | Final validation: clickable analytics cards are documented. | `UI_UX_SPECIFICATION.md` §8.1 — Overview<br>`PRD.md` §13.1 — Overview cards | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.23` | Final validation: Campus Explore redesign is documented. | `UI_UX_SPECIFICATION.md` §7.5 — Campus Explore (focused Campus Incident Explorer)<br>`PRD.md` §15 — Campus Explore | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.24` | Final validation: Homepage redesign is documented. | `UI_UX_SPECIFICATION.md` §7.1 — Home (rebuilt from scratch)<br>`PRD.md` §16 — Homepage | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.25` | Final validation: mobile-first UI is documented. | `UI_UX_SPECIFICATION.md` §5 — Responsive and Mobile-First Rules<br>`PRD.md` §17 — UI/UX Requirements | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.26` | Final validation: frontend/backend separation is documented. | `ARCHITECTURE.md` §3 — Repository and Module Map<br>`PRD.md` §20 — Frontend / Backend Separation | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.27` | Final validation: demo accounts are explicitly deferred to the end. | `IMPLEMENTATION_PLAN.md` §3.22 — Phase 3.22 — Demo accounts and demo data — last<br>`IMPLEMENTATION_PLAN.md` §8 — Final Account Phase — Required Future Inputs<br>`PRD.md` §21 — Accounts and Demo Data<br>`UI_UX_SPECIFICATION.md` §22 — Development-Only Role Switcher | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.28` | Final validation: existing UI is explicitly not reused. | `PRD.md` §1.3 — Source project policy<br>`UI_UX_SPECIFICATION.md` §21 — Removed and Prohibited UI<br>`IMPLEMENTATION_PLAN.md` §1 — Purpose and Build Approach | Documented ✔ (structure + content check) | Not started |
| `REQ-G-023.29` | Final validation: unnecessary urgency filters are explicitly removed. | `UI_UX_SPECIFICATION.md` §7.5 — Campus Explore (focused Campus Incident Explorer)<br>`UI_UX_SPECIFICATION.md` §21 — Removed and Prohibited UI<br>`PRD.md` §15 — Campus Explore<br>`API_SPECIFICATION.md` §5 — Pagination, Filtering, Sorting<br>`API_SPECIFICATION.md` §14 — Explore and Home | Documented ✔ (structure + content check) | Not started |

### REQ-G-024 — `emergency_access_break_glass`

| ID | Requirement | Documentation sections | Doc status | Build status |
|---|---|---|---|---|
| `REQ-G-024.01` | Emergency Access / Break-Glass Request: Personnel can request temporary emergency access with granular scopes and justification. | `PRD.md` §9<br>`API_SPECIFICATION.md` §21<br>`EMERGENCY_ACCESS_SPECIFICATION.md` §3 | Documented ✔ | Complete ✔ (Tested & Verified) |
| `REQ-G-024.02` | Normal Override vs Critical Break-Glass: Distinct paths for normal approval vs immediate critical life-safety override. | `PRD.md` §9<br>`EMERGENCY_ACCESS_SPECIFICATION.md` §3<br>`API_SPECIFICATION.md` §21 | Documented ✔ | Complete ✔ (Tested & Verified) |
| `REQ-G-024.03` | Granular Scopes: Least-privilege independent scopes (`INCIDENT_VIEW`, `LOCATION_VIEW`, `EVIDENCE_VIEW`, `REPORTER_CONTACT_VIEW`, `REALTIME_ACCESS`, `INCIDENT_UPDATE`, `TEMPORARY_TEAM_ASSIGNMENT`). | `EMERGENCY_ACCESS_SPECIFICATION.md` §4<br>`API_SPECIFICATION.md` §21 | Documented ✔ | Complete ✔ (Tested & Verified) |
| `REQ-G-024.04` | Time-Bound Expiry: Backend-enforced automatic expiration (60m default, 30m critical); background sweep job. | `DATABASE_SCHEMA.md` §3.26<br>`EMERGENCY_ACCESS_SPECIFICATION.md` §6 | Documented ✔ | Complete ✔ (Tested & Verified) |
| `REQ-G-024.05` | Revocation: Authorized supervisors and requesters can immediately terminate active access. | `EMERGENCY_ACCESS_SPECIFICATION.md` §5<br>`API_SPECIFICATION.md` §21 | Documented ✔ | Complete ✔ (Tested & Verified) |
| `REQ-G-024.06` | Post-Hoc Supervisor Review: Critical break-glass triggers mandatory review (`REVIEW_REQUIRED` → `REVIEWED`). | `EMERGENCY_ACCESS_SPECIFICATION.md` §3.2<br>`API_SPECIFICATION.md` §21 | Documented ✔ | Complete ✔ (Tested & Verified) |
| `REQ-G-024.07` | SHA-256 Audit Chain Integration: All lifecycle events and sensitive resource accesses enter tamper-evident audit log. | `DATABASE_SCHEMA.md` §2<br>`EMERGENCY_ACCESS_SPECIFICATION.md` §7 | Documented ✔ | Complete ✔ (Tested & Verified) |
| `REQ-G-024.08` | Authorization Engine Integration: Layered enforcement in `AccessPolicyService` without altering permanent roles. | `ARCHITECTURE.md` §7.2<br>`ARCHITECTURE.md` §7.4 | Documented ✔ | Complete ✔ (Tested & Verified) |

## 4. Ambiguities Recorded (no requirement removed)

Ambiguities and the safe implementation rules chosen are listed in `PRD.md` §25 (A-01 … A-22). Items marked *Confirm* need college confirmation before the final phase. None of them deletes or weakens an original requirement.

## 5. Package Validation Summary

| Check | Result |
|---|---|
| All 23 requirement groups present in register | ✔ |
| All 189 sub-requirements resolve to existing sections/files | ✔ |
| Six live SOS states in UI | ✔ |
| Six live SOS states in API | ✔ |
| Dedicated UI section: Student Interface | ✔ |
| Dedicated UI section: Campus Administration Console | ✔ |
| Dedicated UI section: Chief Proctor Workspace | ✔ |
| Dedicated UI section: Security Workspace | ✔ |
| Dedicated UI section: Medical Workspace | ✔ |
| Dedicated UI section: Fire & Safety Workspace | ✔ |
| Dedicated UI section: Women Safety Workspace | ✔ |
| Dedicated UI section: Men Safety Workspace | ✔ |
| Dedicated UI section: Student Council Workspace | ✔ |
| Dedicated UI section: Infrastructure & Facilities Workspace | ✔ |
| Dedicated UI section: Transportation Workspace | ✔ |
| Dedicated UI section: IT / Digital Safety Workspace | ✔ |
| SOS explicit confirmation (PRD) | ✔ |
| SOS confirm endpoint with idempotency (API) | ✔ |
| No priority selector for student | ✔ |
| My Reports two tabs (UI) | ✔ |
| Normalized pin coordinates (DB) | ✔ |
| Max two photos (DB trigger/API) | ✔ |
| Photo access matrix (API) | ✔ |
| Unknown-person no identification (AI) | ✔ |
| Security sees six fields (AI) | ✔ |
| Deterministic routing pure function (AI) | ✔ |
| Fallback rule classifier (AI) | ✔ |
| Multi-team rules (AI) | ✔ |
| Auto dispatch algorithm (ARCH) | ✔ |
| Duty states in DB enum | ✔ |
| No inactivity auto-offline (DB CHECK) | ✔ |
| Nobody available escalation (AI) | ✔ |
| Campus-wide vs restricted matrix (AI) | ✔ |
| Admin View full_description (API) | ✔ |
| Directory excludes students (API) | ✔ |
| Audit append-only + events (DB) | ✔ |
| Clickable analytics cards (UI) | ✔ |
| Explore redesign removals (UI) | ✔ |
| Homepage removals (UI) | ✔ |
| Mobile-first priority list (UI) | ✔ |
| Frontend/backend independent (ARCH) | ✔ |
| Demo accounts deferred (PLAN) | ✔ |
| Existing UI not reused (UI) | ✔ |
| Dev-only role switcher (UI) | ✔ |
| Mermaid diagrams in ARCHITECTURE (>=4) | ✔ |
| Mermaid ER diagram in DB | ✔ |
| Balanced code fences: PRD | ✔ |
| Balanced code fences: TECH | ✔ |
| Balanced code fences: ARCH | ✔ |
| Balanced code fences: DB | ✔ |
| Balanced code fences: API | ✔ |
| Balanced code fences: UI | ✔ |
| Balanced code fences: AI | ✔ |
| Balanced code fences: PLAN | ✔ |
| Urgency/Low-Medium-High only in removal context | ✔ |
| No fake accounts/placeholder data in docs | ✔ |

**Overall documentation validation: PASS** (54/54 content checks passed; 0 unresolved references).

## 6. Maintenance
When a document section is renumbered, update the mapping and re-run validation. New requirements must receive a new sub-ID, appear in `PRD.md`, and be mapped here before they are built.
