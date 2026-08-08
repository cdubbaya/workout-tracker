/**
 * The auth and clock drivers, tested without a network.
 *
 * The doubles here are shaped from the real `@supabase/supabase-js` types —
 * `Session` and `User` are imported, not hand-described, so a double that
 * drifts from what Supabase actually returns is a type error rather than a
 * green test over code that breaks on a device.
 */

import type { Session, User } from '@supabase/supabase-js';

import { eventForSession, identityOf, localDayOf, runEffect } from '../auth';
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
    const event = eventForSession(aSession(), at);

    expect(event).toEqual({
      type: 'SignedIn',
      at,
      identity: { userId: aUser().id, email: 'ada@example.com' },
      today: localDayOf(at),
    });
  });

  it('turns an absent session into SignedOut', () => {
    const at = 1_775_000_000_000;

    expect(eventForSession(null, at)).toEqual({ type: 'SignedOut', at });
  });

  it('treats a session whose user has no email as signed out', () => {
    const at = 1_775_000_000_000;
    const session = aSession(aUser({ email: undefined }));

    expect(eventForSession(session, at)).toEqual({ type: 'SignedOut', at });
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
        userId: 'user-42',
        email: 'grace@example.com',
        at: 0,
      }),
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
