# Campus SOS — Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Product | Campus SOS |
| Document | PRD |
| Version | 1.0 (documentation-first release) |
| Source of truth | `docs/CAMPUS_SOS_MASTER_GENERATION_SPEC.json` |
| Generation mode | `DOCUMENTATION_FIRST` — no production application is implemented by this package |

> **How to read requirement IDs.** Every requirement in the master specification has an ID of the form `REQ-G-<group>.<n>`. Group IDs (`REQ-G-001` … `REQ-G-023`) come from the JSON's `requirement_id_groups`. Sub-IDs split each group into individually testable statements. The full ID → documentation mapping is in `REQUIREMENTS_TRACEABILITY.md`.

---

## 1. Purpose, Scope, and Status

**Campus SOS** is a campus safety and emergency-response platform for a college campus. Students report emergencies and ordinary incidents with a description, optional photos, and an exact pin on the campus map. The platform classifies the report with AI, routes it with deterministic configurable rules to the correct specialized teams, dispatches an available responder automatically, and keeps students and authorized personnel informed — without exposing sensitive cases to people who should not see them.

### 1.1 In scope for this documentation package
- Product requirements, architecture, data model, API contract, UI/UX system, AI + routing rules, tech stack, phased implementation plan, and traceability.
- Role-specific interface specifications for all 12 roles (plus the responder working mode).
- Explicit safe rules for every ambiguity found in the master specification (see §25).

### 1.2 Out of scope for this package
- Writing the production application (the build follows `IMPLEMENTATION_PLAN.md`).
- Real or demo accounts, real team members, real hotline numbers, the actual campus map image, and final college routing policies. These are **future inputs** (§24) supplied before the final phase.

### 1.3 Source project policy
The previous project (`CampusSOS-master (2).zip`) is a **functional reference only**. The following must **not** be copied: existing UI, visual design, architecture, demo accounts, fake incidents, fake statistics, fake notifications, fake audit records.

### Requirements — Project, Global Rules, Output Package
| ID | Requirement |
|---|---|
| `REQ-G-001.01` | Generation mode is DOCUMENTATION_FIRST: generate the specification package first; do not implement the production application yet. |
| `REQ-G-001.02` | The source project (CampusSOS-master (2).zip) is a functional reference only. |
| `REQ-G-001.03` | Must not copy from the source project: existing UI, visual design, architecture, demo accounts, fake incidents, fake statistics, fake notifications, fake audit records. |
| ID | Requirement |
|---|---|
| `REQ-G-002.01` | Preserve every requirement. |
| `REQ-G-002.02` | Do not silently omit or reinterpret any requirement. |
| `REQ-G-002.03` | If ambiguous, document the ambiguity and propose a safe implementation rule without deleting the original requirement. |
| `REQ-G-002.04` | Every requirement must be mapped to generated documentation (traceability). |
| `REQ-G-002.05` | Validate before zip. |
| `REQ-G-002.06` | No fake production data. |
| ID | Requirement |
|---|---|
| `REQ-G-020.01` | Required file docs/PRD.md: complete product requirements, scope, personas, workflows, requirements, acceptance criteria. |
| `REQ-G-020.02` | Required file docs/TECH_STACK.md: frontend, backend, database, auth, AI, realtime, notification, storage, testing, deployment, observability. |
| `REQ-G-020.03` | Required file docs/ARCHITECTURE.md: system architecture, module boundaries, data flows, security, realtime, AI/routing, dispatch, notification architecture, Mermaid diagrams. |
| `REQ-G-020.04` | Required file docs/DATABASE_SCHEMA.md: entities, fields, types, constraints, relationships, indexes, permissions, statuses, incidents, attachments, map coordinates, notifications, assignments, audit. |
| `REQ-G-020.05` | Required file docs/API_SPECIFICATION.md: endpoints, authentication, authorization, requests, responses, validation, errors, pagination, file uploads, realtime events. |
| `REQ-G-020.06` | Required file docs/UI_UX_SPECIFICATION.md: from-scratch design system and all role-specific screens, navigation, components, responsive/mobile behavior, states and interactions. |
| `REQ-G-020.07` | Required file docs/AI_ROUTING_SPECIFICATION.md: AI input/output contract, taxonomy, routing matrix, audience matrix, fallback, escalation, multi-team rules, test cases. |
| `REQ-G-020.08` | Required file docs/IMPLEMENTATION_PLAN.md: phased Antigravity build plan, dependencies, milestones, testing gates, integration, UI review, final account phase. |
| `REQ-G-020.09` | Required file docs/REQUIREMENTS_TRACEABILITY.md: every requirement ID mapped to exact documentation sections with validation status. |
| `REQ-G-020.10` | Required file README.md: master index and instructions for using all generated documentation. |
| `REQ-G-020.11` | Zip output campus_sos_specification_package.zip containing every required output file plus the JSON source specification at docs/CAMPUS_SOS_MASTER_GENERATION_SPEC.json; no missing files; no unrequested clutter. |

---

## 2. Product Principles

1. **A safety platform, not a dashboard.** Every screen exists to help someone report, respond, or stay informed. Decorative analytics and marketing copy are excluded.
2. **Emergency SOS first.** It is the highest-priority workflow, reachable in one tap from the student home and from any student screen.
3. **Two reporting lanes.** *Emergency SOS* = major, immediate emergencies. *Report an Incident* = normal, non-immediate concerns. Students never pick a "priority level".
4. **AI structures, rules decide.** AI classifies and extracts; a deterministic, configurable routing engine decides teams and audiences. AI is never the sole routing authority.
5. **Administration sees everything; teams see what is relevant.** Every access to a restricted case is audited.
6. **Privacy by default.** Sensitive incidents are never broadcast to students; photos are not public.
7. **Resilient by design.** If AI, SMS, push, or a single responder fails, the emergency still reaches a human.
8. **Maintainable.** Frontend and backend are independent applications with documented contracts.
9. **No fake production data.** Accounts and demo data are created last.

### Requirements — Principles
| ID | Requirement |
|---|---|
| `REQ-G-003.01` | Campus SOS is a campus safety and emergency-response platform, not a generic AI dashboard. |
| `REQ-G-003.02` | Emergency SOS is the highest-priority workflow for major immediate emergencies. |
| `REQ-G-003.03` | Report an Incident is for normal/non-immediate campus issues and concerns. |
| `REQ-G-003.04` | AI classifies and structures the report; deterministic routing rules decide teams and notification audiences. |
| `REQ-G-003.05` | Campus Administration has visibility into every incident. |
| `REQ-G-003.06` | Specialized teams receive relevant cases. |
| `REQ-G-003.07` | Sensitive incidents are not automatically broadcast to students. |
| `REQ-G-003.08` | Photos are evidence and are available to Campus Administration and all teams assigned to the incident. |
| `REQ-G-003.09` | Emergency workflows remain operational when one external service or responder fails. |
| `REQ-G-003.10` | Frontend and backend are completely separated for maintainability. |
| `REQ-G-003.11` | Real/demo accounts are created only at the final stage. |

---

## 3. Personas and Roles

| Role | Primary persona | Typical device | Interface |
|---|---|---|---|
| Student | Reporter and recipient of safety notifications | Phone (mobile-first) | Student App |
| Campus Administration | Control-room operator, campus authority | Desktop / tablet | Admin Console |
| Chief Proctor | Disciplinary and conduct authority | Desktop / phone | Proctor Workspace |
| Security | Guards, security supervisors | Phone + control-room desktop | Security Workspace |
| Medical | Doctors, nurses, medical responders | Phone | Medical Workspace |
| Fire & Safety | Fire marshals, safety officers | Phone | Fire & Safety Workspace |
| Women Safety / Women Club | Restricted welfare responders | Phone | Women Safety Workspace |
| Men Safety / Men Harassment Team | Restricted welfare responders | Phone | Men Safety Workspace |
| Student Council | Student grievance and welfare representatives | Phone / desktop | Student Council Workspace |
| Infrastructure & Facilities | Electrical, water, building, maintenance | Phone | Facilities Workspace |
| Transportation / Traffic | Transport, parking, road blockage | Phone | Transport Workspace |
| IT / Digital Safety | Cyber and digital-safety staff | Desktop / phone | Digital Safety Workspace |

**Responder** is not a separate login role: a responder is a *team member* with a duty state (Available / Busy / Offline) who can be auto-assigned a case. **Team coordinator** is a team member flagged to receive escalations when no responder is available.

Teachers and non-teaching staff are not a distinct role in the master spec; they can be recipients of notifications as logged-in users (see §10) and are modelled as `user_type = staff` with no case-handling permissions unless they also hold a team role.

---

## 4. Glossary

| Term | Meaning |
|---|---|
| Incident | Any record created by Emergency SOS or Report an Incident |
| Workflow | `EMERGENCY_SOS` or `STANDARD_REPORT` |
| Pin | Normalized `(x, y)` position on the static campus map, each in `[0,1]` |
| Domain / Category | Classified type of incident (taxonomy in `AI_ROUTING_SPECIFICATION.md`) |
| Routing decision | Deterministic output: teams, audiences, restrictions, escalation flags |
| Team audience | Teams that act on or must know about an incident |
| Campus-wide notification | Sanitized safety notice to all logged-in users |
| Dispatch | Automatic assignment of a specific available responder |
| Emergency Assist | Guided intake + safety guidance experience inside Emergency SOS |

---

## 5. Emergency SOS Workflow

Emergency SOS handles major immediate emergencies: serious fire hazards, major accidents, major blocked routes, serious security threats, major fights/quarrels, and other immediate emergencies.

### 5.1 Step-by-step flow
| # | Step | Notes |
|---|---|---|
| 1 | Student selects **Emergency SOS** | One tap from Home and bottom navigation |
| 2 | **Emergency Assist** asks what happened | Single clear prompt; emergency contacts always visible |
| 3 | Student enters a description | Text (voice-to-text optional via device keyboard); minimum length is 1 character, so help is never blocked |
| 4 | Student may attach **up to 2 photos** | Optional; camera or gallery |
| 5 | Student selects a **predefined campus location** when useful | Optional; room, classroom, laboratory, block, library, canteen, parking, ground, hostel, other |
| 6 | Student places an **exact pin** on the static 2D campus map | Tap/click; normalized coordinates stored |
| 7 | **AI classifies** the description | Falls back to rule-based classification if AI is unavailable |
| 8 | **Routing engine** determines teams and notification audience | Deterministic and configurable |
| 9 | Student sees a **confirmation screen** | Shows description, location/pin, photos, and teams that will be alerted |
| 10 | Student **explicitly confirms** | Large primary button; nothing is dispatched before this |
| 11 | **Emergency is created** | Incident ID issued; audit event `SOS_CONFIRMED` |
| 12 | Relevant teams/responders are **notified** | Multi-channel with redundancy |
| 13 | **Automatic responder assignment** begins | See §12 |
| 14 | Student receives the **live status screen** | Six states in §11.1 |

### 5.2 Priority
- Emergency SOS is always the highest-priority workflow.
- The student has **no** priority selector (`student_priority_selection = false`).
- Dispatch queues order SOS incidents ahead of all standard reports.

### 5.3 Behavioural rules (safe interpretations)
- **Draft, not incident.** Steps 1–9 create only a *draft* held on the device and server-side draft store. An incident exists only after step 10.
- **Fast path.** Description alone is enough to reach confirmation; location and photos are optional so the flow stays under ~30 seconds.
- **Offline / poor network.** The confirmation action queues locally and retries; the screen always shows the campus hotline numbers and a "Call now" button so a phone call is available when data is not.
- **Abuse control.** False-alarm patterns are flagged for Campus Administration review (rate limits and audit), never auto-banning a student during a live emergency.
- **AI-unavailable path.** The confirmation screen still shows a rule-based classification and teams; the student is never told "AI failed".

### Requirements — Reporting (shared by §5 and §6)
| ID | Requirement |
|---|---|
| `REQ-G-004.01` | Emergency SOS purpose: major campus emergencies such as serious fire hazards, major accidents, major blocked routes, serious security threats, major fights/quarrels, and other immediate emergencies. |
| `REQ-G-004.02` | Emergency SOS flow (14 steps): select SOS; Emergency Assist asks what happened; enter description; attach up to 2 photos; select predefined location when useful; place exact pin on static 2D map; AI classifies; routing engine determines teams and audience; confirmation screen; explicit confirmation; emergency created; relevant teams/responders notified; automatic responder assignment begins; live status screen. |
| `REQ-G-004.03` | Emergency SOS is always the highest-priority workflow; the student has no priority selection. |
| `REQ-G-004.04` | Student sees a confirmation screen and must explicitly confirm before the emergency is created. |
| `REQ-G-004.05` | Report an Incident purpose: normal campus reports, complaints, concerns, and non-immediate incidents. |
| `REQ-G-004.06` | Report an Incident fields: incident description, category, predefined campus location, exact map pin, optional maximum 2 photos. |

---

## 6. Report an Incident Workflow

Used for normal campus reports, complaints, concerns, and non-immediate incidents.

### 6.1 Fields
| Field | Required | Notes |
|---|---|---|
| Incident description | Yes | Free text |
| Category | Yes | Student-chosen from the category list; AI also classifies independently (see A-03 in §25) |
| Predefined campus location | Yes | room, classroom, laboratory, block, library, canteen, parking, ground, hostel, other |
| Exact map pin | Yes | Normalized coordinates on the static 2D map |
| Photos | Optional | Maximum 2 |

### 6.2 Student category list (proposed, configurable)
Fire / Fire hazard · Accident / Medical · Fight or quarrel · Teacher or staff misconduct · Student misconduct · Harassment · Unknown person / suspicious activity · Blocked road or path · Infrastructure hazard (electrical, water, building) · Cyber / digital issue · Grievance / welfare · Other.

### 6.3 Flow
1. Student opens **Report an Incident**.
2. Enters description, chooses category, location, drops pin, optionally attaches photos.
3. Review screen: AI classification result and the teams that will receive the case (sensitive categories show only "Relevant authorized team").
4. Student submits; incident is created with `workflow = STANDARD_REPORT`.
5. Routing, notification, and (configurable) dispatch run exactly as for SOS, with standard-priority timeouts.
6. Student follows progress in **My Reports → Reports**.

### 6.3.1 Escalation to SOS
If the AI or the rule engine detects immediate danger in a standard report, the system **does not silently upgrade it**; it shows the student an "Is this an emergency right now?" prompt that opens Emergency SOS with the draft pre-filled, and flags the report to Campus Administration (rule `R-ESC-001`).

---

## 7. Location and Campus Map

- The map is an **uploaded static 2D campus map image** managed by Campus Administration (Settings → Campus Map).
- GPS is **not** the primary location mechanism. (Optional device GPS may be offered later as a hint only; it never replaces the pin.)
- The student taps/clicks to place the exact pin. The stored value is normalized `x`, `y` in `[0,1]` relative to the image's width and height, so it stays accurate at any screen size.
- Administration and teams see the same exact pin. Campus Explore displays incident pins on the same map (subject to privacy filtering, §15).
- Predefined locations: room, classroom, laboratory, block, library, canteen, parking, ground, hostel, other. Each has a configurable name (e.g., "Block C — Lab 3") and an optional default map anchor used to *suggest* a pin location; the student's pin always wins.

### Requirements — Location
| ID | Requirement |
|---|---|
| `REQ-G-005.01` | Map type is an uploaded static 2D college campus map image. |
| `REQ-G-005.02` | GPS is not the primary location mechanism. |
| `REQ-G-005.03` | Student can tap/click the map to place the exact incident pin. |
| `REQ-G-005.04` | Store normalized relative X/Y coordinates so the pin remains accurate at different screen sizes. |
| `REQ-G-005.05` | Administration and teams see the same exact pin. |
| `REQ-G-005.06` | Campus Explore displays incident pins on the same campus map. |
| `REQ-G-005.07` | Predefined locations: room, classroom, laboratory, block, library, canteen, parking, ground, hostel, other. |

---

## 8. Photo Evidence

- Up to **2 photos** per incident, always optional.
- Usable for fire hazards, blocked road/path, unknown person/security alert, accidents, infrastructure hazards, and other evidence-based incidents.
- Photos are **evidence**, not public content. They are visible only to Campus Administration, every team and person assigned to the incident, and the reporter.
- **Unknown-person workflow.** A student may upload a photo of an unknown person. Security sees photo, description, map pin, time, category, and status. The platform **never** identifies the person automatically (no face recognition, no AI identity guessing).
- Safe handling: private object storage, signed short-lived URLs, EXIF location/metadata stripped for display, malware/type validation, size and format limits (see `API_SPECIFICATION.md` §9).

### Requirements — Photos
| ID | Requirement |
|---|---|
| `REQ-G-006.01` | Photos are optional with a maximum of 2 per incident. |
| `REQ-G-006.02` | Photos are usable for fire hazard, blocked road/path, unknown person/security alert, accident, infrastructure hazard, and other evidence-based incidents. |
| `REQ-G-006.03` | Photo access: Campus Administration and every team/person assigned to the incident. |
| `REQ-G-006.04` | Photos are not public by default. |
| `REQ-G-006.05` | Unknown-person workflow: student can upload a photo. |
| `REQ-G-006.06` | Security sees photo, description, map pin, time, category, and status in the unknown-person workflow. |
| `REQ-G-006.07` | Do not automatically identify the person in the photo. |

---

## 9. AI Classification and Routing

Detailed in `AI_ROUTING_SPECIFICATION.md`. Product-level rules:

- AI **understands** the description, **classifies** the category, **extracts** structured information, produces **structured routing input**, and provides **reasoning/metadata** to authorized personnel where appropriate.
- AI **must not**: invent campus authority policy, be the sole routing authority, identify people from photographs, or decide public disclosure of sensitive cases.
- The **routing engine** is deterministic, configurable, supports **multi-team assignment**, and provides a configured **rule-based fallback** if AI is unavailable.
- Routing examples (fire, accident/medical, fight, teacher/student misconduct, women/men harassment, unknown person, blocked route, infrastructure, cyber) are encoded as default rules in the routing matrix.

### Requirements — AI and Routing
| ID | Requirement |
|---|---|
| `REQ-G-007.01` | AI duties: understand the student description, classify category, extract structured information, produce structured routing input, provide reasoning/metadata for authorized personnel where appropriate. |
| `REQ-G-007.02` | AI must not: invent campus authority policy, be the sole routing authority, automatically identify people from photographs, decide public disclosure of sensitive cases. |
| `REQ-G-007.03` | Routing engine is deterministic and configurable. |
| `REQ-G-007.04` | Routing engine supports multi-team assignment. |
| `REQ-G-007.05` | If AI is unavailable, use the configured rule-based classification/routing fallback. |
| `REQ-G-007.06` | Routing examples: fire/fire hazard; accident/medical; fight/quarrel; teacher misconduct; student misconduct; women harassment; men harassment; unknown person; blocked route; infrastructure hazard; cyber/digital. |

---

## 10. Notification and Disclosure Rules

- Logged-in users can receive appropriate campus safety notifications when notifications are enabled.
- **Campus-wide when relevant:** major fire, major fire hazard, major campus route blockage, major security threat, campus-wide safety danger, major environmental/safety hazard, event requiring students to avoid an area.
- **Restricted examples:** teacher misconduct, student misconduct, harassment, individual medical case, personal grievance, student-teacher dispute, disciplinary matter.
- Principle: *notify people who need to act and people who need to know; do not notify people who should not receive the information.*
- Sensitive case details are **never broadcast to all students by default.**
- Campus-wide notices contain **sanitized** text only (no reporter identity, no individuals' names, no photos by default). See `ARCHITECTURE.md` §10 and `AI_ROUTING_SPECIFICATION.md` §9 for the audience matrix.

### Requirements — Notifications
| ID | Requirement |
|---|---|
| `REQ-G-008.01` | Logged-in users can receive appropriate campus safety notifications when notifications are enabled. |
| `REQ-G-008.02` | Campus-wide when relevant: major fire, major fire hazard, major campus route blockage, major security threat, campus-wide safety danger, major environmental/safety hazard, event requiring students to avoid an area. |
| `REQ-G-008.03` | Restricted examples: teacher misconduct, student misconduct, harassment, individual medical case, personal grievance, student-teacher dispute, disciplinary matter. |
| `REQ-G-008.04` | Principle: notify people who need to act and people who need to know; do not notify people who should not receive the information. |
| `REQ-G-008.05` | Never broadcast sensitive case details to all students by default. |

---

## 11. Role Scopes and Interfaces

Each role has a **purpose-built interface** (see `UI_UX_SPECIFICATION.md` §§7–19), not one generic dashboard with hidden widgets.

### 11.1 Student
- Navigation: Home, Emergency SOS, Emergency Assist, Report an Incident, Campus Explore, My Reports, Notifications, Emergency Contacts.
- **My Reports** has two tabs: **Reports** (normal incident submissions) and **Emergency SOS** (SOS submissions). Details: status, assigned teams, timeline, location, category, relevant case information. *Assigned teams* for restricted categories show the team name only (no member names) as a privacy-safe default.
- **Live SOS status:** Emergency Created → Teams Notified → Responder Assigned → Responder On the Way → Responder At Location → Resolved.

### 11.2 Campus Administration
Scope: everything on campus, with full incident visibility. Interface: Overview, All Incidents, Active Emergencies/Dispatch, Resolved Incidents, Campus Map, Teams, Responders, User Directory, Analytics/Statistics, Notifications, Audit Trail, Settings.

### 11.3 Chief Proctor
Disciplinary/conduct matters. Receives: student misconduct, teacher/staff misconduct, student-teacher disputes, fights, quarrels, harassment, other configured disciplinary cases. **Should not receive by default:** routine medical, routine infrastructure, unrelated technical issues, unrelated transportation cases.

### 11.4 Security
Physical security. Receives: unknown person, suspicious activity, unauthorized access, fights, security threats, campus safety alerts.

### 11.5 Medical
Medical emergencies and accidents. Receives: collapse, injury, accident, illness, bee sting, other medical emergency. **First-aid guidance enabled:** conservative basic guidance only while professional medical help is responding; never diagnose; never delay professional care.

### 11.6 Fire & Safety · 11.7 Women Safety (restricted) · 11.8 Men Safety (restricted) · 11.9 Student Council · 11.10 Infrastructure & Facilities · 11.11 Transportation · 11.12 IT / Digital Safety
Scopes as listed in the requirements below. Women Safety and Men Safety are **restricted**: case visibility is limited to the team, Chief Proctor (when routed), Campus Administration, and security only if immediate danger.

### Requirements — Roles
| ID | Requirement |
|---|---|
| `REQ-G-009.01` | Student interface: Home, Emergency SOS, Emergency Assist, Report an Incident, Campus Explore, My Reports, Notifications, Emergency Contacts. |
| `REQ-G-009.02` | My Reports has tabs Reports (normal incident submissions) and Emergency SOS (SOS submissions) showing status, assigned teams, timeline, location, category, relevant case information. |
| `REQ-G-009.03` | Live SOS status: Emergency Created, Teams Notified, Responder Assigned, Responder On the Way, Responder At Location, Resolved. |
| `REQ-G-009.04` | Campus Administration scope is everything on campus with interface: Overview, All Incidents, Active Emergencies/Dispatch, Resolved Incidents, Campus Map, Teams, Responders, User Directory, Analytics/Statistics, Notifications, Audit Trail, Settings. |
| `REQ-G-009.05` | Campus Administration has full incident visibility. |
| `REQ-G-009.06` | Chief Proctor scope: disciplinary/conduct matters; receives student misconduct, teacher/staff misconduct, student-teacher disputes, fights, quarrels, harassment, other configured disciplinary cases. |
| `REQ-G-009.07` | Chief Proctor should not receive by default: routine medical, routine infrastructure, unrelated technical issues, unrelated transportation cases. |
| `REQ-G-009.08` | Security scope: physical security; receives unknown person, suspicious activity, unauthorized access, fights, security threats, campus safety alerts. |
| `REQ-G-009.09` | Medical scope: medical emergencies and accidents; receives collapse, injury, accident, illness, bee sting, other medical emergency. |
| `REQ-G-009.10` | Medical first aid enabled: only conservative basic first-aid guidance while professional medical help is responding; never diagnose or delay professional care. |
| `REQ-G-009.11` | Fire & Safety scope: fire and safety hazards. |
| `REQ-G-009.12` | Women Safety scope: women safety and women harassment; restricted. |
| `REQ-G-009.13` | Men Safety scope: men safety and men harassment; restricted. |
| `REQ-G-009.14` | Student Council scope: student grievances, welfare, and configured student-teacher/student-campus concerns. |
| `REQ-G-009.15` | Infrastructure & Facilities scope: infrastructure, electrical, water, building, maintenance, and facility hazards. |
| `REQ-G-009.16` | Transportation scope: road blockage, transport, traffic, parking, vehicle incidents. |
| `REQ-G-009.17` | IT/Digital Safety scope: cyber incidents, digital harassment, account/security, network/digital safety. |

---

## 12. Dispatch and Responder Availability

- **Mode:** the system automatically assigns a specific available responder and notifies the relevant team.
- **Availability states:** Available (on duty, eligible), Busy (handling an assigned case), Offline (off duty/unavailable). Example: Dr. Mahika is assigned a medical case → Busy → Available after finishing → Offline when off duty.
- **Fallback:** reject or no response within the configured period → try another eligible responder; multiple responders required → assign several; nobody available → escalate to the relevant team coordinator/administration; team-level awareness stays active after individual assignment.
- **No inactivity auto-offline:** the system never sets a responder Offline merely because the app is idle. Offline changes come from the responder, Campus Administration, or a configured duty schedule.
- Full algorithm: `ARCHITECTURE.md` §9 and `AI_ROUTING_SPECIFICATION.md` §10.

### Requirements — Dispatch
| ID | Requirement |
|---|---|
| `REQ-G-010.01` | Dispatch mode: automatically assign a specific available responder and notify the relevant team. |
| `REQ-G-010.02` | Responder states: Available (on duty, eligible), Busy (handling an assigned case), Offline (off duty/unavailable). |
| `REQ-G-010.03` | Example lifecycle: Dr. Mahika is assigned a medical case, becomes Busy, becomes Available after finishing, and is Offline when off duty. |
| `REQ-G-010.04` | If a responder rejects or does not respond within a configured period, try another eligible responder. |
| `REQ-G-010.05` | If multiple responders are required, assign multiple responders. |
| `REQ-G-010.06` | If nobody is available, escalate to the relevant team coordinator/administration. |
| `REQ-G-010.07` | Team-level awareness remains active after individual assignment. |
| `REQ-G-010.08` | No inactivity auto-offline. |

---

## 13. Campus Administration Console

### 13.1 Overview cards
Total Incidents · Active Emergencies · Resolved Incidents · Average Response Time · Incidents by Domain/Category. Each card is clickable (Total → all incident statistics/history; Active → dispatch page; Resolved → resolved page; Average Response Time → detailed response analytics).

### 13.2 Incident table
Columns: ID, Type, Category, Priority/Workflow, Location, Status, Time, Action. The **View** button opens the complete case file including the *full student description*, all routing/AI data, photos, notification history, response timeline, status history, resolution details and audit history.

### Requirements — Admin
| ID | Requirement |
|---|---|
| `REQ-G-011.01` | Overview cards: Total Incidents, Active Emergencies, Resolved Incidents, Average Response Time, Incidents by Domain/Category. |
| `REQ-G-011.02` | Click actions: Total Incidents opens all incident statistics/history; Active Emergencies opens dispatch page; Resolved Incidents opens resolved page; Average Response Time opens detailed response analytics. |
| `REQ-G-011.03` | Category analytics are provided. |
| `REQ-G-011.04` | Incident table columns: ID, Type, Category, Priority/Workflow, Location, Status, Time, Action. |
| `REQ-G-011.05` | A View button is required on each incident. |
| `REQ-G-011.06` | View must show: full student description, incident ID, report type, category, workflow, predefined location, exact map pin, date/time, authorized reporter information, AI classification, AI reasoning where appropriate, routing decision, assigned teams, assigned responders, photos, notification history, response timeline, status history, resolution details, audit history. |

---

## 14. User Directory

A directory of **Campus SOS personnel**, not of students. Contains administrators, team members, responders, and relevant department/team contacts. It must never be a directory of every student's phone number.

### Requirements — User Directory
| ID | Requirement |
|---|---|
| `REQ-G-012.01` | User Directory must not be a directory of every student's phone number. |
| `REQ-G-012.02` | User Directory includes Campus SOS administrators, team members, responders, and relevant department/team contacts. |
| `REQ-G-012.03` | User Directory fields: name, department/team, designation, role, phone, email where appropriate, availability where appropriate. |

---

## 15. Campus Explore

A focused **Campus Incident Explorer**: static 2D map, incident pins, recent campus incidents, status, and recent campus activity. The urgency filter, the Low/Medium/High urgency system, the generic system urgency filter, the unnecessary response-protocol section, and the generic AI distress-analysis marketing section are **removed**. Sensitive incidents are sanitized or excluded per the viewer's permissions (visibility matrix in `ARCHITECTURE.md` §10.4).

### Requirements — Campus Explore
| ID | Requirement |
|---|---|
| `REQ-G-013.01` | Campus Explore is a focused Campus Incident Explorer with static 2D campus map, incident pins, recent campus incidents, status, recent campus activity. |
| `REQ-G-013.02` | Remove from Explore: urgency filter, Low/Medium/High urgency system, generic system urgency filter, unnecessary response protocol section, generic AI distress-analysis marketing section. |
| `REQ-G-013.03` | Sensitive incidents are sanitized or excluded according to access permissions. |

---

## 16. Homepage

Rebuilt from scratch. Primary actions: **Emergency SOS** and **Report an Incident**. Sections: primary actions, on-duty teams, recent campus activity, emergency contacts, appropriate safety notifications. Removed: generic Live Campus Dispatch section, generic AI marketing, fake statistics/activity/operational data. Emergency hotlines are configurable 24/7 campus emergency contacts.

### Requirements — Homepage
| ID | Requirement |
|---|---|
| `REQ-G-014.01` | Homepage is rebuilt from scratch. |
| `REQ-G-014.02` | Homepage primary actions: Emergency SOS and Report an Incident. |
| `REQ-G-014.03` | Homepage sections: primary actions, on-duty teams, recent campus activity, emergency contacts, appropriate safety notifications. |
| `REQ-G-014.04` | Remove from Homepage: generic Live Campus Dispatch section, generic AI marketing, fake statistics, fake activity, fake operational data. |
| `REQ-G-014.05` | Emergency hotlines are configurable 24/7 campus emergency contacts. |

---

## 17. UI/UX Requirements

From-scratch design; clean, elegant, modern, professional, minimal, accessible, mobile-first, responsive, fast. Avoid generic AI dashboards, excessive gradients/glassmorphism, unnecessary cards, clutter, decorative emergency distractions, inconsistent components, fake metrics, and template-like AI UI. Mobile priority: Emergency SOS, Emergency Assist, map pinning, photo upload, notifications, live SOS status, My Reports. Full specification: `UI_UX_SPECIFICATION.md`.

### Requirements — UI/UX
| ID | Requirement |
|---|---|
| `REQ-G-015.01` | UI/UX is designed from scratch. |
| `REQ-G-015.02` | UI quality: clean, elegant, modern, professional, minimal, interactive where useful, clear visual hierarchy, consistent spacing, consistent typography, purposeful motion, accessible, mobile-first, responsive, fast, uncluttered. |
| `REQ-G-015.03` | Avoid: generic AI dashboard, excessive gradients, excessive glassmorphism, unnecessary cards, visual clutter, decorative emergency distractions, inconsistent components, fake metrics, template-like AI UI. |
| `REQ-G-015.04` | Mobile priority: Emergency SOS, Emergency Assist, map pinning, photo upload, notifications, live SOS status, My Reports. |
| `REQ-G-015.05` | Each role has its own purpose-built interface rather than one generic dashboard with random widgets hidden. |

---

## 18. Audit Trail

Audit logging is required for every event listed below and produces a chronological case history visible only to authorized personnel. Records are append-only.

### Requirements — Audit
| ID | Requirement |
|---|---|
| `REQ-G-016.01` | Audit logging is required. |
| `REQ-G-016.02` | Audited events: incident created, SOS confirmed, AI classification, routing decision, notification sent, responder assigned, responder accepted, responder rejected, reassignment, status changes, resolution, admin actions, team assignment changes, relevant permission/access events. |
| `REQ-G-016.03` | Timeline: chronological case history visible to authorized personnel. |

---

## 19. Security and Privacy

### Requirements — Security and Privacy
| ID | Requirement |
|---|---|
| `REQ-G-017.01` | Role-based access control. |
| `REQ-G-017.02` | Team-based authorization. |
| `REQ-G-017.03` | Incident-level access. |
| `REQ-G-017.04` | Secure photo storage. |
| `REQ-G-017.05` | Audit logging. |
| `REQ-G-017.06` | Secure authentication. |
| `REQ-G-017.07` | Least privilege. |
| `REQ-G-017.08` | Privacy-aware notification rules. |
| `REQ-G-017.09` | No public sensitive incident details. |

---

## 20. Frontend / Backend Separation

The repository is split into `frontend/` (independent application), `backend/` (independent application), `docs/` (this package), and `contracts/` (OpenAPI + JSON Schema + event schemas). A second developer must be able to find UI, API, AI, routing, notifications, dispatch, database, authentication, and audit code immediately (module map in `ARCHITECTURE.md` §3).

### Requirements — Frontend/Backend
| ID | Requirement |
|---|---|
| `REQ-G-018.01` | Frontend and backend are independent applications (required). |
| `REQ-G-018.02` | Documentation lives in a separate docs directory. |
| `REQ-G-018.03` | Documented API/data contracts between frontend and backend. |
| `REQ-G-018.04` | A second developer can locate UI, API, AI, routing, notifications, dispatch, database, authentication, and audit code without navigating an unstructured monolith. |

---

## 21. Accounts and Demo Data

During foundational development, all role interfaces are built using a **development-only** role switcher and mocked adapters (compiled out of production builds). Real accounts are created at the very end after the user supplies names, teams, contacts, duty statuses, and roles. No fake data is seeded into any production-capable environment.

### Requirements — Accounts
| ID | Requirement |
|---|---|
| `REQ-G-019.01` | Current phase: build all interfaces and role architecture now. |
| `REQ-G-019.02` | Temporary preview: use development-only role switching/mocking if required to preview each role. |
| `REQ-G-019.03` | Real accounts are created at the end after the user provides final names, teams, contacts, duty statuses, and roles. |
| `REQ-G-019.04` | Do not seed fake production data during foundational development. |

---

## 22. Non-Functional Requirements (proposed targets)

These are proposals to make the spec testable; they do not override any requirement above.

| Area | Target |
|---|---|
| SOS submit latency | Confirmed SOS persisted < 2 s on 4G (p95); notification fan-out starts < 3 s after persistence |
| Availability | 99.9 % monthly for incident creation and notification; graceful degradation when AI/SMS/push is down |
| Accessibility | WCAG 2.2 AA; touch targets ≥ 48 px; screen-reader labels on map pin controls with keyboard-accessible alternative |
| Performance | Student app initial JS < 200 KB gz on the SOS route; LCP < 2.5 s on mid-range Android |
| Browser/device | Last 2 versions of Chrome, Edge, Safari, Firefox; installable PWA; Android 9+/iOS 15+ |
| Language | English first; i18n-ready (Hindi proposed) |
| Data retention | Configurable; default: incidents 3 years, audit records 7 years, photos 1 year after resolution (college policy to confirm) |
| Privacy | Compliant with applicable Indian data-protection law (DPDP Act, 2023) — college legal review required |
| Backup/DR | Daily DB backups, PITR enabled, RPO ≤ 15 min, RTO ≤ 2 h |

---

## 23. Delivery Sequence and Final Validation

The 22-step implementation sequence and the 29 final-validation checks are captured as requirements and detailed in `IMPLEMENTATION_PLAN.md` (§§3–5) and `REQUIREMENTS_TRACEABILITY.md`.

### Requirements — Implementation Sequence
| ID | Requirement |
|---|---|
| `REQ-G-021.01` | Implementation sequence step 1: Architecture and contracts. |
| `REQ-G-021.02` | Implementation sequence step 2: Database and security model. |
| `REQ-G-021.03` | Implementation sequence step 3: Authentication and role model. |
| `REQ-G-021.04` | Implementation sequence step 4: All role interfaces. |
| `REQ-G-021.05` | Implementation sequence step 5: Student Emergency SOS. |
| `REQ-G-021.06` | Implementation sequence step 6: Student Report Incident. |
| `REQ-G-021.07` | Implementation sequence step 7: Campus static map and pinning. |
| `REQ-G-021.08` | Implementation sequence step 8: Photo upload/storage/access. |
| `REQ-G-021.09` | Implementation sequence step 9: AI classification. |
| `REQ-G-021.10` | Implementation sequence step 10: Deterministic routing. |
| `REQ-G-021.11` | Implementation sequence step 11: Automatic responder dispatch. |
| `REQ-G-021.12` | Implementation sequence step 12: Responder availability. |
| `REQ-G-021.13` | Implementation sequence step 13: Notifications. |
| `REQ-G-021.14` | Implementation sequence step 14: Admin incident management. |
| `REQ-G-021.15` | Implementation sequence step 15: Campus Explore. |
| `REQ-G-021.16` | Implementation sequence step 16: Analytics. |
| `REQ-G-021.17` | Implementation sequence step 17: Audit trail. |
| `REQ-G-021.18` | Implementation sequence step 18: Security/privacy hardening. |
| `REQ-G-021.19` | Implementation sequence step 19: Mobile/responsive polish. |
| `REQ-G-021.20` | Implementation sequence step 20: Testing. |
| `REQ-G-021.21` | Implementation sequence step 21: Real campus/team configuration. |
| `REQ-G-021.22` | Implementation sequence step 22: Demo accounts and demo data last. |

### Requirements — Final Validation
| ID | Requirement |
|---|---|
| `REQ-G-023.01` | Final validation: every confirmed feature is documented. |
| `REQ-G-023.02` | Final validation: every role has a dedicated interface specification. |
| `REQ-G-023.03` | Final validation: all 10 required documentation files exist. |
| `REQ-G-023.04` | Final validation: every requirement is traceable. |
| `REQ-G-023.05` | Final validation: Emergency SOS confirmation flow is documented. |
| `REQ-G-023.06` | Final validation: normal incident flow is documented. |
| `REQ-G-023.07` | Final validation: live student SOS status is documented. |
| `REQ-G-023.08` | Final validation: My Reports has separate Reports and Emergency SOS views. |
| `REQ-G-023.09` | Final validation: static 2D map and exact pinning are documented. |
| `REQ-G-023.10` | Final validation: maximum two photos are documented. |
| `REQ-G-023.11` | Final validation: photo permissions are documented. |
| `REQ-G-023.12` | Final validation: unknown-person security photo workflow is documented. |
| `REQ-G-023.13` | Final validation: AI classification and deterministic routing are documented. |
| `REQ-G-023.14` | Final validation: multi-team assignment is documented. |
| `REQ-G-023.15` | Final validation: automatic responder assignment is documented. |
| `REQ-G-023.16` | Final validation: Available/Busy/Offline states are documented. |
| `REQ-G-023.17` | Final validation: responder fallback/reassignment is documented. |
| `REQ-G-023.18` | Final validation: campus-wide versus restricted notifications are documented. |
| `REQ-G-023.19` | Final validation: admin View Incident exposes the complete student description and case details. |
| `REQ-G-023.20` | Final validation: User Directory contains Campus SOS personnel/responders rather than a student phone directory. |
| `REQ-G-023.21` | Final validation: audit trail is documented. |
| `REQ-G-023.22` | Final validation: clickable analytics cards are documented. |
| `REQ-G-023.23` | Final validation: Campus Explore redesign is documented. |
| `REQ-G-023.24` | Final validation: Homepage redesign is documented. |
| `REQ-G-023.25` | Final validation: mobile-first UI is documented. |
| `REQ-G-023.26` | Final validation: frontend/backend separation is documented. |
| `REQ-G-023.27` | Final validation: demo accounts are explicitly deferred to the end. |
| `REQ-G-023.28` | Final validation: existing UI is explicitly not reused. |
| `REQ-G-023.29` | Final validation: unnecessary urgency filters are explicitly removed. |

---

## 24. Future Inputs

Inputs the user must provide later; the platform is designed so each is configuration, not code.

### Requirements — Future Inputs
| ID | Requirement |
|---|---|
| `REQ-G-022.01` | Future input: actual college 2D campus map. |
| `REQ-G-022.02` | Future input: Campus SOS team member names. |
| `REQ-G-022.03` | Future input: administrator details. |
| `REQ-G-022.04` | Future input: responder details. |
| `REQ-G-022.05` | Future input: department/team assignments. |
| `REQ-G-022.06` | Future input: duty schedules. |
| `REQ-G-022.07` | Future input: emergency hotline numbers. |
| `REQ-G-022.08` | Future input: final college routing policies. |
| `REQ-G-022.09` | Future input: final demo account list. |

---

## 25. Ambiguities and Safe Implementation Rules

Per `global_rules.if_ambiguous`, ambiguities are documented with a safe rule. **No original requirement is deleted or weakened.** Items marked *Confirm* should be confirmed with the college before the final phase.

| ID | Ambiguity | Safe implementation rule | Confirm |
|---|---|---|---|
| A-01 | "Explicit confirm" vs. speed in a live emergency | Draft until one-tap confirm; description alone is enough; offline queue + hotline buttons | |
| A-02 | Admin sees "every incident" but Women/Men Safety are "restricted" | Admin retains full visibility; every view of a restricted case is audited (`ACCESS_RESTRICTED_CASE`); restricted case content is hidden from non-routed teams | ✔ |
| A-03 | Student picks a category *and* AI classifies | Store both; routing uses the **union** of rules fired by either; a mismatch raises an admin-review flag; AI never overrides the student's category label shown to the student | |
| A-04 | Who authorizes campus-wide broadcast, given AI cannot decide disclosure | Deterministic rule decides *eligibility*; a sanitized draft is generated from a fixed template; **Campus Administration approves** before publish. Config `auto_publish_categories` (default: empty) may allow auto-publish for e.g. confirmed major fire | ✔ |
| A-05 | "Student Council when configured" | Team is optional; routing includes it only if enabled and has an active member; otherwise skipped with an audit note | |
| A-06 | "Security when appropriate" (medical, infra, harassment) | Encoded as explicit conditions: `immediate_danger`, `violence_flag`, `safety_risk`, `crowd_risk`; see routing matrix | |
| A-07 | "Average Response Time" is undefined | Defined metrics: T1 created→first team notified; T2 created→responder accepted; T3 created→responder at location (**headline card value for emergencies**); T4 created→resolved. Card shows T3 with T2 and T4 in the drill-down | |
| A-08 | "Priority/Workflow" column | Values: `Emergency SOS` or `Standard`; no student-set priority exists | |
| A-09 | Does dispatch apply to normal reports? | Same engine; standard reports use longer timeouts and a configurable per-team mode: `AUTO_ASSIGN` or `TEAM_QUEUE` (coordinator/claim). Default `AUTO_ASSIGN` for Security/Medical/Fire; `TEAM_QUEUE` for others | ✔ |
| A-10 | "Configured period" for responder timeout | Defaults: SOS 45 s, standard 10 min; configurable per team in Settings | ✔ |
| A-11 | `no_inactivity_auto_offline` vs. duty schedules | Inactivity never changes status. A configured duty schedule or explicit action may; each change is audited | |
| A-12 | Anonymous reporting not mentioned | Not supported in v1; reporter identity visible only to authorized roles; students see their own reports only | ✔ |
| A-13 | Student can't see assigned team members for restricted cases | Student sees team names; responder first name shown only for non-restricted SOS "On the way" for reassurance | |
| A-14 | Campus Explore content for students | Students see sanitized public-safe incidents only (approved campus-wide notices, major hazards, route blockages); never restricted categories or reporter data | |
| A-15 | "Emergency Assist" scope | Guided intake + hotline shortcuts + conservative first-aid card (Medical only) shown after confirmation; never diagnostic | |
| A-16 | Tech stack unspecified | Recommended stack in `TECH_STACK.md` with alternatives | |
| A-17 | Multi-floor/multi-building maps | v1 supports one static 2D map; additional maps are a future extension (`campus_maps` table already supports many) | ✔ |
| A-18 | Reporter gender and women/men safety routing | Routing is by **incident category**, not reporter profile; no gender attribute is required from students | |
| A-19 | Dev-only role switching in production | Role switcher compiled out unless `APP_ENV=development`; CI check fails the build if present in production bundles | |
| A-20 | Teachers/staff as notification recipients | Staff users receive campus-wide notices as logged-in users; no case handling unless in a team | |
| A-21 | SOS the system cannot classify | Route to Campus Administration **and** Security as general first responders, flag `LOW_CONFIDENCE`; never drop or delay | ✔ |
| A-22 | Self-harm/mental-health crisis is not named in the spec | Safe default: classify as medical emergency with immediate danger, route to Medical + Administration, restricted, never campus-wide; college policy to define any further handling | ✔ |

---

## 26. Acceptance Criteria (summary)

| Feature | Acceptance criterion |
|---|---|
| Emergency SOS | Given a student with description only, when they tap Confirm, then an incident with `workflow=EMERGENCY_SOS` exists, `SOS_CONFIRMED` is audited, ≥ 1 team is notified and dispatch starts — even if AI is down |
| SOS confirmation | No incident exists before explicit confirmation; abandoning the confirmation screen leaves a draft only |
| Report an Incident | All required fields validated; incident created with `STANDARD_REPORT` |
| Map pin | Pin placed at `(x,y)` renders at the same relative point on mobile and desktop for the student, admin, teams, and Explore |
| Photos | A 3rd photo is rejected; photo URLs are unavailable to non-assigned teams and other students |
| Unknown person | Security sees photo, description, pin, time, category, status; no identity inference exists in any API |
| Routing | Each default routing example yields exactly the teams in the matrix (test cases `TC-R-001…`) |
| AI failure | With AI disabled, classification falls back to rules and routing still completes |
| Dispatch | Reject/timeout triggers next eligible responder; none available → coordinator + admin escalation |
| Availability | Available/Busy/Offline transitions are audited; no auto-offline on inactivity |
| Notifications | Restricted categories never produce a campus-wide notification; campus-wide notices are sanitized |
| Admin View | View shows all 20 required elements including the full student description |
| User Directory | Contains personnel only; no student rows exist or can be created |
| Analytics | Each overview card navigates to its target page |
| Explore | No urgency filter or Low/Medium/High anywhere; sensitive incidents are excluded/sanitized |
| Homepage | Only real data is shown; empty states are honest ("No recent activity") |
| Audit | Every listed event type is written and appears in the case timeline |
| Accounts | No demo accounts or seed incidents exist until the final phase |

---

## 27. Non-Goals
- Automatic identification of people from photos.
- Any student-selected urgency or priority (not supported).
- A student phone directory.
- Reuse of the previous project's UI, design, architecture, or data.
- Public posting of sensitive incident details.
