/**
 * The Supabase client, configured to persist the session across app
 * termination.
 *
 * `AsyncStorage` is what makes "reopening does not ask again" true: the session
 * survives the process being killed, not merely backgrounded. Supabase refreshes
 * the token on its own, so a returning user lands signed in.
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { readSupabaseConfig, type SupabaseConfig } from './config';

export function createSupabaseClient(
  config: SupabaseConfig = readSupabaseConfig(),
): SupabaseClient {
  return createClient(config.url, config.publishableKey, {
    auth: {
      storage: AsyncStorage,
      // The session outlives the process. This is the criterion.
      persistSession: true,
      autoRefreshToken: true,
      // No deep-link callback in this ticket; email sign-in returns a session
      // directly, and parsing a URL that is never there only invites bugs.
      detectSessionInUrl: false,
    },
  });
}
