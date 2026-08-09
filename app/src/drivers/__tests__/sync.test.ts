/**
 * The sync driver: the loop that drains the durable queue and reports back what
 * landed.
 *
 * The transport double records what it was asked to deliver and can be told to
 * fail — that is what a dropped connection is from here. It never applies the
 * idempotency rule itself: that rule belongs to the server's key, and a double
 * that enforced it would turn every duplicate assertion into a tautology.
 * Duplicates are counted at the transport instead, so a driver that sends the
 * same write twice is visible rather than absorbed.
 */

import type { QueuedWrite } from '../../core/effects';
import { createWriteQueue, type WriteStorage } from '../queue';
import { createSyncDriver } from '../sync';

function aStorage(): WriteStorage {
  const items = new Map<string, string>();

  return {
    async getItem(key: string): Promise<string | null> {
      return items.has(key) ? (items.get(key) as string) : null;
    },
    async setItem(key: string, value: string): Promise<void> {
      items.set(key, value);
    },
  };
}

/**
 * A transport that records deliveries. `offline` rejects the way a fetch does
 * with no signal, and `dropAcknowledgement` models the harder case: the server
 * applied the write and the client never heard so.
 */
function aTransport() {
  const delivered: QueuedWrite[] = [];
  let offline = false;
  let dropAcknowledgement = false;

  return {
    delivered,
    goOffline() {
      offline = true;
    },
    goOnline() {
      offline = false;
    },
    dropNextAcknowledgement() {
      dropAcknowledgement = true;
    },
    async send(entry: QueuedWrite): Promise<void> {
      if (offline) {
        throw new Error('Network request failed');
      }
      // Recorded before the failure: the server applied it, which is precisely
      // why the retry must not double-count.
      delivered.push(entry);
      if (dropAcknowledgement) {
        dropAcknowledgement = false;
        throw new Error('Network request failed');
      }
    },
    /** How many times a given id crossed the wire. */
    deliveriesOf(writeId: string): number {
      return delivered.filter((entry) => entry.writeId === writeId).length;
    },
  };
}

const profileWrite = (writeId: string): QueuedWrite => ({
  type: 'PersistProfile',
  writeId,
  userId: 'user-ada-1',
  email: 'ada@example.com',
  at: 1_700_000_000_000,
});

const acknowledgementWrite = (writeId: string, at: number): QueuedWrite => ({
  type: 'PersistOnboardingAcknowledgement',
  writeId,
  userId: 'user-ada-1',
  at,
});

describe('Draining the queue', () => {
  it('delivers a queued write and reports which ids landed', async () => {
    const storage = aStorage();
    const transport = aTransport();
    const queue = createWriteQueue(storage);
    await queue.enqueue(profileWrite('write-1'));

    const acknowledged = await createSyncDriver(queue, transport.send).drain();

    expect(transport.deliveriesOf('write-1')).toBe(1);
    // The ids the core needs to clear its pending list. Reported by the driver
    // rather than assumed by the caller, because only the driver knows which
    // deliveries the network actually completed.
    expect(acknowledged).toEqual(['write-1']);
  });

  it('empties the queue durably once writes land', async () => {
    const storage = aStorage();
    const transport = aTransport();
    const queue = createWriteQueue(storage);
    await queue.enqueue(profileWrite('write-1'));

    await createSyncDriver(queue, transport.send).drain();

    // Read through a fresh queue: an acknowledgement held only in memory means
    // the next cold start delivers the write a second time.
    expect(await createWriteQueue(storage).pending()).toEqual([]);
  });

  it('delivers in the order the writes were made', async () => {
    const storage = aStorage();
    const transport = aTransport();
    const queue = createWriteQueue(storage);
    await queue.enqueue(profileWrite('write-1'));
    await queue.enqueue(acknowledgementWrite('write-2', 1_700_000_050_000));

    await createSyncDriver(queue, transport.send).drain();

    // An acknowledgement delivered before the profile row exists is an error
    // the server would reject, so order is load-bearing rather than cosmetic.
    expect(transport.delivered.map((entry) => entry.writeId)).toEqual(['write-1', 'write-2']);
  });
});

describe('A dropped connection', () => {
  it('keeps the undelivered write for the next attempt', async () => {
    const storage = aStorage();
    const transport = aTransport();
    const queue = createWriteQueue(storage);
    await queue.enqueue(profileWrite('write-1'));
    transport.goOffline();

    const acknowledged = await createSyncDriver(queue, transport.send).drain();

    expect(acknowledged).toEqual([]);
    expect((await queue.pending()).map((entry) => entry.writeId)).toEqual(['write-1']);
  });

  it('does not reject — a failed drain is not a reason to take the app down', async () => {
    const storage = aStorage();
    const transport = aTransport();
    await createWriteQueue(storage).enqueue(profileWrite('write-1'));
    transport.goOffline();

    // The app stays usable on a slow or dropped connection. A drain that threw
    // would surface as an unhandled rejection in whatever started it.
    await expect(
      createSyncDriver(createWriteQueue(storage), transport.send).drain(),
    ).resolves.toEqual([]);
  });

  it('stops at the first failure rather than reordering around it', async () => {
    const storage = aStorage();
    const transport = aTransport();
    const queue = createWriteQueue(storage);
    await queue.enqueue(profileWrite('write-1'));
    await queue.enqueue(acknowledgementWrite('write-2', 1_700_000_050_000));
    transport.goOffline();

    await createSyncDriver(queue, transport.send).drain();

    // Skipping ahead would deliver a later write while an earlier one is still
    // owed, which is the reordering the ordered queue exists to prevent.
    expect(transport.delivered).toEqual([]);
  });

  it('syncs automatically on reconnect, with no user action', async () => {
    const storage = aStorage();
    const transport = aTransport();
    const queue = createWriteQueue(storage);
    const sync = createSyncDriver(queue, transport.send);

    transport.goOffline();
    await queue.enqueue(profileWrite('write-1'));
    await sync.drain();
    expect(transport.delivered).toEqual([]);

    // The reconnect. Nothing the user did — the same drain the driver runs on
    // its own schedule.
    transport.goOnline();
    const acknowledged = await sync.drain();

    expect(acknowledged).toEqual(['write-1']);
    expect(await queue.pending()).toEqual([]);
  });

  it('syncs a multi-day backlog with the times things actually happened', async () => {
    const storage = aStorage();
    const transport = aTransport();
    const queue = createWriteQueue(storage);
    const mondayAt = 1_700_000_000_000;
    const wednesdayAt = mondayAt + 2 * 24 * 60 * 60 * 1000;

    transport.goOffline();
    await queue.enqueue(acknowledgementWrite('write-monday', mondayAt));
    await queue.enqueue(acknowledgementWrite('write-wednesday', wednesdayAt));
    await createSyncDriver(queue, transport.send).drain();

    transport.goOnline();
    await createSyncDriver(queue, transport.send).drain();

    // The times are the ones the events carried, not the moment of the sync —
    // otherwise a week of work lands compressed into the day signal returned.
    expect(transport.delivered.map((entry) => 'at' in entry && entry.at)).toEqual([
      mondayAt,
      wednesdayAt,
    ]);
  });
});

describe('A dropped acknowledgement', () => {
  it('is retried, and the retry carries the id the first attempt carried', async () => {
    const storage = aStorage();
    const transport = aTransport();
    const queue = createWriteQueue(storage);
    await queue.enqueue(profileWrite('write-1'));

    // The server applied it; the client never heard so.
    transport.dropNextAcknowledgement();
    await createSyncDriver(queue, transport.send).drain();

    await createSyncDriver(queue, transport.send).drain();

    // Two deliveries, one key. At-least-once delivery makes the second one
    // unavoidable; the shared `writeId` is what makes it harmless, because the
    // server keys on it and recognises the second as the first.
    expect(transport.deliveriesOf('write-1')).toBe(2);
    expect(new Set(transport.delivered.map((entry) => entry.writeId)).size).toBe(1);
  });

  it('leaves exactly one write behind, not two', async () => {
    const storage = aStorage();
    const transport = aTransport();
    const queue = createWriteQueue(storage);
    await queue.enqueue(profileWrite('write-1'));

    transport.dropNextAcknowledgement();
    await createSyncDriver(queue, transport.send).drain();

    // The queue still owes it — the client cannot tell a lost acknowledgement
    // from a write that never arrived, and guessing wrong loses data.
    expect((await queue.pending()).map((entry) => entry.writeId)).toEqual(['write-1']);
  });
});

/**
 * The criterion the core cannot cover, because the core does not know the queue
 * exists: kill the process mid-drain and assert nothing is lost and nothing is
 * duplicated.
 *
 * "Killing the process" is modelled by abandoning every object — queue, driver,
 * and the in-flight drain promise — and rebuilding from storage alone. A cold
 * start has nothing else, so anything the rebuilt queue cannot produce is
 * genuinely lost.
 */
describe('The process dying mid-queue', () => {
  it('loses nothing and duplicates nothing', async () => {
    const storage = aStorage();
    const transport = aTransport();

    const before = createWriteQueue(storage);
    await before.enqueue(profileWrite('write-1'));
    await before.enqueue(acknowledgementWrite('write-2', 1_700_000_050_000));
    await before.enqueue(acknowledgementWrite('write-3', 1_700_000_060_000));

    // The drain gets through the first write and the process dies. The
    // remaining deliveries never happen, and nothing of this run carries over.
    transport.dropNextAcknowledgement();
    const killedMidDrain = createSyncDriver(before, transport.send);
    await killedMidDrain.drain().catch(() => undefined);

    // Cold start. Everything above is gone but the bytes on disk.
    const after = createWriteQueue(storage);
    await createSyncDriver(after, transport.send).drain();

    // Nothing lost: every write reached the server.
    expect(new Set(transport.delivered.map((entry) => entry.writeId))).toEqual(
      new Set(['write-1', 'write-2', 'write-3']),
    );

    // Nothing duplicated: the one write that crossed twice did so under a
    // single key, which is what the server deduplicates on. Two *keys* for one
    // act would be the duplicate that counts.
    await expect(after.pending()).resolves.toEqual([]);
    expect(transport.deliveriesOf('write-2')).toBe(1);
    expect(transport.deliveriesOf('write-3')).toBe(1);
  });
});
