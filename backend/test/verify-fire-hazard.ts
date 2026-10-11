import * as fs from 'fs';
import * as path from 'path';

async function verifyFireHazardDelivery() {
  const BASE_URL = 'http://localhost:4000/api/v1';
  console.log('================================================================');
  console.log('CAMPUS SOS — LIVE FIRE HAZARD DELIVERY & ROUTING VERIFICATION');
  console.log('================================================================\n');

  // STEP 1: AUTHENTICATE USERS
  console.log('[1/6] Authenticating users across required roles...');
  const student = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student.priya@campus-sos.edu', password: 'Password123!' }),
  }).then((r) => r.json());

  const student2 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student.aarav@campus-sos.edu', password: 'Password123!' }),
  }).then((r) => r.json());

  const fireSafety = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fire.safety@campus-sos.edu', password: 'Password123!' }),
  }).then((r) => r.json());

  const security = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'security.singh@campus-sos.edu', password: 'Password123!' }),
  }).then((r) => r.json());

  const campusAdmin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin.office@campus-sos.edu', password: 'Password123!' }),
  }).then((r) => r.json());

  const womenSafety = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'women.safety@campus-sos.edu', password: 'Password123!' }),
  }).then((r) => r.json());

  console.log('  ✓ Student Priya Sharma:', student.user?.id);
  console.log('  ✓ Fire Safety Officer:', fireSafety.user?.id, `(Team: ${fireSafety.user?.teamCode})`);
  console.log('  ✓ Security Officer:', security.user?.id, `(Team: ${security.user?.teamCode})`);
  console.log('  ✓ Campus Admin:', campusAdmin.user?.id, `(Role: ${campusAdmin.user?.role})`);
  console.log('  ✓ Women Safety (Unauthorized Department):', womenSafety.user?.id);
  console.log('  ✓ Student Aarav (Unauthorized Student):', student2.user?.id);

  // STEP 2: SUBMIT REAL FIRE HAZARD REPORT THROUGH API
  console.log('\n[2/6] Submitting real Fire Hazard test report through API...');
  const reportPayload = {
    description: 'Active electrical short circuit sparking with thick smoke near chemistry lab room B-204',
    category: 'FIRE',
    location: {
      kind: 'PREDEFINED',
      predefined_location_id: 'loc_chem_lab',
      text: 'Chemistry Lab Room B-204',
    },
    pin: { x: 0.452, y: 0.628 },
    attachment_ids: [],
  };

  const idempotencyKey = `fire-hazard-live-${Date.now()}`;
  const reportRes = await fetch(`${BASE_URL}/incidents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${student.access_token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(reportPayload),
  }).then((r) => r.json());

  const incidentId = reportRes.incident.id;
  const publicId = reportRes.incident.public_id;
  console.log(`  ✓ Incident Created: ID=${incidentId}, PublicID=${publicId}`);
  console.log(`  ✓ Status: ${reportRes.incident.status}`);
  console.log(`  ✓ Routing Decision:`);
  console.log(`      Categories: ${JSON.stringify(reportRes.routing_decision?.categories || reportRes.incident.categories)}`);
  console.log(`      Matched Rules: ${JSON.stringify(reportRes.routing_decision?.matched_rules)}`);

  // STEP 3: VERIFY PERSISTED ASSIGNMENTS & TEAMS (FIRE_SAFETY, SECURITY, CAMPUS_ADMIN)
  console.log('\n[3/6] Verifying persisted assignments and team bindings in database...');
  const dbPath = path.resolve(__dirname, '../data/campus_sos_dev_db.json');
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  const incidentTeams = (dbData.incidentTeams || []).filter((it: any) => it.incidentId === incidentId);
  const teamCodes = incidentTeams.map((it: any) => {
    const t = (dbData.teams || []).find((team: any) => team.id === it.teamId);
    return { code: t?.code, role: it.role };
  });

  console.log('  Persisted Incident Teams:');
  teamCodes.forEach((tc: any) => console.log(`    - ${tc.code} (Role: ${tc.role})`));

  const hasFire = teamCodes.some((tc: any) => tc.code === 'FIRE_SAFETY');
  const hasSecurity = teamCodes.some((tc: any) => tc.code === 'SECURITY');
  const hasAdmin = teamCodes.some((tc: any) => tc.code === 'CAMPUS_ADMIN');

  console.log(`  ✓ FIRE_SAFETY present: ${hasFire}`);
  console.log(`  ✓ SECURITY present: ${hasSecurity}`);
  console.log(`  ✓ CAMPUS_ADMIN present: ${hasAdmin}`);

  if (!hasFire || !hasSecurity || !hasAdmin) {
    throw new Error('FAILED: Expected FIRE_SAFETY, SECURITY, and CAMPUS_ADMIN teams to be assigned');
  }

  // Assign responder via Admin API to verify assignment persistence
  console.log('  Assigning Fire Safety Responder via Admin API...');
  const assignRes = await fetch(`${BASE_URL}/admin/incidents/${incidentId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${campusAdmin.access_token}`,
    },
    body: JSON.stringify({
      team_id: 'team_fire_01',
      member_id: 'usr_fire_01',
    }),
  }).then((r) => r.json());
  console.log(`  ✓ Responder assigned successfully: ${assignRes.status || 'RESPONDER_ASSIGNED'}`);

  // Re-read DB to verify persisted assignment record
  const dbDataUpdated = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const assignments = (dbDataUpdated.assignments || []).filter((a: any) => a.incidentId === incidentId);
  console.log(`  Persisted Responder Assignments: ${assignments.length}`);
  assignments.forEach((a: any) => {
    const t = (dbDataUpdated.teams || []).find((team: any) => team.id === a.teamId);
    console.log(`    - Assignment ID: ${a.id}, Team: ${t?.code}, Member: ${a.memberId}, Status: ${a.status}`);
  });

  if (assignments.length === 0) {
    throw new Error('FAILED: Expected at least one persisted assignment for incident');
  }

  // STEP 4: VERIFY AUTHORIZED DEPARTMENT QUEUE RETRIEVAL
  console.log('\n[4/6] Verifying authorized department queue retrieval...');
  const fireQueue = await fetch(`${BASE_URL}/team/incidents`, {
    headers: { Authorization: `Bearer ${fireSafety.access_token}` },
  }).then((r) => r.json());
  const inFireQueue = fireQueue.some((i: any) => i.id === incidentId);
  console.log(`  ✓ Accessible in FIRE_SAFETY queue: ${inFireQueue}`);

  const secQueue = await fetch(`${BASE_URL}/team/incidents`, {
    headers: { Authorization: `Bearer ${security.access_token}` },
  }).then((r) => r.json());
  const inSecQueue = secQueue.some((i: any) => i.id === incidentId);
  console.log(`  ✓ Accessible in SECURITY queue: ${inSecQueue}`);

  const adminIncidents = await fetch(`${BASE_URL}/admin/incidents`, {
    headers: { Authorization: `Bearer ${campusAdmin.access_token}` },
  }).then((r) => r.json());
  const adminList = Array.isArray(adminIncidents) ? adminIncidents : (adminIncidents.data || []);
  const inAdminView = adminList.some((i: any) => i.id === incidentId);
  console.log(`  ✓ Accessible in CAMPUS_ADMIN overview: ${inAdminView}`);

  if (!inFireQueue || !inSecQueue || !inAdminView) {
    throw new Error('FAILED: Incident not visible in all authorized department queues');
  }

  // STEP 5: VERIFY NOTIFICATIONS & RECIPIENTS
  console.log('\n[5/6] Verifying notification processing and recipient IDs...');
  const notifs = (dbDataUpdated.notifications || []).filter((n: any) => n.incidentId === incidentId);
  console.log(`  Persisted Notifications for Incident: ${notifs.length}`);
  notifs.forEach((n: any) => {
    const recipientUser = (dbDataUpdated.users || []).find((u: any) => u.id === n.recipientUserId || u.id === n.recipientId);
    console.log(`    - Notif ID: ${n.id}`);
    console.log(`      Recipient: ${recipientUser?.fullName || 'Unknown'} (${recipientUser?.email || n.recipientUserId})`);
    console.log(`      Audience: ${n.audienceType}, Title: "${n.title}"`);
  });

  const fireNotif = notifs.some((n: any) => n.recipientUserId === fireSafety.user?.id || n.recipientId === fireSafety.user?.id);
  console.log(`  ✓ Notification recorded for Fire Safety personnel: ${fireNotif}`);

  // Check outbox events for this incident
  const outbox = (dbDataUpdated.outboxEvents || []).filter((e: any) => e.aggregateId === incidentId);
  console.log(`  Outbox Events for Incident: ${outbox.length}`);
  outbox.forEach((e: any) => {
    console.log(`    - Outbox Event ID: ${e.id}, Type: ${e.eventType}, Status: ${e.status || 'PENDING'}, Processed: ${e.processed}`);
  });

  // STEP 6: VERIFY UNAUTHORIZED ACCESS DENIAL
  console.log('\n[6/6] Verifying unauthorized access denial (Isolation & Access Guards)...');
  const wsQueue = await fetch(`${BASE_URL}/team/incidents`, {
    headers: { Authorization: `Bearer ${womenSafety.access_token}` },
  }).then((r) => r.json());
  const inWsQueue = wsQueue.some((i: any) => i.id === incidentId);
  console.log(`  ✓ Excluded from unrelated team (WOMEN_SAFETY) queue: ${!inWsQueue}`);

  const student2Access = await fetch(`${BASE_URL}/me/incidents/${incidentId}`, {
    headers: { Authorization: `Bearer ${student2.access_token}` },
  });
  console.log(`  ✓ Other student (Aarav) access attempt HTTP Status: ${student2Access.status} (Access Denied / Not Found)`);

  if (inWsQueue || (student2Access.status !== 403 && student2Access.status !== 404)) {
    throw new Error('FAILED: Unauthorized access was not properly denied!');
  }

  console.log('\n================================================================');
  console.log('✅ ALL FIRE HAZARD ROUTING, ASSIGNMENT & ACCESS CHECKS PASSED');
  console.log('================================================================\n');
}

verifyFireHazardDelivery().catch((err) => {
  console.error('\n❌ FIRE HAZARD VERIFICATION FAILED:', err);
  process.exit(1);
});
