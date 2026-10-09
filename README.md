# Campus SOS — Specification Package

Master index for the complete **Campus SOS** product documentation, generated from `docs/CAMPUS_SOS_MASTER_GENERATION_SPEC.json` in **DOCUMENTATION_FIRST** mode. No production application is implemented in this package.

> Campus SOS is a campus safety and emergency-response platform. Emergency SOS is the highest-priority workflow; Report an Incident handles normal concerns. AI classifies and structures reports; deterministic routing rules decide teams and notification audiences; responders are dispatched automatically; sensitive cases are never broadcast to students.

## 1. Contents

| File | What it contains | Read it when |
|---|---|---|
| `docs/PRD.md` | Scope, personas, workflows, all requirements (with IDs), ambiguities + safe rules, acceptance criteria | First — it is the product contract |
| `docs/TECH_STACK.md` | Recommended frontend, backend, database, auth, AI, realtime, notification, storage, testing, deployment, observability | Before choosing tools |
| `docs/ARCHITECTURE.md` | System context, module map, data flows, state machines, authorization, dispatch, notification, realtime, resilience (Mermaid) | Before designing any module |
| `docs/DATABASE_SCHEMA.md` | Entities, fields, types, constraints, indexes, RLS, statuses, map-coordinate rules | Before writing migrations |
| `docs/API_SPECIFICATION.md` | Endpoints, auth, authorization, validation, errors, pagination, uploads, realtime events | Before building frontend or backend |
| `docs/UI_UX_SPECIFICATION.md` | From-scratch design system and all 12 role interfaces, mobile behaviour, states | Before any UI work |
| `docs/AI_ROUTING_SPECIFICATION.md` | AI contract, taxonomy, routing matrix, audience matrix, fallback, escalation, test cases | Before AI/routing/dispatch work |
| `docs/IMPLEMENTATION_PLAN.md` | 22-step phased Antigravity plan, milestones, gates, final account phase | To run the build |
| `docs/REQUIREMENTS_TRACEABILITY.md` | Every requirement ID → exact doc sections + validation status | To check coverage / track build status |
| `docs/CAMPUS_SOS_MASTER_GENERATION_SPEC.json` | The source specification (unchanged) | When in doubt about original intent |

## 2. Recommended Reading Order
1. `PRD.md` §§1–3, 5–6 (what the product does) → 2. `ARCHITECTURE.md` §§2–5 → 3. `AI_ROUTING_SPECIFICATION.md` §§1, 7–10 → 4. `UI_UX_SPECIFICATION.md` §§1–7 → 5. `DATABASE_SCHEMA.md` and `API_SPECIFICATION.md` → 6. `IMPLEMENTATION_PLAN.md`.

## 3. Using the Package with Antigravity
1. Create the repo layout from `ARCHITECTURE.md` §3 (`frontend/`, `backend/`, `contracts/`, `docs/`) and copy `docs/` in.
2. Run missions **in order**, one per step in `IMPLEMENTATION_PLAN.md` §3, using the mission template in §6.1. Attach `README.md`, `docs/PRD.md`, and that phase's primary docs.
3. Require each mission to pass its **testing gate** before starting the next.
4. After each mission, update the *Build status* column in `REQUIREMENTS_TRACEABILITY.md`.
5. Do **not** create real or demo accounts or demo data until step 3.22.

## 4. Requirement IDs
`REQ-G-001` … `REQ-G-023` are the spec's groups; `REQ-G-004.03` is a sub-requirement. All 189 sub-requirements are defined in `PRD.md` and mapped in `REQUIREMENTS_TRACEABILITY.md`.

## 5. Non-Negotiables (quick reference)
- Emergency SOS = highest priority; student never selects priority; explicit confirmation before creation.
- Max **2 photos**; photos are evidence — visible only to Campus Administration, assigned teams/people (and the reporter); never public; **no automatic identification of people**.
- Exact pin on the static 2D map stored as **normalized X/Y**.
- AI classifies; **deterministic configurable rules route**; multi-team assignment; rule fallback if AI is down.
- Campus Administration sees every incident; sensitive cases are never broadcast to students.
- Automatic responder dispatch with Available / Busy / Offline; **no inactivity auto-offline**; fallback and escalation.
- User Directory = Campus SOS personnel only, never a student phone directory.
- UI built **from scratch**; the previous project's UI/design/architecture/data are **not** reused; no urgency filters; no fake data.
- Frontend and backend are completely separate; contracts are documented.
- Demo/real accounts are created **last**.

## 6. Future Inputs Needed Before Go-Live
Actual 2D campus map · team member names · administrator details · responder details · department/team assignments · duty schedules · emergency hotline numbers · final college routing policies · final demo account list. (`PRD.md` §24, `IMPLEMENTATION_PLAN.md` §8)

## 7. Open Confirmations
Items marked *Confirm* in `PRD.md` §25 and open decisions in `TECH_STACK.md` §15 should be settled with the college before the final configuration phase.

## 8. Package Validation
Documentation validation result: **PASS** — 189 sub-requirements across 23 groups mapped; details in `docs/REQUIREMENTS_TRACEABILITY.md` §5.
