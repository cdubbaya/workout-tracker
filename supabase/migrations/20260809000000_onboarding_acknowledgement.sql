-- The disclaimer acknowledgement, on the profile.
--
-- A separate migration rather than an edit to `20260807000000_profile.sql`:
-- that one is `create table if not exists`, so amending it would be a no-op
-- against any database that has already run it.
--
-- No new policies. The four on `profile` are per-verb and column-agnostic, so
-- the owner-only update policy already governs this column — which is what
-- keeps one user from acknowledging on another's behalf.

alter table public.profile
  -- A timestamp rather than a boolean. The disclaimer is load-bearing rather
  -- than ceremonial (ADR-0007) — the program schedules no rest, so this row is
  -- the record that the user was told recovery is their call, and *when* they
  -- were told is the part worth keeping.
  --
  -- Nullable with no default: null means "has not acknowledged", which is a real
  -- answer and the one that sends a new user into onboarding. Defaulting it to
  -- `now()` would mark every existing user as having accepted a disclaimer they
  -- were never shown.
  add column if not exists onboarding_acknowledged_at timestamptz;
