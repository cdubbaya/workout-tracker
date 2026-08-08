/**
 * The RLS policy suite for `profile`.
 *
 * A configuration check rather than a code seam — spec #1 is explicit that it
 * should stay small enough never to become an excuse to move logic into the
 * database. What it proves is the one thing the core cannot: that the server
 * refuses a read it should refuse.
 *
 * Runs against a local Supabase instance (`supabase start`), never a real
 * project — it creates and deletes users. It skips rather than fails when no
 * instance is reachable, so `npm test` on a machine without Docker does not go
 * red for a reason unrelated to the change under test.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The CLI's fixed local values, identical on every machine and published in
// Supabase's own docs. Not secrets, and deliberately not read from `.env` —
// this suite must never point at a real project.
const LOCAL_URL = process.env.SUPABASE_LOCAL_URL ?? 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY =
  process.env.SUPABASE_LOCAL_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_SERVICE_KEY =
  process.env.SUPABASE_LOCAL_SERVICE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const admin = createClient(LOCAL_URL, LOCAL_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function localInstanceReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${LOCAL_URL}/rest/v1/`, {
      headers: { apikey: LOCAL_ANON_KEY },
    });
    return response.ok;
  } catch {
    return false;
  }
}

type TestUser = {
  id: string;
  email: string;
  client: SupabaseClient;
};

/** A confirmed user plus a client authenticated as them. */
async function createUser(email: string, password: string): Promise<TestUser> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw error ?? new Error(`could not create ${email}`);
  }

  const client = createClient(LOCAL_URL, LOCAL_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) {
    throw signIn.error;
  }

  return { id: data.user.id, email, client };
}

let reachable = false;
let ada: TestUser;
let grace: TestUser;

// Unique per run so a re-run after a failed teardown does not collide.
const suffix = process.env.RLS_TEST_SUFFIX ?? String(process.pid);

beforeAll(async () => {
  reachable = await localInstanceReachable();
  if (!reachable) {
    return;
  }

  ada = await createUser(`ada+${suffix}@rls.test`, 'test-password-ada');
  grace = await createUser(`grace+${suffix}@rls.test`, 'test-password-grace');

  // Seed one row per user as themselves, which also exercises the insert policy.
  for (const user of [ada, grace]) {
    const { error } = await user.client
      .from('profile')
      .insert({ id: user.id, email: user.email });
    if (error) {
      throw error;
    }
  }
}, 60_000);

afterAll(async () => {
  if (!reachable) {
    return;
  }
  for (const user of [ada, grace]) {
    if (user?.id) {
      await admin.auth.admin.deleteUser(user.id);
    }
  }
});

/**
 * Skips the body when no local instance is reachable, and says so out loud.
 *
 * A silent pass would be worse than a failure here: this suite is the only
 * evidence for the isolation criterion, and a green tick over an assertion
 * that never ran is exactly the vacuous pass the criterion exists to prevent.
 */
function itLocal(name: string, body: () => Promise<void>) {
  it(name, async () => {
    if (!reachable) {
      console.warn(
        `SKIPPED (no local Supabase at ${LOCAL_URL} — run \`supabase start\`): ${name}`,
      );
      return;
    }
    await body();
  });
}

describe('profile row-level security', () => {
  itLocal('lets a user read their own row', async () => {
    const { data, error } = await ada.client.from('profile').select('id,email').eq('id', ada.id);

    expect(error).toBeNull();
    expect(data).toEqual([{ id: ada.id, email: ada.email }]);
  });

  itLocal('does not let user A read user B row', async () => {
    // The criterion. RLS filters rather than errors, so the tell is an empty
    // result — asserting on an error would pass even with RLS disabled.
    const { data, error } = await ada.client
      .from('profile')
      .select('id,email')
      .eq('id', grace.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  itLocal('does not leak other rows in an unfiltered select', async () => {
    // Belt and braces: a policy correct for a keyed lookup but wrong for a
    // table scan would pass the test above and still expose everyone.
    const { data, error } = await ada.client.from('profile').select('id');

    expect(error).toBeNull();
    expect(data).toEqual([{ id: ada.id }]);
  });

  itLocal('does not let user A update user B row', async () => {
    const { data, error } = await ada.client
      .from('profile')
      .update({ email: 'attacker@rls.test' })
      .eq('id', grace.id)
      .select();

    // The update matches no visible row, so nothing changes.
    expect(error).toBeNull();
    expect(data).toEqual([]);

    const { data: after } = await grace.client
      .from('profile')
      .select('email')
      .eq('id', grace.id);
    expect(after).toEqual([{ email: grace.email }]);
  });

  itLocal('does not let user A insert a row owned by user B', async () => {
    const { error } = await ada.client
      .from('profile')
      .insert({ id: grace.id, email: 'attacker@rls.test' });

    // An insert violating `with check` is rejected outright rather than filtered.
    expect(error).not.toBeNull();
  });

  itLocal('does not let user A delete user B row', async () => {
    await ada.client.from('profile').delete().eq('id', grace.id);

    const { data } = await grace.client.from('profile').select('id').eq('id', grace.id);
    expect(data).toEqual([{ id: grace.id }]);
  });

  itLocal('does not let an anonymous client read any row', async () => {
    const anon = createClient(LOCAL_URL, LOCAL_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data } = await anon.from('profile').select('id');
    expect(data ?? []).toEqual([]);
  });
});
