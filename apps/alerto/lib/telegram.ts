// Thin wrapper over the Telegram Bot API. Used by both the inbound webhook
// (subscription flow) and the outbound delivery adapter (broadcasting alerts).

const API = (method: string) =>
  `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

async function call<T = unknown>(method: string, body: Record<string, unknown>): Promise<{
  ok: boolean;
  result?: T;
  description?: string;
}> {
  const res = await fetch(API(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

/** Escape user/text content for Telegram HTML parse mode. */
export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type SendResult = { ok: boolean; messageId?: string; error?: string };

/** Send an HTML message to a chat. Returns a normalized result for send logs. */
export async function sendMessage(
  chatId: string | number,
  html: string,
  extra: Record<string, unknown> = {},
): Promise<SendResult> {
  const r = await call<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
  return r.ok
    ? { ok: true, messageId: String(r.result?.message_id ?? "") }
    : { ok: false, error: r.description ?? "telegram send failed" };
}

export async function answerCallbackQuery(id: string, text?: string) {
  await call("answerCallbackQuery", { callback_query_id: id, text });
}

/** Inline keyboard of barangays, 2 per row. callback_data = "brgy:<id>". */
export function barangayKeyboard(barangays: { id: string; name: string }[]) {
  const rows: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < barangays.length; i += 2) {
    rows.push(
      barangays.slice(i, i + 2).map((b) => ({
        text: b.name,
        callback_data: `brgy:${b.id}`,
      })),
    );
  }
  return { inline_keyboard: rows };
}

/** Reply keyboard offering to share a phone number (optional step). */
export const contactKeyboard = {
  keyboard: [
    [{ text: "📱 I-share ang aking number", request_contact: true }],
    [{ text: "⏭️ Laktawan" }],
  ],
  resize_keyboard: true,
  one_time_keyboard: true,
};

export const removeKeyboard = { remove_keyboard: true };
