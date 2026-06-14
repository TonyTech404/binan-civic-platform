import { z } from "zod";

/**
 * Bantay Biñan — shared domain model.
 * Single source of truth for categories, statuses, departments, barangays,
 * and the Zod schemas used to validate report submissions on both ends.
 */

// ── Report status flow ───────────────────────────────────────
export const REPORT_STATUSES = [
  "open",
  "assigned",
  "in_progress",
  "resolved",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const STATUS_LABELS: Record<ReportStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
};

/** Status a citizen-submitted report starts in. */
export const INITIAL_STATUS: ReportStatus = "open";

// ── Categories ───────────────────────────────────────────────
export const CATEGORIES = [
  { slug: "road_damage", label: "Road Damage", icon: "construction" },
  { slug: "streetlight", label: "Streetlight Issues", icon: "lightbulb" },
  { slug: "flooding", label: "Flooding", icon: "waves" },
  { slug: "blocked_drainage", label: "Blocked Drainage", icon: "droplets" },
  { slug: "garbage", label: "Garbage Collection", icon: "trash-2" },
  { slug: "fallen_trees", label: "Fallen Trees", icon: "tree-pine" },
  { slug: "public_safety", label: "Public Safety", icon: "shield-alert" },
  { slug: "other", label: "Other", icon: "circle-help" },
] as const;
export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [
  CategorySlug,
  ...CategorySlug[],
];

// ── Departments (resolution owners) ──────────────────────────
export const DEPARTMENTS = [
  { slug: "engineering", name: "Engineering Office" },
  { slug: "drrmo", name: "DRRMO" },
  { slug: "environment", name: "Environment Office" },
  { slug: "traffic", name: "Traffic Management Office" },
  { slug: "barangay", name: "Barangay Offices" },
] as const;
export type DepartmentSlug = (typeof DEPARTMENTS)[number]["slug"];

/** Suggested default routing — citizens never see this, admins can override. */
export const CATEGORY_DEFAULT_DEPARTMENT: Record<CategorySlug, DepartmentSlug> = {
  road_damage: "engineering",
  streetlight: "engineering",
  flooding: "drrmo",
  blocked_drainage: "environment",
  garbage: "environment",
  fallen_trees: "environment",
  public_safety: "drrmo",
  other: "barangay",
};

// ── Barangays of Biñan City (official 24) ────────────────────
export const BARANGAYS = [
  "Biñan (Poblacion)",
  "Bungahan",
  "Canlalay",
  "Casile",
  "De La Paz",
  "Ganado",
  "Langkiwa",
  "Loma",
  "Malaban",
  "Malamig",
  "Mampalasan",
  "Platero",
  "Poblacion",
  "San Antonio",
  "San Francisco",
  "San Jose",
  "San Vicente",
  "Santo Domingo",
  "Santo Niño",
  "Santo Tomas",
  "Soro-soro",
  "Timbao",
  "Tubigan",
  "Zapote",
] as const;
export type Barangay = (typeof BARANGAYS)[number];

// ── Geographic center of Biñan (default map view) ────────────
export const BINAN_CENTER = { lng: 121.0792, lat: 14.3417, zoom: 12 } as const;

// ── Emergency contacts ───────────────────────────────────────
export const EMERGENCY_CONTACTS = [
  { name: "City Emergency Hotline", number: "911", type: "emergency" },
  { name: "Biñan City Hall", number: "(049) 511-4814", type: "general" },
  { name: "DRRMO Biñan", number: "(049) 511-9000", type: "disaster" },
  { name: "Biñan Fire Station", number: "(049) 511-1888", type: "fire" },
  { name: "Biñan PNP", number: "(049) 511-4444", type: "police" },
  { name: "Ospital ng Biñan", number: "(049) 511-7777", type: "medical" },
] as const;

// ── Validation schemas ───────────────────────────────────────
export const reportSubmissionSchema = z.object({
  category: z.enum(CATEGORY_SLUGS),
  description: z.string().trim().min(10, "Please describe the issue (10+ characters).").max(2000),
  barangay: z.enum(BARANGAYS),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().trim().max(300).optional(),
  // R2 object key returned by the photo-upload endpoint, if a photo was attached.
  photo_key: z.string().trim().max(300).optional(),
  reporter_contact: z.string().trim().max(120).optional(),
});
export type ReportSubmission = z.infer<typeof reportSubmissionSchema>;

export const statusUpdateSchema = z.object({
  status: z.enum(REPORT_STATUSES),
  department_slug: z.enum(["engineering", "drrmo", "environment", "traffic", "barangay"]).optional(),
  note: z.string().trim().max(1000).optional(),
  resolution_photo_key: z.string().trim().max(300).optional(),
});
export type StatusUpdate = z.infer<typeof statusUpdateSchema>;

// ── Persisted record shapes (mirror DB rows) ─────────────────
export interface Report {
  id: string;
  reference_number: string;
  category: CategorySlug;
  description: string;
  barangay: Barangay;
  latitude: number;
  longitude: number;
  address: string | null;
  photo_key: string | null;
  resolution_photo_key: string | null;
  status: ReportStatus;
  department_slug: DepartmentSlug | null;
  reporter_contact: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusHistoryEntry {
  id: string;
  report_id: string;
  status: ReportStatus;
  note: string | null;
  created_at: string;
}

// ── Reference number helpers ─────────────────────────────────
/** Format a yearly sequence into the public reference, e.g. BB-2026-000123. */
export function formatReferenceNumber(year: number, seq: number): string {
  return `BB-${year}-${String(seq).padStart(6, "0")}`;
}

export const REFERENCE_PATTERN = /^BB-\d{4}-\d{6}$/;
