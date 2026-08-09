/**
 * The core's half of the offline write queue, tested through the event
 * interface only. No storage, no network, no async — everything here is the
 * rule, and the durability that carries it lives in the driver suite.
 *
 * These assert the acceptance criteria of issue #11 that the core owns:
 * writes keyed on a client-generated id, `SyncAcknowledged`, and
 * `RemoteStateLoaded`.
 */

import { drive, aState } from '../testing/harness';
import { initialState } from '../state';
import type { CoreEvent, Identity } from '../events';

const ada: Identity = { userId: 'user-ada-1', email: 'ada@example.com' };

const signIn = (
  identity: Identity,
  at: number,
  today: string,
  writeId: string,
): CoreEvent => ({ type: 'SignedIn', at, identity, today, writeId });

describe('A write the core asks for', () => {
  it('is keyed on the client-generated id the event carried', () => {
    const at = 1_700_000_000_000;

    const { effects } = drive(initialState, [signIn(ada, at, '2026-08-07', 'write-sign-in-1')]);

    // The id is what makes an at-least-once queue safe: a retry after a
    // dropped acknowledgement carries the same key, so the server recognises
    // the second delivery as the first one.
    //
    // Carried in on the event rather than generated here, because the core has
    // no randomness source — `purity.test.ts` enforces that.
    expect(effects).toEqual([
      {
        type: 'PersistProfile',
        writeId: 'write-sign-in-1',
        userId: ada.userId,
        email: ada.email,
        at,
      },
    ]);
  });

  it('takes its id from the event rather than deriving one', () => {
    // Two sign-ins by the same user at the same instant are two writes. A core
    // that derived the key from the payload would collapse them, and a retry
    // would be indistinguishable from a genuine second write.
    const at = 1_700_000_000_000;

    const { effects } = drive(initialState, [
      signIn(ada, at, '2026-08-07', 'write-a'),
      signIn(ada, at, '2026-08-07', 'write-b'),
    ]);

    expect(effects.map((effect) => 'writeId' in effect && effect.writeId)).toEqual([
      'write-a',
      'write-b',
    ]);
  });

  it('carries the timestamp of the act, not of the sync', () => {
    // Multi-day offline periods sync with the times things actually happened.
    // The effect is built when the event arrives, so the timestamp on it is
    // the moment of the act — whenever the queue eventually drains it.
    const happenedAt = 1_700_000_000_000;

    const { effects } = drive(aState({ identity: ada, onboardingKnown: true }), [
      { type: 'OnboardingAcknowledged', at: happenedAt, writeId: 'write-ack-1' },
    ]);

    expect(effects).toEqual([
      {
        type: 'PersistOnboardingAcknowledgement',
        writeId: 'write-ack-1',
        userId: ada.userId,
        at: happenedAt,
      },
    ]);
  });
});

describe('SyncAcknowledged', () => {
  it('clears the writes the server confirmed', () => {
    const { state } = drive(initialState, [
      signIn(ada, 1_700_000_000_000, '2026-08-07', 'write-sign-in-1'),
      { type: 'OnboardingAcknowledged', at: 1_700_000_050_000, writeId: 'write-ack-1' },
      {
        type: 'SyncAcknowledged',
        at: 1_700_000_100_000,
        writeIds: ['write-sign-in-1', 'write-ack-1'],
      },
    ]);

    // Until the server confirms, a write the core asked for is a request. This
    // is the event that turns it into a fact.
    expect(state.pendingWriteIds).toEqual([]);
  });

  it('leaves a write it did not name still pending', () => {
    const { state } = drive(initialState, [
      signIn(ada, 1_700_000_000_000, '2026-08-07', 'write-sign-in-1'),
      { type: 'OnboardingAcknowledged', at: 1_700_000_050_000, writeId: 'write-ack-1' },
      { type: 'SyncAcknowledged', at: 1_700_000_100_000, writeIds: ['write-sign-in-1'] },
    ]);

    // A partial drain is the normal case on a dropped connection: the batch
    // stops where the signal did, and what it did not reach is still owed.
    expect(state.pendingWriteIds).toEqual(['write-ack-1']);
  });

  it('is idempotent — acknowledging a write twice is not an error', () => {
    const acknowledgeTwice = [
      { type: 'SyncAcknowledged', at: 1_700_000_100_000, writeIds: ['write-sign-in-1'] },
      { type: 'SyncAcknowledged', at: 1_700_000_200_000, writeIds: ['write-sign-in-1'] },
    ] as const;

    const { state } = drive(initialState, [
      signIn(ada, 1_700_000_000_000, '2026-08-07', 'write-sign-in-1'),
      ...acknowledgeTwice,
    ]);

    // At-least-once delivery means a dropped acknowledgement is redelivered.
    // The second one must land on a core that has already forgotten the write.
    expect(state.pendingWriteIds).toEqual([]);
  });

  it('emits no effect — confirming a write is not a reason to write again', () => {
    const { effects } = drive(aState({ pendingWriteIds: ['write-ack-1'] }), [
      { type: 'SyncAcknowledged', at: 1_700_000_100_000, writeIds: ['write-ack-1'] },
    ]);

    expect(effects).toEqual([]);
  });
});

describe('Signing out with a write still owed', () => {
  it('keeps it pending, because the write is the departing user’s data', () => {
    const { state } = drive(initialState, [
      signIn(ada, 1_700_000_000_000, '2026-08-07', 'write-sign-in-1'),
      { type: 'SignedOut', at: 1_700_000_200_000 },
    ]);

    // Signing out is not a reason to lose a Session. The queue still holds the
    // write and the RLS policy still governs it, so it lands under the account
    // that made it rather than being dropped on the way out.
    expect(state.pendingWriteIds).toEqual(['write-sign-in-1']);
  });

  it('still clears it when the server confirms after the sign-out', () => {
    const { state } = drive(initialState, [
      signIn(ada, 1_700_000_000_000, '2026-08-07', 'write-sign-in-1'),
      { type: 'SignedOut', at: 1_700_000_200_000 },
      { type: 'SyncAcknowledged', at: 1_700_000_300_000, writeIds: ['write-sign-in-1'] },
    ]);

    // Otherwise the count of owed writes only ever grows, and a later spec
    // showing "still on the phone" would say so forever.
    expect(state.pendingWriteIds).toEqual([]);
  });
});

describe('RemoteStateLoaded', () => {
  it('hydrates the acknowledgement from the server snapshot', () => {
    const acknowledgedAt = 1_600_000_000_000;

    const { state } = drive(aState({ identity: ada }), [
      {
        type: 'RemoteStateLoaded',
        at: 1_700_000_000_000,
        snapshot: { onboardingAcknowledgedAt: acknowledgedAt },
      },
    ]);

    // Cold start holds nothing. Distinct from `at` so a reducer confusing the
    // moment of the read with the moment of the act fails here.
    expect(state.onboardingAcknowledgedAt).toBe(acknowledgedAt);
    expect(state.onboardingKnown).toBe(true);
  });

  it('treats a null acknowledgement in the snapshot as a real answer', () => {
    const { state } = drive(aState({ identity: ada }), [
      {
        type: 'RemoteStateLoaded',
        at: 1_700_000_000_000,
        snapshot: { onboardingAcknowledgedAt: null },
      },
    ]);

    expect(state.onboardingAcknowledgedAt).toBeNull();
    expect(state.onboardingKnown).toBe(true);
  });

  it('emits no effect — adopting the server snapshot is not a write', () => {
    const { effects } = drive(aState({ identity: ada }), [
      {
        type: 'RemoteStateLoaded',
        at: 1_700_000_000_000,
        snapshot: { onboardingAcknowledgedAt: 1_600_000_000_000 },
      },
    ]);

    // Echoing the snapshot back would re-stamp the row on every cold start,
    // destroying the acknowledgement timestamp the disclaimer's audit trail
    // rests on.
    expect(effects).toEqual([]);
  });

  it('does not overwrite a queued acknowledgement the server has not seen yet', () => {
    // The offline case that matters: the user acknowledged on the plane, the
    // write is still in the queue, and the cold-start snapshot predates it.
    // Adopting the snapshot verbatim would send them back through onboarding
    // and then drop the queued write on top of it.
    const acknowledgedOffline = 1_700_000_050_000;

    const { state } = drive(initialState, [
      signIn(ada, 1_700_000_000_000, '2026-08-07', 'write-sign-in-1'),
      { type: 'OnboardingAcknowledged', at: acknowledgedOffline, writeId: 'write-ack-1' },
      {
        type: 'RemoteStateLoaded',
        at: 1_700_000_100_000,
        snapshot: { onboardingAcknowledgedAt: null },
      },
    ]);

    expect(state.onboardingAcknowledgedAt).toBe(acknowledgedOffline);
  });
});
