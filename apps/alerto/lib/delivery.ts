// Channel-agnostic delivery layer.
//
// The send loop (see app/api/alerts/route.ts) talks only to a DeliveryAdapter.
// Today the only adapter is Telegram. When SMS is added, drop a
// `semaphoreAdapter` in here keyed by "sms" — the subscriber list, targeting,
// alerts table and per-recipient send log all stay exactly the same.

import { sendMessage, esc, type SendResult } from "@/lib/telegram";

export type Severity = "info" | "advisory" | "warning" | "critical";

export type DeliveryMessage = {
  title: string;
  body: string;
  category: string;
  severity: Severity;
};

export interface DeliveryAdapter {
  channel: string;
  /** `destination` is the chat_id (telegram) or phone (sms). */
  send(destination: string, msg: DeliveryMessage): Promise<SendResult>;
}

const SEVERITY_TAG: Record<Severity, string> = {
  info: "ℹ️ PAALALA",
  advisory: "📢 ADBAYSORI",
  warning: "⚠️ BABALA",
  critical: "🚨 KRITIKAL",
};

/** Render an alert as a Telegram HTML message. */
export function renderTelegram(msg: DeliveryMessage): string {
  return [
    `${SEVERITY_TAG[msg.severity]} — <b>BANTAY BIÑAN</b>`,
    ``,
    `<b>${esc(msg.title)}</b>`,
    ``,
    esc(msg.body),
    ``,
    `<i>Opisyal na abiso mula sa Pamahalaang Lungsod ng Biñan.</i>`,
  ].join("\n");
}

export const telegramAdapter: DeliveryAdapter = {
  channel: "telegram",
  send: (destination, msg) => sendMessage(destination, renderTelegram(msg)),
};

const ADAPTERS: Record<string, DeliveryAdapter> = {
  telegram: telegramAdapter,
  // sms: semaphoreAdapter,   ← future: one line to enable SMS delivery
};

export function adapterFor(channel: string): DeliveryAdapter | null {
  return ADAPTERS[channel] ?? null;
}
