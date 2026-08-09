/**
 * The core's state. Small on purpose — spec #1 is explicit that the core should
 * look almost pointless here and earn its shape in #2 and #3.
 *
 * Pose landmarks may never appear in this type. ADR-0009 is a design decision;
 * keeping the field absent makes it a structural one.
 */

import type { Identity, LocalDate, Timestamp, WriteId } from './events';

export type CoreState = {
  /** `null` when signed out. The signed-out state is a real state, not an absence. */
  identity: Identity | null;
  /**
   * The day the core currently believes it is, set by `SignedIn` and advanced
   * by `DayRolled`. `null` until a driver says otherwise — the core has no
   * clock to guess with.
   */
  today: LocalDate | null;
  /**
   * When the user acknowledged the medical disclaimer, or `null` if they have
   * not. A timestamp rather than a boolean because the disclaimer is
   * load-bearing rather than ceremonial (ADR-0007) — *when* it was accepted is
   * worth keeping, and a boolean throws that away for nothing.
   *
   * `null` covers both "signed out" and "signed in, profile has not reported
   * yet". Those are distinguished by `onboardingKnown`, not by this field: the
   * core has no way to guess, and guessing wrong shows onboarding to someone
   * who has already been through it.
   */
  onboardingAcknowledgedAt: Timestamp | null;
  /**
   * Whether `onboardingAcknowledgedAt` is an answer or an absence of one.
   *
   * False on cold start until the profile driver reports. Without it, a
   * returning user's first frame is indistinguishable from a new user's, which
   * is precisely the flash of onboarding the issue forbids.
   */
  onboardingKnown: boolean;
  /**
   * The writes the core has asked for and the server has not confirmed, in the
   * order they were asked for.
   *
   * Ids rather than the writes themselves: the queue is the durable copy, and a
   * second copy in core state would be a second thing to keep in step. What the
   * core needs is only whether anything is still owed — which is what lets a
   * later spec tell a user their Session is still on the phone.
   *
   * Cleared by `SyncAcknowledged`. A write that is redelivered after a dropped
   * acknowledgement is already absent here, so the second confirmation is a
   * no-op rather than an error.
   */
  pendingWriteIds: readonly WriteId[];
};

export const initialState: CoreState = {
  identity: null,
  today: null,
  onboardingAcknowledgedAt: null,
  onboardingKnown: false,
  pendingWriteIds: [],
};

/** Which screen the state puts the user on. */
export type Screen = 'loading' | 'sign-in' | 'onboarding' | 'home';

/**
 * Where this state belongs on screen.
 *
 * A derivation rather than a field: two sources of truth for "which screen" is
 * how a user ends up on the wrong one. It lives in the core so the rule is
 * provable without a renderer — `App` reads it instead of deciding itself.
 *
 * `loading` is a distinct answer rather than a fallback. On cold start the
 * session restores before the profile does, and treating that gap as "not
 * acknowledged" would flash the disclaimer at a returning user.
 */
export function screenFor(state: CoreState): Screen {
  if (!state.identity) {
    return 'sign-in';
  }
  if (!state.onboardingKnown) {
    return 'loading';
  }
  return state.onboardingAcknowledgedAt === null ? 'onboarding' : 'home';
}
