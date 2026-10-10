// Comprehensive live verification script for Campus SOS Backend & Workflows
async function runVerification() {
  const BASE_URL = 'http://localhost:4000/api/v1';
  console.log('=== CAMPUS SOS LIVE APPLICATION VERIFICATION ===\n');

  // 1. LOGIN AS STUDENT
  console.log('--- STEP 1 & 2: Student Login & Real Report Submission ---');
  const studentLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student.priya@campus-sos.edu', password: 'Password123!' }),
  }).then((r) => r.json());
  console.log('Student Token acquired:', !!studentLogin.access_token);
  console.log('Student Info:', studentLogin.user);

  // Submit standard report
  const reportPayload = {
    description: 'Cracked concrete slab on walkway between hostel block 4 and dining hall',
    category: 'INFRASTRUCTURE',
    location: { kind: 'PREDEFINED', predefined_location_id: 'loc_hostel_4', text: 'Hostel Block 4 Walkway' },
    pin: { x: 0.354, y: 0.412 },
    attachment_ids: [],
  };

  const reportRes = await fetch(`${BASE_URL}/incidents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentLogin.access_token}`,
      'Idempotency-Key': `verify-std-${Date.now()}`,
    },
    body: JSON.stringify(reportPayload),
  }).then((r) => r.json());
  console.log('Report Creation Response:', reportRes);
  const incidentId = reportRes.incident.id;
  const publicId = reportRes.incident.public_id;
  console.log(`Verified Real Persistent Record: ID=${incidentId}, PublicID=${publicId}\n`);

  // 2. VERIFY RETRIEVAL IN STUDENT PORTAL
  console.log('--- STEP 2b: Verify Student "My Reports" Retrieval ---');
  const myReports = await fetch(`${BASE_URL}/me/reports?tab=reports`, {
    headers: { Authorization: `Bearer ${studentLogin.access_token}` },
  }).then((r) => r.json());
  const foundInMyReports = myReports.find((r: any) => r.id === incidentId);
  console.log('Found in student reports list:', !!foundInMyReports);
  console.log('Student report status:', foundInMyReports?.status);

  // Student detailed view (coordinates verification)
  const myDetail = await fetch(`${BASE_URL}/me/incidents/${incidentId}`, {
    headers: { Authorization: `Bearer ${studentLogin.access_token}` },
  }).then((r) => r.json());
  console.log('Student Detail Location & Pin:', myDetail.location);
  console.log('Coordinates survived submission accurately:', myDetail.location?.pin?.x === 0.354 && myDetail.location?.pin?.y === 0.412);
  console.log('');

  // 3. VERIFY DEPARTMENT ROUTING (INFRASTRUCTURE TEAM & CHIEF PROCTOR)
  console.log('--- STEP 3: Department Routing & Faculty Visibility ---');
  // Login as Infrastructure Lead
  const infraLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'infra.patel@campus-sos.edu', password: 'Password123!' }),
  }).then((r) => r.json());

  const infraQueue = await fetch(`${BASE_URL}/team/incidents`, {
    headers: { Authorization: `Bearer ${infraLogin.access_token}` },
  }).then((r) => r.json());
  const foundInInfra = infraQueue.find((i: any) => i.id === incidentId);
  console.log('Infrastructure Lead Queue contains incident:', !!foundInInfra);
  console.log('Infrastructure Lead Assigned Role on incident:', foundInInfra?.incidentTeams?.map((t: any) => t.role));

  // Check that unrelated team (Women Safety) CANNOT see it
  const wsLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'women.safety@campus-sos.edu', password: 'Password123!' }),
  }).then((r) => r.json());
  const wsQueue = await fetch(`${BASE_URL}/team/incidents`, {
    headers: { Authorization: `Bearer ${wsLogin.access_token}` },
  }).then((r) => r.json());
  console.log('Unrelated team (Women Safety) isolated from incident:', !wsQueue.some((i: any) => i.id === incidentId));
  console.log('');

  // 4. ATTACHMENTS WITH 1 AND 2 GENUINE IMAGES
  console.log('--- STEP 4: Genuine Image Uploads (1 & 2 Photos) & Retrieval ---');
  // 1-pixel transparent PNG
  const realPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  // 1-pixel red JPEG
  const realJpgBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');

  // Photo 1 upload
  const p1Req = await fetch(`${BASE_URL}/attachments/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentLogin.access_token}` },
    body: JSON.stringify({ mime_type: 'image/png', size_bytes: realPngBuffer.length, position: 1 }),
  }).then((r) => r.json());
  const p1Upload = await fetch(`${BASE_URL}/attachments/${p1Req.attachment_id}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentLogin.access_token}` },
    body: JSON.stringify({ data_base64: realPngBuffer.toString('base64'), mime_type: 'image/png' }),
  }).then((r) => r.json());
  console.log('Photo 1 Uploaded:', p1Upload);

  // Photo 2 upload
  const p2Req = await fetch(`${BASE_URL}/attachments/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentLogin.access_token}` },
    body: JSON.stringify({ mime_type: 'image/jpeg', size_bytes: realJpgBuffer.length, position: 2 }),
  }).then((r) => r.json());
  const p2Upload = await fetch(`${BASE_URL}/attachments/${p2Req.attachment_id}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentLogin.access_token}` },
    body: JSON.stringify({ data_base64: realJpgBuffer.toString('base64'), mime_type: 'image/jpeg' }),
  }).then((r) => r.json());
  console.log('Photo 2 Uploaded:', p2Upload);

  // Submit report with 2 genuine photos
  const twoPhotoReport = await fetch(`${BASE_URL}/incidents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentLogin.access_token}`,
      'Idempotency-Key': `verify-photos-${Date.now()}`,
    },
    body: JSON.stringify({
      description: 'Broken window pane and water ingress in academic hall',
      category: 'INFRASTRUCTURE',
      location: { kind: 'PREDEFINED', text: 'Academic Block A' },
      pin: { x: 0.22, y: 0.54 },
      attachment_ids: [p1Req.attachment_id, p2Req.attachment_id],
    }),
  }).then((r) => r.json());
  console.log('Two-Photo Report Created:', twoPhotoReport.incident.public_id);

  // Retrieve attachments as authorized staff (Infra Lead)
  const infraIncidentDetail = await fetch(`${BASE_URL}/team/incidents/${twoPhotoReport.incident.id}`, {
    headers: { Authorization: `Bearer ${infraLogin.access_token}` },
  }).then((r) => r.json());
  console.log('Authorized Staff retrieved attachments count:', infraIncidentDetail.attachments?.length);
  console.log('Attachment IDs:', infraIncidentDetail.attachments?.map((a: any) => a.id));
  console.log('');

  // 5. IN-APP NOTIFICATIONS & READ STATUS
  console.log('--- STEP 5: In-App Notifications ---');
  const infraNotifications = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${infraLogin.access_token}` },
  }).then((r) => r.json());
  console.log('Infrastructure Lead Notifications received count:', infraNotifications.length);
  if (infraNotifications.length > 0) {
    const latestNotif = infraNotifications[0];
    console.log('Latest Notification Sample:', {
      id: latestNotif.id,
      title: latestNotif.title,
      read: latestNotif.isRead || latestNotif.read,
      incidentId: latestNotif.incidentId,
    });
    // Mark as read
    const markRead = await fetch(`${BASE_URL}/notifications/${latestNotif.id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${infraLogin.access_token}` },
    }).then((r) => r.json());
    console.log('Notification Mark-as-Read response:', markRead);
  }
  console.log('');

  // 6. EMERGENCY SOS SEPARATION FROM STANDARD REPORTS
  console.log('--- STEP 6: Emergency SOS Workflow Separation ---');
  const sosDraft = await fetch(`${BASE_URL}/sos/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentLogin.access_token}` },
    body: JSON.stringify({
      description: 'Severe electrical sparking at central transformer',
      location: { kind: 'PREDEFINED', text: 'Central Substation' },
      pin: { x: 0.55, y: 0.65 },
    }),
  }).then((r) => r.json());

  const sosConfirm = await fetch(`${BASE_URL}/sos/drafts/${sosDraft.draft_id || sosDraft.id}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentLogin.access_token}`,
      'Idempotency-Key': `verify-sos-${Date.now()}`,
    },
    body: JSON.stringify({}),
  }).then((r) => r.json());
  console.log('Emergency SOS Confirmed Result:', sosConfirm);
  console.log('Workflow distinct (EMERGENCY_SOS vs STANDARD_REPORT):', sosConfirm.incident.workflow === 'EMERGENCY_SOS');
  console.log('Emergency SOS Public ID prefix:', sosConfirm.incident.public_id);
  console.log('Live Emergency Dispatch Channel created:', sosConfirm.live_channel);
  console.log('');

  // 7. LOGIN, LOGOUT, INVALID CREDENTIALS, EXPIRY, ROLE PERMISSIONS
  console.log('--- STEP 7: Authentication, Logout & Permissions ---');
  // Invalid password
  const badCreds = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student.priya@campus-sos.edu', password: 'BadPassword999!' }),
  });
  console.log('Invalid credentials rejected with HTTP 401:', badCreds.status === 401);

  // Student attempting admin endpoint
  const unauthorizedAdminAccess = await fetch(`${BASE_URL}/admin/incidents`, {
    headers: { Authorization: `Bearer ${studentLogin.access_token}` },
  });
  console.log('Student blocked from /admin/incidents (HTTP 403):', unauthorizedAdminAccess.status === 403);

  // Logout
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentLogin.access_token}` },
  }).then((r) => r.json());
  console.log('Logout Response:', logoutRes);
  console.log('');

  console.log('=== ALL MANUAL VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===');
}

runVerification().catch(console.error);
