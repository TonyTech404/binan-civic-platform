#!/usr/bin/env node
// Register (or update) the Telegram webhook for the Bantay Alerto bot.
//
// Usage:
//   TELEGRAM_BOT_TOKEN=… TELEGRAM_WEBHOOK_SECRET=… \
//     node scripts/set-webhook.mjs [https://your-host/api/telegram/webhook]
//
// If no URL is given, defaults to the production custom domain. Reads the two
// env vars from the process env or, if absent, from .env.local.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

function envFromFile() {
  try {
    const raw = readFileSync(join(here, "..", ".env.local"), "utf8");
    const out = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
    return out;
  } catch {
    return {};
  }
}

const file = envFromFile();
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || file.TELEGRAM_BOT_TOKEN;
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || file.TELEGRAM_WEBHOOK_SECRET;
const url =
  process.argv[2] ||
  "https://bantay-alerto.buildwithanthony.com/api/telegram/webhook";

if (!TOKEN || TOKEN.startsWith("REPLACE")) {
  console.error("✗ TELEGRAM_BOT_TOKEN is not set (env or .env.local).");
  process.exit(1);
}
if (!SECRET || SECRET.startsWith("REPLACE")) {
  console.error("✗ TELEGRAM_WEBHOOK_SECRET is not set (env or .env.local).");
  process.exit(1);
}

const res = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url,
    secret_token: SECRET,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  }),
});
const data = await res.json();
console.log(data.ok ? `✓ Webhook set → ${url}` : `✗ ${JSON.stringify(data)}`);
process.exit(data.ok ? 0 : 1);
