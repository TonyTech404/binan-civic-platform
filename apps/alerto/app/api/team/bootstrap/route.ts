import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, createTokenClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// First-run bootstrap: the first authenticated staff member can claim owner
// access, but ONLY while the team is empty. Once an owner exists this is a
// no-op 403, so it can't be used to escalate later.
export async function POST(req: NextRequest) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { data: userRes, error } = await createTokenClient(token).auth.getUser();
  if (error || !userRes?.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const db = createServiceClient();
  const { count } = await db
    .from("alerto_admins")
    .select("user_id", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Team already provisioned." }, { status: 403 });
  }

  const user = userRes.user;
  await db.from("alerto_admins").insert({
    user_id: user.id,
    email: user.email ?? "",
    full_name: (user.user_metadata?.full_name as string) ?? null,
    role: "owner",
  });
  return NextResponse.json({ ok: true, role: "owner" });
}
