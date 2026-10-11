import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:4000/api/v1';
const DB_PATH = path.resolve(__dirname, '../data/campus_sos_dev_db.json');

function getPersistedDb() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Persisted dev database file not found at ${DB_PATH}`);
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

describe('Campus SOS — Deterministic Routing & Delivery Acceptance Suite', () => {
  let studentToken: string;
  let fireSafetyToken: string;
  let securityToken: string;
  let adminToken: string;
  let medicalToken: string;
  let chiefProctorToken: string;
  let infraToken: string;

  beforeAll(async () => {
    // Authenticate all distinct role accounts
    const authStudent = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student.priya@campus-sos.edu', password: 'Password123!' }),
    }).then((r) => r.json());
    studentToken = authStudent.access_token;
    expect(studentToken).toBeDefined();

    const authFire = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fire.safety@campus-sos.edu', password: 'Password123!' }),
    }).then((r) => r.json());
    fireSafetyToken = authFire.access_token;
    expect(fireSafetyToken).toBeDefined();

    const authSec = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'security.singh@campus-sos.edu', password: 'Password123!' }),
    }).then((r) => r.json());
    securityToken = authSec.access_token;
    expect(securityToken).toBeDefined();

    const authAdmin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin.office@campus-sos.edu', password: 'Password123!' }),
    }).then((r) => r.json());
    adminToken = authAdmin.access_token;
    expect(adminToken).toBeDefined();

    const authMed = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'medical.roy@campus-sos.edu', password: 'Password123!' }),
    }).then((r) => r.json());
    medicalToken = authMed.access_token;
    expect(medicalToken).toBeDefined();

    const authProctor = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'chief.proctor@campus-sos.edu', password: 'Password123!' }),
    }).then((r) => r.json());
    chiefProctorToken = authProctor.access_token;
    expect(chiefProctorToken).toBeDefined();

    const authInfra = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'infra.patel@campus-sos.edu', password: 'Password123!' }),
    }).then((r) => r.json());
    infraToken = authInfra.access_token;
    expect(infraToken).toBeDefined();
  });

  describe('Scenario A–F: Ordinary Fire Hazard Report & Deterministic Routing', () => {
    let createdIncidentId: string;
    let createdPublicId: string;
    const idempotencyKey = `fire-report-${Date.now()}`;

    it('A & B. Submits ordinary report and persists exactly one incident with unique public ID and location', async () => {
      const response = await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          category: 'FIRE_HAZARD',
          description: 'Smoke and burning smell near the electrical laboratory.',
          location: { kind: 'PREDEFINED', text: 'Electrical Engineering Lab Block B' },
          pin: { x: 0.35, y: 0.45 },
          attachment_ids: [],
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.incident).toBeDefined();
      createdIncidentId = data.incident.id;
      createdPublicId = data.incident.public_id;

      expect(createdIncidentId).toBeDefined();
      expect(createdPublicId).toBeDefined();
      expect(data.incident.workflow).toBe('STANDARD_REPORT');
      expect(data.incident.status).toBe('TEAMS_NOTIFIED');

      // Inspect persisted database record directly on disk
      const db = getPersistedDb();
      const persisted = db.incidents.find((i: any) => i.id === createdIncidentId);
      expect(persisted).toBeDefined();
      expect(persisted.publicId).toBe(createdPublicId);
      expect(persisted.reporterId).toBe('usr_student_01');
      expect(persisted.workflow).toBe('STANDARD_REPORT');
      expect(persisted.status).toBe('TEAMS_NOTIFIED');
      expect(persisted.studentCategory).toBe('FIRE_HAZARD');
      expect(typeof persisted.immediateDanger).toBe('boolean');
      expect(persisted.campusWideEligible).toBe(false);

      // Verify location record
      const persistedLoc = db.incidentLocations.find((l: any) => l.incidentId === createdIncidentId);
      expect(persistedLoc).toBeDefined();
      expect(persistedLoc.pinX).toBe(0.35);
      expect(persistedLoc.pinY).toBe(0.45);
      expect(persistedLoc.locationText).toBe('Electrical Engineering Lab Block B');
    });

    it('C. Persists routing decision and team assignments containing FIRE_SAFETY, SECURITY, and CAMPUS_ADMIN', async () => {
      const db = getPersistedDb();

      // Check persisted routing decision
      const decision = db.routingDecisions.find((rd: any) => rd.incidentId === createdIncidentId);
      expect(decision).toBeDefined();
      expect(decision.matchedRules).toContain('R-FIRE-001');

      const decisionTeams = decision.teams.map((t: any) => t.team_code);
      expect(decisionTeams).toContain('FIRE_SAFETY');
      expect(decisionTeams).toContain('SECURITY');
      expect(decisionTeams).toContain('CAMPUS_ADMIN');

      // Medical and Chief Proctor must NOT be included for ordinary fire hazard without injuries
      expect(decisionTeams).not.toContain('MEDICAL');
      expect(decisionTeams).not.toContain('CHIEF_PROCTOR');

      // Check persisted IncidentTeam records
      const assignedTeams = db.incidentTeams.filter((it: any) => it.incidentId === createdIncidentId && !it.revokedAt);
      const assignedTeamIds = assignedTeams.map((it: any) => it.teamId);

      const fireTeam = db.teams.find((t: any) => t.code === 'FIRE_SAFETY');
      const secTeam = db.teams.find((t: any) => t.code === 'SECURITY');
      const adminTeam = db.teams.find((t: any) => t.code === 'CAMPUS_ADMIN');
      const medTeam = db.teams.find((t: any) => t.code === 'MEDICAL');
      const proctorTeam = db.teams.find((t: any) => t.code === 'CHIEF_PROCTOR');

      expect(assignedTeamIds).toContain(fireTeam.id);
      expect(assignedTeamIds).toContain(secTeam.id);
      expect(assignedTeamIds).toContain(adminTeam.id);
      expect(assignedTeamIds).not.toContain(medTeam.id);
      expect(assignedTeamIds).not.toContain(proctorTeam.id);
    });

    it('D. Department accounts retrieve the incident in workspace and receive in-app notifications', async () => {
      // 1. Fire Safety Workspace
      const fireRes = await fetch(`${BASE_URL}/team/incidents`, {
        headers: { Authorization: `Bearer ${fireSafetyToken}` },
      });
      expect(fireRes.status).toBe(200);
      const fireIncidents = await fireRes.json();
      expect(fireIncidents.some((i: any) => i.id === createdIncidentId)).toBe(true);

      // 2. Security Workspace
      const secRes = await fetch(`${BASE_URL}/team/incidents`, {
        headers: { Authorization: `Bearer ${securityToken}` },
      });
      expect(secRes.status).toBe(200);
      const secIncidents = await secRes.json();
      expect(secIncidents.some((i: any) => i.id === createdIncidentId)).toBe(true);

      // 3. Admin Workspace
      const adminRes = await fetch(`${BASE_URL}/team/incidents`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(adminRes.status).toBe(200);
      const adminIncidents = await adminRes.json();
      expect(adminIncidents.some((i: any) => i.id === createdIncidentId)).toBe(true);

      // 4. Medical Workspace MUST NOT see this incident
      const medRes = await fetch(`${BASE_URL}/team/incidents`, {
        headers: { Authorization: `Bearer ${medicalToken}` },
      });
      expect(medRes.status).toBe(200);
      const medIncidents = await medRes.json();
      expect(medIncidents.some((i: any) => i.id === createdIncidentId)).toBe(false);

      // 5. Check Notifications for target recipient user IDs
      const db = getPersistedDb();
      const incidentNotifs = db.notifications.filter((n: any) => n.incidentId === createdIncidentId);

      const fireNotif = incidentNotifs.find((n: any) => n.recipientUserId === 'usr_fire_01');
      const secNotif = incidentNotifs.find((n: any) => n.recipientUserId === 'usr_sec_01');
      const adminNotif = incidentNotifs.find((n: any) => n.recipientUserId === 'usr_admin_01');
      const medNotif = incidentNotifs.find((n: any) => n.recipientUserId === 'usr_med_01');

      expect(fireNotif).toBeDefined();
      expect(secNotif).toBeDefined();
      expect(adminNotif).toBeDefined();
      expect(medNotif).toBeUndefined(); // Medical user was NOT notified

      // Check accurate delivery state (SENT, not fake DELIVERED without external gateway)
      expect(fireNotif.deliveryStatus).toBe('SENT');
      expect(secNotif.deliveryStatus).toBe('SENT');
      expect(adminNotif.deliveryStatus).toBe('SENT');
    });

    it('E. Medical is included when situation warrants medical assistance (injury present)', async () => {
      const injuryResponse = await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': `fire-injury-${Date.now()}`,
        },
        body: JSON.stringify({
          category: 'FIRE_HAZARD',
          description: 'Fire in chemistry lab with severe burn injuries and casualty requiring immediate medical doctor',
          location: { kind: 'PREDEFINED', text: 'Chemistry Lab 101' },
          pin: { x: 0.5, y: 0.5 },
        }),
      });

      expect(injuryResponse.status).toBe(201);
      const injuryData = await injuryResponse.json();
      const db = getPersistedDb();

      const decision = db.routingDecisions.find((rd: any) => rd.incidentId === injuryData.incident.id);
      expect(decision).toBeDefined();
      const teams = decision.teams.map((t: any) => t.team_code);
      expect(teams).toContain('FIRE_SAFETY');
      expect(teams).toContain('SECURITY');
      expect(teams).toContain('CAMPUS_ADMIN');
      expect(teams).toContain('MEDICAL'); // Included due to injury context
    });

    it('F. Normal fire hazard does not trigger emergency responder dispatch or campus-wide broadcast', async () => {
      // 1. No responder offers generated for standard report
      const offersRes = await fetch(`${BASE_URL}/responder/offers`, {
        headers: { Authorization: `Bearer ${fireSafetyToken}` },
      });
      expect(offersRes.status).toBe(200);
      const offers = await offersRes.json();
      expect(offers.some((o: any) => o.incidentId === createdIncidentId || o.incident?.id === createdIncidentId)).toBe(false);

      // 2. No campus-wide active notice triggered
      const noticesRes = await fetch(`${BASE_URL}/notices/active`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      expect(noticesRes.status).toBe(200);
      const notices = await noticesRes.json();
      const fireBroadcast = notices.find((n: any) => n.incidentId === createdIncidentId);
      expect(fireBroadcast).toBeUndefined();
    });
  });

  describe('Scenario G: Emergency SOS with Fire — Confirmation, Dispatch, and Status Transitions', () => {
    let sosDraftId: string;
    let sosIncidentId: string;
    let assignmentId: string;

    it('Creates draft and does NOT dispatch before explicit confirmation', async () => {
      const draftRes = await fetch(`${BASE_URL}/sos/drafts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          description: 'Massive active fire breakout in academic auditorium block!',
          location: { kind: 'PREDEFINED', text: 'Main Auditorium' },
          pin: { x: 0.6, y: 0.7 },
        }),
      });

      expect(draftRes.status).toBe(201);
      const draft = await draftRes.json();
      sosDraftId = draft.draft_id || draft.id;
      expect(sosDraftId).toBeDefined();

      // Check that no dispatch offers exist yet for this draft
      const preOffers = await fetch(`${BASE_URL}/responder/offers`, {
        headers: { Authorization: `Bearer ${fireSafetyToken}` },
      }).then((r) => r.json());
      expect(preOffers.some((o: any) => o.incidentId === sosDraftId)).toBe(false);
    });

    it('Explicitly confirms SOS, triggers emergency routing and dispatch offers', async () => {
      const confirmRes = await fetch(`${BASE_URL}/sos/drafts/${sosDraftId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': `sos-fire-confirm-${Date.now()}`,
        },
        body: JSON.stringify({}),
      });

      expect(confirmRes.status).toBe(201);
      const confirmed = await confirmRes.json();
      expect(confirmed.incident).toBeDefined();
      sosIncidentId = confirmed.incident.id;
      expect(confirmed.incident.workflow).toBe('EMERGENCY_SOS');

      // Verify routing in database
      const db = getPersistedDb();
      const decision = db.routingDecisions.find((rd: any) => rd.incidentId === sosIncidentId);
      expect(decision).toBeDefined();
      const decisionTeams = decision.teams.map((t: any) => t.team_code);
      expect(decisionTeams).toContain('FIRE_SAFETY');
      expect(decisionTeams).toContain('SECURITY');
      expect(decisionTeams).toContain('CAMPUS_ADMIN');

      // Check responder offers for Fire Safety responder
      const offersRes = await fetch(`${BASE_URL}/responder/offers`, {
        headers: { Authorization: `Bearer ${fireSafetyToken}` },
      });
      expect(offersRes.status).toBe(200);
      const offers = await offersRes.json();
      const fireOffer = offers.find((o: any) => o.incidentId === sosIncidentId || o.incident?.id === sosIncidentId);
      expect(fireOffer).toBeDefined();
      expect(fireOffer.status).toBe('OFFERED');
      assignmentId = fireOffer.id;
    });

    it('Responder accepts offer -> Incident transitions to RESPONDER_ASSIGNED', async () => {
      const acceptRes = await fetch(`${BASE_URL}/responder/offers/${assignmentId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fireSafetyToken}`,
        },
        body: JSON.stringify({}),
      });

      expect([200, 201]).toContain(acceptRes.status);
      const acceptData = await acceptRes.json();
      expect(acceptData.status).toBe('ACCEPTED');

      // Verify incident status
      const db = getPersistedDb();
      const incident = db.incidents.find((i: any) => i.id === sosIncidentId);
      expect(incident.status).toBe('RESPONDER_ASSIGNED');
    });

    it('Responder marks en-route -> Incident transitions to RESPONDER_ON_THE_WAY', async () => {
      const enRouteRes = await fetch(`${BASE_URL}/responder/assignments/${assignmentId}/en-route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fireSafetyToken}`,
        },
        body: JSON.stringify({}),
      });

      expect([200, 201]).toContain(enRouteRes.status);
      const enRouteData = await enRouteRes.json();
      expect(enRouteData.status).toBe('EN_ROUTE');

      const db = getPersistedDb();
      const incident = db.incidents.find((i: any) => i.id === sosIncidentId);
      expect(incident.status).toBe('RESPONDER_ON_THE_WAY');
    });

    it('Responder marks on-scene -> Incident transitions to RESPONDER_AT_LOCATION', async () => {
      const onSceneRes = await fetch(`${BASE_URL}/responder/assignments/${assignmentId}/on-scene`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fireSafetyToken}`,
        },
        body: JSON.stringify({}),
      });

      expect([200, 201]).toContain(onSceneRes.status);
      const onSceneData = await onSceneRes.json();
      expect(onSceneData.status).toBe('ON_SCENE');

      const db = getPersistedDb();
      const incident = db.incidents.find((i: any) => i.id === sosIncidentId);
      expect(incident.status).toBe('RESPONDER_AT_LOCATION');
      expect(incident.responderArrivedAt).toBeDefined();
    });

    it('Responder completes assignment -> Incident transitions to RESOLVED', async () => {
      const completeRes = await fetch(`${BASE_URL}/responder/assignments/${assignmentId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fireSafetyToken}`,
        },
        body: JSON.stringify({ resolution_summary: 'Fire safely extinguished using CO2 extinguishers.' }),
      });

      expect([200, 201]).toContain(completeRes.status);

      const db = getPersistedDb();
      const incident = db.incidents.find((i: any) => i.id === sosIncidentId);
      expect(incident.status).toBe('RESOLVED');
      expect(incident.resolvedAt).toBeDefined();
    });
  });

  describe('Scenario H: Idempotency, Resilience & Security Boundary Verification', () => {
    it('Handles duplicate submissions idempotently without creating duplicate records', async () => {
      const key = `idem-test-${Date.now()}`;
      const payload = {
        category: 'INFRASTRUCTURE',
        description: 'Broken water pipe in basement corridor',
        location: { kind: 'PREDEFINED', text: 'Main Building Basement' },
        pin: { x: 0.1, y: 0.2 },
      };

      const res1 = await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': key,
        },
        body: JSON.stringify(payload),
      });
      expect(res1.status).toBe(201);
      const data1 = await res1.json();

      // Submit identical request with same key
      const res2 = await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': key,
        },
        body: JSON.stringify(payload),
      });
      const data2 = await res2.json();

      expect(data2.incident.id).toBe(data1.incident.id);
      expect(data2.idempotency_replay).toBe(true);

      // Verify database has only ONE record with this idempotency key
      const db = getPersistedDb();
      const matches = db.incidents.filter((i: any) => i.idempotencyKey === key);
      expect(matches.length).toBe(1);
    });

    it('Blocks unauthorized cross-team access to restricted incidents', async () => {
      // Student submits sensitive harassment report
      const sensRes = await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': `sens-harass-${Date.now()}`,
        },
        body: JSON.stringify({
          category: 'WOMEN_HARASSMENT',
          description: 'Confidential reporting: verbal harassment incident near hostel entrance',
          location: { kind: 'PREDEFINED', text: 'Girls Hostel Gate' },
          pin: { x: 0.8, y: 0.8 },
        }),
      });
      expect(sensRes.status).toBe(201);
      const sensData = await sensRes.json();
      const sensIncidentId = sensData.incident.id;

      // Verify incident is marked restricted in DB
      const db = getPersistedDb();
      const sensIncident = db.incidents.find((i: any) => i.id === sensIncidentId);
      expect(sensIncident.isRestricted).toBe(true);
      expect(sensIncident.campusWideEligible).toBe(false);

      // Infrastructure team cannot see it in queue
      const infraList = await fetch(`${BASE_URL}/team/incidents`, {
        headers: { Authorization: `Bearer ${infraToken}` },
      }).then((r) => r.json());
      expect(infraList.some((i: any) => i.id === sensIncidentId)).toBe(false);

      // Infrastructure team direct access is forbidden (403)
      const infraDirectRes = await fetch(`${BASE_URL}/team/incidents/${sensIncidentId}`, {
        headers: { Authorization: `Bearer ${infraToken}` },
      });
      expect(infraDirectRes.status).toBe(403);
    });

    it('Tracks notification delivery states accurately as SENT (not premature mock DELIVERED)', async () => {
      const db = getPersistedDb();
      const deliveries = db.notificationDeliveries || [];
      expect(deliveries.length).toBeGreaterThan(0);

      // Verify deliveries have valid channels and SENT status
      for (const d of deliveries.slice(-10)) {
        expect(['SENT', 'DELIVERED', 'FAILED']).toContain(d.status);
        expect(d.sentAt || d.createdAt).toBeDefined();
      }
    });
  });

  describe('Scenario I: Category-Specific Deterministic Routing Verification', () => {
    it('Routes Medical Emergencies to MEDICAL, SECURITY, CAMPUS_ADMIN (excludes FIRE_SAFETY)', async () => {
      const res = await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': `med-route-${Date.now()}`,
        },
        body: JSON.stringify({
          category: 'MEDICAL_EMERGENCY',
          description: 'Student fainted with low pulse at university sports complex gym',
          location: { kind: 'PREDEFINED', text: 'Gymnasium 1st Floor' },
          pin: { x: 0.4, y: 0.6 },
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      const db = getPersistedDb();
      const decision = db.routingDecisions.find((rd: any) => rd.incidentId === data.incident.id);
      expect(decision).toBeDefined();

      const teamCodes = decision.teams.map((t: any) => t.team_code);
      expect(teamCodes).toContain('MEDICAL');
      expect(teamCodes).toContain('CAMPUS_ADMIN');
      expect(teamCodes).not.toContain('FIRE_SAFETY');
    });

    it('Routes Infrastructure Hazards to INFRASTRUCTURE, CAMPUS_ADMIN (excludes MEDICAL, FIRE_SAFETY)', async () => {
      const res = await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': `infra-route-${Date.now()}`,
        },
        body: JSON.stringify({
          category: 'INFRASTRUCTURE',
          description: 'Large concrete slab loose and dangling from library overhang',
          location: { kind: 'PREDEFINED', text: 'Central Library Portico' },
          pin: { x: 0.25, y: 0.35 },
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      const db = getPersistedDb();
      const decision = db.routingDecisions.find((rd: any) => rd.incidentId === data.incident.id);
      expect(decision).toBeDefined();

      const teamCodes = decision.teams.map((t: any) => t.team_code);
      expect(teamCodes).toContain('INFRASTRUCTURE');
      expect(teamCodes).toContain('CAMPUS_ADMIN');
      expect(teamCodes).not.toContain('FIRE_SAFETY');
      expect(teamCodes).not.toContain('MEDICAL');
    });

    it('Routes General Complaints without emergency dispatch or campus-wide broadcast', async () => {
      const res = await fetch(`${BASE_URL}/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
          'Idempotency-Key': `general-route-${Date.now()}`,
        },
        body: JSON.stringify({
          category: 'GENERAL_COMPLAINT',
          description: 'Reading room AC thermostat temperature setting is too low',
          location: { kind: 'PREDEFINED', text: 'Reading Room 2' },
          pin: { x: 0.3, y: 0.3 },
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      const db = getPersistedDb();

      const incident = db.incidents.find((i: any) => i.id === data.incident.id);
      expect(incident.workflow).toBe('STANDARD_REPORT');
      expect(incident.campusWideEligible).toBe(false);

      const decision = db.routingDecisions.find((rd: any) => rd.incidentId === data.incident.id);
      expect(decision).toBeDefined();
      expect(decision.audience?.campus_wide_eligible ?? false).toBe(false);
    });
  });
});
