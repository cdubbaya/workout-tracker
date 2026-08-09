/**
 * The durable write queue.
 *
 * The claim under test is the one the core cannot make, because the core does
 * not know the queue exists: a write survives the process being killed, not
 * merely backgrounded.
 *
 * Process death is modelled by throwing away the queue object and building a
 * new one over the same storage. That is exactly what a cold start is — every
 * field, closure and in-flight promise gone, and nothing left but what reached
 * disk. A test that reused the instance would prove only that a variable still
 * held its value.
 *
 * The storage double is a real key-value map behind the same narrow interface
 * `AsyncStorage` exposes, returning `string | null` from `getItem` as the real
 * one does — a double that handed back parsed objects would go green over code
 * that crashes on a device.
 */

import type { QueuedWrite } from '../../core/effects';
import { createWriteQueue, type WriteStorage } from '../queue';

/**
 * A key-value store that survives its owner, so a "restart" can be modelled by
 * dropping the queue and keeping this.
 */
function aStorage(): WriteStorage & { failNextWrite: () => void } {
  const items = new Map<string, string>();
  let failWrite = false;

  return {
    async getItem(key: string): Promise<string | null> {
      // `null`, not `undefined`: what the real AsyncStorage returns for a key
      // that is not there.
      return items.has(key) ? (items.get(key) as string) : null;
    },
    async setItem(key: string, value: string): Promise<void> {
      if (failWrite) {
        failWrite = false;
        throw new Error('storage full');
      }
      items.set(key, value);
    },
    failNextWrite() {
      failWrite = true;
    },
  };
}

const profileWrite = (writeId: string, email: string): QueuedWrite => ({
  type: 'PersistProfile',
  writeId,
  userId: 'user-ada-1',
  email,
  at: 1_700_000_000_000,
});

const acknowledgementWrite = (writeId: string, at: number): QueuedWrite => ({
  type: 'PersistOnboardingAcknowledgement',
  writeId,
  userId: 'user-ada-1',
  at,
});

describe('A write made offline', () => {
  it('survives the process being killed', async () => {
    const storage = aStorage();

    const before = createWriteQueue(storage);
    await before.enqueue(profileWrite('write-1', 'ada@example.com'));

    // The process dies here. Nothing of `before` carries over — a new queue
    // over the same storage is all a cold start has.
    const after = createWriteQueue(storage);

    expect(await after.pending()).toEqual([profileWrite('write-1', 'ada@example.com')]);
  });

  it('survives with the timestamp of the act, not of the restart', async () => {
    // Multi-day offline periods sync with the times things actually happened.
    // The payload is stored whole, so the timestamp that comes back out is the
    // one the event carried however long ago.
    const happenedAt = 1_600_000_000_000;
    const storage = aStorage();

    await createWriteQueue(storage).enqueue(acknowledgementWrite('write-1', happenedAt));

    const [restored] = await createWriteQueue(storage).pending();

    expect(restored).toEqual(acknowledgementWrite('write-1', happenedAt));
  });

  it('keeps several writes in the order they were made', async () => {
    const storage = aStorage();
    const queue = createWriteQueue(storage);

    await queue.enqueue(profileWrite('write-1', 'ada@example.com'));
    await queue.enqueue(acknowledgementWrite('write-2', 1_700_000_050_000));

    // Order is the record of what happened. A queue that reordered would sync
    // an acknowledgement before the profile row it belongs to exists.
    expect((await createWriteQueue(storage).pending()).map((w) => w.writeId)).toEqual([
      'write-1',
      'write-2',
    ]);
  });
});

describe('Enqueuing the same write twice', () => {
  it('keeps one copy, keyed on the client-generated id', async () => {
    const storage = aStorage();
    const queue = createWriteQueue(storage);

    await queue.enqueue(profileWrite('write-1', 'ada@example.com'));
    await queue.enqueue(profileWrite('write-1', 'ada@example.com'));

    // The id is the identity of the write. A React effect that ran twice, or a
    // retry that re-enqueued, must not produce two deliveries.
    expect(await queue.pending()).toHaveLength(1);
  });

  it('distinguishes two genuinely different writes', async () => {
    const storage = aStorage();
    const queue = createWriteQueue(storage);

    await queue.enqueue(profileWrite('write-1', 'ada@example.com'));
    await queue.enqueue(profileWrite('write-2', 'grace@example.com'));

    // Guards the over-correction: deduplicating on the payload rather than on
    // the id would collapse two real writes into one.
    expect(await queue.pending()).toHaveLength(2);
  });
});

describe('Acknowledging a write', () => {
  it('removes it durably, so a restart does not resurrect it', async () => {
    const storage = aStorage();
    const queue = createWriteQueue(storage);
    await queue.enqueue(profileWrite('write-1', 'ada@example.com'));

    await queue.acknowledge(['write-1']);

    // The duplicate this guards: an acknowledgement held only in memory means
    // the next cold start finds the write still queued and sends it again.
    expect(await createWriteQueue(storage).pending()).toEqual([]);
  });

  it('leaves the writes it did not name', async () => {
    const storage = aStorage();
    const queue = createWriteQueue(storage);
    await queue.enqueue(profileWrite('write-1', 'ada@example.com'));
    await queue.enqueue(acknowledgementWrite('write-2', 1_700_000_050_000));

    await queue.acknowledge(['write-1']);

    expect((await queue.pending()).map((w) => w.writeId)).toEqual(['write-2']);
  });

  it('is idempotent — a redelivered acknowledgement is not an error', async () => {
    const storage = aStorage();
    const queue = createWriteQueue(storage);
    await queue.enqueue(profileWrite('write-1', 'ada@example.com'));

    await queue.acknowledge(['write-1']);
    await queue.acknowledge(['write-1']);

    expect(await queue.pending()).toEqual([]);
  });

  it('ignores an id it never held', async () => {
    const storage = aStorage();
    const queue = createWriteQueue(storage);
    await queue.enqueue(profileWrite('write-1', 'ada@example.com'));

    await queue.acknowledge(['write-never-queued']);

    expect((await queue.pending()).map((w) => w.writeId)).toEqual(['write-1']);
  });
});

describe('Clearing local state, when a user signs out or deletes their account', () => {
  const deletionWrite = (writeId: string): QueuedWrite => ({
    type: 'DeleteAccount',
    writeId,
    userId: 'user-ada-1',
    at: 1_700_000_300_000,
  });

  it('drops the previous user writes, so handing the phone over hands over nothing', async () => {
    const storage = aStorage();
    const queue = createWriteQueue(storage);
    await queue.enqueue(profileWrite('write-1', 'ada@example.com'));
    await queue.enqueue(acknowledgementWrite('write-2', 1_700_000_000_000));

    await queue.clear();

    // Durably, not merely in this instance: a queue that cleared in memory
    // would hand the next user the previous one's writes on the next cold start.
    expect(await createWriteQueue(storage).pending()).toEqual([]);
  });

  it('keeps a pending deletion, which is the one write that outlives its user', async () => {
    // The trap. Deleting an account emits `DeleteAccount` *and*
    // `ClearLocalState`, so a clear that took everything would erase the
    // deletion before it was ever delivered — and a user who deleted their
    // account with no signal would stay in the database forever, with nothing
    // left on the phone to retry it.
    const storage = aStorage();
    const queue = createWriteQueue(storage);
    await queue.enqueue(profileWrite('write-1', 'ada@example.com'));
    await queue.enqueue(deletionWrite('write-delete'));

    await queue.clear();

    const remaining = await createWriteQueue(storage).pending();
    expect(remaining.map((write) => write.writeId)).toEqual(['write-delete']);
  });
});

describe('A write the storage refused', () => {
  it('is not silently dropped — the caller learns it did not land', async () => {
    const storage = aStorage();
    const queue = createWriteQueue(storage);
    storage.failNextWrite();

    // A queue that swallowed the failure would report a durable write that is
    // nowhere, which is the exact loss the whole ticket exists to prevent.
    await expect(queue.enqueue(profileWrite('write-1', 'ada@example.com'))).rejects.toThrow();
  });
});

describe('Corrupt stored data', () => {
  it('does not take the app down on cold start', async () => {
    const storage = aStorage();
    await storage.setItem('pushup.write-queue.v1', 'not json{');

    // A crash loop on launch is worse than a lost queue: the user cannot even
    // get to the camera. Recoverable rather than fatal.
    await expect(createWriteQueue(storage).pending()).resolves.toEqual([]);
  });
});
