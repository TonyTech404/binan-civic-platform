-- Bantay Biñan — citizen reporting schema
--
-- NOTE: This Supabase project already hosts a separate alert/subscriber
-- prototype (tables: alerts, subscribers, send_logs, alert_targets,
-- admin_profiles, barangays). This migration is deliberately additive and
-- does NOT touch any of those. Barangay is stored as validated text on the
-- report (no FK) so we stay fully decoupled from the existing `barangays`
-- table, whose shape differs.
--
-- Trust model:
--   * Anonymous citizens never touch the DB directly. The Hono Worker API
--     uses the service_role key (bypasses RLS) to insert reports and to read
--     a single report by reference number.
--   * Admin/staff authenticate via Supabase Auth. RLS grants them read access;
--     all mutations are funneled through the Worker so audit logging and
--     status history are written server-side and cannot be forged.

set check_function_bodies = off;

-- ── Reference data ───────────────────────────────────────────
create table public.departments (
  slug text primary key,
  name text not null
);

-- ── Yearly reference-number counter ──────────────────────────
create table public.report_counters (
  year int primary key,
  last_seq int not null default 0
);

create or replace function public.next_reference_number()
returns text
language plpgsql
as $$
declare
  y int := extract(year from now())::int;
  s int;
begin
  insert into public.report_counters (year, last_seq)
  values (y, 1)
  on conflict (year)
    do update set last_seq = public.report_counters.last_seq + 1
  returning last_seq into s;
  return 'BB-' || y || '-' || lpad(s::text, 6, '0');
end;
$$;

-- ── Reports ──────────────────────────────────────────────────
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reference_number text unique not null,
  category text not null,
  description text not null,
  barangay text not null,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  photo_key text,
  resolution_photo_key text,
  status text not null default 'open'
    check (status in ('open', 'assigned', 'in_progress', 'resolved')),
  department_slug text references public.departments (slug) on delete set null,
  reporter_contact text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status);
create index reports_category_idx on public.reports (category);
create index reports_barangay_idx on public.reports (barangay);
create index reports_created_at_idx on public.reports (created_at desc);

-- ── Status history ───────────────────────────────────────────
create table public.status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index status_history_report_idx on public.status_history (report_id, created_at);

-- ── Audit logs ───────────────────────────────────────────────
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  report_id uuid references public.reports (id) on delete set null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_report_idx on public.audit_logs (report_id, created_at desc);

-- ── Triggers ─────────────────────────────────────────────────
create or replace function public.tg_set_reference_number()
returns trigger language plpgsql as $$
begin
  if new.reference_number is null or new.reference_number = '' then
    new.reference_number := public.next_reference_number();
  end if;
  return new;
end;
$$;

create trigger reports_set_reference
  before insert on public.reports
  for each row execute function public.tg_set_reference_number();

create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger reports_touch_updated_at
  before update on public.reports
  for each row execute function public.tg_touch_updated_at();

-- Record initial status on insert and every status change.
create or replace function public.tg_log_status()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.status_history (report_id, status, note)
    values (new.id, new.status, 'Report submitted');
  elsif (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.status_history (report_id, status)
    values (new.id, new.status);
  end if;
  return new;
end;
$$;

create trigger reports_log_status_insert
  after insert on public.reports
  for each row execute function public.tg_log_status();

create trigger reports_log_status_update
  after update on public.reports
  for each row execute function public.tg_log_status();

-- ── Row Level Security ───────────────────────────────────────
alter table public.departments     enable row level security;
alter table public.reports         enable row level security;
alter table public.status_history  enable row level security;
alter table public.audit_logs      enable row level security;
alter table public.report_counters enable row level security;

-- Departments: readable by anyone.
create policy "departments readable" on public.departments for select using (true);

-- Reports & history: readable by authenticated admins only.
-- (Anonymous public tracking goes through the Worker via service_role.)
create policy "reports readable by authed" on public.reports
  for select to authenticated using (true);
create policy "status history readable by authed" on public.status_history
  for select to authenticated using (true);
create policy "audit logs readable by authed" on public.audit_logs
  for select to authenticated using (true);

-- No INSERT/UPDATE/DELETE policies on reports/history/audit for anon or
-- authenticated → only the service_role Worker can mutate them.

-- ── Seed reference data ──────────────────────────────────────
insert into public.departments (slug, name) values
  ('engineering', 'Engineering Office'),
  ('drrmo', 'DRRMO'),
  ('environment', 'Environment Office'),
  ('traffic', 'Traffic Management Office'),
  ('barangay', 'Barangay Offices');
