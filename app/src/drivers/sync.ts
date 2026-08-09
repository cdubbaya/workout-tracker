/**
 * The sync driver: drain the durable queue, report what landed.
 *
 * It holds no rules. Deciding what a write *means* belongs to the core; this
 * module decides only when to try and what to do when the network says no —
 * which is why "the app stays usable on a dropped connection" is a property of
 * this file rather than something every screen has to remember.
 *
 * Delivery is at-least-once (ADR-0010). A write leaves the queue only after the
 * server confirms it, so an acknowledgement lost on the way back means the
 * write is delivered a second time. That is the intended trade: the alternative
 * — dropping it on an ambiguous failure — loses data, and the shared `writeId`
 * makes the duplicate harmless because the server keys on it.
 */

import type { QueuedWrite } from '../core/effects';
import type { WriteId } from '../core/events';

import type { WriteQueue } from './queue';

/** Deliver one write. Rejects when the network or the server refuses it. */
export type SendWrite = (write: QueuedWrite) => Promise<void>;

export type SyncDriver = {
  /**
   * Deliver everything owed, oldest first, and return the ids the server
   * confirmed — what `SyncAcknowledged` carries into the core.
   *
   * Never rejects. A drain that threw would surface as an unhandled rejection
   * in whatever scheduled it, and a network failure is the expected case here
   * rather than an exceptional one.
   */
  drain: () => Promise<WriteId[]>;
  /**
   * Drain on an interval until the returned function is called.
   *
   * Polling rather than a reachability listener: the question "can I reach the
   * server" is only truthfully answered by trying, and a driver that trusted a
   * connectivity flag would sit idle on a captive portal that reports itself as
   * online. Shaped like `clock.start` so both schedulers are read the same way.
   */
  start: (onAcknowledged: (writeIds: WriteId[]) => void) => () => void;
};

/**
 * How often to retry. Frequent enough that a reconnect syncs before the user
 * notices, rare enough to cost nothing on a phone that is simply offline.
 */
export const SYNC_POLL_INTERVAL_MS = 15_000;

export function createSyncDriver(
  queue: WriteQueue,
  send: SendWrite,
  intervalMs: number = SYNC_POLL_INTERVAL_MS,
): SyncDriver {
  /**
   * One drain at a time. Two overlapping drains would read the same pending
   * list and deliver every write twice — harmless to the server, which keys on
   * `writeId`, but wasted bandwidth on exactly the connection that is already
   * struggling.
   */
  let draining: Promise<WriteId[]> | null = null;

  async function drainOnce(): Promise<WriteId[]> {
    const pending = await queue.pending();
    const acknowledged: WriteId[] = [];

    for (const entry of pending) {
      try {
        await send(entry);
      } catch {
        // Stop rather than skip. The writes behind this one are later than it,
        // and delivering them while an earlier write is still owed would put
        // the server's view of events out of the order they happened in.
        break;
      }
      acknowledged.push(entry.writeId);
    }

    if (acknowledged.length > 0) {
      // Only after the server confirmed. Removing before would turn a dropped
      // response into a lost write, which is the failure the queue exists to
      // rule out — the duplicate delivery it costs instead is one the
      // `writeId` absorbs.
      await queue.acknowledge(acknowledged);
    }

    return acknowledged;
  }

  function drain(): Promise<WriteId[]> {
    if (draining) {
      return draining;
    }

    const run = drainOnce()
      // A storage failure is as unexceptional as a network one here, and a
      // rejection escaping into an interval callback has nowhere to be caught.
      .catch(() => [] as WriteId[])
      .finally(() => {
        draining = null;
      });

    draining = run;
    return run;
  }

  function start(onAcknowledged: (writeIds: WriteId[]) => void) {
    const attempt = () => {
      void drain().then((writeIds) => {
        // Silence when nothing landed: an empty `SyncAcknowledged` every
        // interval would be a state update per tick for no news.
        if (writeIds.length > 0) {
          onAcknowledged(writeIds);
        }
      });
    };

    // Immediately, then on the interval. A cold start with a backlog should not
    // wait out a full period before trying — that is the reconnect a user
    // notices.
    attempt();
    const handle = setInterval(attempt, intervalMs);

    return () => clearInterval(handle);
  }

  return { drain, start };
}
