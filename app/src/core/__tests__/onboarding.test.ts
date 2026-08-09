/**
 * Onboarding tested through the core: build a state, apply events, assert the
 * state and the effects that come out. No renderer, no network, no async.
 *
 * These assert the acceptance criteria of issue #10, through the public event
 * interface only.
 */

import { drive, aState } from '../testing/harness';
import { initialState, screenFor } from '../state';
import type { CoreEvent, Identity } from '../events';

const ada: Identity = { userId: 'user-ada-1', email: 'ada@example.com' };
const grace: Identity = { userId: 'user-grace-2', email: 'grace@example.com' };

const signIn = (identity: Identity, at: number, today: string): CoreEvent => ({
  type: 'SignedIn',
  at,
  identity,
  today,
});

describe('A new user', () => {
  it('has not acknowledged onboarding', () => {
    const { state } = drive(initialState, [signIn(ada, 1_700_000_000_000, '2026-08-07')]);

    // The gate the screen reads. A new sign-in says nothing about whether this
    // user has been through onboarding — the profile does, and it has not
    // answered yet.
    expect(state.onboardingAcknowledgedAt).toBeNull();
  });
});

describe('OnboardingAcknowledged', () => {
  it('records when the user acknowledged, from the event rather than a clock', () => {
    const at = 1_700_000_500_000;
    const { state } = drive(aState({ identity: ada, onboardingKnown: true }), [
      { type: 'OnboardingAcknowledged', at },
    ]);

    // The event's own timestamp. A core that read `Date.now()` would fail this
    // whatever the machine's clock happened to be.
    expect(state.onboardingAcknowledgedAt).toBe(at);
  });

  it('emits an effect describing the profile write, rather than performing it', () => {
    const at = 1_700_000_500_000;
    const { effects } = drive(aState({ identity: ada, onboardingKnown: true }), [
      { type: 'OnboardingAcknowledged', at },
    ]);

    // Surviving app termination is a claim about the server, not about memory.
    // The core describes the write; the driver executes it.
    expect(effects).toEqual([
      { type: 'PersistOnboardingAcknowledgement', userId: ada.userId, at },
    ]);
  });

  it('persists for whoever is signed in, not for whoever the event names', () => {
    // The event carries no user id — it cannot name the wrong one. Asserted
    // against a second identity so the test cannot pass on a hardcoded id.
    const at = 1_700_000_600_000;
    const { effects } = drive(aState({ identity: grace, onboardingKnown: true }), [
      { type: 'OnboardingAcknowledged', at },
    ]);

    expect(effects).toEqual([
      { type: 'PersistOnboardingAcknowledgement', userId: grace.userId, at },
    ]);
  });
});

describe('A returning user', () => {
  it('is known to have acknowledged once the profile reports', () => {
    const acknowledgedAt = 1_600_000_000_000;
    const { state } = drive(aState({ identity: ada }), [
      { type: 'OnboardingLoaded', at: 1_700_000_000_000, acknowledgedAt },
    ]);

    // Surviving termination: a cold start holds nothing, and this is the
    // profile answering. Distinct from `at` so a reducer that confused the two
    // has to fail here.
    expect(state.onboardingAcknowledgedAt).toBe(acknowledgedAt);
    expect(state.onboardingKnown).toBe(true);
  });

  it('is known not to have acknowledged when the profile says so', () => {
    const { state } = drive(aState({ identity: ada }), [
      { type: 'OnboardingLoaded', at: 1_700_000_000_000, acknowledgedAt: null },
    ]);

    // `null` is an answer, not a missing one. This is what sends a new user
    // into onboarding rather than leaving them on a blank screen.
    expect(state.onboardingAcknowledgedAt).toBeNull();
    expect(state.onboardingKnown).toBe(true);
  });

  it('has nothing known before the profile reports', () => {
    // The gap this guards: on cold start the session restores before the
    // profile does, and a core that treated "not yet loaded" as "not
    // acknowledged" would flash onboarding at someone who finished it months
    // ago.
    const { state } = drive(initialState, [signIn(ada, 1_700_000_000_000, '2026-08-07')]);

    expect(state.onboardingKnown).toBe(false);
  });

  it('writes nothing when the profile reports — loading is not acknowledging', () => {
    const { effects } = drive(aState({ identity: ada }), [
      { type: 'OnboardingLoaded', at: 1_700_000_000_000, acknowledgedAt: null },
    ]);

    // A read that wrote back would re-stamp every cold start, destroying the
    // original acknowledgement timestamp the disclaimer's audit trail rests on.
    expect(effects).toEqual([]);
  });
});

describe('Signing out', () => {
  it('forgets the acknowledgement, so the next user is asked', () => {
    const { state } = drive(
      aState({
        identity: ada,
        today: '2026-08-07',
        onboardingAcknowledgedAt: 1_600_000_000_000,
        onboardingKnown: true,
      }),
      [{ type: 'SignedOut', at: 1_700_000_200_000 }],
    );

    // Acknowledgement is a property of a user, not of a phone. Handing the
    // device to someone else must not skip the disclaimer for them — and it is
    // the *server* that says whether they have acknowledged.
    expect(state.onboardingAcknowledgedAt).toBeNull();
    expect(state.onboardingKnown).toBe(false);
  });
});

/**
 * Criterion: "A returning user who has acknowledged does not see onboarding
 * again."
 *
 * The routing rule lives in the core so it is provable without a renderer, a
 * client or a network — `App` reads it rather than deciding for itself.
 */
describe('Which screen the user belongs on', () => {
  it('sends a signed-out user to sign-in', () => {
    expect(screenFor(initialState)).toBe('sign-in');
  });

  it('sends a new user to onboarding', () => {
    const state = aState({
      identity: ada,
      onboardingKnown: true,
      onboardingAcknowledgedAt: null,
    });

    expect(screenFor(state)).toBe('onboarding');
  });

  it('sends a user who has acknowledged straight to home', () => {
    const state = aState({
      identity: ada,
      onboardingKnown: true,
      onboardingAcknowledgedAt: 1_600_000_000_000,
    });

    expect(screenFor(state)).toBe('home');
  });

  it('shows nothing while the profile has not reported', () => {
    // The flash this guards. On cold start the session restores before the
    // profile does; routing to onboarding on that frame would show the
    // disclaimer to someone who accepted it months ago.
    const state = aState({ identity: ada, onboardingKnown: false });

    expect(screenFor(state)).toBe('loading');
  });

  it('takes a returning user from loading to home without passing through onboarding', () => {
    // The whole cold-start sequence, as a property rather than as three separate
    // states: at no point does a user who has acknowledged get routed to
    // onboarding.
    const events: CoreEvent[] = [
      signIn(ada, 1_700_000_000_000, '2026-08-07'),
      {
        type: 'OnboardingLoaded',
        at: 1_700_000_000_100,
        acknowledgedAt: 1_600_000_000_000,
      },
    ];

    const screens = events.map((_, i) => {
      const { state } = drive(initialState, events.slice(0, i + 1));
      return screenFor(state);
    });

    expect(screens).toEqual(['loading', 'home']);
    expect(screens).not.toContain('onboarding');
  });

  it('takes a new user from loading to onboarding to home', () => {
    const events: CoreEvent[] = [
      signIn(ada, 1_700_000_000_000, '2026-08-07'),
      { type: 'OnboardingLoaded', at: 1_700_000_000_100, acknowledgedAt: null },
      { type: 'OnboardingAcknowledged', at: 1_700_000_050_000 },
    ];

    const screens = events.map((_, i) => {
      const { state } = drive(initialState, events.slice(0, i + 1));
      return screenFor(state);
    });

    // Acknowledging moves them on immediately — the screen does not wait for the
    // write to land, because a failed write is a retry and not a reason to hold
    // someone on the disclaimer.
    expect(screens).toEqual(['loading', 'onboarding', 'home']);
  });
});

describe('Acknowledgement without an identity', () => {
  it('changes nothing and writes nothing', () => {
    const start = aState({ today: '2026-08-07' });

    const { state, effects } = drive(start, [
      { type: 'OnboardingAcknowledged', at: 1_700_000_500_000 },
    ]);

    // There is no row to write to. Recording it in memory would let the next
    // sign-in inherit a stranger's acknowledgement.
    expect(state).toEqual(start);
    expect(effects).toEqual([]);
  });
});
