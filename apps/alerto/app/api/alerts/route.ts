import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { adapterFor, type DeliveryMessage, type Severity } from "@/lib/delivery";

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

// Compose + broadcast an alert. RBAC-gated (alerts:send). The send loop drives
// a channel-agnostic DeliveryAdapter and records one send_log row per recipient,
// so the whole thing is auditable and — because of the unique(alert,subscriber)
// constraint — safe to re-run.
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

  // 1. Create the alert (sending).
  const { data: alert, error: alertErr } = await db
    .from("alerto_alerts")
    .insert({
      title, body, category, severity,
      target_scope: scope, status: "sending", created_by: caller.userId,
    })
    .select("id")
    .single();
  if (alertErr || !alert) {
    console.error("alert insert failed:", alertErr);
    return NextResponse.json({ error: "Could not create alert." }, { status: 500 });
  }

  // 2. Record targets.
  if (scope === "barangays") {
    await db.from("alerto_alert_targets").insert(
      barangayIds.map((barangay_id) => ({ alert_id: alert.id, barangay_id })),
    );
  }

  // 3. Resolve recipients (active Telegram subscribers, optionally by barangay).
  let q = db
    .from("alerto_subscribers")
    .select("id, telegram_chat_id, channel")
    .eq("status", "active")
    .eq("channel", "telegram")
    .not("telegram_chat_id", "is", null);
  if (scope === "barangays") q = q.in("barangay_id", barangayIds);
  const { data: recipients } = await q;
  const list = recipients ?? [];

  // 4. Queue send_logs (idempotent).
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

  // 5. Send loop.
  const msg: DeliveryMessage = { title, body, category, severity };
  let delivered = 0;
  let failed = 0;
  for (const r of list) {
    const adapter = adapterFor(r.channel);
    const dest = r.telegram_chat_id as string;
    const res = adapter
      ? await adapter.send(dest, msg)
      : { ok: false, error: `no adapter for ${r.channel}` };

    await db
      .from("alerto_send_logs")
      .update({
        status: res.ok ? "sent" : "failed",
        provider_message_id: res.messageId ?? null,
        error: res.error ?? null,
      })
      .eq("alert_id", alert.id)
      .eq("subscriber_id", r.id);

    if (res.ok) delivered++;
    else failed++;
  }

  // 6. Finalize.
  const status = list.length > 0 && delivered === 0 ? "failed" : "sent";
  await db
    .from("alerto_alerts")
    .update({
      status,
      sent_at: new Date().toISOString(),
      recipients_total: list.length,
      delivered_count: delivered,
      failed_count: failed,
    })
    .eq("id", alert.id);

  return NextResponse.json({
    id: alert.id,
    recipients_total: list.length,
    delivered_count: delivered,
    failed_count: failed,
    status,
  });
}
