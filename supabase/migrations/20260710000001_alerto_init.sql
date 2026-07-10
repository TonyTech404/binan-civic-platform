-- Bantay Alerto — localized civic alert broadcast system
--
-- Residents subscribe on Telegram; city staff broadcast localized alerts
-- (river levels, brownouts, LGU advisories) either city-wide or targeted to
-- specific barangays. The data model is delivery-channel-agnostic: today's
-- Telegram send and tomorrow's SMS (Semaphore) share the same subscriber list,
-- targeting, alerts and per-recipient send log — only the delivery adapter changes.
--
-- ADDITIVE ONLY. This Supabase project also hosts a separate, off-limits
-- alert/subscriber prototype (tables: alerts, subscribers, send_logs,
-- alert_targets, admin_profiles, barangays). Every object here is prefixed
-- `alerto_` so there is zero collision with that prototype or with Bantay
-- Biñan (reports…) and Bantay Eskwela (eskwela_…).
--
-- Trust model:
--   * Residents never touch the DB. The Telegram webhook (service_role) writes
--     subscriber rows.
--   * Staff authenticate via Supabase Auth and must have a row in
--     alerto_admins to see anything (RLS gates all reads to team members).
--   * Sending + team management are funneled through the Next.js server
--     (service_role) after an RBAC check, so the send loop and audit log
--     cannot be forged from the browser.

set check_function_bodies = off;

-- ── Barangays (reference) ────────────────────────────────────
-- Decoupled from the prototype's `barangays` table (different shape).
create table public.alerto_barangays (
  id           uuid primary key default gen_random_uuid(),
  name         text unique not null,
  -- Illustrative targeting group for the demo (e.g. flood-prone / riverside).
  -- Editable by staff; not an authoritative hydrological classification.
  is_riverside boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── Team / RBAC ──────────────────────────────────────────────
-- Maps a Supabase Auth user to a role. Membership here is what grants any
-- access at all (see RLS policies below).
--   owner    → full access + manage team + send
--   operator → compose & send alerts, view everything
--   viewer   → read-only dashboards
create table public.alerto_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'viewer'
               check (role in ('owner', 'operator', 'viewer')),
  created_at timestamptz not null default now()
);

-- Helper: is the current auth user a team member? (used across RLS policies)
create or replace function public.alerto_is_member()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.alerto_admins a where a.user_id = auth.uid());
$$;

-- ── Subscribers ──────────────────────────────────────────────
-- One row per resident. `phone` is optional today (Telegram-only) but is the
-- hook for the future SMS channel — capture it now, deliver on it later.
create table public.alerto_subscribers (
  id               uuid primary key default gen_random_uuid(),
  channel          text not null default 'telegram'
                     check (channel in ('telegram', 'sms')),
  telegram_chat_id text unique,               -- null for future pure-SMS subscribers
  telegram_username text,
  full_name        text,
  phone            text,                        -- E.164 (+63…), optional now
  barangay_id      uuid references public.alerto_barangays (id) on delete set null,
  status           text not null default 'active'
                     check (status in ('active', 'inactive', 'blocked')),
  language         text not null default 'fil',
  consent_at       timestamptz,                 -- Data Privacy Act: consent timestamp
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index alerto_subscribers_barangay_idx on public.alerto_subscribers (barangay_id) where status = 'active';
create index alerto_subscribers_status_idx   on public.alerto_subscribers (status);

-- ── Alerts (a composed broadcast) ────────────────────────────
create table public.alerto_alerts (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  body             text not null,
  category         text not null default 'advisory'
                     check (category in ('flood','weather','brownout','advisory','health','security','announcement')),
  severity         text not null default 'info'
                     check (severity in ('info','advisory','warning','critical')),
  target_scope     text not null default 'city'
                     check (target_scope in ('city','barangays')),
  status           text not null default 'draft'
                     check (status in ('draft','sending','sent','failed')),
  created_by       uuid references public.alerto_admins (user_id) on delete set null,
  created_at       timestamptz not null default now(),
  sent_at          timestamptz,
  recipients_total int not null default 0,
  delivered_count  int not null default 0,
  failed_count     int not null default 0
);

create index alerto_alerts_created_idx on public.alerto_alerts (created_at desc);
create index alerto_alerts_status_idx  on public.alerto_alerts (status);

-- Which barangays an alert targets (only when target_scope = 'barangays').
create table public.alerto_alert_targets (
  alert_id    uuid not null references public.alerto_alerts (id) on delete cascade,
  barangay_id uuid not null references public.alerto_barangays (id) on delete cascade,
  primary key (alert_id, barangay_id)
);

-- ── Per-recipient send log ───────────────────────────────────
-- The backbone: one row per recipient per alert. Gives idempotency
-- (unique alert+subscriber), a resumable queue, and full delivery audit.
create table public.alerto_send_logs (
  id                  uuid primary key default gen_random_uuid(),
  alert_id            uuid not null references public.alerto_alerts (id) on delete cascade,
  subscriber_id       uuid references public.alerto_subscribers (id) on delete set null,
  channel             text not null,            -- telegram / sms (snapshot at send time)
  destination         text not null,            -- chat_id or phone at send time
  status              text not null default 'pending'
                        check (status in ('pending','sent','delivered','failed')),
  provider_message_id text,
  error               text,
  created_at          timestamptz not null default now(),
  unique (alert_id, subscriber_id)
);

create index alerto_send_logs_alert_idx on public.alerto_send_logs (alert_id);

-- ── Triggers ─────────────────────────────────────────────────
create or replace function public.alerto_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger alerto_subscribers_touch
  before update on public.alerto_subscribers
  for each row execute function public.alerto_touch_updated_at();

-- ── Row Level Security ───────────────────────────────────────
alter table public.alerto_barangays     enable row level security;
alter table public.alerto_admins         enable row level security;
alter table public.alerto_subscribers    enable row level security;
alter table public.alerto_alerts         enable row level security;
alter table public.alerto_alert_targets  enable row level security;
alter table public.alerto_send_logs      enable row level security;

-- Barangays: readable by anyone (the public subscribe page needs the list).
create policy "alerto barangays public read" on public.alerto_barangays
  for select using (true);

-- Everything else: readable only by team members. Writes are never granted to
-- anon/authenticated — they go through the server's service_role after an RBAC
-- check. A team member may read their own admin row even before the helper
-- is warm (bootstrap-safe).
create policy "alerto admins self read" on public.alerto_admins
  for select to authenticated using (user_id = auth.uid() or public.alerto_is_member());

create policy "alerto subscribers team read" on public.alerto_subscribers
  for select to authenticated using (public.alerto_is_member());
create policy "alerto alerts team read" on public.alerto_alerts
  for select to authenticated using (public.alerto_is_member());
create policy "alerto alert_targets team read" on public.alerto_alert_targets
  for select to authenticated using (public.alerto_is_member());
create policy "alerto send_logs team read" on public.alerto_send_logs
  for select to authenticated using (public.alerto_is_member());

-- ── Realtime (live dashboard delivery counts) ────────────────
alter publication supabase_realtime add table public.alerto_alerts;
alter publication supabase_realtime add table public.alerto_send_logs;

-- ── Seed: Biñan's 24 barangays ───────────────────────────────
-- is_riverside flags are an illustrative demo grouping (flood-prone areas near
-- the Biñan/San Isidro waterways) — staff can correct these anytime.
insert into public.alerto_barangays (name, is_riverside) values
  ('Biñan (Poblacion)', false),
  ('Bungahan',          false),
  ('Canlalay',          false),
  ('Casile',            false),
  ('De La Paz',         false),
  ('Ganado',            false),
  ('Langkiwa',          false),
  ('Loma',              false),
  ('Malaban',           true),
  ('Malamig',           false),
  ('Mampalasan',        false),
  ('Platero',           false),
  ('Poblacion',         false),
  ('San Antonio',       false),
  ('San Francisco (Halang)', false),
  ('San Jose',          false),
  ('San Vicente',       true),
  ('Santo Domingo',     true),
  ('Santo Niño',        false),
  ('Santo Tomas (Calabuso)', false),
  ('Soro-soro',         false),
  ('Timbao',            true),
  ('Tubigan',           false),
  ('Zapote',            true)
on conflict (name) do nothing;
