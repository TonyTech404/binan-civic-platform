import { NextRequest, NextResponse } from "next/server";
import { requireApprover } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { processBatch, queueRecipients } from "@/lib/send";

export const dynamic = "force-dynamic";

// Approve a pending alert and broadcast it. Approver-only (owner or can_approve),
// MFA required. Recipients are resolved AT APPROVAL TIME (a fresh snapshot), the
// first batch is sent, and the client drains the rest via POST /[id]/send.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireApprover(req);
  if (!caller) return NextResponse.json({ error: "Not authorized to approve." }, { status: 403 });

  const { id } = await params;
  const db = createServiceClient();

  const { data: alert } = await db
    .from("alerto_alerts")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (!alert) return NextResponse.json({ error: "Alert not found." }, { status: 404 });
  if (alert.status !== "pending_approval") {
    return NextResponse.json({ error: "This alert is not awaiting approval." }, { status: 409 });
  }

  // A barangay-scoped approver may only approve alerts targeting their barangay.
  if (caller.barangayId) {
    const { data: t } = await db
      .from("alerto_alert_targets")
      .select("barangay_id")
      .eq("alert_id", id)
      .eq("barangay_id", caller.barangayId)
      .maybeSingle();
    if (!t) return NextResponse.json({ error: "Outside your barangay." }, { status: 403 });
  }

  await db
    .from("alerto_alerts")
    .update({ status: "sending", approved_by: caller.userId, approved_at: new Date().toISOString() })
    .eq("id", id);

  await queueRecipients(id);
  const tally = await processBatch(id);
  return NextResponse.json({ id, ...tally });
}
