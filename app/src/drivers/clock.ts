/**
 * The clock driver. The only module in the app permitted to ask what time it is.
 *
 * It watches for the local day changing and raises `DayRolled`. Its first real
 * consumer is the Daily Budget in spec #3; it ships here because the rule it
 * encodes — time is an input, never a read — is established here.
 *
 * Confining the ambient clock to this one module is also what makes the
 * server-authoritative-time upgrade named in ADR-0010 a driver swap rather than
 * an audit of the whole codebase.
 */

import type { DayRolled, LocalDate, Timestamp } from '../core/events';

import { localDayOf } from './auth';

/** Injected so a test can advance time without waiting for it. */
export type Now = () => Timestamp;

export type ClockDriver = {
  /**
   * Compare the current day against `lastKnownDay` and return the event if it
   * changed. `null` means the day is unchanged and there is nothing to raise.
   */
  poll: (lastKnownDay: LocalDate | null) => DayRolled | null;
  /** Poll on an interval, emitting events until the returned function is called. */
  start: (
    lastKnownDay: () => LocalDate | null,
    emit: (event: DayRolled) => void,
  ) => () => void;
};

/** How often to check. A minute is far below a day and cheap enough to ignore. */
export const DAY_POLL_INTERVAL_MS = 60_000;

export function createClockDriver(
  now: Now = () => Date.now(),
  intervalMs: number = DAY_POLL_INTERVAL_MS,
): ClockDriver {
  function poll(lastKnownDay: LocalDate | null): DayRolled | null {
    const at = now();
    const today = localDayOf(at);

    // A first observation is not a roll: the core adopts its day from
    // `SignedIn`, and announcing a roll here would claim a boundary was
    // crossed when nothing was crossed.
    if (lastKnownDay === null || today === lastKnownDay) {
      return null;
    }

    return { type: 'DayRolled', at, today };
  }

  function start(lastKnownDay: () => LocalDate | null, emit: (event: DayRolled) => void) {
    const handle = setInterval(() => {
      const event = poll(lastKnownDay());
      if (event) {
        emit(event);
      }
    }, intervalMs);

    return () => clearInterval(handle);
  }

  return { poll, start };
}
