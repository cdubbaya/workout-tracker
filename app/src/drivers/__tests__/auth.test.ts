/**
 * The auth and clock drivers, tested without a network.
 *
 * The doubles here are shaped from the real `@supabase/supabase-js` types —
 * `Session` and `User` are imported, not hand-described, so a double that
 * drifts from what Supabase actually returns is a type error rather than a
 * green test over code that breaks on a device.
 */

import type { Session, User } from '@supabase/supabase-js';

import {
  eventForSession,
  identityOf,
  localDayOf,
  remoteStateEventFor,
  runEffect,
} from '../auth';
import { createClockDriver } from '../clock';
import { readSupabaseConfig } from '../config';

/**
 * A Supabase user carries far more than identity. Building from the real type
 * keeps this honest: `email` is optional upstream, which is exactly the case
 * `identityOf` has to handle.
 */
function aUser(overrides: Partial<User> = {}): User {
  return {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    app_metadata: { provider: 'email' },
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-08-07T10:00:00.000Z',
    email: 'ada@example.com',
    ...overrides,
  } as User;
}

function aSession(user: User = aUser()): Session {
  return {
    access_token: 'access-token-value',
    refresh_token: 'refresh-token-value',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  } as Session;
}

describe('identityOf', () => {
  it('maps a Supabase user to an identity', () => {
    const user = aUser({ id: 'user-42', email: 'grace@example.com' });

    // Distinct values per field: an implementation swapping id and email
    // cannot pass this.
    expect(identityOf(user)).toEqual({ userId: 'user-42', email: 'grace@example.com' });
  });

  it('returns null for a user with no email', () => {
    // Supabase types `email` as optional. Asserting instead would sign someone
    // in as a user with no address.
    expect(identityOf(aUser({ email: undefined }))).toBeNull();
  });

  it('returns null for no user at all', () => {
    expect(identityOf(null)).toBeNull();
  });
});

describe('eventForSession', () => {
  it('turns a session into SignedIn carrying the identity and the timestamp', () => {
    const at = 1_775_000_000_000;
    const event = eventForSession(aSession(), at, 'write-sign-in-1');

    expect(event).toEqual({
      type: 'SignedIn',
      at,
      identity: { userId: aUser().id, email: 'ada@example.com' },
      today: localDayOf(at),
      // Passed through rather than minted here, so the profile write this
      // raises keeps one key across every delivery attempt.
      writeId: 'write-sign-in-1',
    });
  });

  it('turns an absent session into SignedOut', () => {
    const at = 1_775_000_000_000;

    // No key on the event: signing out writes nothing to the server, so
    // carrying one would promise a delivery that never happens.
    expect(eventForSession(null, at, 'write-sign-in-1')).toEqual({
      type: 'SignedOut',
      at,
    });
  });

  it('treats a session whose user has no email as signed out', () => {
    const at = 1_775_000_000_000;
    const session = aSession(aUser({ email: undefined }));

    expect(eventForSession(session, at, 'write-sign-in-1')).toEqual({
      type: 'SignedOut',
      at,
    });
  });
});

describe('localDayOf', () => {
  it('reads the day in local time, not UTC', () => {
    // The property: the date is the one the *device* is showing. Built from
    // local parts, so this holds in every timezone rather than only where the
    // offset happens to be zero.
    const at = 1_775_000_000_000;
    const expected = new Date(at);
    const pad = (n: number) => String(n).padStart(2, '0');

    expect(localDayOf(at)).toBe(
      `${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(expected.getDate())}`,
    );
  });

  it('formats as YYYY-MM-DD with zero padding', () => {
    expect(localDayOf(new Date(2026, 0, 5, 12).getTime())).toBe('2026-01-05');
  });
});

describe('the clock driver', () => {
  it('raises DayRolled when the local day differs from the last known one', () => {
    const at = new Date(2026, 7, 8, 0, 30).getTime();
    const clock = createClockDriver(() => at);

    expect(clock.poll('2026-08-07')).toEqual({ type: 'DayRolled', at, today: '2026-08-08' });
  });

  it('stays silent when the day has not changed', () => {
    const at = new Date(2026, 7, 7, 23, 30).getTime();
    const clock = createClockDriver(() => at);

    expect(clock.poll('2026-08-07')).toBeNull();
  });

  it('stays silent on a first observation, which is not a boundary crossing', () => {
    const clock = createClockDriver(() => new Date(2026, 7, 7, 9, 0).getTime());

    expect(clock.poll(null)).toBeNull();
  });

  it('emits on an interval while running, and stops when told to', () => {
    jest.useFakeTimers();
    try {
      let current = new Date(2026, 7, 7, 23, 59).getTime();
      const clock = createClockDriver(() => current, 1_000);
      const emitted: string[] = [];
      let known = '2026-08-07';

      const stop = clock.start(
        () => known,
        (event) => {
          emitted.push(event.today);
          known = event.today;
        },
      );

      jest.advanceTimersByTime(1_000);
      expect(emitted).toEqual([]);

      current = new Date(2026, 7, 8, 0, 1).getTime();
      jest.advanceTimersByTime(1_000);
      expect(emitted).toEqual(['2026-08-08']);

      // Having emitted once, the driver does not repeat itself for the same day.
      jest.advanceTimersByTime(5_000);
      expect(emitted).toEqual(['2026-08-08']);

      stop();
      current = new Date(2026, 7, 9, 0, 1).getTime();
      jest.advanceTimersByTime(5_000);
      expect(emitted).toEqual(['2026-08-08']);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('runEffect', () => {
  it('upserts the profile keyed on the user id, so a replay cannot duplicate it', async () => {
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const client = { from: jest.fn().mockReturnValue({ upsert }) };

    await runEffect(client as never, {
      type: 'PersistProfile',
      writeId: 'write-1',
      userId: 'user-42',
      email: 'grace@example.com',
      at: Date.UTC(2026, 7, 7, 10, 0, 0),
    });

    expect(client.from).toHaveBeenCalledWith('profile');
    expect(upsert).toHaveBeenCalledWith(
      {
        id: 'user-42',
        email: 'grace@example.com',
        updated_at: '2026-08-07T10:00:00.000Z',
      },
      { onConflict: 'id' },
    );
  });

  it('surfaces a write failure rather than swallowing it', async () => {
    // Supabase returns errors in the result rather than rejecting, so a driver
    // that ignored `error` would report success on every failed write.
    const error = { message: 'permission denied for table profile' };
    const client = { from: () => ({ upsert: jest.fn().mockResolvedValue({ error }) }) };

    await expect(
      runEffect(client as never, {
        type: 'PersistProfile',
        writeId: 'write-1',
        userId: 'user-42',
        email: 'grace@example.com',
        at: 0,
      }),
    ).rejects.toEqual(error);
  });
});

describe('runEffect, for the onboarding acknowledgement', () => {
  it('updates only the acknowledgement column, keyed on the user id', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    const client = { from: jest.fn().mockReturnValue({ update }) };

    await runEffect(client as never, {
      type: 'PersistOnboardingAcknowledgement',
      writeId: 'write-1',
      userId: 'user-42',
      at: Date.UTC(2026, 7, 7, 10, 0, 0),
    });

    expect(client.from).toHaveBeenCalledWith('profile');

    // An update rather than an upsert: the row already exists — `PersistProfile`
    // created it at sign-in — and an upsert here would need the email to satisfy
    // the not-null column, which this effect does not carry and should not.
    expect(update).toHaveBeenCalledWith({
      onboarding_acknowledged_at: '2026-08-07T10:00:00.000Z',
      updated_at: '2026-08-07T10:00:00.000Z',
    });
    expect(eq).toHaveBeenCalledWith('id', 'user-42');
  });

  it('surfaces a write failure rather than swallowing it', async () => {
    const error = { message: 'permission denied for table profile' };
    const client = {
      from: () => ({ update: () => ({ eq: jest.fn().mockResolvedValue({ error }) }) }),
    };

    await expect(
      runEffect(client as never, {
        type: 'PersistOnboardingAcknowledgement',
        writeId: 'write-1',
        userId: 'user-42',
        at: 0,
      }),
    ).rejects.toEqual(error);
  });
});

describe('Signing in again, for a user who has acknowledged', () => {
  it('does not name the acknowledgement column, so a re-sign-in cannot clear it', async () => {
    // The silent regression this guards: `PersistProfile` upserts on every
    // sign-in, and Supabase builds its `do update set` from the columns it was
    // given. Adding `onboarding_acknowledged_at` to that payload — even as
    // `undefined` — would reset a returning user's acknowledgement and put them
    // back through onboarding. Verified against a local instance that the
    // current payload leaves the column untouched.
    const upsert = jest.fn().mockResolvedValue({ error: null });
    const client = { from: jest.fn().mockReturnValue({ upsert }) };

    await runEffect(client as never, {
      type: 'PersistProfile',
      writeId: 'write-1',
      userId: 'user-42',
      email: 'grace@example.com',
      at: 0,
    });

    expect(Object.keys(upsert.mock.calls[0][0])).not.toContain(
      'onboarding_acknowledged_at',
    );
  });
});

describe('remoteStateEventFor', () => {
  /**
   * Supabase hands back the column as the string PostgREST rendered, not a Date
   * and not a number. A double that returned a timestamp would go green over a
   * driver that never parses — which is the whole job of this function.
   *
   * The literal below is the exact form a local instance returns for a
   * `timestamptz`, captured from the running container rather than assumed:
   * `2026-08-07T10:00:00+00:00`, with a numeric offset and no `Z` and no
   * milliseconds. Writing the friendlier `.000Z` form here would leave the
   * driver's one real risk — that it cannot parse what Postgres actually
   * renders — untested.
   */
  function clientReturning(
    result: { data: { onboarding_acknowledged_at: string | null } | null; error: unknown },
  ) {
    const maybeSingle = jest.fn().mockResolvedValue(result);
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    return { client: { from: jest.fn().mockReturnValue({ select }) }, select, eq };
  }

  it('reports the acknowledgement the profile holds, parsed to a timestamp', async () => {
    const { client, select, eq } = clientReturning({
      data: { onboarding_acknowledged_at: '2026-08-07T10:00:00+00:00' },
      error: null,
    });

    const event = await remoteStateEventFor(client as never, 'user-42', 1_775_000_000_000);

    expect(select).toHaveBeenCalledWith('onboarding_acknowledged_at');
    expect(eq).toHaveBeenCalledWith('id', 'user-42');

    // Derived from the stated instant rather than pinned to a literal the
    // implementation happened to produce.
    expect(event).toEqual({
      type: 'RemoteStateLoaded',
      at: 1_775_000_000_000,
      snapshot: { onboardingAcknowledgedAt: Date.UTC(2026, 7, 7, 10, 0, 0) },
    });
  });

  it('reports null for a profile that has not acknowledged', async () => {
    const { client } = clientReturning({
      data: { onboarding_acknowledged_at: null },
      error: null,
    });

    const event = await remoteStateEventFor(client as never, 'user-42', 1_775_000_000_000);

    expect(event).toEqual({
      type: 'RemoteStateLoaded',
      at: 1_775_000_000_000,
      snapshot: { onboardingAcknowledgedAt: null },
    });
  });

  it('reports null when no row exists yet', async () => {
    // The profile write goes through the queue, so the first cold start after
    // a sign-up can read before it drains. A new user seeing onboarding is the
    // right answer here; throwing would leave them on a blank screen.
    const { client } = clientReturning({ data: null, error: null });

    const event = await remoteStateEventFor(client as never, 'user-42', 1_775_000_000_000);

    expect(event).toEqual({
      type: 'RemoteStateLoaded',
      at: 1_775_000_000_000,
      snapshot: { onboardingAcknowledgedAt: null },
    });
  });

  it('surfaces a read failure rather than reporting a user as new', async () => {
    // The dangerous default. A failed read that returned `acknowledgedAt: null`
    // would show the disclaimer again to someone who accepted it, and — worse —
    // would let the app write over their original acknowledgement.
    const error = { message: 'permission denied for table profile' };
    const { client } = clientReturning({ data: null, error });

    await expect(
      remoteStateEventFor(client as never, 'user-42', 1_775_000_000_000),
    ).rejects.toEqual(error);
  });
});

describe('readSupabaseConfig', () => {
  it('reads url and publishable key from the environment', () => {
    const config = readSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_example',
    });

    expect(config).toEqual({
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_example',
    });
  });

  it('names every missing variable, so setup fails loudly at startup', () => {
    expect(() => readSupabaseConfig({})).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
    expect(() => readSupabaseConfig({})).toThrow(/EXPO_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
