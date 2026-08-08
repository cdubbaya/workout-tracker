/**
 * Where the drivers meet the core.
 *
 * The React layer owns no rules. It dispatches events, holds the state the
 * core returns, and hands effects to the driver — which is why every rule in
 * this file's behaviour is testable in `src/core/__tests__` with no renderer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { reduce } from '../core/reduce';
import { initialState, type CoreState } from '../core/state';
import type { CoreEvent } from '../core/events';
import { eventForSession, runEffect } from '../drivers/auth';
import { createClockDriver } from '../drivers/clock';

export type CoreSession = {
  state: CoreState;
  /** False until the persisted session has been checked, so the UI can avoid
   * flashing a signed-out screen at a signed-in user on cold start. */
  ready: boolean;
  dispatch: (event: CoreEvent) => void;
};

export function useCore(client: SupabaseClient): CoreSession {
  const [state, setState] = useState<CoreState>(initialState);
  const [ready, setReady] = useState(false);

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
      // A failed write must not take the screen down with it. The durable
      // queue that makes this retry properly arrives with the offline work.
      void runEffect(client, effect).catch((error) => {
        console.warn('effect failed', effect.type, error);
      });
    }
  });

  useEffect(() => {
    let active = true;

    // The persisted session, restored on cold start. This is what makes
    // reopening the app not ask again.
    void client.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }
      const event = eventForSession(data.session, Date.now());
      if (event) {
        dispatch(event);
      }
      setReady(true);
    });

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      const event = eventForSession(session, Date.now());
      if (event) {
        dispatch(event);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [client, dispatch]);

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

  return { state, ready, dispatch };
}
