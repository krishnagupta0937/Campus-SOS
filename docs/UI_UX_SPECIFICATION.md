# Campus SOS — UI/UX Specification

This is a **from-scratch** design system and screen specification. Nothing from the previous project's UI, visual design, or architecture is reused. All data shown in any screen is real; before real data exists, screens show honest empty states — never fake metrics, fake activity, or fake notifications.

## 1. Design Intent
**Calm authority.** In an emergency the interface should feel quiet, clear, and certain. Visual hierarchy comes from size, weight, spacing, and one reserved alert color — not from gradients, glass effects, or decoration.

Qualities: clean · elegant · modern · professional · minimal · interactive where useful · clear visual hierarchy · consistent spacing · consistent typography · purposeful motion · accessible · mobile-first · responsive · fast · uncluttered.

Avoid: generic AI dashboard look, excessive gradients, excessive glassmorphism, unnecessary cards, visual clutter, decorative emergency distractions (flashing, sirens, animated alarms), inconsistent components, fake metrics, template-like AI UI.

Role rule: **each role has its own purpose-built interface** (own navigation, own home, own case view). One shared design system, many specific experiences.

## 2. Interface Map

| Role | Interface | Primary device | Landing screen |
|---|---|---|---|
| Student | Student App | Mobile | Home |
| Campus Administration | Admin Console | Desktop/tablet | Overview |
| Chief Proctor | Proctor Workspace | Desktop/mobile | Conduct Cases |
| Security | Security Workspace | Mobile + control desk | Live Alerts |
| Medical | Medical Workspace | Mobile | Medical Cases |
| Fire & Safety | Fire & Safety Workspace | Mobile | Hazard Cases |
| Women Safety | Women Safety Workspace | Mobile | Restricted Cases |
| Men Safety | Men Safety Workspace | Mobile | Restricted Cases |
| Student Council | Council Workspace | Mobile/desktop | Grievances |
| Infrastructure & Facilities | Facilities Workspace | Mobile | Work Orders |
| Transportation | Transport Workspace | Mobile | Route & Traffic |
| IT / Digital Safety | Digital Safety Workspace | Desktop/mobile | Digital Cases |

## 3. Design System

### 3.1 Color tokens (CSS variables; light and dark)
```css
:root {
  /* Neutrals */
  --bg: #FAFAF7;          --surface: #FFFFFF;     --surface-2: #F2F2ED;
  --border: #DEDED6;      --text: #14171A;        --text-muted: #5B6168;
  /* Brand (calm teal-blue) */
  --brand: #0F5C7A;       --brand-contrast: #FFFFFF;  --brand-soft: #E3F0F5;
  /* Reserved emergency accent — only for SOS entry, critical states */
  --emergency: #C8102E;   --emergency-contrast: #FFFFFF; --emergency-soft: #FBE9EC;
  /* Semantic */
  --success: #1F7A4D; --warning: #A15C00; --info: #1B5FAA;
  /* Duty states */
  --duty-available: #1F7A4D; --duty-busy: #A15C00; --duty-offline: #6B7077;
  --focus: #1B5FAA;
}
[data-theme="dark"] {
  --bg: #0F1214; --surface: #171B1F; --surface-2: #1F252A; --border: #2C343B;
  --text: #ECEFF1; --text-muted: #9AA3AB;
  --brand: #5BB4D6; --brand-contrast:#06232F; --brand-soft:#12303C;
  --emergency: #FF5C72; --emergency-contrast:#2A0007; --emergency-soft:#3A1219;
}
```
Rules: contrast ≥ 4.5:1 for text (≥ 3:1 for large text/UI); status is **never** conveyed by color alone (always icon + text). `--emergency` appears only on the SOS entry button, SOS confirmation, and critical status chips.

### 3.2 Typography
Primary font: **Inter** (variable) with system fallback `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; optional Devanagari fallback `Noto Sans Devanagari`. Numerals tabular in tables.
| Token | Size/Line | Weight | Use |
|---|---|---|---|
| `display` | 32/40 | 700 | Live SOS status headline |
| `h1` | 24/32 | 650 | Screen titles |
| `h2` | 20/28 | 600 | Section titles |
| `h3` | 16/24 | 600 | Card titles |
| `body` | 16/24 | 400 | Default (16 px min on mobile) |
| `body-sm` | 14/20 | 400 | Secondary |
| `caption` | 12/16 | 500 | Meta, timestamps |

### 3.3 Spacing, shape, elevation
- 4 px base grid: `4, 8, 12, 16, 24, 32, 48, 64`. Screen padding 16 (mobile) / 24 (tablet) / 32 (desktop).
- Radius: 8 (controls), 12 (surfaces), 999 (chips). Borders over shadows; one shadow level (`0 1px 2px rgba(0,0,0,.08)`) for floating layers only.
- Minimum touch target 48×48 px; spacing between targets ≥ 8 px.

### 3.4 Motion
- Durations 120–240 ms, easing `cubic-bezier(.2,0,0,1)`. Used for: step transitions in SOS flow, pin drop, status progress fill, sheet open/close.
- Never used for decoration; no flashing or looping alarm animation. Respect `prefers-reduced-motion` (swap to instant/opacity).

### 3.5 Iconography
Single outline icon set (e.g., Lucide) at 20/24 px, with text labels on all primary navigation and all emergency actions.

### 3.6 Layout grid
Mobile: 1 column + bottom nav. Tablet: 2 columns + rail nav. Desktop: 12-column grid, left sidebar (240 px, collapsible), content max-width 1440 px.

## 4. Core Components
| Component | Variants / States | Notes |
|---|---|---|
| `Button` | primary, secondary, quiet, destructive, **sos** (emergency color, large); loading, disabled | Loading keeps width; no spinner-only labels |
| `SosButton` | idle, pressed | 72 px high on mobile Home; always labelled "Emergency SOS" |
| `Field` (text, textarea, select) | default, focus, error, disabled | Inline error text; label always visible |
| `CampusMap` | view, pin-place, multi-pin (Explore), selected | Pan/pinch-zoom; pin = SVG marker at `(x×W, y×H)`; keyboard nudge controls; "Reset view" |
| `PinPicker` | empty, placed, adjusting | Large touch-friendly; magnifier offset while dragging; "Confirm pin" |
| `PhotoPicker` | 0/1/2 photos, uploading, error | Counter "1 of 2"; third add disabled with explanation |
| `StatusTracker` | 6 steps, current, done | Used in Live SOS Status |
| `StatusChip` | per status | Icon + text |
| `DutyBadge` | Available, Busy, Offline | Color + icon + text |
| `CaseCard` | compact, expanded | Role-specific fields |
| `DataTable` | sortable, filterable, row action | Sticky header; row hover; responsive collapse to list on mobile |
| `Timeline` | vertical, filterable | Chronological, time + actor + event |
| `Sheet` / `Dialog` | bottom sheet (mobile), modal (desktop) | Focus trap; Esc closes; confirm dialogs for destructive actions |
| `Toast` / `Banner` | info, success, warning, offline, degraded | Banner for "Offline — SOS will send when connection returns" |
| `EmptyState` | with explanation + action | Honest copy: "No recent campus activity." |
| `Skeleton` | text, card, map | For loading |
| `NotificationItem` | unread, read, critical | |
| `HotlineCard` | tap-to-call | `tel:` links |
| `Stat` (admin only) | clickable | Real numbers only; shows "—" until data exists |

## 5. Responsive and Mobile-First Rules
- Design at 360 × 640 first; scale up at 600 / 900 / 1200 px breakpoints.
- **Mobile priority screens** (must be flawless on a phone): Emergency SOS, Emergency Assist, map pinning, photo upload, notifications, live SOS status, My Reports.
- One-hand reach: primary actions in the bottom 40% of the screen; sticky bottom action bar in flows.
- Offline: SOS flow works from cache; confirmation queues and shows hotlines.
- Performance: SOS route ships < 200 KB gz; fonts subset; map image progressive; no layout shift on pin layer.
- Admin/team desktop screens collapse tables to stacked rows below 900 px.

## 6. Accessibility, States, and Content
- WCAG 2.2 AA. All interactive elements keyboard reachable; visible focus ring (`--focus`, 3 px). Screen-reader names for pin, photo, status steps (`aria-live="polite"` for status changes; `assertive` only for the confirmation result).
- Map pinning has a non-pointer alternative: select a predefined location, then nudge with arrow buttons; coordinates announced as "approximately 41% from left, 67% from top".
- Every screen defines: **loading, empty, error, offline, degraded (service down), success** states.
- Content tone: short, direct, calm. Never blame the student; never say "AI failed". Examples: "Help is being arranged." "We're alerting the right team."
- Privacy copy on sensitive categories: "Shared only with the authorized team."

---

## 7. Student Interface

**Navigation (mobile bottom bar):** Home · Explore · **SOS (center, emergency color)** · My Reports · Notifications. *Emergency Contacts* is reachable from Home and from the More sheet; *Report an Incident* from Home and the SOS-adjacent "+" in header. Tablet/desktop: left rail with all eight entries (Home, Emergency SOS, Emergency Assist, Report an Incident, Campus Explore, My Reports, Notifications, Emergency Contacts).

### 7.1 Home (rebuilt from scratch)
Order top→bottom:
1. **Primary actions** — two large actions: **Emergency SOS** (emergency color, 72 px) and **Report an Incident** (brand outline). Nothing else competes above the fold.
2. **Safety notifications** — only appropriate active notices (sanitized campus-wide); hidden when none ("No active safety notices").
3. **On-duty teams** — list of teams with ≥ 1 Available member (team name + count/"On duty"); honest empty state if none configured.
4. **Recent campus activity** — real sanitized items from Explore feed; empty state otherwise.
5. **Emergency contacts** — configured 24/7 hotlines with tap-to-call.
Removed: generic Live Campus Dispatch section, AI marketing, fake statistics/activity/operational data.

### 7.2 Emergency SOS flow (mobile-first)
Single-task screens with a persistent top bar (Back, "Emergency SOS") and a persistent hotline strip ("Call campus emergency").

| Step | Screen | Content & behaviour |
|---|---|---|
| 1 | Entry | Tap SOS → immediately opens Emergency Assist |
| 2 | **Emergency Assist — What happened?** | Large textarea, placeholder "Tell us what's happening"; quick-start chips (Fire, Injury, Fight, Blocked road, Suspicious person, Other) that only **prefill text**, not priority; "Continue" enabled with any text |
| 3 | Photos (optional) | `PhotoPicker`, camera first; "Skip" visible; max 2 |
| 4 | Location | Predefined location chips/select (room, classroom, laboratory, block, library, canteen, parking, ground, hostel, other) + "Place pin on map" |
| 5 | **Pin on campus map** | Full-screen `PinPicker`; tap to place; drag to adjust; "Confirm pin"; "Skip for now" allowed |
| 6 | **Confirmation screen** | Summary: description, photos thumbnails, location + mini-map with pin, **teams that will be alerted** (generic label for restricted), edit links per section, giant **"Confirm Emergency"** button (emergency color) and a quiet "Cancel" |
| 7 | Result | On success: immediate transition to Live Status (no spinner wall). On offline: "Saved. Sending as soon as you're connected." + hotline buttons |

Rules: nothing is dispatched before step 6's explicit confirm; AI-down is invisible to the student; rule-based teams are shown identically.

### 7.3 Live SOS Status
- Headline (`display`): current state in plain words ("Help is on the way").
- `StatusTracker` with the six steps: **Emergency Created → Teams Notified → Responder Assigned → Responder On the Way → Responder At Location → Resolved**, each with a timestamp when reached.
- Responder card (when assigned, non-restricted): first name + team ("Dr. Mahika · Medical"). For restricted cases: "An authorized responder is assigned."
- Medical first-aid card (only when classification is medical): conservative basic guidance + "Do not wait for guidance — help is on the way." Never diagnostic.
- Actions: "Add a note", "Call campus emergency", "I'm safe / cancel" (sends a request to admin; does not self-cancel dispatch).
- Updates arrive via realtime; fallback polling every 5 s; screen stays awake (wake-lock) while active.

### 7.4 Report an Incident
Stepped form (one scrollable page on tablet+): 1 Description → 2 Category (chip list, configurable) → 3 Location (predefined) → 4 Pin on map → 5 Photos (≤ 2, optional) → Review (AI classification label and teams preview; restricted shown generically) → Submit. Validation inline; draft autosave. Success screen shows the incident ID and a link to My Reports.
If the system detects immediate danger: dismissible banner "Is this happening right now? Switch to Emergency SOS."

### 7.5 Campus Explore (focused Campus Incident Explorer)
- Map-first layout: static 2D campus map with **incident pins**, a bottom sheet (mobile) / right panel (desktop) listing **recent campus incidents** with status, and a **recent campus activity** section.
- Pin tap → sheet with sanitized summary (generic category label, status, time, general area).
- Filters: **status only** (Active / Resolved) and optional area. **No urgency filter. No Low/Medium/High anywhere.**
- Removed: response-protocol section, generic AI distress-analysis section, marketing copy.
- Privacy: sensitive incidents excluded or sanitized per permissions; student's own reports are visible in My Reports, not Explore.

### 7.6 My Reports
Two tabs: **Reports** (normal incident submissions) and **Emergency SOS** (SOS submissions).
- List rows: public ID, category label, location, status chip, date.
- Detail screen: status, assigned teams (team names; restricted → "Authorized team"), timeline, location (name + mini-map pin), category, relevant case information, photos (own), notes. Live SOS items open Live Status while active.
- Empty states: "You haven't submitted any reports." / "No Emergency SOS submissions."

### 7.7 Notifications
Inbox list (unread first), types: Safety notice (campus-wide), My report update, Area advisory. Tap opens detail/deep link. Settings toggle: Enable/disable notifications; push permission prompt explained before the browser prompt. Critical notices styled with icon + "Critical" label (not color alone).

### 7.8 Emergency Contacts
List of configured hotlines (24/7 badge), tap-to-call, optional "Copy number". Also shows personnel contacts only if the admin marks a team as student-visible. Never shows student numbers.

---

## 8. Campus Administration Console

**Navigation (left sidebar):** Overview · All Incidents · Active Emergencies/Dispatch · Resolved Incidents · Campus Map · Teams · Responders · User Directory · Analytics/Statistics · Notifications · Audit Trail · Settings. Top bar: global search (incident ID), live "Active emergencies" counter, user menu. Persistent **critical alert tray** for new SOS (sound optional, setting).

### 8.1 Overview
Five clickable summary elements (real data only; "—" with explanation until data exists):
| Card | Click → |
|---|---|
| Total Incidents | All incident statistics/history (active + resolved) |
| Active Emergencies | Active Emergencies/Dispatch page |
| Resolved Incidents | Resolved Incidents page |
| Average Response Time | Detailed response analytics |
| Incidents by Domain/Category | Category analytics (bar chart + table; click a bar → filtered All Incidents) |
Below: **Incident table** — columns **ID · Type · Category · Priority/Workflow · Location · Status · Time · Action**; Action = **View** button. Filters: status, workflow, category, date, team, search. No urgency filter.

### 8.2 View Incident (full case file)
Right-side panel (desktop) / full page (mobile). Sections in this order; all required elements present:
1. Header: incident ID, report type, workflow, status, category.
2. **Full student description** (complete, unmodified, copy button).
3. Predefined location + **exact map pin** (mini-map with zoom).
4. Date/time, **authorized reporter information** (name, contact; masked until "Reveal" for restricted cases — reveal is audited).
5. **AI classification** (source AI or rule fallback, confidence, extracted fields) and **AI reasoning** (labelled "Assistive — not authoritative").
6. **Routing decision** (matched rules, config version, flags) and **assigned teams**.
7. **Assigned responders** with duty states and assignment attempts.
8. **Photos** (max 2; signed URLs; each view audited).
9. **Notification history** (audience, channel, status).
10. **Response timeline** (T1–T4 markers) and **status history**.
11. **Resolution details**.
12. **Audit history**.
Actions: Assign/Reassign, Change status, Reclassify (re-route), Add team, Approve campus notice, Add note, Resolve/Reopen, Cancel (false alarm/duplicate).

### 8.3 Active Emergencies / Dispatch
Split view: left list of active incidents (SOS first, oldest unresolved highlighted by an "elapsed" timer, not color flashing), right map with pins and selected case. Per case: team states, offers in flight (responder, countdown), escalation banner, manual assign. Live updates.

### 8.4 Resolved Incidents
Table with resolution code, duration (T4), responders, category; filters; export (CSV).

### 8.5 Campus Map
Full map with all incident pins (admin sees all; filter by status/category/team). Edit mode (Settings): upload map, define predefined locations and anchors.

### 8.6 Teams
Team cards/list: members, coordinator, enabled state, assignment mode, timeouts, restricted flag. Edit membership; "Student Council — enable/disable (when configured)".

### 8.7 Responders
Table of responders: name, team, **duty state (Available/Busy/Offline)**, current case, last assigned, schedule. Admin can set duty state (audited). Inactivity never changes state — a hint explains this.

### 8.8 User Directory
Personnel only: **name · department/team · designation · role · phone · email (where appropriate) · availability (where appropriate)**. Filters by team/role/availability; search. Empty-state copy: "Directory lists Campus SOS personnel only." No student rows.

### 8.9 Analytics / Statistics
Tabs: Summary (all incidents history), Response (T1 notified, T2 accepted, **T3 at-location — headline Average Response Time**, T4 resolved; by team/category/time), Categories (incidents by domain), Dispatch (rejections, timeouts, escalations). Charts: line/bar only, labelled axes, accessible data tables alongside.

### 8.10 Notifications (Admin)
Tabs: Pending approval (campus-wide drafts), Published, Delivery history, Failed deliveries. Approve/edit/reject sanitized notices; compose manual notice. A banner explains the deny-list for restricted categories.

### 8.11 Audit Trail
Global filterable log (event type, incident, actor, date), hash-chain "Verify integrity" action, export. Row → opens the related case timeline.

### 8.12 Settings
Hotlines · Campus Map · Predefined Locations · Routing Rules (versioned editor + test runner) · Timeouts · Notice policy (`auto_publish_categories`) · AI (enable/timeouts) · Retention · Role/Team configuration. Final-phase wizard: "Real campus configuration" (map, teams, people, hotlines, duty status, routing policies).

---

## 9. Chief Proctor Workspace
- **Nav:** Conduct Cases · Notices (read) · Directory (own scope) · Profile.
- **Home — Conduct Cases:** queue of routed cases: student misconduct, teacher/staff misconduct, student-teacher disputes, fights, quarrels, harassment, other configured disciplinary cases. Tabs: New · In review · Closed.
- **Case view modules:** description, category, parties mentioned (as text), location + pin, photos (if any), timeline, internal notes, linked incidents, resolution outcome.
- **Actions:** Accept for review, Add confidential note, Request more info from reporter (via system message), Refer to Women/Men Safety or Student Council (admin-visible), Mark outcome.
- **Never shown by default:** routine medical, routine infrastructure, unrelated technical and transportation cases.
- Restricted handling: reporter identity shown only if routing marks it necessary; each reveal audited.

## 10. Security Workspace
- **Nav:** Live Alerts · Active Cases · Map · My Duty · History.
- **Home — Live Alerts:** real-time list: unknown person, suspicious activity, unauthorized access, fights, security threats, campus safety alerts. SOS entries pinned top with elapsed timer.
- **Case view modules (unknown-person workflow):** **photo (max 2)**, description, **map pin**, time, category, status — in one glance layout; no identification tools or suggestions anywhere.
- **Responder mode:** accept/reject offer, en route, on scene, complete (§19). Map shows pin + a "navigate" hint (static map direction text; no GPS dependency).
- **Actions:** Request backup (escalate), message Campus Administration, add note, change status.

## 11. Medical Workspace
- **Nav:** Medical Cases · My Duty · History.
- **Home:** active medical cases (collapse, injury, accident, illness, bee sting, other medical emergency) with elapsed time; duty toggle prominent.
- **Case view modules:** description, location + pin, photos (if any), reporter contact (for responder, audited), timeline, **first-aid guidance panel** (conservative basic guidance for the student; clinicians can see exactly what was shown), notes.
- **Actions:** accept/reject, on the way, at location, complete with outcome note, request Security (when appropriate), escalate to coordinator.
- Policy copy: "Guidance shown to students is basic first aid only and never replaces professional care."

## 12. Fire & Safety Workspace
- **Nav:** Hazard Cases · Map · Drill Mode · My Duty.
- **Home:** fire and fire-hazard cases with photos prominent (evidence-based), pins, escalation to campus-wide notice proposal (admin approves).
- **Case view:** photos, description, pin, hazard type (extracted), notes, **"Propose campus-wide notice"** action (creates a sanitized draft for Administration approval).
- **Actions:** respond, mark hazard contained, request Security/Administration support.

## 13. Women Safety Workspace (restricted)
- **Nav:** Restricted Cases · My Duty · Resources.
- **Home:** list of routed harassment/safety cases for women, minimal previews (generic titles until opened), with "Restricted" label (icon + text).
- **Case view:** description, location + pin, timeline, confidential notes, optional referral to Chief Proctor; reporter identity shown only to authorized members; each open is audited.
- **Actions:** accept, contact reporter via system messaging, escalate to Chief Proctor, request Security (immediate danger), close.
- No campus-wide sharing, no Explore visibility, no notification text containing details.

## 14. Men Safety Workspace (restricted)
Same structure and privacy rules as §13 for Men Safety / Men Harassment Team cases; separate queue, separate team, separate access list.

## 15. Student Council Workspace
- **Nav:** Grievances · Welfare · Notices · Profile.
- **Home:** configured student grievance and welfare cases (when the team is enabled); status tabs.
- **Case view:** description, category, timeline, notes, linked Chief Proctor involvement if routed.
- **Actions:** acknowledge, update status, request info, close; cannot see restricted/disciplinary cases unless routed.

## 16. Infrastructure & Facilities Workspace
- **Nav:** Work Orders · Map · My Duty.
- **Home:** infrastructure, electrical, water, building, maintenance and facility hazards; safety-risk flag raises priority within the team list (no student urgency).
- **Case view:** photos, description, pin, hazard type, assigned technician, work log.
- **Actions:** accept, schedule, mark made safe, complete, request Security when safety risk.

## 17. Transportation Workspace
- **Nav:** Route & Traffic · Parking · Map · My Duty.
- **Home:** road blockage, transport, traffic, parking, vehicle incidents; blocked-route cases show pins and affected-route text; "Propose campus notice" for major route blockages.
- **Actions:** accept, clear route, update, request Security/Facilities, complete.

## 18. IT / Digital Safety Workspace
- **Nav:** Digital Cases · Account Security · Network · Profile.
- **Home:** cyber incidents, digital harassment, account/security issues, network/digital safety cases.
- **Case view:** description, evidence attachments (photos/screenshots ≤ 2), timeline, notes, disciplinary referral to Chief Proctor when appropriate.
- **Actions:** accept, investigate, contain, refer, close.

## 19. Responder Mode (shared pattern inside every team workspace)
Phone-first state machine UI:
1. **Duty switch** at top: Available / Busy / Offline (Busy set automatically on accept).
2. **Offer sheet** (full-screen interrupt for SOS): incident summary within authorization, location chip, **countdown to timeout**, big **Accept** / **Reject** (reject asks optional reason).
3. **Active assignment**: status buttons — **On the way → At location → Complete**; map with pin; call/message coordinator; "Need backup".
4. **Completion**: resolution summary, returns the responder to Available (unless they choose Offline).
Notification routes (push + SMS + voice fallback) deep-link directly to the offer sheet. Offline/poor network: actions queue and sync.

---

## 20. Cross-Cutting Patterns
- **Map component:** one `CampusMap` used by Student pinning, Explore, Admin, and teams. Same normalized coordinates → identical position across roles and screen sizes.
- **Photo viewer:** lightbox, pinch-zoom, download disabled by default for non-admin, watermark "Evidence — Campus SOS" on view, access audited.
- **Timeline:** identical component for every role; entries filtered server-side by permission.
- **Role switching in dev only:** see §22.

## 21. Removed and Prohibited UI
| Element | Status |
|---|---|
| Urgency filter, Low/Medium/High system, generic system urgency filter | **Removed everywhere** |
| Unnecessary response-protocol section | Removed |
| Generic AI distress-analysis marketing section | Removed |
| Generic Live Campus Dispatch section on Home | Removed |
| Fake statistics, activity, operational data, notifications | Prohibited |
| Student-selected priority | Prohibited |
| Student phone directory | Prohibited |
| Previous project's layouts, components, styling | Not reused |

## 22. Development-Only Role Switcher
During foundational development a floating "Dev: view as role" control lets developers preview any of the 12 interfaces with **mocked adapters** and empty/no-seed data. It is behind `APP_ENV=development`, excluded from production bundles (CI bundle scan), and is replaced by real accounts in the final phase.
