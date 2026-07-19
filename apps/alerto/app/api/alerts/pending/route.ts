import { NextRequest, NextResponse } from "next/server";
import { requireApprover } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET — the approver's queue: alerts awaiting approval, oldest first, with the
// submitter's identity resolved. Approver-only (owner or can_approve), MFA req'd.
export async function GET(req: NextRequest) {
  const caller = await requireApprover(req);
  if (!caller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = createServiceClient();
  const { data: alerts } = await db
    .from("alerto_alerts")
    .select("id,title,body,category,severity,target_scope,created_at,created_by")
    .eq("status", "pending_approval")
    .order("created_at", { ascending: true });
  let list = alerts ?? [];

  // A barangay-scoped approver only sees pending alerts targeting their barangay.
  if (caller.barangayId && list.length) {
    const { data: mine } = await db
      .from("alerto_alert_targets")
      .select("alert_id")
      .eq("barangay_id", caller.barangayId)
      .in("alert_id", list.map((a) => a.id));
    const allowed = new Set((mine ?? []).map((t) => t.alert_id));
    list = list.filter((a) => allowed.has(a.id));
  }

  // Resolve submitter emails (one query) and barangay-target counts.
  const submitterIds = [...new Set(list.map((a) => a.created_by).filter(Boolean))] as string[];
  const submitters = submitterIds.length
    ? (await db.from("alerto_admins").select("user_id,email,full_name").in("user_id", submitterIds)).data ?? []
    : [];
  const byId = new Map(submitters.map((s) => [s.user_id, s]));

  const barangayIds = list.filter((a) => a.target_scope === "barangays").map((a) => a.id);
  const targetCounts = new Map<string, number>();
  if (barangayIds.length) {
    const { data: targets } = await db
      .from("alerto_alert_targets")
      .select("alert_id")
      .in("alert_id", barangayIds);
    for (const t of targets ?? []) targetCounts.set(t.alert_id, (targetCounts.get(t.alert_id) ?? 0) + 1);
  }

  return NextResponse.json({
    alerts: list.map((a) => ({
      ...a,
      submitter: byId.get(a.created_by ?? "") ?? null,
      target_count: a.target_scope === "barangays" ? targetCounts.get(a.id) ?? 0 : null,
    })),
  });
}
