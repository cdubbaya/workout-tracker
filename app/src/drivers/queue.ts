/**
 * The durable write queue.
 *
 * Every effect that crosses the network goes in here before it is attempted,
 * and leaves only once the server has confirmed it. That ordering is the whole
 * guarantee: a write is on disk before anything can lose it, so the window in
 * which a crash costs a Session is the one between the user's tap and the
 * `await` below, rather than the minutes the phone spends without a signal.
 *
 * **Durability means across process termination, not merely backgrounding.** A
 * queue held in a module-level array satisfies every test that keeps the same
 * process alive and loses everything the first time iOS reclaims the app. So
 * the queue holds no writes in memory at all — `pending` reads storage, and
 * every mutation writes it back before resolving. A cold start therefore
 * inherits the truth rather than a copy of it.
 *
 * Sync is at-least-once with idempotent writes keyed on `writeId` (ADR-0010),
 * which is what makes the failure mode of that choice harmless: an
 * acknowledgement lost on the way back means the write is delivered twice, and
 * the server recognises the second delivery as the first.
 */

import type { QueuedWrite } from '../core/effects';
import type { WriteId } from '../core/events';

/**
 * The slice of `AsyncStorage` this needs.
 *
 * Narrow on purpose: a driver that took the whole module could not be driven
 * by a test without a native runtime, and the queue uses three of its methods.
 * Shaped from the real interface — `getItem` resolves `string | null`, exactly
 * as AsyncStorage does for a key that is absent.
 */
export type WriteStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

/**
 * Versioned, so a later spec that changes the stored shape can recognise the
 * old one rather than silently misreading it.
 */
export const QUEUE_STORAGE_KEY = 'pushup.write-queue.v1';

export type WriteQueue = {
  /**
   * Put a write on disk. Resolves once it is durable, and rejects if it is
   * not — a caller that was told the write landed when it did not is the loss
   * this module exists to prevent.
   *
   * Enqueuing a `writeId` already held is a no-op, so a React effect that ran
   * twice cannot produce two deliveries.
   */
  enqueue: (write: QueuedWrite) => Promise<void>;
  /** Everything still owed, oldest first. Read from storage, never from memory. */
  pending: () => Promise<QueuedWrite[]>;
  /**
   * Drop the writes the server confirmed. Ids it never held are ignored, so a
   * redelivered acknowledgement is not an error.
   */
  acknowledge: (writeIds: readonly WriteId[]) => Promise<void>;
};

/**
 * Read what is on disk.
 *
 * Corrupt data resolves to an empty queue rather than throwing. A crash on
 * launch is worse than a lost queue — the user cannot reach the camera at all —
 * and there is no repair a parse failure leaves available.
 */
async function read(storage: WriteStorage): Promise<QueuedWrite[]> {
  const raw = await storage.getItem(QUEUE_STORAGE_KEY);
  if (raw === null) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedWrite[]) : [];
  } catch {
    return [];
  }
}

async function write(storage: WriteStorage, writes: readonly QueuedWrite[]): Promise<void> {
  // No `catch`. A storage failure propagates to the caller, because a write
  // reported as durable and held nowhere is the loss this module prevents.
  await storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(writes));
}

export function createWriteQueue(storage: WriteStorage): WriteQueue {
  /**
   * Mutations run one at a time.
   *
   * Read-modify-write over shared storage: two concurrent enqueues that both
   * read the same list would each write their own version back, and the later
   * one would erase the earlier write. Chaining on a promise rather than
   * reaching for a lock library keeps the ordering explicit and the module
   * dependency-free.
   */
  let tail: Promise<unknown> = Promise.resolve();

  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(operation);
    // Swallow only for the *chain*: a rejection still reaches the caller
    // through `result`, but must not poison every operation queued behind it.
    tail = result.catch(() => undefined);
    return result;
  }

  return {
    enqueue(entry: QueuedWrite): Promise<void> {
      return serialize(async () => {
        const writes = await read(storage);

        // Keyed on the id rather than on the payload: two sign-ins by the same
        // user are two writes, and collapsing them on equality would lose one.
        if (writes.some((existing) => existing.writeId === entry.writeId)) {
          return;
        }

        await write(storage, [...writes, entry]);
      });
    },

    pending(): Promise<QueuedWrite[]> {
      return serialize(() => read(storage));
    },

    acknowledge(writeIds: readonly WriteId[]): Promise<void> {
      return serialize(async () => {
        const landed = new Set(writeIds);
        const writes = await read(storage);
        const remaining = writes.filter((entry) => !landed.has(entry.writeId));

        // Nothing to do beats a write that rewrites the same bytes: an
        // acknowledgement for an id already gone is the common case under
        // at-least-once delivery.
        if (remaining.length === writes.length) {
          return;
        }

        await write(storage, remaining);
      });
    },
  };
}
