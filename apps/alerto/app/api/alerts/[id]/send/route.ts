import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { processBatch } from "@/lib/send";

export const dynamic = "force-dynamic";

// Drain the next batch of pending recipients for an alert. RBAC-gated
// (alerts:send). The client calls this repeatedly until `pending` reaches 0.
// Only alerts already in "sending" may be drained — this prevents draining a
// pending_approval / rejected alert (which has no queued recipients and whose
// status would otherwise be recomputed to "sent").
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requirePermission(req, "alerts:send");
  if (!caller) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const { id } = await params;

  const db = createServiceClient();
  const { data: alert } = await db.from("alerto_alerts").select("status").eq("id", id).maybeSingle();
  if (!alert) return NextResponse.json({ error: "Alert not found." }, { status: 404 });
  if (alert.status !== "sending") {
    return NextResponse.json({ error: "Alert is not broadcasting." }, { status: 409 });
  }

  const tally = await processBatch(id);
  return NextResponse.json({ id, ...tally }, { status: tally.ok ? 200 : 404 });
}
