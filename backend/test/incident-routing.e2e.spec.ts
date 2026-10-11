import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:4000/api/v1';

describe('Campus SOS — End-to-End Incident Routing & Dispatch Lifecycle Suite', () => {
  let studentToken: string;
  let adminToken: string;
  let securityToken: string;
  let infraToken: string;
  let womenSafetyToken: string;

  beforeAll(async () => {
    // 1. Authenticate users across key operational roles
    const studentAuth = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.priya@campus-sos.edu', password: 'Password123!' }),
    }).then((r) => r.json());
    studentToken = studentAuth.access_token;

    const adminAuth = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.office@campus-sos.edu', password: 'Password123!' }),
    }).then((r) => r.json());
    adminToken = adminAuth.access_token;

    const secAuth = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'security.singh@campus-sos.edu', password: 'Password123!' }),
    }).then((r) => r.json());
    securityToken = secAuth.access_token;

    const infraAuth = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'infra.patel@campus-sos.edu', password: 'Password123!' }),
    }).then((r) => r.json());
    infraToken = infraAuth.access_token;

    const wsAuth = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'women.safety@campus-sos.edu', password: 'Password123!' }),
    }).then((r) => r.json());
    womenSafetyToken = wsAuth.access_token;
  });

  describe('1. Student Emergency SOS with Explicit Confirmation', () => {
    it('creates draft and only dispatches upon explicit confirmation', async () => {
      // Create draft
      const draftRes = await fetch(`${BASE_URL}/sos/drafts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          description: 'Immediate medical distress near Central Library',
          location: { kind: 'PREDEFINED', text: 'Central Library Fountain' },
          pin: { x: 0.45, y: 0.65 },
        }),
      });
      expect(draftRes.status).toBe(201);
      const draft = await draftRes.json();
      const draftId = draft.draft_id || draft.id;
      expect(draftId).toBeDefined();

      // Confirm SOS explicitly with Idempotency-Key
      const confirmRes = await fetch(`${BASE_URL}/sos/drafts/${draftId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': `sos-e2e-${Date.now()}`,
        },
        body: JSON.stringify({}),
      });
      expect(confirmRes.status).toBe(201);
      const confirmed = await confirmRes.json();
      expect(confirmed.incident).toBeDefined();
      expect(confirmed.incident.workflow).toBe('EMERGENCY_SOS');
      expect(confirmed.incident.status).toMatch(/CREATED|TEAMS_NOTIFIED|RESPONDER_ASSIGNED/);
      expect(confirmed.live_channel).toBe(`incident:${confirmed.incident.id}`);
    });
  });

  describe('2. Ordinary Incident Reports Without Emergency Dispatch', () => {
    it('creates standard report without emergency dispatch trigger', async () => {
      const res = await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': `std-e2e-${Date.now()}`,
        },
        body: JSON.stringify({
          description: 'Water tap leaking continuously in sports complex washroom',
          category: 'INFRASTRUCTURE',
          location: { kind: 'PREDEFINED', text: 'Sports Complex Ground Floor' },
          pin: { x: 0.35, y: 0.45 },
          attachment_ids: [],
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.incident.workflow).toBe('STANDARD_REPORT');
      expect(data.incident.status).toBe('TEAMS_NOTIFIED');
    });
  });

  describe('3. Correct Routing to Responsible Teams', () => {
    it('routes infrastructure issue to infrastructure team queue', async () => {
      const created = await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': `routing-e2e-${Date.now()}`,
        },
        body: JSON.stringify({
          description: 'Main air conditioner unit faulty in Lecture Hall 3',
          category: 'INFRASTRUCTURE',
          location: { kind: 'PREDEFINED', text: 'Lecture Hall Complex' },
          pin: { x: 0.2, y: 0.3 },
        }),
      }).then((r) => r.json());

      const infraQueue = await fetch(`${BASE_URL}/team/incidents`, {
        headers: { Authorization: `Bearer ${infraToken}` },
      }).then((r) => r.json());

      const found = infraQueue.find((i: any) => i.id === created.incident.id);
      expect(found).toBeDefined();
      expect(found.studentCategory).toBe('INFRASTRUCTURE');
    });
  });

  describe('4. Restricted & Sensitive Reports Scoping', () => {
    it('isolates sensitive women safety report from unauthorized teams', async () => {
      const sensitive = await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': `sens-e2e-${Date.now()}`,
        },
        body: JSON.stringify({
          description: 'Confidential inquiry regarding harassment concern',
          category: 'WOMEN_HARASSMENT',
          location: { kind: 'PREDEFINED', text: 'Hostel Ring Road' },
          pin: { x: 0.5, y: 0.5 },
        }),
      }).then((r) => r.json());

      // Women safety team CAN see it
      const wsQueue = await fetch(`${BASE_URL}/team/incidents`, {
        headers: { Authorization: `Bearer ${womenSafetyToken}` },
      }).then((r) => r.json());
      expect(wsQueue.some((i: any) => i.id === sensitive.incident.id)).toBe(true);

      // Infrastructure team CANNOT see it
      const infraQueue = await fetch(`${BASE_URL}/team/incidents`, {
        headers: { Authorization: `Bearer ${infraToken}` },
      }).then((r) => r.json());
      expect(infraQueue.some((i: any) => i.id === sensitive.incident.id)).toBe(false);
    });
  });

  describe('5. Responder Lifecycle: Offers, Accept, En-Route, On-Scene, Complete', () => {
    it('transitions assignment through complete operational lifecycle', async () => {
      // Create SOS to trigger dispatch
      const draft = await fetch(`${BASE_URL}/sos/drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({
          description: 'Trespasser spotted entering restricted lab compound',
          location: { kind: 'PREDEFINED', text: 'Research Lab Block' },
          pin: { x: 0.8, y: 0.2 },
        }),
      }).then((r) => r.json());

      const confirmed = await fetch(`${BASE_URL}/sos/drafts/${draft.draft_id || draft.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': `lifecycle-dispatch-${Date.now()}`,
        },
        body: JSON.stringify({}),
      }).then((r) => r.json());

      const incidentId = confirmed.incident.id;

      // Admin or coordinator assigns responder
      const assignRes = await fetch(`${BASE_URL}/admin/incidents/${incidentId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          team_id: 'team_sec_01',
          responder_user_id: 'usr_sec_01',
          note: 'Assigned for immediate patrol check',
        }),
      });
      expect([200, 201]).toContain(assignRes.status);

      // Responder views offers
      const offersRes = await fetch(`${BASE_URL}/responder/offers`, {
        headers: { Authorization: `Bearer ${securityToken}` },
      });
      expect(offersRes.status).toBe(200);
      const offers = await offersRes.json();
      const myOffer = offers.find((o: any) => o.incidentId === incidentId || o.incident?.id === incidentId);
      expect(myOffer).toBeDefined();

      const assignmentId = myOffer.id;

      // Responder accepts offer
      const acceptRes = await fetch(`${BASE_URL}/responder/offers/${assignmentId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${securityToken}`,
        },
        body: JSON.stringify({}),
      });
      expect([200, 201]).toContain(acceptRes.status);
      const acceptData = await acceptRes.json();
      expect(acceptData.status).toBe('ACCEPTED');

      // Responder marks en-route
      const enRouteRes = await fetch(`${BASE_URL}/responder/assignments/${assignmentId}/en-route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${securityToken}`,
        },
        body: JSON.stringify({}),
      });
      expect([200, 201]).toContain(enRouteRes.status);
      const enRouteData = await enRouteRes.json();
      expect(enRouteData.status).toBe('EN_ROUTE');

      // Responder marks on-scene
      const onSceneRes = await fetch(`${BASE_URL}/responder/assignments/${assignmentId}/on-scene`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${securityToken}`,
        },
        body: JSON.stringify({}),
      });
      expect([200, 201]).toContain(onSceneRes.status);
      const onSceneData = await onSceneRes.json();
      expect(onSceneData.status).toBe('ON_SCENE');

      // Responder completes assignment
      const completeRes = await fetch(`${BASE_URL}/responder/assignments/${assignmentId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${securityToken}`,
        },
        body: JSON.stringify({
          resolution_summary: 'Compound secured, trespasser escorted off campus',
        }),
      });
      expect([200, 201]).toContain(completeRes.status);
      const completeData = await completeRes.json();
      expect(completeData.status).toBe('COMPLETED');
    });
  });

  describe('6. Idempotency & Duplicate Replays', () => {
    it('returns original incident with idempotency_replay on exact duplicate submission', async () => {
      const idempotencyKey = `idempotent-e2e-${Date.now()}`;
      const payload = {
        description: 'Exposed high voltage wire near electrical transformer',
        category: 'INFRASTRUCTURE',
        location: { kind: 'PREDEFINED', text: 'Substation West' },
        pin: { x: 0.12, y: 0.88 },
      };

      const res1 = await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      const res2 = await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      expect(res1.incident.id).toBe(res2.incident.id);
      expect(res2.idempotency_replay).toBe(true);
    });
  });

  describe('7. Immediate Token Invalidation on Logout', () => {
    it('rejects access tokens immediately after logout', async () => {
      // 1. Log in a temporary session for student Aarav
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student.aarav@campus-sos.edu', password: 'Password123!' }),
      }).then((r) => r.json());

      const sessionToken = loginRes.access_token;
      expect(sessionToken).toBeDefined();

      // 2. Profile works before logout
      const beforeRes = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      expect(beforeRes.status).toBe(200);

      // 3. Logout
      const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      expect(logoutRes.status).toBe(200);

      // 4. Request with the same token must be rejected with 401
      const afterRes = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      expect(afterRes.status).toBe(401);
      const afterBody = await afterRes.json();
      expect(afterBody.code).toMatch(/TOKEN_REVOKED|UNAUTHENTICATED/);
    });
  });

  describe('8. Unauthorized Access Attempts Protection', () => {
    it('blocks unauthorized access to another student private incident', async () => {
      const report = await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': `unauth-e2e-${Date.now()}`,
        },
        body: JSON.stringify({
          description: 'Confidential personal dispute report',
          category: 'STUDENT_MISCONDUCT',
          location: { kind: 'PREDEFINED', text: 'Hostel Room' },
          pin: { x: 0.5, y: 0.5 },
        }),
      }).then((r) => r.json());

      // Attempt access as unrelated infrastructure staff
      const unauthorizedRes = await fetch(`${BASE_URL}/me/incidents/${report.incident.id}`, {
        headers: { Authorization: `Bearer ${infraToken}` },
      });
      expect(unauthorizedRes.status).toBe(403);
    });
  });
});
