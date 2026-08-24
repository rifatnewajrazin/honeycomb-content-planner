-- HoneyComb Content Planner — Supabase data migration
-- Run this once in Supabase Dashboard → SQL Editor → New query → Run.
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
alter publication supabase_realtime add table
  public.posts,
  public.tasks,
  public.team,
  public.content_ideas,
  public.priority_notes,
  public.priority_board_log,
  public.activity_log;
