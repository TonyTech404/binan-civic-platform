import { NextRequest, NextResponse } from "next/server";
import { requireApprover } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Reject a pending alert (nothing is ever sent). Approver-only, MFA required.
// Optional review note is stored so the submitter can see why.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireApprover(req);
  if (!caller) return NextResponse.json({ error: "Not authorized to reject." }, { status: 403 });

  const { id } = await params;
  const { note } = (await req.json().catch(() => ({}))) as { note?: string };

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

  await db
    .from("alerto_alerts")
    .update({
      status: "rejected",
      rejected_by: caller.userId,
      rejected_at: new Date().toISOString(),
      review_note: (note ?? "").trim() || null,
    })
    .eq("id", id);

  return NextResponse.json({ id, status: "rejected" });
}
