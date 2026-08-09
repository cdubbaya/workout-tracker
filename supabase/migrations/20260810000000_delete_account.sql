-- Leaving: a user deletes their own account and everything in it.
--
-- The client holds an anon key, and `auth.users` is not reachable with one —
-- deleting that row needs elevated rights. So the privilege lives here, in a
-- function narrow enough to hold exactly one: delete *the caller*. A service
-- key shipped to the client would delete anyone.
--
-- Deleting the `auth.users` row rather than the `profile` row is the whole
-- design. `profile.id` references it `on delete cascade`, so removing the user
-- takes the profile with it — and every later table that references the profile
-- or the user the same way goes too, without this function being edited to name
-- it. A function that listed its tables is a function a later spec forgets to
-- add its table to, which is how "deleted" accounts keep their rows.
--
-- It also removes the credential. Deleting only the profile would leave an
-- account that still signs in, to an app with nothing in it.

create or replace function public.delete_account()
returns void
language plpgsql
-- `security definer` is what supplies the rights the caller lacks. It is also
-- what makes the two lines below load-bearing rather than ceremonial.
security definer
-- Pinned so the function cannot be hijacked by a caller-controlled
-- `search_path` resolving `users` to something they created. `pg_temp` is last
-- for the same reason: a temp table shadowing a real one is the classic
-- definer-function escalation.
set search_path = pg_catalog, public, pg_temp
as $$
declare
  caller uuid := auth.uid();
begin
  -- No session, no deletion. Without this an unauthenticated call would reach
  -- `delete from auth.users where id is null` — which deletes nothing today,
  -- and is one refactor away from deleting everything.
  if caller is null then
    raise exception 'delete_account requires an authenticated caller'
      using errcode = '42501';
  end if;

  -- The caller and only the caller. The identity comes from the JWT rather than
  -- from an argument, so there is nothing here to forge.
  --
  -- Deleting a row that is already gone affects zero rows and raises nothing,
  -- which is what makes this safe to redeliver: the write queue is
  -- at-least-once (ADR-0010), so a dropped acknowledgement means this runs
  -- twice, and the second run must cost nothing.
  delete from auth.users where id = caller;
end;
$$;

-- What the cascade is, made checkable.
--
-- The criterion this ticket is held to says the cascade must be *verified*
-- rather than assumed, and the thing worth verifying is not that one row
-- vanished — it is that it vanished *by cascade*, because that is what covers
-- the tables later specs add without this function being edited to name them.
-- That fact lives in `pg_catalog`, which is not reachable over the API, so this
-- view is the one column of it that matters.
--
-- Read-only and owner-scoped to the backend: `service_role` only, never the
-- app's roles. It exposes schema shape, not anyone's data.
create or replace view public.account_cascade_constraint as
  select
    con.conname as constraint_name,
    -- `c` is Postgres's code for `on delete cascade`. `a` (no action) or `n`
    -- (set null) would leave orphaned rows behind a deleted account.
    con.confdeltype as delete_action
  from pg_catalog.pg_constraint con
  join pg_catalog.pg_class rel on rel.oid = con.conrelid
  join pg_catalog.pg_namespace nsp on nsp.oid = rel.relnamespace
  where con.contype = 'f'
    and nsp.nspname = 'public';

-- `security_invoker` so the view cannot be used to read past the caller's own
-- rights. It is a catalog view, but the default (`security definer` semantics
-- for views) is the wrong default to leave in place on anything.
alter view public.account_cascade_constraint set (security_invoker = on);

revoke all on public.account_cascade_constraint from public, anon, authenticated;
grant select on public.account_cascade_constraint to service_role;

-- The backend's own view of `profile`.
--
-- `service_role` is the role that runs outside a user session — it bypasses RLS
-- by design, and is the only way to ask "is this row actually gone" rather than
-- "is this row invisible to the asker". Without it there is no out-of-band
-- verifier, and the deletion criterion cannot be checked at all: a row hidden
-- by RLS and a row that no longer exists look identical from every client.
--
-- Not a widening of what any *user* can reach. `service_role` requires the
-- secret key, which lives on a server and is never shipped to the app — the
-- client holds a publishable key and is still governed entirely by the policies
-- above.
grant select on public.profile to service_role;

-- `authenticated` only. `anon` is granted nothing here for the same reason it is
-- granted nothing on `profile` — an unauthenticated caller has no account to
-- delete, and the check above would reject it anyway.
--
-- Revoke from `public` first: a newly created function is executable by
-- everyone by default, and that default is exactly wrong for a definer function
-- holding elevated rights.
revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
