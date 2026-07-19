import { createServiceClient } from "@/lib/supabase";
import { adapterFor, type DeliveryMessage, type Severity } from "@/lib/delivery";

// Cloudflare Workers cap the number of outbound subrequests per invocation
// (50 on the free plan). Each recipient = 1 Telegram send, so we process a
// bounded BATCH per call and let the caller drain repeatedly until pending===0.
// The send_logs table makes this fully resumable (one row per recipient).
const BATCH = 30;        // recipients per invocation (keeps subrequests well under the cap)
const CONCURRENCY = 8;   // parallel sends per wave (safely under Telegram's ~30 msg/s)

// Errors that mean the recipient is permanently unreachable — the bot was
// blocked, the account was deleted/deactivated, or the chat no longer exists.
// Such subscribers get flagged so future broadcasts skip them.
const PERMANENT = /blocked|deactivated|chat not found|user is deactivated|bot was kicked/i;

/**
 * Resolve an alert's recipients (active Telegram subscribers, optionally scoped
 * to its target barangays) and queue one pending send_log per recipient. Reads
 * the target scope from the alert row + alerto_alert_targets, so it works both
 * when an approver sends directly and when an alert is broadcast at approval
 * time (recipients are snapshotted at send, not at compose). Idempotent.
 */
export async function queueRecipients(alertId: string): Promise<number> {
  const db = createServiceClient();

  const { data: alert } = await db
    .from("alerto_alerts")
    .select("id,target_scope")
    .eq("id", alertId)
    .maybeSingle();
  if (!alert) return 0;

  let barangayIds: string[] = [];
  if (alert.target_scope === "barangays") {
    const { data: targets } = await db
      .from("alerto_alert_targets")
      .select("barangay_id")
      .eq("alert_id", alertId);
    barangayIds = (targets ?? []).map((t) => t.barangay_id as string);
    if (barangayIds.length === 0) return 0;
  }

  let q = db
    .from("alerto_subscribers")
    .select("id, telegram_chat_id, channel")
    .eq("status", "active")
    .eq("channel", "telegram")
    .not("telegram_chat_id", "is", null);
  if (alert.target_scope === "barangays") q = q.in("barangay_id", barangayIds);

  const { data: recipients } = await q;
  const list = recipients ?? [];
  if (list.length > 0) {
    await db.from("alerto_send_logs").upsert(
      list.map((r) => ({
        alert_id: alertId,
        subscriber_id: r.id,
        channel: r.channel,
        destination: r.telegram_chat_id as string,
        status: "pending",
      })),
      { onConflict: "alert_id,subscriber_id" },
    );
  }
  return list.length;
}

export type Tally = {
  ok: boolean;
  error?: string;
  processed: number;   // recipients handled this call
  total: number;       // all recipients for the alert
  sent: number;
  failed: number;
  pending: number;     // still queued (call again to continue)
  blocked?: number;    // subscribers flagged blocked this call
};

/**
 * Send the next batch of PENDING recipients for an alert, then recompute the
 * alert's tallies/status from the log (so counts are always correct even if a
 * previous run was cut off). Recipients who blocked the bot are auto-flagged
 * `blocked` so they drop out of future sends. Safe to call repeatedly.
 */
export async function processBatch(alertId: string): Promise<Tally> {
  const db = createServiceClient();

  const { data: alert } = await db
    .from("alerto_alerts")
    .select("id,title,body,category,severity")
    .eq("id", alertId)
    .maybeSingle();
  if (!alert) return { ok: false, error: "Alert not found", processed: 0, total: 0, sent: 0, failed: 0, pending: 0 };

  const msg: DeliveryMessage = {
    title: alert.title, body: alert.body, category: alert.category, severity: alert.severity as Severity,
  };

  const { data: pendingRows } = await db
    .from("alerto_send_logs")
    .select("id,subscriber_id,channel,destination")
    .eq("alert_id", alertId)
    .eq("status", "pending")
    .limit(BATCH);
  const batch = pendingRows ?? [];

  const sentIds: string[] = [];
  const failures: { id: string; subscriberId: string | null; error: string }[] = [];
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    const chunk = batch.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (r) => {
        const adapter = adapterFor(r.channel);
        if (!adapter) return { r, ok: false, error: `no adapter for ${r.channel}` };
        const out = await adapter.send(r.destination, msg);
        return { r, ok: out.ok, error: out.error ?? "delivery failed" };
      }),
    );
    for (const x of results) {
      if (x.ok) sentIds.push(x.r.id);
      else failures.push({ id: x.r.id, subscriberId: x.r.subscriber_id, error: x.error });
    }
  }

  // Sent: one bulk update.
  if (sentIds.length) await db.from("alerto_send_logs").update({ status: "sent" }).in("id", sentIds);

  // Failed: group by error message so we keep the real reason with few writes.
  const byError = new Map<string, string[]>();
  for (const f of failures) {
    const arr = byError.get(f.error) ?? [];
    arr.push(f.id);
    byError.set(f.error, arr);
  }
  for (const [err, ids] of byError) {
    await db.from("alerto_send_logs").update({ status: "failed", error: err }).in("id", ids);
  }

  // Auto-flag subscribers who are permanently unreachable so they're skipped next time.
  const blockedSubs = failures
    .filter((f) => f.subscriberId && PERMANENT.test(f.error))
    .map((f) => f.subscriberId as string);
  if (blockedSubs.length) {
    await db.from("alerto_subscribers").update({ status: "blocked" }).in("id", blockedSubs);
  }

  // Recompute tallies from the full log — the source of truth.
  const { data: allRows } = await db.from("alerto_send_logs").select("status").eq("alert_id", alertId);
  const rows = allRows ?? [];
  const total = rows.length;
  const sent = rows.filter((r) => r.status === "sent" || r.status === "delivered").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const status = pending > 0 ? "sending" : sent > 0 ? "sent" : total > 0 ? "failed" : "sent";

  await db
    .from("alerto_alerts")
    .update({
      recipients_total: total,
      delivered_count: sent,
      failed_count: failed,
      status,
      sent_at: pending > 0 ? null : new Date().toISOString(),
    })
    .eq("id", alertId);

  return { ok: true, processed: batch.length, total, sent, failed, pending, blocked: blockedSubs.length };
}
