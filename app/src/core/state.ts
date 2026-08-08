/**
 * The core's state. Small on purpose — spec #1 is explicit that the core should
 * look almost pointless here and earn its shape in #2 and #3.
 *
 * Pose landmarks may never appear in this type. ADR-0009 is a design decision;
 * keeping the field absent makes it a structural one.
 */

import type { Identity, LocalDate } from './events';

export type CoreState = {
  /** `null` when signed out. The signed-out state is a real state, not an absence. */
  identity: Identity | null;
  /**
   * The day the core currently believes it is, set by `SignedIn` and advanced
   * by `DayRolled`. `null` until a driver says otherwise — the core has no
   * clock to guess with.
   */
  today: LocalDate | null;
};

export const initialState: CoreState = {
  identity: null,
  today: null,
};
