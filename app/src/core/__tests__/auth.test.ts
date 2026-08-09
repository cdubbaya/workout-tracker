/**
 * Sign-in tested through the core: build a state, apply events, assert the
 * state and the effects that come out. No network, no emulator, no async.
 *
 * These assert the acceptance criteria of issue #9, through the public event
 * interface only.
 */

import { drive, aState } from '../testing/harness';
import { initialState } from '../state';
import type { CoreEvent, Identity } from '../events';

const ada: Identity = { userId: 'user-ada-1', email: 'ada@example.com' };
const grace: Identity = { userId: 'user-grace-2', email: 'grace@example.com' };

const signIn = (
  identity: Identity,
  at: number,
  today: string,
  // The profile write a sign-in raises is keyed on a client-generated id.
  // Defaulted here because these tests are about identity rather than about
  // the queue — `sync.test.ts` is where the id itself is under test.
  writeId = 'write-sign-in',
): CoreEvent => ({
  type: 'SignedIn',
  at,
  identity,
  today,
  writeId,
});

describe('SignedIn', () => {
  it('puts the signed-in identity into state', () => {
    const { state } = drive(initialState, [signIn(ada, 1_700_000_000_000, '2026-08-07')]);

    // Distinct values per field: an implementation that confused id and email
    // has to fail here.
    expect(state.identity).toEqual(ada);
  });

  it('emits an effect describing the profile write, rather than performing it', () => {
    const at = 1_700_000_000_000;
    const { effects } = drive(initialState, [signIn(ada, at, '2026-08-07')]);

    // The core describes the write; the driver executes it. The effect carries
    // the event's own timestamp — ADR-0010's client-authoritative clock.
    expect(effects).toEqual([
      {
        type: 'PersistProfile',
        writeId: 'write-sign-in',
        userId: ada.userId,
        email: ada.email,
        at,
      },
    ]);
  });

  it('adopts the day the event carries, without consulting a clock', () => {
    // The property: the core's day is whatever the event said, even when that
    // is nowhere near the real present. A core that read `Date.now()` would
    // fail this whatever the machine's clock happened to be.
    const farFuture = '2099-12-31';
    const { state } = drive(initialState, [signIn(ada, 0, farFuture)]);

    expect(state.today).toBe(farFuture);
  });

  it('replaces the previous identity when a different user signs in', () => {
    const { state } = drive(aState({ identity: ada }), [
      signIn(grace, 1_700_000_100_000, '2026-08-07'),
    ]);

    expect(state.identity).toEqual(grace);
  });
});

describe('SignedOut', () => {
  it('clears the identity', () => {
    const { state } = drive(aState({ identity: ada, today: '2026-08-07' }), [
      { type: 'SignedOut', at: 1_700_000_200_000 },
    ]);

    expect(state.identity).toBeNull();
  });

  it('emits an effect telling the driver to drop local state', () => {
    const { effects } = drive(aState({ identity: ada }), [
      { type: 'SignedOut', at: 1_700_000_200_000 },
    ]);

    // Handing the phone to someone else must not leave the previous user's
    // data reachable — and what signing out clears is a rule with a test,
    // not a screen's cleanup handler.
    expect(effects).toEqual([{ type: 'ClearLocalState' }]);
  });
});

describe('DayRolled', () => {
  it('advances the day the core believes it is', () => {
    const { state } = drive(aState({ identity: ada, today: '2026-08-07' }), [
      { type: 'DayRolled', at: 1_700_086_400_000, today: '2026-08-08' },
    ]);

    expect(state.today).toBe('2026-08-08');
  });

  it('keeps the user signed in across a day boundary', () => {
    const { state } = drive(aState({ identity: ada, today: '2026-08-07' }), [
      { type: 'DayRolled', at: 1_700_086_400_000, today: '2026-08-08' },
    ]);

    expect(state.identity).toEqual(ada);
  });

  it('advances many days without a clock, in one synchronous fold', () => {
    // The point of time-as-an-input: 200 days is a list, not a wait. This is
    // the property spec #1 names as the reason for the rule.
    const days = Array.from({ length: 200 }, (_, i) => {
      const date = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000);
      return date.toISOString().slice(0, 10);
    });

    const { state } = drive(
      aState({ identity: ada }),
      days.map((today, i): CoreEvent => ({
        type: 'DayRolled',
        at: i * 86_400_000,
        today,
      })),
    );

    expect(state.today).toBe(days[days.length - 1]);
  });
});

describe('Purity', () => {
  it('returns the same state and effects for the same input', () => {
    const events: CoreEvent[] = [
      signIn(ada, 1_700_000_000_000, '2026-08-07'),
      { type: 'DayRolled', at: 1_700_086_400_000, today: '2026-08-08' },
      { type: 'SignedOut', at: 1_700_090_000_000 },
    ];

    // Determinism is the property every later spec's fixture replay rests on.
    expect(drive(initialState, events)).toEqual(drive(initialState, events));
  });

  it('does not mutate the state it was given', () => {
    const before = aState({ identity: ada, today: '2026-08-07' });
    const snapshot = structuredClone(before);

    drive(before, [{ type: 'SignedOut', at: 1_700_000_200_000 }]);

    expect(before).toEqual(snapshot);
  });

  it('ignores an unknown event rather than throwing', () => {
    // Later specs add events. An old reducer meeting a new event must not
    // crash — adding an event may not require touching an existing branch.
    const unknown = { type: 'PoseFrame', at: 1 } as unknown as CoreEvent;
    const start = aState({ identity: ada, today: '2026-08-07' });

    const { state, effects } = drive(start, [unknown]);

    expect(state).toEqual(start);
    expect(effects).toEqual([]);
  });
});

describe('The harness', () => {
  it('collects effects from every event, not just the last', () => {
    const { effects } = drive(initialState, [
      signIn(ada, 1_700_000_000_000, '2026-08-07'),
      { type: 'SignedOut', at: 1_700_000_200_000 },
    ]);

    expect(effects.map((e) => e.type)).toEqual(['PersistProfile', 'ClearLocalState']);
  });

  it('builds a starting state without replaying the events that would reach it', () => {
    const built = aState({ identity: grace, today: '2026-08-07' });

    expect(built.identity).toEqual(grace);
    expect(built.today).toBe('2026-08-07');
  });
});
