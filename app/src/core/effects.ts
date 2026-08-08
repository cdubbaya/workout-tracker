/**
 * Effects are data, not calls.
 *
 * The core returns a description of the write; a driver executes it. This is
 * what lets a test assert what *would* have been written with no database, and
 * it is the reason Supabase needs no seam of its own (spec #1).
 *
 * An effect never carries a function, a promise, or a handle. If it cannot be
 * compared with a deep equality check, it is not an effect.
 */

import type { Identity, LocalDate, Timestamp, UserId } from './events';

/**
 * Upsert the signed-in user's `profile` row. Idempotent and keyed on the user
 * id, so an at-least-once queue replaying it cannot duplicate a profile.
 */
export type PersistProfile = {
  type: 'PersistProfile';
  userId: UserId;
  email: string;
  /** The client's timestamp, which the server accepts (ADR-0010). */
  at: Timestamp;
};

/**
 * Drop everything held for the signed-out user. Emitted by the core so that
 * "what does signing out clear" is a rule with a test, rather than whatever a
 * screen's cleanup handler happens to do.
 */
export type ClearLocalState = {
  type: 'ClearLocalState';
};

export type Effect = PersistProfile | ClearLocalState;

/** Convenience for drivers and tests narrowing a collected effect list. */
export function isEffect<T extends Effect['type']>(
  effect: Effect,
  type: T,
): effect is Extract<Effect, { type: T }> {
  return effect.type === type;
}

export type { Identity, LocalDate, Timestamp, UserId };
