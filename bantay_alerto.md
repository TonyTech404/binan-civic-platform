# Bantay Alerto

## Localized Civic Alert Broadcast System (MVP)

Residents subscribe on **Telegram**; City Government of Biñan staff broadcast
**localized** alerts (river levels, brownouts, LGU advisories) either city-wide
or targeted to specific barangays. Built to make the eventual switch to **SMS
(Semaphore)** a one-adapter swap — the subscriber list, targeting, alerts, and
per-recipient audit log are all delivery-channel-agnostic.

> App: `apps/alerto` · package `@bantay/alerto` · Next.js 15 + OpenNext on
> Cloudflare Workers · shared Supabase project (`alerto_`-prefixed tables) ·
> Bantay Biñan government design system (IBM Plex, brand red, city seal).

---

## What's built

**Public**
- `/` — landing (Filipino), explains the service, CTA to subscribe.
- `/subscribe` — server-rendered **QR code** for the Telegram deep link + step
  instructions + Data Privacy Act consent notice.

**Resident flow (Telegram bot, webhook)** — `app/api/telegram/webhook`
- `/start` → welcome + inline keyboard of the 24 barangays.
- pick barangay → subscriber saved (`chat_id`, barangay, consent timestamp).
- optional **"Share my number"** button → captures a cellphone number now, so
  SMS is ready later.
- `/status` shows their subscription; `/stop` unsubscribes.

**Admin dashboard (RBAC)** — `/admin/*`, Supabase Auth login
- `/admin` — subscriber counts, per-barangay bars, recent alerts + delivery stats.
- `/admin/compose` — category/severity, title/body, **city-wide vs. pick-barangays**
  targeting (with "riverside" quick-select), live Telegram preview, send.
- `/admin/alerts` + `/admin/alerts/[id]` — history and per-recipient delivery log.
- `/admin/subscribers` — searchable/filterable subscriber table.
- `/admin/team` — invite members and set roles.

**RBAC roles** (`lib/rbac.ts`, table `alerto_admins`)
- `owner` — everything + manage team (always city-wide)
- `operator` — compose & send alerts, view all
- `viewer` — read-only dashboards

**Barangay scope** (multi-tenant): each staff row has a nullable `barangay_id`.
`NULL` = city-wide; set = scoped (sees only their barangay's subscribers, can
only send to their barangay). Enforced in **RLS** (scope-aware read policies via
`alerto_is_city()` / `alerto_barangay()` SECURITY DEFINER helpers — the real
boundary, since the dashboard reads Supabase directly) AND in `/api/alerts`
(forces the target). City owners assign scope on the Team page. Migration
`20260711000001_alerto_barangay_scope.sql`.

Reads are RLS-gated to team members; **sending + team management** go through
server API routes with the service role *after* an RBAC check, so nothing can be
forged from the browser.

---

## Data model (all `alerto_`-prefixed — additive, never touches the off-limits prototype)

`alerto_barangays` (seeded: Biñan's 24 barangays, `is_riverside` flag) ·
`alerto_admins` (RBAC) · `alerto_subscribers` (chat_id, phone, barangay, status,
consent) · `alerto_alerts` · `alerto_alert_targets` · `alerto_send_logs`
(one row per recipient per alert — idempotent via `unique(alert,subscriber)`,
resumable, full audit). Migration: `supabase/migrations/20260710000001_alerto_init.sql`
(already pushed).

---

## The SMS path (deferred, but designed-in)

`lib/delivery.ts` defines a `DeliveryAdapter`. Today only `telegramAdapter` is
registered. To add SMS later: write a `semaphoreAdapter` (uses `subscriber.phone`
as the destination), register it under `"sms"`, and route subscribers by their
`channel`. **The send loop, targeting, alerts, and send-log stay identical.**

---

## Go-live checklist (what's left — needs you)

1. **Create the bot** in Telegram BotFather → copy the token. Set its username in
   `wrangler.toml` / `.env.local` as `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
   (currently placeholder `BantayBinanAlertoBot`).
2. **Local secrets** — edit `apps/alerto/.env.local`:
   - `TELEGRAM_BOT_TOKEN` = BotFather token
   - `TELEGRAM_WEBHOOK_SECRET` = any random string
3. **Deploy** — `pnpm deploy:alerto` (builds via OpenNext + `wrangler deploy`).
   First set the Worker secrets:
   ```
   cd apps/alerto
   wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   wrangler secret put TELEGRAM_BOT_TOKEN
   wrangler secret put TELEGRAM_WEBHOOK_SECRET
   ```
   (Custom domain `bantaybinan.com` is set in `wrangler.toml`.)
4. **Register the webhook** — `cd apps/alerto && pnpm set-webhook`
   (defaults to the production URL; reads token/secret from `.env.local`).
5. **Claim owner** — sign in at `/admin/login` with a Supabase Auth account
   (e.g. the existing `admin@bantaybinan.gov.ph`), then click **Claim Owner
   Access** on first run. Add the rest of the team from `/admin/team`.

## Local dev

```
pnpm dev:alerto            # http://localhost:3002
```
For the bot to work locally, tunnel 3002 (e.g. cloudflared/ngrok) and
`node scripts/set-webhook.mjs https://<tunnel>/api/telegram/webhook`.

## Scale notes (post-demo)

- Send loop is sequential inline — fine for demo scale (dozens–hundreds). For
  city-wide blasts, drain `alerto_send_logs` (status `pending`) via a Cloudflare
  Cron Trigger / Queue and batch for Telegram's ~30 msg/s limit. The send-log
  table already makes this resumable.
- Telegram can only message users who have `/start`ed the bot — that's why the
  subscribe flow (not a channel) is the backbone.
