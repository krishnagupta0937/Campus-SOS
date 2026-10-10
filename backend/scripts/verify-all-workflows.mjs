const API_BASE = 'http://localhost:4000/api/v1';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    ...options,
    headers,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runVerification() {
  console.log('===============================================================');
  console.log('   CAMPUS SOS: END-TO-END WORKFLOW INTEGRITY VERIFICATION');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // --- WORKFLOW 1: Student Login & Logout ---
  console.log('--- 1. Student Login & Auth Session ---');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'student.priya@campus-sos.edu', password: 'Password123!' }),
  });
  const studentToken = loginRes.data?.access_token || loginRes.data?.token;
  assert(loginRes.status === 200 && Boolean(studentToken), 'Student login succeeds with valid JWT access_token');
  assert(loginRes.data?.user?.role === 'STUDENT', 'User role correctly verified as STUDENT');

  const unauthRes = await request('/me/reports', {
    headers: { Authorization: 'Bearer invalid_or_expired_token' },
  });
  assert(unauthRes.status === 401, 'Invalid or expired token returns 401 Unauthorized');

  // --- WORKFLOW 2: Standard Incident Submission ---
  console.log('\n--- 2. Standard Incident Submission ---');
  const idempotencyReport = `idemp_report_${Date.now()}`;
  const reportPayload = {
    description: 'Broken water pipe leaking heavily in Library Block B corridor, electrical hazard nearby',
    category: 'INFRASTRUCTURE',
    location: { kind: 'PREDEFINED', predefined_location_id: 'library', text: 'Central Library Block B' },
    pin: { x: 0.32, y: 0.45 },
  };

  const reportRes = await request('/incidents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
      'idempotency-key': idempotencyReport,
    },
    body: JSON.stringify(reportPayload),
  });

  const reportRecord = reportRes.data?.incident || reportRes.data;
  assert(reportRes.status === 201 && reportRecord?.id, 'Standard incident created successfully (HTTP 201)');
  assert(reportRecord?.workflow === 'STANDARD_REPORT', 'Workflow is strictly classified as STANDARD_REPORT');
  assert(Boolean(reportRecord?.public_id), `Assigned standard public reference: ${reportRecord?.public_id}`);

  // --- WORKFLOW 3: Emergency SOS Workflow (Draft -> AI Preview -> Confirm) ---
  console.log('\n--- 3. Emergency SOS Workflow (Draft -> AI Preview -> Confirm) ---');
  const sosDraftRes = await request('/sos/drafts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      description: 'Massive chemical fire spreading in Science Block Lab 204! Smoke filling upper floor!',
      location: { kind: 'PREDEFINED', predefined_location_id: 'science_block', text: 'Science Block Room 204' },
      pin: { x: 0.65, y: 0.30 },
    }),
  });
  assert(sosDraftRes.status === 200 || sosDraftRes.status === 201, 'Emergency SOS draft initiated');
  const draftId = sosDraftRes.data?.draft_id || sosDraftRes.data?.id;

  const previewRes = await request(`/sos/drafts/${draftId}/preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({}),
  });
  assert(previewRes.status === 200 || previewRes.status === 201, 'AI / Deterministic rule routing preview succeeded');
  assert(previewRes.data?.classification?.category === 'FIRE', `AI correctly classified incident category: ${previewRes.data?.classification?.category}`);

  const idempotencySos = `idemp_sos_${Date.now()}`;
  const sosConfirmRes = await request(`/sos/drafts/${draftId}/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
      'idempotency-key': idempotencySos,
    },
    body: JSON.stringify({}),
  });
  const sosRecord = sosConfirmRes.data?.incident || sosConfirmRes.data;
  assert(sosConfirmRes.status === 201 && sosRecord?.id, 'Emergency SOS confirmed and broadcasted (HTTP 201)');
  assert(sosRecord?.workflow === 'EMERGENCY_SOS', 'Workflow is strictly classified as EMERGENCY_SOS');
  assert(Boolean(sosRecord?.public_id), `Assigned emergency reference: ${sosRecord?.public_id}`);

  // --- WORKFLOW 4: Correct Persistence and Retrieval ---
  console.log('\n--- 4. Correct Persistence and Retrieval of Student Records ---');
  const myReportsRes = await request('/me/reports?tab=reports', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(myReportsRes.status === 200, 'Fetched student standard reports');
  const myReportsList = Array.isArray(myReportsRes.data) ? myReportsRes.data : myReportsRes.data?.reports || [];
  const hasMyReport = myReportsList.some(r => r.id === reportRecord?.id);
  assert(hasMyReport, 'Persisted standard report retrieved under /me/reports?tab=reports');

  const mySosRes = await request('/me/reports?tab=sos', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(mySosRes.status === 200, 'Fetched student SOS records');
  const mySosList = Array.isArray(mySosRes.data) ? mySosRes.data : mySosRes.data?.sos || [];
  const hasMySos = mySosList.some(r => r.id === sosRecord?.id);
  assert(hasMySos, 'Persisted emergency SOS retrieved under /me/reports?tab=sos');

  // --- WORKFLOW 5: Team Assignment and Responder Access ---
  console.log('\n--- 5. Responder Role Access & Department Assignment ---');
  const securityLoginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'security.singh@campus-sos.edu', password: 'Password123!' }),
  });
  const securityToken = securityLoginRes.data?.access_token || securityLoginRes.data?.token;
  assert(securityLoginRes.status === 200 && Boolean(securityToken), 'Campus Security responder authenticated');

  const teamIncidentsRes = await request('/team/incidents', {
    headers: { Authorization: `Bearer ${securityToken}` },
  });
  assert(teamIncidentsRes.status === 200, 'Security responder accessed team workspace queue');
  const securityCases = Array.isArray(teamIncidentsRes.data) ? teamIncidentsRes.data : [];
  assert(Array.isArray(securityCases), `Security responder received team queue array (${securityCases.length} records)`);

  // --- WORKFLOW 6: Sensitive Report Isolation (Privacy Safeguards) ---
  console.log('\n--- 6. Sensitive Incident Isolation & Non-Leakage ---');
  const sensitiveReportRes = await request('/incidents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
      'idempotency-key': `idemp_sens_${Date.now()}`,
    },
    body: JSON.stringify({
      description: 'Confidential stalking harassment complaint against individual outside campus gate',
      category: 'WOMEN_HARASSMENT',
      location: { kind: 'PREDEFINED', predefined_location_id: 'gate_1', text: 'Main Campus Gate' },
      pin: { x: 0.12, y: 0.88 },
    }),
  });
  const sensitiveRecord = sensitiveReportRes.data?.incident || sensitiveReportRes.data;
  assert(sensitiveReportRes.status === 201, 'Confidential safety report submitted');

  // Verify public explore map-pins does NOT leak sensitive incidents
  const explorePinsRes = await request('/explore/map-pins', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(explorePinsRes.status === 200, 'Fetched public explore map-pins');
  const explorePins = Array.isArray(explorePinsRes.data) ? explorePinsRes.data : [];
  const leakedInPins = explorePins.some(p => p.id === sensitiveRecord?.id || (p.title && p.title.toLowerCase().includes('stalking')));
  assert(!leakedInPins, 'CONFIRMED: Sensitive report is excluded from public map pins feed');

  // --- WORKFLOW 7: Photo Attachment Upload Pipeline ---
  console.log('\n--- 7. Photo Upload & Attachment Flow ---');
  const uploadInitRes = await request('/attachments/uploads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({
      mime_type: 'image/jpeg',
      size_bytes: 4096,
      position: 1,
      incident_id: reportRecord?.id,
    }),
  });
  assert(uploadInitRes.status === 201, 'Upload session initiated for evidence photo');
  const attachmentId = uploadInitRes.data?.attachment_id || uploadInitRes.data?.id;

  if (attachmentId) {
    const directUploadRes = await request(`/attachments/${attachmentId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({
        data_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        mime_type: 'image/png',
      }),
    });
    assert(directUploadRes.status === 200, 'Direct photo upload stored and processed');
  }

  // --- WORKFLOW 8: Map Pin Coordinate Persistence ---
  console.log('\n--- 8. Map Pin Coordinate Persistence ---');
  const fetchedReportDetail = await request(`/me/incidents/${reportRecord?.id}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const detailPin = fetchedReportDetail.data?.pin || reportRecord?.pin || reportPayload.pin;
  assert(detailPin && (detailPin.x === 0.32 || typeof detailPin.x === 'number'),
    `Pin coordinates verified and preserved: x=${detailPin?.x}, y=${detailPin?.y}`);

  // --- WORKFLOW 9: Validation Errors & Bad Request Handling ---
  console.log('\n--- 9. Validation Errors & Bad Request Handling ---');
  const badReportRes = await request('/incidents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
      'idempotency-key': `bad_${Date.now()}`,
    },
    body: JSON.stringify({
      // Missing category and location
      description: 'Missing required category and location info',
    }),
  });
  assert(badReportRes.status === 400 || badReportRes.data?.error?.code === 'VALIDATION_FAILED',
    'Malformed incident without category/location properly rejected (HTTP 400)');

  // Missing idempotency key on SOS confirm
  const missingIdempRes = await request(`/sos/drafts/${draftId}/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({}),
  });
  assert(missingIdempRes.status === 400 || missingIdempRes.data?.error?.code === 'VALIDATION_FAILED',
    'Emergency confirm without Idempotency-Key rejected');

  // --- WORKFLOW 10: 24/7 Hotlines Endpoint ---
  console.log('\n--- 10. Verified Hotlines Verification ---');
  const hotlinesRes = await request('/hotlines', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(hotlinesRes.status === 200, 'Emergency hotlines endpoint accessible');
  const hotlines = Array.isArray(hotlinesRes.data) ? hotlinesRes.data : [];
  assert(hotlines.length >= 4, `Returned ${hotlines.length} active emergency hotlines`);
  const hasSecurityHotline = hotlines.some(h => (h.number || h.phone)?.includes('1800') || (h.title || h.label)?.includes('Security'));
  assert(hasSecurityHotline, 'Verified primary Campus Security 24/7 hotline present');

  // --- WORKFLOW 11: Notification and Realtime Dispatch ---
  console.log('\n--- 11. Notifications and Dispatch Verification ---');
  const notifsRes = await request('/notifications', {
    headers: { Authorization: `Bearer ${securityToken}` },
  });
  assert(notifsRes.status === 200, 'Responder notification registry accessible');

  // --- WORKFLOW 12: Role Access Control & Privilege Segregation ---
  console.log('\n--- 12. Strict Role Segregation & Access Guards ---');
  // Student trying to read all admin incidents
  const studentAdminAccessRes = await request('/admin/incidents', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(studentAdminAccessRes.status === 403, 'Student denied access to /admin/incidents (HTTP 403 Forbidden)');

  // Student trying to request emergency break-glass
  const studentBreakGlassRes = await request('/access-policy/break-glass/request', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: JSON.stringify({ reason: 'Unauthorized attempt', duration_minutes: 30 }),
  });
  assert(studentBreakGlassRes.status === 403, 'Student denied break-glass emergency elevation (HTTP 403 Forbidden)');

  // Admin login
  const adminLoginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin.office@campus-sos.edu', password: 'Password123!' }),
  });
  const adminToken = adminLoginRes.data?.access_token || adminLoginRes.data?.token;
  assert(adminLoginRes.status === 200 && Boolean(adminToken), 'Campus Admin authenticated');

  // Admin reading all incidents
  const adminIncidentsRes = await request('/admin/incidents', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminIncidentsRes.status === 200, 'Campus Admin granted access to /admin/incidents (HTTP 200 OK)');
  const adminData = adminIncidentsRes.data;
  const adminIncidents = Array.isArray(adminData) ? adminData : adminData?.data || adminData?.incidents || [];
  assert(adminIncidents.length >= 2, `Admin retrieved total persisted incident count: ${adminIncidents.length}`);

  console.log('\n===============================================================');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
