/**
 * The domain core: an event goes in, a new state and a list of effects come out.
 *
 * This module imports nothing from React Native, nothing from Supabase, and
 * nothing that reads a clock, a random number, or the filesystem. Its only
 * imports are its own sibling types. `src/core/__tests__/purity.test.ts`
 * enforces that rather than trusting it.
 *
 * Three rules, established here because signing in actually needs them:
 *
 * - Time is an input. Every event carries its own timestamp; day boundaries
 *   arrive as `DayRolled`.
 * - Effects are data. This returns descriptions of writes; drivers perform them.
 * - Randomness is an input. Nothing needs it yet — the rule exists so nothing
 *   later smuggles in non-determinism.
 */

import type { CoreEvent } from './events';
import type { Effect } from './effects';
import type { CoreState } from './state';

export type Outcome = {
  state: CoreState;
  effects: readonly Effect[];
};

const NO_EFFECTS: readonly Effect[] = [];

export function reduce(state: CoreState, event: CoreEvent): Outcome {
  switch (event.type) {
    case 'SignedIn':
      return {
        state: { ...state, identity: event.identity, today: event.today },
        effects: [
          {
            type: 'PersistProfile',
            userId: event.identity.userId,
            email: event.identity.email,
            at: event.at,
          },
        ],
      };

    case 'SignedOut':
      // `today` survives sign-out: the calendar did not change because a user
      // signed out, and the next sign-in carries its own day anyway.
      //
      // The acknowledgement does not. It is a property of a user rather than of
      // a phone, so handing the device over must not skip the disclaimer for
      // whoever signs in next. Cleared back to *unknown* rather than to
      // not-acknowledged, so the next user's profile is what answers.
      return {
        state: {
          ...state,
          identity: null,
          onboardingAcknowledgedAt: null,
          onboardingKnown: false,
        },
        effects: [{ type: 'ClearLocalState' }],
      };

    case 'DayRolled':
      return {
        state: { ...state, today: event.today },
        effects: NO_EFFECTS,
      };

    case 'OnboardingAcknowledged': {
      // Nobody to acknowledge for. Onboarding sits behind sign-in, so this is
      // unreachable through the UI — ignored rather than thrown, because a
      // reducer that crashed on an ordering it cannot rule out would take the
      // screen down for a rule it only needed to decline.
      if (!state.identity) {
        return { state, effects: NO_EFFECTS };
      }

      return {
        // Known too: the user just answered, so nothing needs to ask the
        // profile before showing them Home.
        state: { ...state, onboardingAcknowledgedAt: event.at, onboardingKnown: true },
        effects: [
          {
            type: 'PersistOnboardingAcknowledgement',
            userId: state.identity.userId,
            at: event.at,
          },
        ],
      };
    }

    case 'OnboardingLoaded':
      // What the profile said, adopted verbatim — including `null`, which is a
      // real answer meaning "this user has not acknowledged" and is what sends
      // a new user into onboarding.
      return {
        state: {
          ...state,
          onboardingAcknowledgedAt: event.acknowledgedAt,
          onboardingKnown: true,
        },
        effects: NO_EFFECTS,
      };

    default:
      // Later specs add events. An older reducer meeting a newer event leaves
      // state untouched rather than throwing, so adding an event never
      // requires editing an existing branch.
      return { state, effects: NO_EFFECTS };
  }
}
