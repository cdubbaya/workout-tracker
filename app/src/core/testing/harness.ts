/**
 * The test harness every later spec consumes.
 *
 * Two pieces, both named as deliverables by spec #1:
 *
 * - `aState` builds an arbitrary starting state directly, so a test that needs
 *   day 200 of a Streak does not replay 200 days of events.
 * - `drive` applies a list of events and collects every effect emitted along
 *   the way, so a test can assert on effects from the middle of a sequence
 *   rather than only the last step.
 *
 * Tests drive the core through its event interface and assert state and
 * effects. Renaming anything inside the core while preserving its behaviour
 * must not break a test — that property is the whole reason for the seam, so
 * nothing here reaches for an internal function or a private field.
 *
 * Lives outside `__tests__/` because later specs import it as a deliverable —
 * and because a helper module sitting among the test files is a suite jest
 * tries, and fails, to run.
 */

import { reduce } from '../reduce';
import { initialState, type CoreState } from '../state';
import type { CoreEvent } from '../events';
import type { Effect } from '../effects';

/**
 * Build a starting state without replaying history. Defaults to the real
 * `initialState` so a test names only what it cares about.
 */
export function aState(overrides: Partial<CoreState> = {}): CoreState {
  return { ...initialState, ...overrides };
}

export type DriveResult = {
  state: CoreState;
  /** Every effect emitted across the whole event list, in order. */
  effects: Effect[];
};

/**
 * Apply events in order, threading state through and accumulating effects.
 *
 * Deliberately a plain synchronous fold: no emulator, no database, no camera,
 * no async. If driving the core ever needs to await something, the core has
 * stopped being pure and that is the bug.
 */
export function drive(state: CoreState, events: readonly CoreEvent[]): DriveResult {
  return events.reduce<DriveResult>(
    (acc, event) => {
      const next = reduce(acc.state, event);
      return {
        state: next.state,
        effects: [...acc.effects, ...next.effects],
      };
    },
    { state, effects: [] },
  );
}
