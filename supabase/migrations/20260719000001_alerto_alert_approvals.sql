-- Alert approval workflow (STRICTLY ADDITIVE — only touches alerto_ tables,
-- never the shared prototype tables). Adds an approval gate: non-approvers
-- submit alerts as `pending_approval`; an owner or a `can_approve` operator
-- approves (which broadcasts) or rejects. `created_by` remains the submitter.

-- Designated approvers. Owners can always approve; this flag grants specific
-- operators approval rights too.
alter table public.alerto_admins
  add column if not exists can_approve boolean not null default false;

-- Approval bookkeeping on alerts.
alter table public.alerto_alerts
  add column if not exists approved_by uuid references public.alerto_admins (user_id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_by uuid references public.alerto_admins (user_id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists review_note text;

-- Widen the status check to include the approval states. This is a superset of
-- the original set ('draft','sending','sent','failed'), so every existing row
-- stays valid.
alter table public.alerto_alerts drop constraint if exists alerto_alerts_status_check;
alter table public.alerto_alerts
  add constraint alerto_alerts_status_check
  check (status in ('draft','pending_approval','rejected','sending','sent','failed'));
