-- HoneyComb Content Planner — Supabase data migration
-- Run this in Supabase Dashboard → SQL Editor → New query → Run.
--
-- Safe to re-run: every statement is idempotent, including the Realtime
-- publication adds (a plain `alter publication ... add table` errors on a
-- table that is already a member, which used to break re-runs).
--
-- Design: each Firestore "collection" becomes a Postgres table with a text
-- primary key (the same id the app already generates) and a jsonb column
-- holding the full document, mirroring Firestore's schemaless documents
-- exactly so the app's existing data shapes don't need to change.
--
-- Security model:
--   - Anyone (anon) can SELECT — the app has a deliberate public read-only
--     "view without signing in" mode.
--   - Only an authenticated Supabase session (i.e. someone who signed in
--     through the app's login form) can INSERT / UPDATE / DELETE.

create table if not exists public.posts (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.team (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.content_ideas (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.priority_notes (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.priority_board_log (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Employee Database (HR directory). Kept separate from `team` on purpose:
-- these hold PII (DOB, phone, blood group, NID, address) and must NOT be
-- world-readable like the rest of the app. Read is restricted to an
-- authenticated Supabase session; writes likewise.
create table if not exists public.employee_records (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_db_log (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

do $$
declare
  t text;
begin
  foreach t in array array['employee_records','employee_db_log']
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists "Public read access" on public.%I;', t);
    execute format('drop policy if exists "Authenticated read access" on public.%I;', t);
    execute format('create policy "Authenticated read access" on public.%I for select using (auth.role() = ''authenticated'');', t);

    execute format('drop policy if exists "Authenticated write access" on public.%I;', t);
    execute format(
      'create policy "Authenticated write access" on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'');',
      t
    );
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['employee_records','employee_db_log']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;

-- Row Level Security: same policy shape on every table.
do $$
declare
  t text;
begin
  foreach t in array array['posts','tasks','team','content_ideas','priority_notes','priority_board_log','activity_log']
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists "Public read access" on public.%I;', t);
    execute format('create policy "Public read access" on public.%I for select using (true);', t);

    execute format('drop policy if exists "Authenticated write access" on public.%I;', t);
    execute format(
      'create policy "Authenticated write access" on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'');',
      t
    );
  end loop;
end $$;

-- Enable Realtime (postgres_changes) so the app's live-sync listeners work.
do $$
declare
  t text;
begin
  foreach t in array array['posts','tasks','team','content_ideas','priority_notes','priority_board_log','activity_log']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Leave Management (HR). Same reasoning as employee_records: leave history is
-- sensitive personnel data, so these are authenticated-read only, never public.
--
--   leave_records   one row per employee per date, with two half-day slots
--                   (am/pm). A day physically has two halves, so storing the
--                   slots rather than a composed code ("L1"/"L2") makes half-day
--                   arithmetic structurally correct and lets a single date hold
--                   a mixed day (vacation morning + sick afternoon).
--   leave_holidays  company-wide non-working days. Never consume balance.
--   leave_policy    one row per leave year: entitlements, blackout months,
--                   weekend days. Editable in-app, not hardcoded.
--   leave_log       scoped audit trail, same shape as employee_db_log.
create table if not exists public.leave_records (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.leave_holidays (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.leave_policy (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.leave_log (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

do $$
declare
  t text;
begin
  foreach t in array array['leave_records','leave_holidays','leave_policy','leave_log']
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists "Public read access" on public.%I;', t);
    execute format('drop policy if exists "Authenticated read access" on public.%I;', t);
    execute format('create policy "Authenticated read access" on public.%I for select using (auth.role() = ''authenticated'');', t);

    execute format('drop policy if exists "Authenticated write access" on public.%I;', t);
    execute format(
      'create policy "Authenticated write access" on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'');',
      t
    );
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['leave_records','leave_holidays','leave_policy','leave_log']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;
