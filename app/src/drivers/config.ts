/**
 * Supabase connection config, read from the environment at build time.
 *
 * A driver concern, not a core one — the core has never heard of Supabase.
 *
 * `EXPO_PUBLIC_`-prefixed variables are inlined into the bundle by Expo, which
 * is what makes them readable here. Both values ship inside the app binary and
 * that is fine: the publishable key identifies an anonymous client rather than
 * granting access. Row-level security is the access layer (ADR-0010), which is
 * why the `profile` policy in this ticket is the real boundary.
 */

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

/**
 * Throws when config is absent rather than constructing a client that fails
 * later with an opaque network error. A missing key is a setup mistake, and it
 * should say so at startup where someone can act on it.
 */
export function readSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
): SupabaseConfig {
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const missing = [
    !url && 'EXPO_PUBLIC_SUPABASE_URL',
    !publishableKey && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ].filter((name): name is string => typeof name === 'string');

  if (missing.length > 0) {
    throw new Error(
      `Supabase config missing: ${missing.join(', ')}. ` +
        'Copy app/.env.example to app/.env and fill it in from the dashboard.',
    );
  }

  return { url: url as string, publishableKey: publishableKey as string };
}
