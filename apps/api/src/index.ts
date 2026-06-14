import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  reportSubmissionSchema,
  statusUpdateSchema,
  CATEGORY_DEFAULT_DEPARTMENT,
  type CategorySlug,
} from "@bantay/shared";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALLOWED_ORIGIN: string;
  PHOTOS: R2Bucket;
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

const app = new Hono<{ Bindings: Env; Variables: { userId: string } }>();

// CORS — ALLOWED_ORIGIN is "*" in dev, locked to the Pages domain in prod.
app.use("*", async (c, next) => {
  const handler = cors({
    origin: c.env.ALLOWED_ORIGIN === "*" ? "*" : c.env.ALLOWED_ORIGIN.split(","),
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  });
  return handler(c, next);
});

// ── Supabase client helpers ──────────────────────────────────
function serviceClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Resolve the authenticated admin from the Bearer token, or null. */
async function getAdminUserId(env: Env, authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

// Gate admin routes.
app.use("/api/admin/*", async (c, next) => {
  const userId = await getAdminUserId(c.env, c.req.header("Authorization"));
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  c.set("userId", userId);
  await next();
});

// ── Health ───────────────────────────────────────────────────
app.get("/api/health", (c) => c.json({ ok: true, service: "bantay-binan-api" }));

// ── Photo upload (called before submit) ──────────────────────
app.post("/api/photos", async (c) => {
  const contentType = c.req.header("Content-Type") ?? "";
  const ext = ALLOWED_IMAGE_TYPES[contentType.split(";")[0].trim()];
  if (!ext) {
    return c.json({ error: "Unsupported image type. Use JPEG, PNG, WebP, or HEIC." }, 415);
  }
  const body = await c.req.arrayBuffer();
  if (body.byteLength === 0) return c.json({ error: "Empty upload." }, 400);
  if (body.byteLength > MAX_PHOTO_BYTES) {
    return c.json({ error: "Photo too large (max 8 MB)." }, 413);
  }
  const key = `reports/${crypto.randomUUID()}.${ext}`;
  await c.env.PHOTOS.put(key, body, { httpMetadata: { contentType } });
  return c.json({ key });
});

// ── Serve a photo from R2 ────────────────────────────────────
app.get("/api/photos/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const obj = await c.env.PHOTOS.get(key);
  if (!obj) return c.json({ error: "Not found" }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
});

// ── Submit a report (anonymous) ──────────────────────────────
app.post("/api/reports", async (c) => {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body." }, 400);
  }
  const parsed = reportSubmissionSchema.safeParse(json);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", issues: parsed.error.flatten() }, 400);
  }
  const input = parsed.data;
  const db = serviceClient(c.env);

  const { data, error } = await db
    .from("reports")
    .insert({
      category: input.category,
      description: input.description,
      barangay: input.barangay,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address ?? null,
      photo_key: input.photo_key ?? null,
      reporter_contact: input.reporter_contact ?? null,
      // reference_number + status('open') are set by DB triggers/defaults.
    })
    .select("id, reference_number, status, created_at")
    .single();

  if (error || !data) {
    return c.json({ error: "Could not save report.", detail: error?.message }, 500);
  }
  return c.json(data, 201);
});

// ── Public report tracking by reference number ───────────────
app.get("/api/reports/:ref", async (c) => {
  const ref = c.req.param("ref").toUpperCase();
  const db = serviceClient(c.env);

  const { data: report, error } = await db
    .from("reports")
    .select(
      "id, reference_number, category, description, barangay, status, department_slug, photo_key, resolution_photo_key, latitude, longitude, address, created_at, updated_at",
    )
    .eq("reference_number", ref)
    .maybeSingle();

  if (error) return c.json({ error: "Lookup failed." }, 500);
  if (!report) return c.json({ error: "No report found with that reference number." }, 404);

  const { data: history } = await db
    .from("status_history")
    .select("status, note, created_at")
    .eq("report_id", report.id)
    .order("created_at", { ascending: true });

  // Don't leak the internal id to the public tracker. (reporter_contact is
  // already excluded by the select above.)
  const publicReport: Record<string, unknown> = { ...report };
  delete publicReport.id;
  return c.json({ ...publicReport, history: history ?? [] });
});

// ── Admin: update status / assign / attach resolution photo ──
app.patch("/api/admin/reports/:id/status", async (c) => {
  const id = c.req.param("id");
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body." }, 400);
  }
  const parsed = statusUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return c.json({ error: "Validation failed", issues: parsed.error.flatten() }, 400);
  }
  const update = parsed.data;
  const db = serviceClient(c.env);

  // If assigning a status without a department, default-route by category.
  let department = update.department_slug ?? null;
  if (!department && update.status === "assigned") {
    const { data: existing } = await db
      .from("reports")
      .select("category")
      .eq("id", id)
      .maybeSingle();
    if (existing) department = CATEGORY_DEFAULT_DEPARTMENT[existing.category as CategorySlug];
  }

  const patch: Record<string, unknown> = { status: update.status };
  if (department) patch.department_slug = department;
  if (update.resolution_photo_key) patch.resolution_photo_key = update.resolution_photo_key;

  const { data, error } = await db
    .from("reports")
    .update(patch)
    .eq("id", id)
    .select("id, reference_number, status, department_slug, resolution_photo_key, updated_at")
    .maybeSingle();

  if (error) return c.json({ error: "Update failed.", detail: error.message }, 500);
  if (!data) return c.json({ error: "Report not found." }, 404);

  // Optional admin note → status_history (separate from the auto status row).
  if (update.note) {
    await db.from("status_history").insert({ report_id: id, status: update.status, note: update.note });
  }

  // Audit trail.
  await db.from("audit_logs").insert({
    actor_id: c.get("userId"),
    action: "report.status_update",
    report_id: id,
    detail: patch,
  });

  return c.json(data);
});

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
