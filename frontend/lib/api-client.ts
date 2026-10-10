import { SampleAccount, getAccountByRoleId } from "./sample-accounts";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface StoredAuth {
  token: string;
  email: string;
  userId: string;
  role: string;
  expiresAt: number;
}

let memoryAuth: StoredAuth | null = null;

function getStoredAuth(): StoredAuth | null {
  if (memoryAuth && memoryAuth.expiresAt > Date.now()) {
    return memoryAuth;
  }
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("campus_sos_backend_auth");
      if (raw) {
        const parsed: StoredAuth = JSON.parse(raw);
        if (parsed.expiresAt > Date.now()) {
          memoryAuth = parsed;
          return parsed;
        }
      }
    } catch {
      // storage unavailable or corrupt
    }
  }
  return null;
}

function setStoredAuth(auth: StoredAuth) {
  memoryAuth = auth;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("campus_sos_backend_auth", JSON.stringify(auth));
    } catch {
      // ignore
    }
  }
}

export async function authenticate(email: string, password = "Password123!"): Promise<StoredAuth> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Login failed with status ${res.status}`);
  }

  const data = await res.json();
  const auth: StoredAuth = {
    token: data.access_token,
    email: email || data.user?.email || "student.priya@campus-sos.edu",
    userId: data.user?.id || "anonymous",
    role: data.user?.role || "STUDENT",
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
  };
  setStoredAuth(auth);
  return auth;
}

export async function ensureAuthenticated(account?: SampleAccount | null): Promise<string> {
  const current = getStoredAuth();
  const targetEmail = account?.email || "student.priya@campus-sos.edu";

  if (current && current.email && targetEmail && current.email.toLowerCase() === targetEmail.toLowerCase()) {
    return current.token;
  }

  const password = account?.password || "Password123!";
  const newAuth = await authenticate(targetEmail, password);
  return newAuth.token;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "idem-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
}

/**
 * Upload an attachment photo (base64 data URL) to backend.
 */
export async function uploadAttachment(
  token: string,
  dataUrl: string,
  linkTarget: { incident_id?: string; draft_id?: string },
  position = 0,
): Promise<{ id: string; url: string }> {
  // Extract mime type and base64 string
  const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const base64Data = dataUrl.replace(/^data:[^;]+;base64,/, "");
  const sizeBytes = Math.round((base64Data.length * 3) / 4);

  // 1. Request upload registration
  const reqRes = await fetch(`${API_BASE_URL}/attachments/uploads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      incident_id: linkTarget.incident_id,
      draft_id: linkTarget.draft_id,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      position,
    }),
  });

  if (!reqRes.ok) {
    const err = await reqRes.json().catch(() => ({}));
    throw new Error(err.message || "Failed to initiate attachment upload");
  }

  const initData = await reqRes.json();
  const attachmentId = initData.id || initData.attachment_id;

  // 2. Direct upload to backend
  const uploadRes = await fetch(`${API_BASE_URL}/attachments/${attachmentId}/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      data_base64: base64Data,
      mime_type: mimeType,
    }),
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.message || "Failed to transfer file data to server");
  }

  const uploadResult = await uploadRes.json();
  return {
    id: attachmentId,
    url: uploadResult.url || `/uploads/${attachmentId}.jpg`,
  };
}

/**
 * Submit standard incident report end-to-end to backend
 */
export async function createStandardReport(params: {
  account?: SampleAccount | null;
  category: string;
  description: string;
  locationName?: string;
  locationId?: string;
  pin?: { x: number; y: number };
  photos?: string[];
}): Promise<any> {
  const token = await ensureAuthenticated(params.account);
  const idempotencyKey = generateIdempotencyKey();

  // 1. Create incident first
  const incidentPayload = {
    description: params.description,
    category: params.category,
    location: {
      kind: "PREDEFINED",
      predefined_location_id: params.locationId || "loc_hostel_4",
      text: params.locationName || "Campus Location",
    },
    pin: params.pin || { x: 0.32, y: 0.38 },
    attachment_ids: [],
  };

  const res = await fetch(`${API_BASE_URL}/incidents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(incidentPayload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to create report (HTTP ${res.status})`);
  }

  const createdIncident = await res.json();
  const uploadedUrls: string[] = [];

  // 2. Upload photos if any
  if (params.photos && params.photos.length > 0) {
    for (let i = 0; i < params.photos.length; i++) {
      try {
        const photo = params.photos[i];
        if (photo.startsWith("data:")) {
          const uploaded = await uploadAttachment(
            token,
            photo,
            { incident_id: createdIncident.id },
            i,
          );
          uploadedUrls.push(uploaded.url);
        } else {
          uploadedUrls.push(photo);
        }
      } catch (uploadErr) {
        console.warn("Attachment upload warning:", uploadErr);
      }
    }
  }

  return {
    ...createdIncident,
    public_id: createdIncident.public_id || createdIncident.publicId,
    workflow: "STANDARD_REPORT",
    category_label: createdIncident.category || params.category,
    location: params.locationName || "Campus Location",
    pin: params.pin || { x: 0.32, y: 0.38 },
    photos: uploadedUrls.length > 0 ? uploadedUrls : params.photos || [],
  };
}

/**
 * Submit Emergency SOS flow: Draft -> AI Preview -> Confirm
 */
export async function createEmergencySos(params: {
  account?: SampleAccount | null;
  description: string;
  locationName?: string;
  locationId?: string;
  pin?: { x: number; y: number };
  photos?: string[];
}): Promise<any> {
  const token = await ensureAuthenticated(params.account);
  const idempotencyKey = generateIdempotencyKey();

  // 1. Create draft
  const draftRes = await fetch(`${API_BASE_URL}/sos/drafts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      description: params.description,
      location: {
        kind: "PREDEFINED",
        text: params.locationName || "Emergency Pin",
      },
      pin: params.pin || { x: 0.5, y: 0.22 },
      attachment_ids: [],
    }),
  });

  if (!draftRes.ok) {
    const err = await draftRes.json().catch(() => ({}));
    throw new Error(err.message || `Failed to start SOS draft (HTTP ${draftRes.status})`);
  }

  const draftData = await draftRes.json();
  const draftId = draftData.id || draftData.draft_id;

  // 2. Attach photos to draft if any
  const uploadedUrls: string[] = [];
  if (params.photos && params.photos.length > 0) {
    for (let i = 0; i < params.photos.length; i++) {
      try {
        const photo = params.photos[i];
        if (photo.startsWith("data:")) {
          const uploaded = await uploadAttachment(
            token,
            photo,
            { draft_id: draftId },
            i,
          );
          uploadedUrls.push(uploaded.url);
        } else {
          uploadedUrls.push(photo);
        }
      } catch (uploadErr) {
        console.warn("Draft photo upload error:", uploadErr);
      }
    }
  }

  // 3. Preview classification
  let previewData: any = null;
  try {
    const prevRes = await fetch(`${API_BASE_URL}/sos/drafts/${draftId}/preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (prevRes.ok) {
      previewData = await prevRes.json();
    }
  } catch {
    // continue to confirm even if AI preview timed out
  }

  // 4. Confirm draft
  const confirmRes = await fetch(`${API_BASE_URL}/sos/drafts/${draftId}/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({}),
  });

  if (!confirmRes.ok) {
    const err = await confirmRes.json().catch(() => ({}));
    throw new Error(err.message || `Failed to confirm SOS (HTTP ${confirmRes.status})`);
  }

  const confirmedIncident = await confirmRes.json();

  return {
    ...confirmedIncident,
    public_id: confirmedIncident.public_id || confirmedIncident.publicId,
    workflow: "EMERGENCY_SOS",
    category: previewData?.classification?.category || "CRITICAL_EMERGENCY",
    category_label: previewData?.classification?.category_label || "Critical Emergency",
    location: params.locationName || "Emergency Pin",
    pin: params.pin || { x: 0.5, y: 0.22 },
    photos: uploadedUrls.length > 0 ? uploadedUrls : params.photos || [],
    assigned_teams: previewData?.teams_to_alert || ["Security Patrol", "Campus Administration"],
  };
}

/**
 * Fetch reports for current student
 */
export async function fetchMyReports(account?: SampleAccount | null, tab: "reports" | "sos" = "reports"): Promise<any[]> {
  try {
    const token = await ensureAuthenticated(account);
    const res = await fetch(`${API_BASE_URL}/me/reports?tab=${tab}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn("fetchMyReports error:", err);
    return [];
  }
}

/**
 * Fetch incidents for team / responder role
 */
export async function fetchTeamIncidents(account?: SampleAccount | null): Promise<any[]> {
  try {
    const token = await ensureAuthenticated(account);
    const res = await fetch(`${API_BASE_URL}/team/incidents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn("fetchTeamIncidents error:", err);
    return [];
  }
}

/**
 * Fetch detailed incident with notes
 */
export async function fetchTeamIncidentDetail(incidentId: string, account?: SampleAccount | null): Promise<any> {
  const token = await ensureAuthenticated(account);
  const res = await fetch(`${API_BASE_URL}/team/incidents/${incidentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch incident details (HTTP ${res.status})`);
  }
  return await res.json();
}
