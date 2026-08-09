/**
 * Leaving, tested through the core: build a state, apply events, assert the
 * state and the effects that come out. No network, no emulator, no async.
 *
 * These assert the acceptance criteria of issue #12, through the public event
 * interface only. What a real server does with the effect this raises is the
 * one claim the core cannot make — `supabase/tests/profile_rls.test.ts` is
 * where the cascade is proven against Postgres rather than assumed here.
 */

import { drive, aState } from '../testing/harness';
import { initialState, screenFor } from '../state';
import type { CoreEvent, Identity } from '../events';

const ada: Identity = { userId: 'user-ada-1', email: 'ada@example.com' };

const deleteAccount = (at: number, writeId = 'write-delete'): CoreEvent => ({
  type: 'AccountDeletionRequested',
  at,
  writeId,
});

describe('AccountDeletionRequested', () => {
  it('signs the user out', () => {
    const { state } = drive(aState({ identity: ada, today: '2026-08-09' }), [
      deleteAccount(1_700_000_300_000),
    ]);

    // Leaving is as complete as never having arrived: the deleted user is not
    // still signed in to an account that no longer exists.
    expect(state.identity).toBeNull();
    expect(screenFor(state)).toBe('sign-in');
  });

  it('emits an effect describing the deletion, rather than performing it', () => {
    const at = 1_700_000_300_000;
    const { effects } = drive(
      aState({ identity: ada, onboardingAcknowledgedAt: at, onboardingKnown: true }),
      [deleteAccount(at)],
    );

    // The core describes the write; the driver executes it. Keyed on a
    // client-generated id like every other write, so a redelivery after a
    // dropped acknowledgement is the same deletion rather than a second one.
    expect(effects).toContainEqual({
      type: 'DeleteAccount',
      writeId: 'write-delete',
      userId: ada.userId,
      at,
    });
  });

  it('clears local state, so the rows are not merely unreachable on this phone', () => {
    const { effects } = drive(aState({ identity: ada }), [deleteAccount(1_700_000_300_000)]);

    // Deletion is the stronger claim of the two this ticket makes, so it must
    // do at least what signing out does.
    expect(effects).toContainEqual({ type: 'ClearLocalState' });
  });

  it('forgets the acknowledgement, back to unknown rather than to not-acknowledged', () => {
    const { state } = drive(
      aState({
        identity: ada,
        onboardingAcknowledgedAt: 1_700_000_000_000,
        onboardingKnown: true,
      }),
      [deleteAccount(1_700_000_300_000)],
    );

    // Same rule as sign-out: the acknowledgement belongs to a user, not to a
    // phone, and the next user's profile is what answers.
    expect(state.onboardingAcknowledgedAt).toBeNull();
    expect(state.onboardingKnown).toBe(false);
  });

  it('keeps the deletion owed until the server confirms it', () => {
    const { state } = drive(aState({ identity: ada }), [deleteAccount(1_700_000_300_000)]);

    // The one way deletion differs from sign-out: a sign-out is done the moment
    // it happens, and a deletion is a request until the server says otherwise.
    // Dropping it here would let a user leave on a plane and stay in the
    // database.
    expect(state.pendingWriteIds).toEqual(['write-delete']);
  });

  it('stops owing the deletion once the server confirms it', () => {
    const { state } = drive(aState({ identity: ada }), [
      deleteAccount(1_700_000_300_000),
      { type: 'SyncAcknowledged', at: 1_700_000_400_000, writeIds: ['write-delete'] },
    ]);

    expect(state.pendingWriteIds).toEqual([]);
  });

  it('is ignored when nobody is signed in', () => {
    // Unreachable through the UI — deletion sits behind Home — but a reducer
    // that crashed on an ordering it cannot rule out would take the screen
    // down for a rule it only needed to decline.
    const start = aState({ today: '2026-08-09' });
    const { state, effects } = drive(start, [deleteAccount(1_700_000_300_000)]);

    expect(state).toEqual(start);
    expect(effects).toEqual([]);
  });

  it('does not mutate the state it was given', () => {
    const before = aState({ identity: ada, today: '2026-08-09' });
    const snapshot = structuredClone(before);

    drive(before, [deleteAccount(1_700_000_300_000)]);

    expect(before).toEqual(snapshot);
  });
});
