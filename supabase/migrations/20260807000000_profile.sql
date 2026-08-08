-- The `profile` table: identity, and the columns later specs fill.
--
-- Spec #1 creates the schema now and populates it later. What this ticket
-- writes is identity; `display_name` and `session_goal` are #3's, and are
-- nullable so that adding them later is not also a migration argument.
--
-- RLS: a user reads and writes only their own row. Friend visibility is
-- read-only and additive and arrives with #6 — deliberately not stubbed
-- permissively here, because a permissive policy written as a placeholder is a
-- permissive policy shipped.

create table if not exists public.profile (
  -- The auth user *is* the profile. One row per user, enforced by the key
  -- rather than by a convention the client is trusted to follow, which is also
  -- what makes the at-least-once upsert idempotent.
  id uuid primary key references auth.users (id) on delete cascade,

  email text not null,

  -- #3 fills these. Nullable rather than defaulted: a Session Goal of zero
  -- would read as a real target the user had been given.
  display_name text,
  session_goal integer,

  -- Client timestamps, which the server accepts (ADR-0010).
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile enable row level security;

-- Table-level grants are a separate gate from the policies below: RLS decides
-- which *rows* a role may touch, and without a grant the role cannot reach the
-- table at all. Both are required.
--
-- `anon` is granted nothing. An unauthenticated client has no business here,
-- and the policies are all `to authenticated` anyway — leaving anon ungranted
-- means a policy mistake later cannot open the table to the public.
grant select, insert, update, delete on public.profile to authenticated;

-- Force RLS for the table owner too. Without this, a connection running as the
-- owner bypasses every policy below and the isolation is only as good as which
-- role happens to be connected.
alter table public.profile force row level security;

-- Four policies rather than one `for all`: the intent is legible per verb, and
-- insert needs `with check` where select needs `using`. `(select auth.uid())`
-- rather than a bare call so the planner evaluates it once per query instead of
-- once per row.

drop policy if exists "profile is readable by its owner" on public.profile;
create policy "profile is readable by its owner"
  on public.profile for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profile is insertable by its owner" on public.profile;
create policy "profile is insertable by its owner"
  on public.profile for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- `using` decides which rows are visible to update; `with check` decides what
-- they may become. Both are required — without the check, an owner could
-- reassign their row's `id` to another user.
drop policy if exists "profile is updatable by its owner" on public.profile;
create policy "profile is updatable by its owner"
  on public.profile for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "profile is deletable by its owner" on public.profile;
create policy "profile is deletable by its owner"
  on public.profile for delete
  to authenticated
  using ((select auth.uid()) = id);
