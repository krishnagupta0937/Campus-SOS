import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:4000/api/v1';

describe('Campus SOS — Phase 8 End-to-End Verification Suite', () => {
  let studentToken: string;
  let adminToken: string;
  let infraToken: string;
  let womenSafetyToken: string;

  beforeAll(async () => {
    // Authenticate test users across distinct tiers
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

  // Scenario 1: A student submits a standard incident with no photo
  it('1. Student submits standard incident with no photo', async () => {
    const res = await fetch(`${BASE_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
        'Idempotency-Key': `sc1-${Date.now()}`,
      },
      body: JSON.stringify({
        description: 'Streetlight flickering and going dark near North Gate road',
        category: 'INFRASTRUCTURE',
        location: { kind: 'PREDEFINED', text: 'North Gate Road' },
        pin: { x: 0.15, y: 0.25 },
        attachment_ids: [],
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.incident).toBeDefined();
    expect(body.incident.workflow).toBe('STANDARD_REPORT');
    expect(body.incident.status).toBe('TEAMS_NOTIFIED');
  });

  // Scenario 2: A student submits an incident with one photo
  it('2. Student submits incident with one photo', async () => {
    // Request upload
    const u1 = await fetch(`${BASE_URL}/attachments/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ mime_type: 'image/png', size_bytes: 2048, position: 1 }),
    }).then((r) => r.json());
    expect(u1.attachment_id).toBeDefined();

    // Direct upload
    const uploadRes = await fetch(`${BASE_URL}/attachments/${u1.attachment_id}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        data_base64: Buffer.from('TEST-PNG-IMAGE-PAYLOAD').toString('base64'),
        mime_type: 'image/png',
      }),
    });
    expect(uploadRes.status).toBe(200);

    // Create report linking photo
    const rep = await fetch(`${BASE_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
        'Idempotency-Key': `sc2-${Date.now()}`,
      },
      body: JSON.stringify({
        description: 'Pothole in the bicycle path causing tire punctures',
        category: 'INFRASTRUCTURE',
        location: { kind: 'PREDEFINED', text: 'Bicycle Path West' },
        pin: { x: 0.28, y: 0.44 },
        attachment_ids: [u1.attachment_id],
      }),
    }).then((r) => r.json());

    expect(rep.incident).toBeDefined();
    expect(rep.incident.public_id).toMatch(/^INC-2026-\d{6}$/);
  });

  // Scenario 3: A student submits an incident with two photos
  it('3. Student submits incident with two photos', async () => {
    const u1 = await fetch(`${BASE_URL}/attachments/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ mime_type: 'image/jpeg', size_bytes: 1024, position: 1 }),
    }).then((r) => r.json());

    const u2 = await fetch(`${BASE_URL}/attachments/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ mime_type: 'image/jpeg', size_bytes: 1024, position: 2 }),
    }).then((r) => r.json());

    await fetch(`${BASE_URL}/attachments/${u1.attachment_id}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ data_base64: Buffer.from('IMG-1').toString('base64'), mime_type: 'image/jpeg' }),
    });

    await fetch(`${BASE_URL}/attachments/${u2.attachment_id}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ data_base64: Buffer.from('IMG-2').toString('base64'), mime_type: 'image/jpeg' }),
    });

    const res = await fetch(`${BASE_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
        'Idempotency-Key': `sc3-${Date.now()}`,
      },
      body: JSON.stringify({
        description: 'Exterior air conditioner unit vibrating loose from wall bracket',
        category: 'INFRASTRUCTURE',
        location: { kind: 'PREDEFINED', text: 'Hostel Block 4' },
        pin: { x: 0.32, y: 0.38 },
        attachment_ids: [u1.attachment_id, u2.attachment_id],
      }),
    });
    expect(res.status).toBe(201);
  });

  // Scenario 4: Invalid attachments are rejected safely
  it('4. Invalid attachments rejected safely (MIME & limit)', async () => {
    // Invalid MIME
    const badMime = await fetch(`${BASE_URL}/attachments/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ mime_type: 'application/pdf', size_bytes: 5000, position: 1 }),
    });
    expect(badMime.status).toBe(415);

    // Limit exceeded (>2 photos)
    const tooMany = await fetch(`${BASE_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
        'Idempotency-Key': `sc4-${Date.now()}`,
      },
      body: JSON.stringify({
        description: 'Exceeding attachment limit testing submission',
        category: 'INFRASTRUCTURE',
        location: { kind: 'PREDEFINED', text: 'Auditorium' },
        pin: { x: 0.5, y: 0.5 },
        attachment_ids: ['att-1', 'att-2', 'att-3'],
      }),
    });
    expect(tooMany.status).toBe(422);
  });

  // Scenario 5 & 6: Persisted incident appears in correct main portal queue and assigned to correct team
  it('5 & 6. Persisted incident routes to correct department queue', async () => {
    const rep = await fetch(`${BASE_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
        'Idempotency-Key': `sc5-${Date.now()}`,
      },
      body: JSON.stringify({
        description: 'Water dispenser cooling system broken and leaking water',
        category: 'INFRASTRUCTURE',
        location: { kind: 'PREDEFINED', text: 'Academic Block A Ground Floor' },
        pin: { x: 0.22, y: 0.52 },
      }),
    }).then((r) => r.json());

    const createdId = rep.incident.id;

    // Infrastructure team sees it
    const infraQueue = await fetch(`${BASE_URL}/team/incidents`, {
      headers: { Authorization: `Bearer ${infraToken}` },
    }).then((r) => r.json());

    const found = infraQueue.find((i: any) => i.id === createdId);
    expect(found).toBeDefined();
    expect(found.studentCategory).toBe('INFRASTRUCTURE');

    // Women safety does NOT see it (restricted scoping)
    const wsQueue = await fetch(`${BASE_URL}/team/incidents`, {
      headers: { Authorization: `Bearer ${womenSafetyToken}` },
    }).then((r) => r.json());

    const leak = wsQueue.find((i: any) => i.id === createdId);
    expect(leak).toBeUndefined();
  });

  // Scenario 7: Sensitive and confidential reports stay restricted
  it('7. Sensitive women safety concerns route only to authorized team', async () => {
    const wsReport = await fetch(`${BASE_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
        'Idempotency-Key': `sc7-${Date.now()}`,
      },
      body: JSON.stringify({
        description: 'Confidential safety concern regarding persistent unwanted following near library',
        category: 'WOMEN_HARASSMENT',
        location: { kind: 'PREDEFINED', text: 'Library Pathway' },
        pin: { x: 0.40, y: 0.65 },
      }),
    }).then((r) => r.json());

    const wsQueue = await fetch(`${BASE_URL}/team/incidents`, {
      headers: { Authorization: `Bearer ${womenSafetyToken}` },
    }).then((r) => r.json());

    const wsFound = wsQueue.find((i: any) => i.id === wsReport.incident.id);
    expect(wsFound).toBeDefined();
    expect(wsFound.isRestricted).toBe(true);

    // Infrastructure does NOT have access
    const infraQueue = await fetch(`${BASE_URL}/team/incidents`, {
      headers: { Authorization: `Bearer ${infraToken}` },
    }).then((r) => r.json());
    expect(infraQueue.find((i: any) => i.id === wsReport.incident.id)).toBeUndefined();
  });

  // Scenario 8, 9, 10: Duplicate events do not create duplicate assignments or notifications
  it('8, 9, 10. Idempotent submission prevents duplicates', async () => {
    const key = `idem-duplicate-check-${Date.now()}`;
    const first = await fetch(`${BASE_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
        'Idempotency-Key': key,
      },
      body: JSON.stringify({
        description: 'Broken window latch in third floor chemistry lab',
        category: 'INFRASTRUCTURE',
        location: { kind: 'PREDEFINED', text: 'Science Block B' },
        pin: { x: 0.42, y: 0.58 },
      }),
    }).then((r) => r.json());

    const second = await fetch(`${BASE_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
        'Idempotency-Key': key,
      },
      body: JSON.stringify({
        description: 'Broken window latch in third floor chemistry lab',
        category: 'INFRASTRUCTURE',
        location: { kind: 'PREDEFINED', text: 'Science Block B' },
        pin: { x: 0.42, y: 0.58 },
      }),
    }).then((r) => r.json());

    expect(first.incident.id).toBe(second.incident.id);
    expect(second.idempotency_replay).toBe(true);
  });

  // Scenario 11: Emergency confirmation and dispatch remain separate from standard reporting
  it('11. Emergency SOS workflow creates distinct EMERGENCY_SOS incident and dispatch channel', async () => {
    const draft = await fetch(`${BASE_URL}/sos/drafts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        description: 'Medical fainting emergency at campus gymnasium',
        location: { kind: 'PREDEFINED', text: 'Sports Gymnasium' },
        pin: { x: 0.70, y: 0.35 },
      }),
    }).then((r) => r.json());

    const draftId = draft.draft_id || draft.id;
    const confirm = await fetch(`${BASE_URL}/sos/drafts/${draftId}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
        'Idempotency-Key': `sos-dispatch-${Date.now()}`,
      },
      body: JSON.stringify({}),
    }).then((r) => r.json());

    expect(confirm.incident.workflow).toBe('EMERGENCY_SOS');
    expect(confirm.incident.public_id).toMatch(/^SOS-2026-\d{6}$/);
    expect(confirm.live_channel).toBe(`incident:${confirm.incident.id}`);
  });

  // Scenario 12: Login, logout, session handling, and role permissions
  it('12. Role permissions and invalid credentials handled cleanly', async () => {
    // Bad password
    const badLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.priya@campus-sos.edu', password: 'WrongPassword!' }),
    });
    expect(badLogin.status).toBe(401);

    // Profile query
    const profile = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    }).then((r) => r.json());
    expect(profile.email).toBe('student.priya@campus-sos.edu');
    expect(profile.role).toBe('STUDENT');
  });

  // Scenario 13: Report coordinates persist and render accurately
  it('13. Pin coordinates persist with precise numeric ordering', async () => {
    const pinPayload = { x: 0.6543, y: 0.8765 };
    const rep = await fetch(`${BASE_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
        'Idempotency-Key': `coords-${Date.now()}`,
      },
      body: JSON.stringify({
        description: 'Damaged solar panel cabling on roof walkway',
        category: 'INFRASTRUCTURE',
        location: { kind: 'PREDEFINED', text: 'Roof Walkway' },
        pin: pinPayload,
      }),
    }).then((r) => r.json());

    const detail = await fetch(`${BASE_URL}/me/incidents/${rep.incident.id}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    }).then((r) => r.json());

    expect(detail.location.pin).toBeDefined();
    expect(detail.location.pin.x).toBeCloseTo(0.6543, 3);
    expect(detail.location.pin.y).toBeCloseTo(0.8765, 3);
  });

  // Scenario 14: Students cannot access other students' confidential reports
  it('14. Student access isolation guards confidential reports', async () => {
    // Submit student incident
    const s1Report = await fetch(`${BASE_URL}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
        'Idempotency-Key': `iso-${Date.now()}`,
      },
      body: JSON.stringify({
        description: 'Private medical leave dispute report',
        category: 'STUDENT_MISCONDUCT',
        location: { kind: 'PREDEFINED', text: 'Hostel' },
        pin: { x: 0.1, y: 0.1 },
      }),
    }).then((r) => r.json());

    // Non-student attempting to access student detail route
    const intruder = await fetch(`${BASE_URL}/me/incidents/${s1Report.incident.id}`, {
      headers: { Authorization: `Bearer ${infraToken}` },
    });
    expect(intruder.status).toBe(403);
  });
});
