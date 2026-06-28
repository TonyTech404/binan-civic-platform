-- Bantay Eskwela — school emergency response schema
-- Additive: does not touch any existing tables.
-- Tables are prefixed "eskwela_" to stay clearly separated.

-- ── Schools ──────────────────────────────────────────────────
create table public.eskwela_schools (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  address          text not null,
  city             text not null default 'Biñan',
  province         text not null default 'Laguna',
  principal_name   text not null,
  emergency_contact text not null,
  latitude         double precision,
  longitude        double precision,
  created_at       timestamptz not null default now()
);

-- ── Rooms ────────────────────────────────────────────────────
create table public.eskwela_rooms (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.eskwela_schools (id) on delete cascade,
  building    text not null,
  room_number text not null,
  created_at  timestamptz not null default now()
);

-- ── Incidents ─────────────────────────────────────────────────
create table public.eskwela_incidents (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.eskwela_schools (id) on delete cascade,
  room_id          uuid not null references public.eskwela_rooms (id) on delete cascade,
  teacher_name     text not null,
  emergency_type   text not null,
  status           text not null default 'ACTIVE'
                     check (status in ('ACTIVE','ACKNOWLEDGED','RESPONDING','RESOLVED')),
  created_at       timestamptz not null default now(),
  acknowledged_at  timestamptz,
  resolved_at      timestamptz
);

create index eskwela_incidents_status_idx on public.eskwela_incidents (status);
create index eskwela_incidents_created_idx on public.eskwela_incidents (created_at desc);

-- ── Incident Timeline ─────────────────────────────────────────
create table public.eskwela_incident_timeline (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.eskwela_incidents (id) on delete cascade,
  message     text not null,
  created_at  timestamptz not null default now()
);

create index eskwela_timeline_incident_idx on public.eskwela_incident_timeline (incident_id, created_at);

-- ── RLS — public read (demo), service role writes ─────────────
alter table public.eskwela_schools            enable row level security;
alter table public.eskwela_rooms              enable row level security;
alter table public.eskwela_incidents          enable row level security;
alter table public.eskwela_incident_timeline  enable row level security;

create policy "eskwela schools public read"   on public.eskwela_schools           for select using (true);
create policy "eskwela rooms public read"     on public.eskwela_rooms             for select using (true);
create policy "eskwela incidents public read" on public.eskwela_incidents         for select using (true);
create policy "eskwela timeline public read"  on public.eskwela_incident_timeline for select using (true);

-- ── Enable Supabase Realtime ──────────────────────────────────
alter publication supabase_realtime add table public.eskwela_incidents;
alter publication supabase_realtime add table public.eskwela_incident_timeline;

-- ── Seed data ─────────────────────────────────────────────────
do $$
declare
  school_id uuid;
begin
  insert into public.eskwela_schools (name, address, principal_name, emergency_contact, latitude, longitude)
  values ('Biñan National High School', 'Biñan, Laguna', 'Juan Dela Cruz', '0917-000-0000', 14.3392, 121.0850)
  returning id into school_id;

  insert into public.eskwela_rooms (school_id, building, room_number)
  values (school_id, 'B', '204');
end $$;
