import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// POST — remove a team member's MFA factors so they can enroll again.
// Lockout recovery (e.g. lost/replaced phone). team:manage only. On the member's
// next login they have no verified factor, so the app walks them through a fresh
// setup. Note: deleting a verified factor also signs the member out everywhere.
export async function POST(req: NextRequest) {
  const caller = await requirePermission(req, "team:manage");
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { user_id } = (await req.json()) as { user_id?: string };
  if (!user_id) return NextResponse.json({ error: "user_id required." }, { status: 400 });

  const db = createServiceClient();
  const { data, error } = await db.auth.admin.mfa.listFactors({ userId: user_id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let removed = 0;
  for (const factor of data?.factors ?? []) {
    const { error: delErr } = await db.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId: user_id,
    });
    if (!delErr) removed++;
  }

  return NextResponse.json({ ok: true, removed });
}
