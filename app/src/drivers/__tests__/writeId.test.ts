/**
 * Where write ids come from.
 *
 * A driver concern rather than a core one: an id is randomness, and the core
 * takes randomness as an input exactly as it takes time. `purity.test.ts`
 * enforces that the core cannot mint one.
 */

import { createWriteIds } from '../writeId';

describe('A generated write id', () => {
  it('differs from the last one, so two writes are two writes', () => {
    const nextWriteId = createWriteIds();

    // Collapsing two acts into one id would make the server treat the second
    // as a redelivery of the first and silently discard it.
    expect(nextWriteId()).not.toBe(nextWriteId());
  });

  it('stays distinct across a hundred writes', () => {
    const nextWriteId = createWriteIds();

    const ids = Array.from({ length: 100 }, nextWriteId);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not repeat across a restart', () => {
    // The queue outlives the process, so an id space that restarted with it
    // would let a fresh run mint a key the server has already applied — and
    // that write would be swallowed as a duplicate.
    const beforeRestart = Array.from({ length: 20 }, createWriteIds());
    const afterRestart = Array.from({ length: 20 }, createWriteIds());

    expect(new Set([...beforeRestart, ...afterRestart]).size).toBe(40);
  });

  it('is a string the server can key on', () => {
    // Stored as JSON and used as a database key, so it has to survive a
    // round trip as a plain scalar.
    const id = createWriteIds()();

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(id))).toBe(id);
  });
});
