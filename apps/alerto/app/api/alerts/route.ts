import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { type Severity } from "@/lib/delivery";
import { processBatch } from "@/lib/send";

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

// Compose + broadcast an alert. RBAC-gated (alerts:send). Recipients are queued
// as send_logs (one row each), then sent in bounded batches: this call sends the
// FIRST batch and returns how many remain `pending`. The client drains the rest
// via POST /api/alerts/[id]/send. This keeps each request under Cloudflare's
// per-invocation subrequest limit and is fully resumable.
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

  const { data: alert, error: alertErr } = await db
    .from("alerto_alerts")
    .insert({ title, body, category, severity, target_scope: scope, status: "sending", created_by: caller.userId })
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

  // Resolve recipients (active Telegram subscribers, optionally by barangay).
  let q = db
    .from("alerto_subscribers")
    .select("id, telegram_chat_id, channel")
    .eq("status", "active")
    .eq("channel", "telegram")
    .not("telegram_chat_id", "is", null);
  if (scope === "barangays") q = q.in("barangay_id", barangayIds);
  const { data: recipients } = await q;
  const list = recipients ?? [];

  // Queue one send_log per recipient (idempotent). destination = chat_id snapshot.
  if (list.length > 0) {
    await db.from("alerto_send_logs").upsert(
      list.map((r) => ({
        alert_id: alert.id,
        subscriber_id: r.id,
        channel: r.channel,
        destination: r.telegram_chat_id as string,
        status: "pending",
      })),
      { onConflict: "alert_id,subscriber_id" },
    );
  }

  // Send the first batch; the client continues draining until pending === 0.
  const tally = await processBatch(alert.id);

  return NextResponse.json({ id: alert.id, ...tally });
}
