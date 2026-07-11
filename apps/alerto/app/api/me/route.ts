import { NextRequest, NextResponse } from "next/server";
import { getCaller } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Returns the caller's role (or null if they're authenticated but not yet a
// team member). Also reports whether the team is empty, so the UI can offer
// first-run "claim owner" bootstrap.
export async function GET(req: NextRequest) {
  const caller = await getCaller(req);
  const svc = createServiceClient();
  const { count } = await svc
    .from("alerto_admins")
    .select("user_id", { count: "exact", head: true });

  // Resolve the caller's barangay name (for the scoped UI), if any.
  let barangayName: string | null = null;
  if (caller?.barangayId) {
    const { data } = await svc
      .from("alerto_barangays")
      .select("name")
      .eq("id", caller.barangayId)
      .maybeSingle();
    barangayName = data?.name ?? null;
  }

  return NextResponse.json({
    role: caller?.role ?? null,
    email: caller?.email ?? null,
    barangayId: caller?.barangayId ?? null,
    barangayName,
    teamEmpty: (count ?? 0) === 0,
  });
}
