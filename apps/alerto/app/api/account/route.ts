import { NextRequest, NextResponse } from "next/server";
import { getCaller } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Update the caller's OWN profile (display name). Any team member may do this
// for themselves — role is irrelevant. Password changes happen client-side via
// Supabase Auth (updateUser), so they don't touch this route.
export async function PATCH(req: NextRequest) {
  const caller = await getCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { full_name } = (await req.json()) as { full_name?: string };
  const name = typeof full_name === "string" && full_name.trim() ? full_name.trim() : null;

  const db = createServiceClient();
  await db.from("alerto_admins").update({ full_name: name }).eq("user_id", caller.userId);
  // Keep the Supabase Auth metadata in sync (best-effort).
  await db.auth.admin.updateUserById(caller.userId, { user_metadata: { full_name: name } });

  return NextResponse.json({ ok: true, full_name: name });
}
