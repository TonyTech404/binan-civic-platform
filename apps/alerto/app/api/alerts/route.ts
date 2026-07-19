import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { type Severity } from "@/lib/delivery";
import { processBatch, queueRecipients } from "@/lib/send";

export const dynamic = "force-dynamic";

type Body = {
  title?: string;
  body?: string;
  category?: string;
  severity?: Severity;
  target_scope?: "city" | "barangays";
  barangay_ids?: string[];
};

const CATEGORIES = ["flood","weather","brownout","advisory","health","security","announcement"];
const SEVERITIES: Severity[] = ["info","advisory","warning","critical"];

// Compose an alert. RBAC-gated (alerts:send = may compose). The alert row + its
// barangay targets are always saved. What happens next depends on the caller:
//
//   • Approver (owner or can_approve) → broadcasts immediately: status "sending",
//     recipients queued, first batch sent; the client drains the rest via
//     POST /api/alerts/[id]/send. (Fully resumable, under Cloudflare's limit.)
//   • Everyone else → status "pending_approval", nothing sent. An approver
//     later approves (POST /api/alerts/[id]/approve) to broadcast, or rejects.
export async function POST(req: NextRequest) {
  const caller = await requirePermission(req, "alerts:send");
  if (!caller) {
    return NextResponse.json({ error: "Not authorized to send alerts." }, { status: 403 });
  }

  const b = (await req.json()) as Body;
  const title = (b.title ?? "").trim();
  const body = (b.body ?? "").trim();
  const category = CATEGORIES.includes(b.category ?? "") ? b.category! : "advisory";
  const severity: Severity = SEVERITIES.includes(b.severity as Severity) ? b.severity! : "info";
  const scope = b.target_scope === "barangays" ? "barangays" : "city";
  const barangayIds = scope === "barangays" ? (b.barangay_ids ?? []) : [];

  if (!title || !body) {
    return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
  }
  if (scope === "barangays" && barangayIds.length === 0) {
    return NextResponse.json({ error: "Select at least one barangay." }, { status: 400 });
  }

  const db = createServiceClient();

  // Approvers broadcast now; everyone else creates a pending-approval request.
  const initialStatus = caller.canApprove ? "sending" : "pending_approval";

  const { data: alert, error: alertErr } = await db
    .from("alerto_alerts")
    .insert({ title, body, category, severity, target_scope: scope, status: initialStatus, created_by: caller.userId })
    .select("id")
    .single();
  if (alertErr || !alert) {
    console.error("alert insert failed:", alertErr);
    return NextResponse.json({ error: "Could not create alert." }, { status: 500 });
  }

  if (scope === "barangays") {
    await db.from("alerto_alert_targets").insert(
      barangayIds.map((barangay_id) => ({ alert_id: alert.id, barangay_id })),
    );
  }

  // Not an approver → hold for review, don't queue or send anything.
  if (!caller.canApprove) {
    return NextResponse.json({ id: alert.id, status: "pending_approval", pending_approval: true });
  }

  // Approver → queue recipients and send the first batch; client drains the rest.
  await queueRecipients(alert.id);
  const tally = await processBatch(alert.id);
  return NextResponse.json({ id: alert.id, ...tally });
}
