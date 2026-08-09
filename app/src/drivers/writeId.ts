/**
 * Where write ids come from.
 *
 * A driver rather than a core concern: an id is randomness, and the core takes
 * randomness as an input exactly as it takes time. Confining it here is what
 * lets `purity.test.ts` forbid the core from minting one, and what keeps a
 * replayed fixture deterministic — the ids arrive on the events rather than
 * being invented mid-replay.
 *
 * The id is the whole idempotency story. The server keys on it, so two acts
 * sharing one id means the second is silently discarded, and one act minting
 * two ids across a retry means it is counted twice.
 */

import type { WriteId } from '../core/events';

/** Mints the next id. Injected wherever a write is raised. */
export type NextWriteId = () => WriteId;

/**
 * A generator whose ids do not repeat, within a run or across a restart.
 *
 * Two parts, and both are needed. The counter guarantees that ids minted in one
 * run are distinct even when they land in the same millisecond — a loop is
 * faster than the clock. The random prefix guarantees the same across runs,
 * where the counter restarts at zero and a device clock may not have moved.
 *
 * `Math.random` rather than `crypto.randomUUID`: the id has to be unique among
 * this user's own writes, not unguessable — it is a deduplication key behind
 * row-level security, never a capability. A user forging another user's write
 * id is refused by the RLS policy, not by the entropy here.
 */
export function createWriteIds(): NextWriteId {
  const run = Math.random().toString(36).slice(2, 10);
  let count = 0;

  return () => {
    count += 1;
    return `${run}-${count}`;
  };
}
