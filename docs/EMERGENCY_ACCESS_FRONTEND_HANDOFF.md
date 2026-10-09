# Emergency Access & Break-Glass — Frontend Handoff Contract

This document provides the frontend implementation contract for integrating the verified backend Emergency Access / Break-Glass API.

---

## 1. Endpoints & API Contract

### 1.1 Request Emergency Access
- **Endpoint**: `/api/v1/access-policy/break-glass/request`
- **Method**: `POST`
- **Authentication**: Bearer JWT (Personnel only; Students rejected with 403)
- **Request Body**:
```json
{
  "incident_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "type": "NORMAL_OVERRIDE", // or "CRITICAL_BREAK_GLASS"
  "requested_scopes": [
    "INCIDENT_VIEW",
    "LOCATION_VIEW",
    "EVIDENCE_VIEW"
  ],
  "reason": "Officer assisting with perimeter containment on request of Medical team."
}
```
- **Response** (`201 Created`):
```json
{
  "id": "e4b2d184-c816-4df8-8097-012984920481",
  "incident_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "requester": {
    "id": "user-uuid",
    "full_name": "Officer Security",
    "role": "SECURITY"
  },
  "type": "NORMAL_OVERRIDE",
  "status": "REQUESTED", // or "ACTIVE" if type was CRITICAL_BREAK_GLASS
  "requested_scopes": ["INCIDENT_VIEW", "LOCATION_VIEW", "EVIDENCE_VIEW"],
  "approved_scopes": [],
  "reason": "Officer assisting with perimeter containment on request of Medical team.",
  "requested_at": "2026-10-06T09:30:00.000Z",
  "approver": null,
  "approved_at": null,
  "activated_at": null,
  "expires_at": null,
  "supervisor_review_status": "NOT_REQUIRED" // or "REVIEW_REQUIRED" if CRITICAL_BREAK_GLASS
}
```
- **Errors**:
  - `400 Bad Request`: Invalid scopes, reason < 5 chars, incident closed, or user already has requested permission.
  - `403 Forbidden`: User is a student (`STUDENT` without personnel status).
  - `404 Not Found`: Incident not found.
  - `409 Conflict`: Active or requested grant already exists for this incident.

---

### 1.2 Approve Emergency Access
- **Endpoint**: `/api/v1/access-policy/break-glass/approve`
- **Method**: `POST`
- **Authentication**: Bearer JWT (`CAMPUS_ADMIN`, `CHIEF_PROCTOR`, or team `isCoordinator: true` for an assigned team).
- **Request Body**:
```json
{
  "request_id": "e4b2d184-c816-4df8-8097-012984920481",
  "approved_scopes": ["INCIDENT_VIEW", "LOCATION_VIEW"], // Optional: defaults to requested scopes. Cannot add unrequested scopes.
  "duration_minutes": 60 // Optional: defaults to 60. Min: 5, Max: 240.
}
```
- **Response** (`200 OK`):
```json
{
  "id": "e4b2d184-c816-4df8-8097-012984920481",
  "incident_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "requester": { "id": "...", "full_name": "Officer Security", "role": "SECURITY" },
  "type": "NORMAL_OVERRIDE",
  "status": "ACTIVE",
  "requested_scopes": ["INCIDENT_VIEW", "LOCATION_VIEW", "EVIDENCE_VIEW"],
  "approved_scopes": ["INCIDENT_VIEW", "LOCATION_VIEW"],
  "approver": { "id": "admin-uuid", "full_name": "Proctor In-Charge", "role": "CHIEF_PROCTOR" },
  "approved_at": "2026-10-06T09:35:00.000Z",
  "activated_at": "2026-10-06T09:35:00.000Z",
  "expires_at": "2026-10-06T10:35:00.000Z",
  "supervisor_review_status": "NOT_REQUIRED"
}
```
- **Errors**:
  - `400 Bad Request`: Request is not in `REQUESTED` status, or approver attempted to grant excessive unrequested scopes.
  - `403 Forbidden`: User is unauthorized to approve, or user attempted self-approval (`requesterUserId === approverId`).
  - `404 Not Found`: Request not found.
  - `409 Conflict`: Concurrently processed approval/rejection.

---

### 1.3 Reject Emergency Access
- **Endpoint**: `/api/v1/access-policy/break-glass/reject`
- **Method**: `POST`
- **Authentication**: Bearer JWT (Supervisor / Coordinator)
- **Request Body**:
```json
{
  "request_id": "e4b2d184-c816-4df8-8097-012984920481",
  "reason": "Medical team confirmed situation is de-escalated."
}
```
- **Response** (`200 OK`): Status updated to `REJECTED`.

---

### 1.4 Revoke Emergency Access
- **Endpoint**: `/api/v1/access-policy/break-glass/revoke`
- **Method**: `POST`
- **Authentication**: Bearer JWT (Supervisor or the Requester themselves)
- **Request Body**:
```json
{
  "request_id": "e4b2d184-c816-4df8-8097-012984920481",
  "reason": "Handover to primary response team complete."
}
```
- **Response** (`200 OK`): Status updated to `REVOKED`. Access immediately ceases.

---

### 1.5 Review Critical Break-Glass
- **Endpoint**: `/api/v1/access-policy/break-glass/review`
- **Method**: `POST`
- **Authentication**: Bearer JWT (`CAMPUS_ADMIN` or `CHIEF_PROCTOR` only)
- **Request Body**:
```json
{
  "request_id": "e4b2d184-c816-4df8-8097-012984920481",
  "status": "REVIEWED", // or "FLAGGED"
  "notes": "Reviewed body-cam and dispatch audio. Urgent entry justified by smoke conditions."
}
```
- **Response** (`200 OK`): `supervisor_review_status` updated to `REVIEWED`.

---

### 1.6 Check Grant Status
- **Endpoint**: `/api/v1/access-policy/break-glass/status?incident_id=<id>`
- **Method**: `GET`
- **Response** (`200 OK`):
Returns the latest `BreakGlassResponseDto` for the user on this incident, or `null` if no request exists.
*Note: If a grant is marked ACTIVE in DB but `expires_at` is past, backend returns `status: "EXPIRED"` dynamically.*

---

### 1.7 List Requests
- **Endpoint**: `/api/v1/access-policy/break-glass/requests?incident_id=<id>&status=<status>`
- **Method**: `GET`
- **Response** (`200 OK`): Array of `BreakGlassResponseDto`. Supervisors see all incident requests; non-supervisors see their own.

---

### 1.8 View Protected Reporter Contact
- **Endpoint**: `/api/v1/access-policy/incidents/:id/reporter-contact`
- **Method**: `GET`
- **Response** (`200 OK`):
```json
{
  "incident_id": "...",
  "reporter": {
    "id": "...",
    "full_name": "Student Name",
    "email": "student@campus.edu",
    "phone": "+919876543210"
  }
}
```
- **Errors**: `403 Forbidden` if user lacks `REPORTER_CONTACT_VIEW` scope (or is not reporter/admin). Access is audited.

---

## 2. Frontend State Machine Mapping

The frontend UI components must reflect the 10 states as follows:

| State | Status in API | UI Badge / Representation | Action Available |
|---|---|---|---|
| **Emergency Access Request** | Initial Modal | Button: "Request Break-Glass" | User selects scopes, enters reason, chooses mode |
| **Emergency Access Pending** | `REQUESTED` | Yellow Pill: "Pending Approval" | User can cancel; approver sees "Approve" / "Reject" |
| **Emergency Access Approved** | `APPROVED` / `ACTIVE` | Blue Pill: "Approved" | Grant transitioning to active |
| **Emergency Access Active** | `ACTIVE` | Green Pill: "Emergency Access Active" with Countdown | Scopes unlocked; "Revoke Access" button |
| **Emergency Access Expiring** | `ACTIVE` (< 10 mins remaining) | Amber Alert: "Expiring Soon" | Warning banner shown to responder |
| **Emergency Access Expired** | `EXPIRED` | Gray Pill: "Access Expired" | Privileges revoked; request new access if needed |
| **Emergency Access Revoked** | `REVOKED` | Red Pill: "Revoked" | Shows revoker and revocation reason |
| **Emergency Access Rejected** | `REJECTED` | Red Pill: "Request Rejected" | Shows rejection reason |
| **Supervisor Review Required** | `supervisor_review_status: REVIEW_REQUIRED` | Orange Pill: "Review Required" | Displayed on admin/proctor dashboard |
| **Supervisor Review Completed** | `supervisor_review_status: REVIEWED` | Slate Pill: "Reviewed" | Review notes visible in audit log |

---

## 3. Realtime Socket Integration

When a user receives `REALTIME_ACCESS`:
1. Emit `subscribe:incident` with `{ "incident_id": "<id>" }` over WebSocket namespace `/rt`.
2. Gateway verifies `hasRealtimeAccess` against `AccessPolicyService`.
3. If valid, client receives `{ "event": "subscribed", "data": { "channel": "incident:<id>" } }`.
4. If grant expires or is revoked, future events are not accessible.

---

## 4. Security Principles for Frontend Developers

1. **Never rely on frontend timers for authorization**: The UI timer is for user convenience. When the backend timer expires, all protected requests will return `403 Forbidden`.
2. **Never expose reporter contact unless `REPORTER_CONTACT_VIEW` is approved**: Do not fetch `/incidents/:id/reporter-contact` proactively unless the active grant explicitly contains `REPORTER_CONTACT_VIEW`.
3. **Never expose download URLs unless `EVIDENCE_VIEW` is approved**: Do not call `/attachments/:id/url` unless the active grant contains `EVIDENCE_VIEW`.
