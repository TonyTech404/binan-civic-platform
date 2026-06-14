import type { ReportSubmission, StatusUpdate } from "@bantay/shared";
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public issues?: unknown,
  ) {
    super(message);
  }
}

async function handle<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status, body.issues);
  }
  return body as T;
}

/** Public URL for a stored photo (served by the Worker from R2). */
export function photoUrl(key: string): string {
  return `${API_URL}/api/photos/${key}`;
}

// ── Public endpoints ─────────────────────────────────────────
export interface SubmitResult {
  id: string;
  reference_number: string;
  status: string;
  created_at: string;
}

export async function uploadPhoto(file: File): Promise<string> {
  const res = await fetch(`${API_URL}/api/photos`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const { key } = await handle<{ key: string }>(res);
  return key;
}

export async function submitReport(report: ReportSubmission): Promise<SubmitResult> {
  const res = await fetch(`${API_URL}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  return handle<SubmitResult>(res);
}

export interface TrackedReport {
  reference_number: string;
  category: string;
  description: string;
  barangay: string;
  status: string;
  department_slug: string | null;
  photo_key: string | null;
  resolution_photo_key: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  created_at: string;
  updated_at: string;
  history: { status: string; note: string | null; created_at: string }[];
}

export async function trackReport(ref: string): Promise<TrackedReport> {
  const res = await fetch(`${API_URL}/api/reports/${encodeURIComponent(ref)}`);
  return handle<TrackedReport>(res);
}

// ── Admin endpoints (require Supabase session) ───────────────
async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function updateReportStatus(id: string, update: StatusUpdate) {
  const res = await fetch(`${API_URL}/api/admin/reports/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(update),
  });
  return handle(res);
}
