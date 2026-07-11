import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { ROLES, type Role } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// GET — list team members (team:view)
export async function GET(req: NextRequest) {
  const caller = await requirePermission(req, "team:view");
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createServiceClient();
  const { data } = await db
    .from("alerto_admins")
    .select("user_id, email, full_name, role, barangay_id, created_at, alerto_barangays(name)")
    .order("created_at");
  return NextResponse.json({ members: data ?? [] });
}

async function findUserByEmail(db: ReturnType<typeof createServiceClient>, email: string) {
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const norm = email.trim().toLowerCase();
  return data?.users.find((u) => u.email?.toLowerCase() === norm) ?? null;
}

// POST — add/invite a team member (team:manage)
// Body: { email, full_name?, role, password?, barangay_id? }
export async function POST(req: NextRequest) {
  const caller = await requirePermission(req, "team:manage");
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email, full_name, role, password, barangay_id } = (await req.json()) as {
    email?: string; full_name?: string; role?: Role; password?: string; barangay_id?: string | null;
  };
  const em = (email ?? "").trim().toLowerCase();
  if (!em || !ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Valid email and role are required." }, { status: 400 });
  }
  // Owners are always city-wide; only operator/viewer can be scoped.
  const scope = role === "owner" ? null : (barangay_id || null);

  const db = createServiceClient();
  let user = await findUserByEmail(db, em);
  let created = false;

  if (!user) {
    const pw = password && password.length >= 8
      ? password
      : `Binan-${Math.abs(hash(em))}!`; // fallback temp password; user can reset
    const { data, error } = await db.auth.admin.createUser({
      email: em,
      password: pw,
      email_confirm: true,
      user_metadata: { full_name: full_name ?? null },
    });
    if (error || !data?.user) {
      return NextResponse.json({ error: error?.message ?? "Could not create user." }, { status: 500 });
    }
    user = data.user;
    created = true;
  }

  await db.from("alerto_admins").upsert(
    { user_id: user.id, email: em, full_name: full_name ?? null, role: role as Role, barangay_id: scope },
    { onConflict: "user_id" },
  );

  return NextResponse.json({ user_id: user.id, email: em, role, created });
}

// PATCH — change a member's role and/or barangay scope (team:manage)
// Body: { user_id, role, barangay_id? }
export async function PATCH(req: NextRequest) {
  const caller = await requirePermission(req, "team:manage");
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as { user_id?: string; role?: Role; barangay_id?: string | null };
  const { user_id, role } = body;
  if (!user_id || !ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "user_id and valid role required." }, { status: 400 });
  }

  const db = createServiceClient();
  if (role !== "owner" && (await isLastOwner(db, user_id))) {
    return NextResponse.json({ error: "Cannot demote the last owner." }, { status: 409 });
  }

  const update: { role: Role; barangay_id?: string | null } = { role: role as Role };
  if (role === "owner") update.barangay_id = null;          // owners are city-wide
  else if ("barangay_id" in body) update.barangay_id = body.barangay_id || null;

  await db.from("alerto_admins").update(update).eq("user_id", user_id);
  return NextResponse.json({ ok: true });
}

// DELETE — remove a member from the team (team:manage). Keeps the auth account.
export async function DELETE(req: NextRequest) {
  const caller = await requirePermission(req, "team:manage");
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { user_id } = (await req.json()) as { user_id?: string };
  if (!user_id) return NextResponse.json({ error: "user_id required." }, { status: 400 });

  const db = createServiceClient();
  if (await isLastOwner(db, user_id)) {
    return NextResponse.json({ error: "Cannot remove the last owner." }, { status: 409 });
  }
  await db.from("alerto_admins").delete().eq("user_id", user_id);
  return NextResponse.json({ ok: true });
}

async function isLastOwner(db: ReturnType<typeof createServiceClient>, userId: string) {
  const { data } = await db.from("alerto_admins").select("user_id").eq("role", "owner");
  const owners = data ?? [];
  return owners.length === 1 && owners[0].user_id === userId;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
