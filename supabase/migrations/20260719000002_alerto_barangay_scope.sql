-- Per-member barangay scoping (STRICTLY ADDITIVE — only alerto_ tables).
-- A member may be pinned to one barangay: they see and send only that barangay.
-- NULL = city-wide (owners are always city-wide). Reads are enforced in RLS so
-- the scoping holds even for direct browser-client queries; sends are enforced
-- server-side in the API (service_role bypasses RLS).

alter table public.alerto_admins
  add column if not exists barangay_id uuid references public.alerto_barangays (id) on delete set null;

-- The current member's assigned barangay (NULL = city-wide, or not a member).
create or replace function public.alerto_admin_barangay()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select barangay_id from public.alerto_admins where user_id = auth.uid();
$$;

-- Subscribers: a scoped member sees only their barangay's residents (PII).
drop policy if exists "alerto subscribers team read" on public.alerto_subscribers;
create policy "alerto subscribers team read" on public.alerto_subscribers
  for select to authenticated using (
    public.alerto_is_member()
    and (public.alerto_admin_barangay() is null or barangay_id = public.alerto_admin_barangay())
  );

-- Alerts: a scoped member sees city-wide alerts + alerts targeting their barangay.
drop policy if exists "alerto alerts team read" on public.alerto_alerts;
create policy "alerto alerts team read" on public.alerto_alerts
  for select to authenticated using (
    public.alerto_is_member() and (
      public.alerto_admin_barangay() is null
      or target_scope = 'city'
      or exists (
        select 1 from public.alerto_alert_targets t
        where t.alert_id = alerto_alerts.id and t.barangay_id = public.alerto_admin_barangay()
      )
    )
  );

-- Alert targets: visible when the member may see the alert (or it's their barangay).
drop policy if exists "alerto alert_targets team read" on public.alerto_alert_targets;
create policy "alerto alert_targets team read" on public.alerto_alert_targets
  for select to authenticated using (
    public.alerto_is_member() and (
      public.alerto_admin_barangay() is null
      or barangay_id = public.alerto_admin_barangay()
      or exists (select 1 from public.alerto_alerts a where a.id = alert_id and a.target_scope = 'city')
    )
  );

-- Send logs: a scoped member sees only logs for recipients in their barangay
-- (so a city-wide alert's detail never leaks other barangays' recipients).
drop policy if exists "alerto send_logs team read" on public.alerto_send_logs;
create policy "alerto send_logs team read" on public.alerto_send_logs
  for select to authenticated using (
    public.alerto_is_member() and (
      public.alerto_admin_barangay() is null
      or exists (
        select 1 from public.alerto_subscribers s
        where s.id = alerto_send_logs.subscriber_id and s.barangay_id = public.alerto_admin_barangay()
      )
    )
  );
