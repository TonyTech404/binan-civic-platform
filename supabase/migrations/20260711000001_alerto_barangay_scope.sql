-- Bantay Alerto — barangay-scoped staff access (multi-tenant by barangay)
--
-- A staff member is either CITY-WIDE (alerto_admins.barangay_id IS NULL — the
-- existing behavior) or SCOPED to one barangay. Scoped staff may only see their
-- barangay's subscribers and may only send to their barangay. Enforcement is in
-- RLS (reads, since the dashboard queries Supabase directly) AND in the server
-- send route (writes). Owners are always city-wide.

set check_function_bodies = off;

-- ── Scope column ─────────────────────────────────────────────
alter table public.alerto_admins
  add column if not exists barangay_id uuid references public.alerto_barangays (id) on delete set null;

-- ── SECURITY DEFINER scope helpers ───────────────────────────
-- SECURITY DEFINER so these can read alerto_admins from inside RLS policies on
-- OTHER tables without recursing into alerto_admins' own RLS.

-- True if the caller is a city-wide team member (barangay_id IS NULL).
create or replace function public.alerto_is_city()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.alerto_admins a
    where a.user_id = auth.uid() and a.barangay_id is null
  );
$$;

-- The caller's assigned barangay (NULL for city-wide staff or non-members).
create or replace function public.alerto_barangay()
returns uuid language sql security definer set search_path = public as $$
  select a.barangay_id from public.alerto_admins a where a.user_id = auth.uid();
$$;

-- ── Rewrite read policies to be scope-aware ──────────────────

-- Subscribers: city staff see all; scoped staff see only their barangay.
drop policy if exists "alerto subscribers team read" on public.alerto_subscribers;
create policy "alerto subscribers scoped read" on public.alerto_subscribers
  for select to authenticated using (
    public.alerto_is_city()
    or (public.alerto_is_member() and barangay_id = public.alerto_barangay())
  );

-- Alerts: city staff see all; scoped staff see their own, any city-wide alert
-- (those reached their residents too), and any alert targeting their barangay.
drop policy if exists "alerto alerts team read" on public.alerto_alerts;
create policy "alerto alerts scoped read" on public.alerto_alerts
  for select to authenticated using (
    public.alerto_is_city()
    or created_by = auth.uid()
    or (public.alerto_is_member() and target_scope = 'city')
    or (public.alerto_is_member() and exists (
          select 1 from public.alerto_alert_targets t
          where t.alert_id = alerto_alerts.id
            and t.barangay_id = public.alerto_barangay()))
  );

-- Send logs: city staff see all; scoped staff see logs for recipients in their
-- barangay.
drop policy if exists "alerto send_logs team read" on public.alerto_send_logs;
create policy "alerto send_logs scoped read" on public.alerto_send_logs
  for select to authenticated using (
    public.alerto_is_city()
    or (public.alerto_is_member() and exists (
          select 1 from public.alerto_subscribers s
          where s.id = alerto_send_logs.subscriber_id
            and s.barangay_id = public.alerto_barangay()))
  );

-- alerto_alert_targets and alerto_barangays remain readable to all members /
-- the public respectively (needed for alert-detail target labels + the picker).
