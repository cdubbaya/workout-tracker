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

import type {
  CoreEvent,
  Identity,
  LocalDate,
  Timestamp,
  UserId,
  WriteId,
} from '../core/events';
import type { QueuedWrite } from '../core/effects';

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
 *
 * `writeId` is passed in rather than minted here: the id has to key the profile
 * write for every delivery attempt, so it belongs to the caller that owns the
 * generator and not to a function called once per auth callback.
 */
export function eventForSession(
  session: Session | null,
  at: Timestamp,
  writeId: WriteId,
): CoreEvent | null {
  const identity = identityOf(session?.user);

  if (!identity) {
    return { type: 'SignedOut', at };
  }

  return { type: 'SignedIn', at, identity, today: localDayOf(at), writeId };
}

/**
 * Deliver one queued write. Effects are data until they reach here.
 *
 * This is the sync driver's transport, so it is reached only from a drain and
 * only for writes the queue is holding. A rejection is how the driver learns
 * the write is still owed — every failure path below therefore throws rather
 * than reporting success.
 *
 * Every statement here is idempotent, keyed so that redelivering it writes the
 * same row rather than a second one. That is what makes at-least-once delivery
 * (ADR-0010) safe: an acknowledgement lost on the way back costs a duplicate
 * delivery, and a duplicate delivery costs nothing.
 *
 * `PersistProfile` upserts on the primary key, so a replay cannot create a
 * second profile. Its payload names only the columns a sign-in owns — Supabase
 * builds the `do update set` clause from exactly those keys, so a re-sign-in
 * leaves the onboarding acknowledgement alone rather than resetting it.
 */
export async function runEffect(
  client: SupabaseClient,
  effect: QueuedWrite,
): Promise<void> {
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

  }
}

/**
 * Read the server's snapshot for this user, as `RemoteStateLoaded`.
 *
 * This is what makes acknowledgement survive app termination: the client holds
 * nothing across a cold start beyond its own unsent queue, so the row is where
 * the answer lives.
 *
 * A read failure rejects rather than reporting `null`. Reporting `null` would
 * show the disclaimer again to a user who accepted it and then overwrite the
 * timestamp they accepted it at — a silent loss, where a rejection is a retry.
 *
 * The snapshot is what the *server* knows, which is not everything the user
 * did: a write still sitting in the queue is newer than anything in here. The
 * core reconciles that, so this function does not have to know the queue
 * exists.
 */
export async function remoteStateEventFor(
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

  // No row is not an error: the profile write may still be sitting in the
  // queue, so a first cold start can outrun it. A user with no row has not
  // acknowledged as far as the server is concerned.
  const raw = data?.onboarding_acknowledged_at ?? null;

  return {
    type: 'RemoteStateLoaded',
    at,
    snapshot: {
      // Postgres hands back the string it rendered, not a number. Parsed here
      // because the core deals in timestamps and never in a database's formats.
      onboardingAcknowledgedAt: raw === null ? null : new Date(raw).getTime(),
    },
  };
}
