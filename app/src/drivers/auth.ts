/**
 * The auth driver: Supabase sessions in, core events out; core effects in,
 * Supabase writes out.
 *
 * It holds no rules. Deciding what a sign-in *means* — what state it produces,
 * what must be written, what a sign-out clears — belongs to the core. This
 * module only translates, which is why it can be thin enough to read in one
 * sitting and why the rules stay testable without a network.
 */

import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import type { CoreEvent, Identity, LocalDate, Timestamp, UserId } from '../core/events';
import type { Effect } from '../core/effects';

/**
 * The local calendar day for an instant. Lives in the driver because it reads
 * the device's timezone — exactly the ambient input the core refuses.
 *
 * Local rather than UTC: the Daily Budget is a claim about the user's day
 * (ADR-0011). Built from parts rather than `toISOString`, which would convert
 * to UTC and roll the date across midnight for most of the world.
 */
export function localDayOf(at: Timestamp): LocalDate {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * A Supabase user becomes an Identity, or nothing.
 *
 * Supabase types `email` as optional — a user can exist without one via other
 * providers — so this returns `null` rather than asserting. Email sign-in is
 * the only route in this ticket, but the type does not know that.
 */
export function identityOf(user: User | null | undefined): Identity | null {
  if (!user?.email) {
    return null;
  }
  return { userId: user.id, email: user.email };
}

/**
 * The event a session change implies. `null` when a session carries no usable
 * identity, so a malformed session is ignored rather than signing someone in
 * as a user with no email.
 */
export function eventForSession(
  session: Session | null,
  at: Timestamp,
): CoreEvent | null {
  const identity = identityOf(session?.user);

  if (!identity) {
    return { type: 'SignedOut', at };
  }

  return { type: 'SignedIn', at, identity, today: localDayOf(at) };
}

/**
 * Execute one effect. Effects are data until they reach here.
 *
 * `PersistProfile` upserts on the primary key, so the at-least-once queue spec
 * #1 describes cannot create a second profile by replaying it. Its payload names
 * only the columns a sign-in owns — Supabase builds the `do update set` clause
 * from exactly those keys, so a re-sign-in leaves the onboarding acknowledgement
 * alone rather than resetting it.
 */
export async function runEffect(client: SupabaseClient, effect: Effect): Promise<void> {
  switch (effect.type) {
    case 'PersistProfile': {
      const { error } = await client.from('profile').upsert(
        {
          id: effect.userId,
          email: effect.email,
          updated_at: new Date(effect.at).toISOString(),
        },
        { onConflict: 'id' },
      );
      if (error) {
        throw error;
      }
      return;
    }

    case 'PersistOnboardingAcknowledgement': {
      // An update rather than an upsert: sign-in already created the row, and an
      // upsert would have to supply `email` to satisfy its not-null column —
      // which this effect does not carry, because an acknowledgement is not an
      // identity claim.
      const { error } = await client
        .from('profile')
        .update({
          onboarding_acknowledged_at: new Date(effect.at).toISOString(),
          updated_at: new Date(effect.at).toISOString(),
        })
        .eq('id', effect.userId);
      if (error) {
        throw error;
      }
      return;
    }

    case 'ClearLocalState':
      // Nothing local is cached yet — the durable queue arrives with the
      // offline work. Handled explicitly so that adding a cache later has an
      // obvious home rather than discovering this branch was silently absent.
      return;
  }
}

/**
 * Read what the profile says about onboarding.
 *
 * This is what makes acknowledgement survive app termination: the client holds
 * nothing across a cold start, so the row is the only place the answer lives.
 *
 * A read failure rejects rather than reporting `null`. Reporting `null` would
 * show the disclaimer again to a user who accepted it and then overwrite the
 * timestamp they accepted it at — a silent loss, where a rejection is a retry.
 */
export async function onboardingEventFor(
  client: SupabaseClient,
  userId: UserId,
  at: Timestamp,
): Promise<CoreEvent> {
  const { data, error } = await client
    .from('profile')
    .select('onboarding_acknowledged_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // No row is not an error: `PersistProfile` is fire-and-forget, so a first cold
  // start can outrun it. A user with no row has not acknowledged.
  const raw = data?.onboarding_acknowledged_at ?? null;

  return {
    type: 'OnboardingLoaded',
    at,
    // Postgres hands back the string it rendered, not a number. Parsed here
    // because the core deals in timestamps and never in a database's formats.
    acknowledgedAt: raw === null ? null : new Date(raw).getTime(),
  };
}
