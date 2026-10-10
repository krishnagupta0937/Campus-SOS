import { SampleAccount } from "./sample-accounts";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export interface StoredAuth {
  token: string;
  email: string;
  userId: string;
  role: string;
  fullName?: string;
  expiresAt: number;
}

export interface IncidentRecord {
  id: string;
  public_id?: string;
  publicId?: string;
  workflow: "EMERGENCY_SOS" | "STANDARD_REPORT";
  category: string;
  category_label?: string;
  finalCategory?: string;
  status: string;
  description: string;
  location: string | { kind?: string; text?: string; predefined_location_id?: string };
  pin?: { x: number; y: number } | null;
  photos?: string[];
  attachments?: Array<{ id: string; url?: string; mimeType?: string }>;
  created_at?: string;
  createdAt?: string;
  resolvedAt?: string | null;
  assigned_teams?: string[];
  [key: string]: unknown;
}

export function formatLocation(loc: string | { kind?: string; text?: string; predefined_location_id?: string } | undefined | null): string {
  if (!loc) return "Campus Area";
  if (typeof loc === "string") return loc;
  return loc.text || loc.predefined_location_id || "Campus Area";
}

export interface HotlineRecord {
  id: string;
  label: string;
  phone: string;
  title: string;
  number: string;
  avail: string;
  description?: string;
  is24x7?: boolean;
  sortOrder?: number;
}

export interface MapPinRecord {
  id: string;
  x: number;
  y: number;
  title: string;
  category: string;
  isEmergency: boolean;
  status: string;
}

let memoryAuth: StoredAuth | null = null;

export function getStoredAuth(): StoredAuth | null {
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

export function setStoredAuth(auth: StoredAuth | null): void {
  memoryAuth = auth;
  if (typeof window !== "undefined") {
    try {
      if (auth) {
        localStorage.setItem("campus_sos_backend_auth", JSON.stringify(auth));
      } else {
        localStorage.removeItem("campus_sos_backend_auth");
      }
    } catch {
      // ignore
    }
  }
}

export function clearStoredAuth(): void {
  setStoredAuth(null);
}

/**
 * Health probe for backend readiness
 */
export async function checkHealth(timeoutMs = 1200): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Real API Login against POST /api/v1/auth/login
 */
export async function authenticate(email: string, password = "Password123!"): Promise<StoredAuth> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || `Login failed with status ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    user?: { id?: string; email?: string; role?: string; fullName?: string };
  };

  const auth: StoredAuth = {
    token: data.access_token,
    email: email || data.user?.email || "student.priya@campus-sos.edu",
    userId: data.user?.id || "anonymous",
    role: data.user?.role || "STUDENT",
    fullName: data.user?.fullName,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
  };
  setStoredAuth(auth);
  return auth;
}

/**
 * Real API Logout against POST /api/v1/auth/logout
 */
export async function logout(): Promise<void> {
  const auth = getStoredAuth();
  clearStoredAuth();
  if (auth?.token) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
        },
      });
    } catch {
      // best-effort logout
    }
  }
}

/**
 * Verify current session token against GET /api/v1/auth/me
 */
export async function verifyCurrentSession(): Promise<StoredAuth | null> {
  const current = getStoredAuth();
  if (!current?.token) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${current.token}`,
      },
    });

    if (!res.ok) {
      clearStoredAuth();
      return null;
    }

    const userData = (await res.json()) as { id: string; email: string; role: string; fullName?: string };
    const refreshed: StoredAuth = {
      ...current,
      userId: userData.id,
      email: userData.email,
      role: userData.role,
      fullName: userData.fullName || current.fullName,
    };
    setStoredAuth(refreshed);
    return refreshed;
  } catch {
    return current;
  }
}

/**
 * Ensure a valid token exists for API calls
 */
export async function ensureAuthenticated(account?: SampleAccount | null): Promise<string> {
  const current = getStoredAuth();
  const targetEmail = account?.email || "student.priya@campus-sos.edu";

  if (current && current.email && targetEmail && current.email.toLowerCase() === targetEmail.toLowerCase()) {
    return current.token;
  }

  // Development login fallback for the specified role account
  const newAuth = await authenticate(targetEmail, "Password123!");
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
  position = 0
): Promise<{ id: string; url: string }> {
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
    const err = (await reqRes.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || "Failed to initiate attachment upload");
  }

  const initData = (await reqRes.json()) as { id?: string; attachment_id?: string };
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
    const err = (await uploadRes.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || "Failed to transfer file data to server");
  }

  const uploadResult = (await uploadRes.json()) as { url?: string };
  return {
    id: attachmentId || "att_" + Date.now(),
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
}): Promise<IncidentRecord> {
  const token = await ensureAuthenticated(params.account);
  const idempotencyKey = generateIdempotencyKey();

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
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || `Failed to create report (HTTP ${res.status})`);
  }

  const resJson = await res.json();
  const createdIncident = ((resJson as { incident?: IncidentRecord }).incident || resJson) as IncidentRecord;
  const uploadedUrls: string[] = [];

  // Upload photos if any
  if (params.photos && params.photos.length > 0) {
    for (let i = 0; i < params.photos.length; i++) {
      try {
        const photo = params.photos[i];
        if (photo.startsWith("data:")) {
          const uploaded = await uploadAttachment(
            token,
            photo,
            { incident_id: createdIncident.id },
            i
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
}): Promise<IncidentRecord> {
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
    const err = (await draftRes.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || `Failed to start SOS draft (HTTP ${draftRes.status})`);
  }

  const draftData = (await draftRes.json()) as { id?: string; draft_id?: string };
  const draftId = draftData.id || draftData.draft_id;

  // 2. Attach photos to draft if any
  const uploadedUrls: string[] = [];
  if (params.photos && params.photos.length > 0 && draftId) {
    for (let i = 0; i < params.photos.length; i++) {
      try {
        const photo = params.photos[i];
        if (photo.startsWith("data:")) {
          const uploaded = await uploadAttachment(
            token,
            photo,
            { draft_id: draftId },
            i
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
  let previewData: { classification?: { category?: string; category_label?: string }; teams_to_alert?: string[] } | null = null;
  if (draftId) {
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
    const err = (await confirmRes.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || `Failed to confirm SOS (HTTP ${confirmRes.status})`);
  }

  const resJson = await confirmRes.json();
  const confirmedIncident = ((resJson as { incident?: IncidentRecord }).incident || resJson) as IncidentRecord;

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
 * Fetch reports for current student from /me/reports
 */
export async function fetchMyReports(
  account?: SampleAccount | null,
  tab: "reports" | "sos" = "reports"
): Promise<IncidentRecord[]> {
  const token = await ensureAuthenticated(account);
  const res = await fetch(`${API_BASE_URL}/me/reports?tab=${tab}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to load reports (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Fetch incidents for team / responder role from /team/incidents
 */
export async function fetchTeamIncidents(account?: SampleAccount | null): Promise<IncidentRecord[]> {
  const token = await ensureAuthenticated(account);
  const res = await fetch(`${API_BASE_URL}/team/incidents`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to load team incidents (HTTP ${res.status})`);
  }
  return await res.json();
}

/**
 * Fetch all incidents for Campus Administration from /admin/incidents
 */
export async function fetchAdminIncidents(
  account?: SampleAccount | null,
  filters?: { status?: string; workflow?: string; category?: string }
): Promise<IncidentRecord[]> {
  const token = await ensureAuthenticated(account);
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
  if (filters?.workflow && filters.workflow !== "ALL") params.set("workflow", filters.workflow);
  if (filters?.category) params.set("category", filters.category);

  const url = `${API_BASE_URL}/admin/incidents${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to load admin incidents (HTTP ${res.status})`);
  }
  const result = await res.json();
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  return [];
}

/**
 * Fetch sanitized campus incidents for public explore feed from /explore/incidents
 */
export async function fetchExploreIncidents(status?: string): Promise<IncidentRecord[]> {
  const auth = getStoredAuth();
  const token = auth?.token || (await ensureAuthenticated(null));
  const url = `${API_BASE_URL}/explore/incidents${status ? `?status=${encodeURIComponent(status)}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return await res.json();
}

/**
 * Fetch live explore map pins from /explore/map-pins
 */
export async function fetchMapPins(): Promise<MapPinRecord[]> {
  const auth = getStoredAuth();
  const token = auth?.token || (await ensureAuthenticated(null));
  const res = await fetch(`${API_BASE_URL}/explore/map-pins`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return await res.json();
}

/**
 * Fetch verified emergency hotlines from /hotlines
 */
export async function fetchHotlines(): Promise<HotlineRecord[]> {
  try {
    const auth = getStoredAuth();
    const token = auth?.token || (await ensureAuthenticated(null));
    const res = await fetch(`${API_BASE_URL}/hotlines`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch hotlines");
    const data = (await res.json()) as HotlineRecord[];
    return data.map((h) => ({
      ...h,
      title: h.label,
      number: h.phone,
      avail: h.is24x7 ? "24/7 Available" : "Standard Duty",
    }));
  } catch {
    // Return verified fallback hotlines if backend is unreachable
    return [
      {
        id: "hl_sec_fallback",
        label: "Central Campus Police & Security Control",
        title: "Central Campus Police & Security Control",
        phone: "+91 1800-226-787",
        number: "+91 1800-226-787",
        avail: "24/7 Available",
        is24x7: true,
      },
      {
        id: "hl_med_fallback",
        label: "Campus Health Clinic & Ambulance",
        title: "Campus Health Clinic & Ambulance",
        phone: "+91 1800-226-911",
        number: "+91 1800-226-911",
        avail: "Immediate Dispatch",
        is24x7: true,
      },
      {
        id: "hl_women_fallback",
        label: "Women Safety Cell & Confidential Support",
        title: "Women Safety Cell & Confidential Support",
        phone: "+91 1800-226-100",
        number: "+91 1800-226-100",
        avail: "Confidential Escort",
        is24x7: true,
      },
      {
        id: "hl_proctor_fallback",
        label: "Chief Proctor Grievance Helpline",
        title: "Chief Proctor Grievance Helpline",
        phone: "+91 1800-226-444",
        number: "+91 1800-226-444",
        avail: "Duty Officer on Call",
        is24x7: true,
      },
    ];
  }
}

/**
 * Fetch detailed incident with notes
 */
export async function fetchTeamIncidentDetail(
  incidentId: string,
  account?: SampleAccount | null
): Promise<IncidentRecord> {
  const token = await ensureAuthenticated(account);
  const res = await fetch(`${API_BASE_URL}/team/incidents/${incidentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch incident details (HTTP ${res.status})`);
  }
  return await res.json();
}
