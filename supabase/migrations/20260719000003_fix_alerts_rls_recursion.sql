-- FIX: infinite recursion between the alerto_alerts and alerto_alert_targets
-- SELECT policies (added in 20260719000002). Each policy's `exists(...)` queried
-- the other table, whose policy queried back — Postgres detects the cycle and
-- every read of alerto_alerts errors ("infinite recursion detected in policy").
--
-- Fix: put the cross-table visibility check in a SECURITY DEFINER function. It
-- runs as the owner, so its inner queries bypass RLS → no policy recursion. Both
-- policies call it. Barangay scoping is preserved exactly (city-wide members see
-- all; scoped members see city-wide alerts + alerts targeting their barangay).

create or replace function public.alerto_can_see_alert(aid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.alerto_admin_barangay() is null
    or exists (select 1 from public.alerto_alerts a where a.id = aid and a.target_scope = 'city')
    or exists (select 1 from public.alerto_alert_targets t
               where t.alert_id = aid and t.barangay_id = public.alerto_admin_barangay());
$$;

drop policy if exists "alerto alerts team read" on public.alerto_alerts;
create policy "alerto alerts team read" on public.alerto_alerts
  for select to authenticated
  using (public.alerto_is_member() and public.alerto_can_see_alert(id));

drop policy if exists "alerto alert_targets team read" on public.alerto_alert_targets;
create policy "alerto alert_targets team read" on public.alerto_alert_targets
  for select to authenticated
  using (public.alerto_is_member() and public.alerto_can_see_alert(alert_id));
