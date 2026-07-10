import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import {
  sendMessage,
  answerCallbackQuery,
  barangayKeyboard,
  contactKeyboard,
  removeKeyboard,
  esc,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

// Telegram delivers updates here. We handle the /start → pick barangay →
// (optional) share number subscription flow, plus /status and /stop. The
// endpoint always replies 200 so Telegram doesn't retry; work is awaited
// because the Worker terminates once we respond.

const HELP = [
  "👋 <b>Maligayang pagdating sa Bantay Biñan Alerto!</b>",
  "",
  "Makakatanggap ka ng mga <b>lokal na alerto</b> — baha, brownout, at opisyal na abiso — na para mismo sa iyong barangay.",
  "",
  "Piliin ang iyong barangay sa ibaba para magsimula.",
].join("\n");

function normalizePhone(raw?: string): string | null {
  if (!raw) return null;
  const d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return d;
  if (d.startsWith("63")) return `+${d}`;
  if (d.startsWith("09")) return `+63${d.slice(1)}`;
  if (d.startsWith("9") && d.length === 10) return `+63${d}`;
  return d ? `+${d}` : null;
}

// Does a typed message look like a phone number? (Telegram Desktop can't use
// the "share contact" button, so many users just type their number.)
function looksLikePhone(t: string): boolean {
  if (t.startsWith("/")) return false;
  const digits = t.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && /^[+\d][\d\s\-()]*$/.test(t.trim());
}

export async function POST(req: NextRequest) {
  // Verify the shared secret Telegram echoes back on every call.
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const update = await req.json();
    const db = createServiceClient();

    // ── Barangay picked (inline button) ─────────────────────────
    if (update.callback_query) {
      const cq = update.callback_query;
      const data: string = cq.data ?? "";
      const chatId = cq.message?.chat?.id;
      const from = cq.from ?? {};

      if (data.startsWith("brgy:") && chatId) {
        const barangayId = data.slice(5);
        const { data: brgy } = await db
          .from("alerto_barangays")
          .select("name")
          .eq("id", barangayId)
          .maybeSingle();

        await db.from("alerto_subscribers").upsert(
          {
            telegram_chat_id: String(chatId),
            telegram_username: from.username ?? null,
            full_name: [from.first_name, from.last_name].filter(Boolean).join(" ") || null,
            barangay_id: barangayId,
            status: "active",
            consent_at: new Date().toISOString(),
          },
          { onConflict: "telegram_chat_id" },
        );

        await answerCallbackQuery(cq.id, `Barangay ${brgy?.name ?? ""} ✓`);
        await sendMessage(
          chatId,
          [
            `✅ <b>Naka-subscribe ka na!</b>`,
            `Barangay: <b>${esc(brgy?.name ?? "—")}</b>`,
            ``,
            `Gusto mo bang mag-iwan ng cellphone number para sa <b>SMS backup</b>? (opsyonal)`,
            ``,
            `I-tap ang button sa ibaba, <b>o i-type mo lang ang iyong number</b> (hal. 0917 123 4567). I-type ang /skip kung ayaw.`,
          ].join("\n"),
          { reply_markup: contactKeyboard },
        );
      } else {
        await answerCallbackQuery(cq.id);
      }
      return NextResponse.json({ ok: true });
    }

    // ── Plain messages ──────────────────────────────────────────
    const msg = update.message;
    const chatId = msg?.chat?.id;
    if (!chatId) return NextResponse.json({ ok: true });

    // Shared a phone number
    if (msg.contact?.phone_number) {
      const phone = normalizePhone(msg.contact.phone_number);
      await db
        .from("alerto_subscribers")
        .update({ phone })
        .eq("telegram_chat_id", String(chatId));
      await sendMessage(
        chatId,
        "🙏 Salamat! Nai-save na ang iyong number. Aabisuhan ka namin sa Telegram (at SMS sa hinaharap).",
        { reply_markup: removeKeyboard },
      );
      return NextResponse.json({ ok: true });
    }

    const text: string = (msg.text ?? "").trim();

    if (text.startsWith("/start")) {
      // Ensure a row exists so we capture the chat even before they pick.
      const from = msg.from ?? {};
      await db.from("alerto_subscribers").upsert(
        {
          telegram_chat_id: String(chatId),
          telegram_username: from.username ?? null,
          full_name: [from.first_name, from.last_name].filter(Boolean).join(" ") || null,
          status: "active",
          consent_at: new Date().toISOString(),
        },
        { onConflict: "telegram_chat_id" },
      );

      const { data: barangays } = await db
        .from("alerto_barangays")
        .select("id, name")
        .order("name");

      await sendMessage(chatId, HELP, {
        reply_markup: barangayKeyboard(barangays ?? []),
      });
      return NextResponse.json({ ok: true });
    }

    if (text === "/skip" || /laktawan/i.test(text)) {
      await sendMessage(
        chatId,
        "Sige, walang number muna. Naka-subscribe ka pa rin sa Telegram alerts. ✅",
        { reply_markup: removeKeyboard },
      );
      return NextResponse.json({ ok: true });
    }

    // Typed a phone number directly (common on Telegram Desktop).
    if (looksLikePhone(text)) {
      const phone = normalizePhone(text);
      await db
        .from("alerto_subscribers")
        .update({ phone })
        .eq("telegram_chat_id", String(chatId));
      await sendMessage(
        chatId,
        `🙏 Salamat! Nai-save na ang iyong number: <b>${esc(phone ?? text)}</b>. Aabisuhan ka sa Telegram (at SMS sa hinaharap).`,
        { reply_markup: removeKeyboard },
      );
      return NextResponse.json({ ok: true });
    }

    if (text === "/stop" || text === "/unsubscribe") {
      await db
        .from("alerto_subscribers")
        .update({ status: "inactive" })
        .eq("telegram_chat_id", String(chatId));
      await sendMessage(
        chatId,
        "❌ Na-unsubscribe ka na. I-type ang /start para bumalik anumang oras.",
        { reply_markup: removeKeyboard },
      );
      return NextResponse.json({ ok: true });
    }

    if (text === "/status") {
      const { data: sub } = await db
        .from("alerto_subscribers")
        .select("status, phone, barangay_id, alerto_barangays(name)")
        .eq("telegram_chat_id", String(chatId))
        .maybeSingle();
      if (!sub) {
        await sendMessage(chatId, "Wala ka pang subscription. I-type ang /start.");
      } else {
        const brgy = (sub as { alerto_barangays?: { name?: string } }).alerto_barangays?.name;
        await sendMessage(
          chatId,
          [
            `<b>Iyong subscription</b>`,
            `Status: ${sub.status === "active" ? "✅ Active" : "⏸️ " + sub.status}`,
            `Barangay: ${esc(brgy ?? "wala pa — i-type /start")}`,
            `Number: ${sub.phone ? esc(sub.phone) : "wala"}`,
          ].join("\n"),
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Fallback
    await sendMessage(chatId, "I-type ang /start para mag-subscribe, o /status para tingnan ang iyong subscription.");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("telegram webhook error:", err);
    // Still 200 so Telegram doesn't hammer retries on a transient error.
    return NextResponse.json({ ok: true });
  }
}
