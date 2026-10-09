# Campus SOS — Emergency Access & Break-Glass Specification

## 1. Overview & Purpose

In emergency operations, responders frequently face scenarios where rapid cross-team coordination is mandatory to protect life safety. However, standard Campus SOS authorization enforces strict privacy isolation (e.g. Sexual Harassment, Misconduct, and Medical incidents are strictly confined to designated teams).

The **Emergency Access / Break-Glass System** provides a cryptographically auditable, time-bound, least-privilege mechanism allowing authorized responders to obtain exceptional temporary access to an incident without permanently altering user roles, mutating team rosters, or granting global administrator rights.

---

## 2. Core Security Principles

1. **Strict Incident Boundary**: Grants are strictly scoped to a single `incident_id`. A grant on Incident A never grants visibility to Incident B or C.
2. **Granular Scopes (Least Privilege)**: Permissions are granular and independent. For example:
   - `INCIDENT_VIEW` does not confer `INCIDENT_UPDATE`.
   - `INCIDENT_VIEW` does not confer `EVIDENCE_VIEW`.
   - `INCIDENT_VIEW` does not reveal `REPORTER_CONTACT_VIEW`.
3. **No Role Mutation**: Break-glass never alters the user's permanent role or team assignments.
4. **Backend-Enforced Expiry**: The backend independently enforces expiration on every authorization call (`expiresAt > NOW()`). Frontend timers are purely cosmetic countdowns.
5. **Tamper-Evident SHA-256 Audit Chain**: Every lifecycle state transition and every subsequent access to sensitive data (photos, reporter contact) writes an event into the SHA-256 hash chain.

---

## 3. Workflows: Normal Override vs Critical Break-Glass

### 3.1 Normal Emergency Override (`NORMAL_OVERRIDE`)
- **Use Case**: Cross-team coordination where operational urgency exists, but waiting for supervisor approval does not introduce direct life safety hazards.
- **Workflow**:
  1. Authorized responder posts `POST /access-policy/break-glass/request` with `type: 'NORMAL_OVERRIDE'`, specific scopes, and rationale.
  2. Status is `REQUESTED`.
  3. Authorized Approver (`CAMPUS_ADMIN`, `CHIEF_PROCTOR`, or team Coordinator assigned to the incident) reviews request.
  4. Approver cannot approve their own request (self-approval strictly prohibited).
  5. Approver approves via `POST /access-policy/break-glass/approve`.
  6. Status transitions to `ACTIVE`, `activatedAt` and `expiresAt` (default 60 minutes) are stamped.
  7. Audit events: `BREAK_GLASS_REQUESTED`, `BREAK_GLASS_APPROVED`, `BREAK_GLASS_ACTIVATED`.

### 3.2 Critical Break-Glass (`CRITICAL_BREAK_GLASS`)
- **Use Case**: Imminent threat to life safety, severe active violence, structural collapse, or medical crisis where the delay of normal approvals would cause grave harm.
- **Workflow**:
  1. Authorized responder posts `POST /access-policy/break-glass/request` with `type: 'CRITICAL_BREAK_GLASS'` and detailed rationale.
  2. Request **activates immediately**: status transitions directly to `ACTIVE`.
  3. Strict short-lived duration: `expiresAt` defaults to 30 minutes.
  4. Automatic flag: `supervisorReviewStatus` is set to `REVIEW_REQUIRED`.
  5. Mandatory Post-Hoc Supervisor Review: A supervisor (`CAMPUS_ADMIN` or `CHIEF_PROCTOR`) must review the action via `POST /access-policy/break-glass/review` and mark `REVIEWED` or `FLAGGED`.
  6. Audit events: `BREAK_GLASS_REQUESTED`, `BREAK_GLASS_ACTIVATED`, `BREAK_GLASS_REVIEW_REQUIRED`, `BREAK_GLASS_REVIEWED`.

---

## 4. Granular Scopes

| Scope | Description | Restrictions |
|---|---|---|
| `INCIDENT_VIEW` | Read incident details, summary, category, timestamps | Does NOT allow photo viewing or updating |
| `LOCATION_VIEW` | Access exact coordinates, GPS, floor maps, and pin data | Bounded to incident location |
| `EVIDENCE_VIEW` | Generate signed download URLs for incident photos/attachments | Audited as `PHOTO_VIEWED` with break-glass metadata |
| `REPORTER_CONTACT_VIEW` | View student reporter phone and email | Audited as `ACCESS_RESTRICTED_CASE` with reporter target |
| `REALTIME_ACCESS` | Connect to live socket rooms (`incident:<id>`) | Verified on websocket subscription |
| `INCIDENT_UPDATE` | Transition incident status, append notes, escalate | Does not mutate team ownership |
| `TEMPORARY_TEAM_ASSIGNMENT` | Temporary task execution as responder | Strictly temporary; permanent team untouched |

---

## 5. Lifecycle & State Machine

```
                   [ Submit Request ]
                           │
             ┌─────────────┴─────────────┐
     (NORMAL_OVERRIDE)           (CRITICAL_BREAK_GLASS)
             │                                   │
             ▼                                   ▼
        [ REQUESTED ]                       [ ACTIVE ]
             │                          (Review Required)
      ┌──────┴──────┐                            │
  (Approve)      (Reject)                        ▼
      ▼             ▼                     [ REVIEWED ]
  [ ACTIVE ]   [ REJECTED ]                      │
      │                                          │
      ├──────────────────────┬───────────────────┤
      ▼                      ▼                   ▼
  [ EXPIRED ]           [ REVOKED ]          (Active)
(Automatic/Cron)      (Supervisor/Self)
```

---

## 6. Authorization Engine Integration

The `AccessPolicyService` integrates break-glass grants into its layered permission hierarchy:

1. **Role Level**: `CAMPUS_ADMIN` has global incident visibility.
2. **Reporter Level**: Incident reporter can always view their own report.
3. **Team Level**: Team membership grants access if the team is routed to the incident (and user has `canViewRestricted` if the case is restricted).
4. **Assignment Level**: Assigned responder has direct operational access.
5. **Emergency Grant Level**: Checks `BreakGlassRequest` table for `incidentId`, `requesterUserId`, `status = 'ACTIVE'`, and `expiresAt > NOW()`. If the active grant contains the specific required scope, access is granted.

---

## 7. Tamper-Evident Audit Integration

All break-glass operations write directly into the existing SHA-256 / HMAC audit hash chain:

- `BREAK_GLASS_REQUESTED`: Request submitted.
- `BREAK_GLASS_APPROVED`: Approver authorization granted.
- `BREAK_GLASS_REJECTED`: Request turned down.
- `BREAK_GLASS_ACTIVATED`: Access activated and timer started.
- `BREAK_GLASS_EXPIRED`: Grant has reached its expiry threshold.
- `BREAK_GLASS_REVOKED`: Explicit early termination by supervisor or requester.
- `BREAK_GLASS_REVIEW_REQUIRED`: Critical break-glass flagged for supervisor.
- `BREAK_GLASS_REVIEWED`: Supervisor has reviewed and validated justification.
- `PHOTO_VIEWED` (with break-glass metadata): Protected evidence accessed.
- `ACCESS_RESTRICTED_CASE` (with break-glass metadata): Reporter contact accessed.
