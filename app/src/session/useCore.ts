/**
 * Where the drivers meet the core.
 *
 * The React layer owns no rules. It dispatches events, holds the state the
 * core returns, and hands effects to the driver — which is why every rule in
 * this file's behaviour is testable in `src/core/__tests__` with no renderer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

import { reduce } from '../core/reduce';
import { initialState, type CoreState } from '../core/state';
import { isQueuedWrite } from '../core/effects';
import type { CoreEvent } from '../core/events';
import { eventForSession, remoteStateEventFor, runEffect } from '../drivers/auth';
import { createClockDriver } from '../drivers/clock';
import { createWriteQueue } from '../drivers/queue';
import { createSyncDriver, SYNC_POLL_INTERVAL_MS } from '../drivers/sync';
import { createWriteIds } from '../drivers/writeId';

export type CoreSession = {
  state: CoreState;
  /** False until the persisted session has been checked, so the UI can avoid
   * flashing a signed-out screen at a signed-in user on cold start. */
  ready: boolean;
  dispatch: (event: CoreEvent) => void;
  /**
   * The id to put on the next event that raises a write. Read from the driver
   * rather than generated at the call site, so that a screen cannot mint a key
   * the queue has already used.
   */
  nextWriteId: () => string;
};

export function useCore(client: SupabaseClient): CoreSession {
  const [state, setState] = useState<CoreState>(initialState);
  const [ready, setReady] = useState(false);

  // One generator for the life of the app: a second one could restart its
  // counter and mint an id the queue is already holding.
  const nextWriteId = useMemo(() => createWriteIds(), []);

  // The queue is durable, so it is built from storage rather than held in
  // state — everything it knows outlives this component and this process.
  const queue = useMemo(() => createWriteQueue(AsyncStorage), []);
  const sync = useMemo(
    () => createSyncDriver(queue, (write) => runEffect(client, write)),
    [client, queue],
  );

  // Effects run outside the state updater: a reducer that performed I/O would
  // run it twice under StrictMode, and would stop being pure besides.
  const pending = useRef<ReturnType<typeof reduce>['effects']>([]);

  const dispatch = useCallback((event: CoreEvent) => {
    setState((current) => {
      const { state: next, effects } = reduce(current, event);
      pending.current = [...pending.current, ...effects];
      return next;
    });
  }, []);

  useEffect(() => {
    const effects = pending.current;
    if (effects.length === 0) {
      return;
    }
    pending.current = [];

    for (const effect of effects) {
      if (!isQueuedWrite(effect)) {
        if (effect.type === 'ClearLocalState') {
          // The driver's half of signing out. `clear` keeps a pending
          // `DeleteAccount` — and the queue serialises its own operations, so
          // the deletion enqueued just above is already on disk by the time
          // this runs rather than racing it.
          //
          // It never waits on a signal: signing out with no connection is
          // still signing out, so nothing here touches the network.
          void queue.clear().catch((error) => {
            console.warn('could not clear local state', error);
          });
        }
        continue;
      }

      const isDeletion = effect.type === 'DeleteAccount';

      // Durable before attempted. The write reaches disk first and the network
      // second, so a crash between the two costs a retry rather than a Session.
      // A storage failure is warned about rather than thrown: taking the screen
      // down would not make the write land.
      void queue
        .enqueue(effect)
        .then(() => sync.drain())
        .then((writeIds) => {
          if (writeIds.length > 0) {
            dispatch({ type: 'SyncAcknowledged', at: Date.now(), writeIds });
          }

          // The Supabase session is dropped *after* the deletion lands, and
          // only then. The write is sent with the user's own token — the
          // function deletes whoever calls it — so signing out first would
          // strip the credential the deletion needs and strand it in the queue
          // with no session left to retry under.
          //
          // If it did not land, the token is deliberately kept: the retry loop
          // is still holding the write, and it needs the session to deliver it.
          if (isDeletion && writeIds.includes(effect.writeId)) {
            void client.auth.signOut();
          }
        })
        .catch((error) => {
          console.warn('could not queue write', effect.type, error);
        });
    }
  });

  /**
   * The retry loop. Runs for the life of the app rather than per screen, which
   * is what makes "syncs automatically on reconnect" true with no user action —
   * a backlog drains whether or not anyone is looking at the screen that made
   * it.
   */
  useEffect(() => {
    return sync.start((writeIds) => {
      dispatch({ type: 'SyncAcknowledged', at: Date.now(), writeIds });
    });
  }, [sync, dispatch]);

  useEffect(() => {
    let active = true;

    // The persisted session, restored on cold start. This is what makes
    // reopening the app not ask again.
    void client.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }
      const event = eventForSession(data.session, Date.now(), nextWriteId());
      if (event) {
        dispatch(event);
      }
      setReady(true);
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      const event = eventForSession(session, Date.now(), nextWriteId());
      if (event) {
        dispatch(event);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [client, dispatch]);

  /**
   * The server's snapshot, fetched once per signed-in user on cold start.
   *
   * Keyed on the user id rather than on the identity object, so a token refresh
   * handing back an equal-but-new identity does not re-read the row. Runs only
   * while the answer is unknown: acknowledging sets it, and re-reading after
   * that would be a round trip to learn what the core already knows.
   *
   * A failed read leaves `onboardingKnown` false, which holds the user on the
   * loading screen rather than showing the disclaimer to someone who has
   * already accepted it — and retries on an interval, so a user who opened the
   * app with no signal lands on Home the moment one arrives rather than needing
   * to relaunch.
   */
  const userId = state.identity?.userId ?? null;
  const known = state.onboardingKnown;

  useEffect(() => {
    if (!userId || known) {
      return;
    }

    let active = true;

    const attempt = () => {
      void remoteStateEventFor(client, userId, Date.now())
        .then((event) => {
          if (active) {
            dispatch(event);
          }
        })
        .catch((error) => {
          console.warn('could not read remote state', error);
        });
    };

    // Immediately, then on the sync driver's cadence until it lands. A single
    // attempt would strand a user who opened the app offline on the loading
    // screen until they relaunched — a network problem blocking a workout,
    // which is exactly what this ticket forbids.
    attempt();
    const handle = setInterval(attempt, SYNC_POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(handle);
    };
  }, [client, dispatch, userId, known]);

  // The clock driver reads `today` through a ref so that starting the interval
  // does not depend on the value it watches — otherwise every day change would
  // tear down and rebuild the timer.
  const todayRef = useRef(state.today);
  todayRef.current = state.today;

  const clock = useMemo(() => createClockDriver(), []);

  useEffect(() => {
    return clock.start(
      () => todayRef.current,
      (event) => dispatch(event),
    );
  }, [clock, dispatch]);

  return { state, ready, dispatch, nextWriteId };
}
