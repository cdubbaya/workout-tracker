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

// The app's own driver, so what is under test is the statement the app sends
// rather than a restatement of it written for the test.
import { runEffect } from '../../app/src/drivers/auth';

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

/**
 * Deleting an account, against a real database.
 *
 * The criterion this suite exists for is that the cascade is *verified* rather
 * than assumed — so these run against Postgres with the real foreign keys, and
 * there is no version of them that a mock could answer. A unit test can prove
 * the driver calls the function; only this can prove the rows are gone.
 *
 * Each test makes its own user and deletes it, rather than using the shared
 * `ada` and `grace`: a test whose whole point is destroying an account cannot
 * share one with the tests that follow it.
 */
describe('deleting an account', () => {
  /** A throwaway user with a seeded profile row, for a test that destroys them. */
  async function aDoomedUser(label: string): Promise<TestUser> {
    const user = await createUser(`${label}+${suffix}@rls.test`, `test-password-${label}`);
    const { error } = await user.client
      .from('profile')
      .insert({ id: user.id, email: user.email });
    if (error) {
      throw error;
    }
    return user;
  }

  itLocal('removes the profile row rather than flagging it', async () => {
    const doomed = await aDoomedUser('doomed-profile');

    await runEffect(doomed.client, {
      type: 'DeleteAccount',
      writeId: 'write-delete-1',
      userId: doomed.id,
      at: Date.UTC(2026, 7, 9, 12, 0, 0),
    });

    // Read as the admin, not as the deleted user. Reading as the user proves
    // nothing: RLS filters their rows to an empty set the moment their JWT
    // stops matching, so a flagged-but-present row would look identical to a
    // deleted one. This is the assertion the criterion actually asks for.
    const { data, error } = await admin.from('profile').select('id').eq('id', doomed.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  itLocal('removes the auth user, so the account cannot sign back in', async () => {
    const doomed = await aDoomedUser('doomed-auth');

    await runEffect(doomed.client, {
      type: 'DeleteAccount',
      writeId: 'write-delete-2',
      userId: doomed.id,
      at: Date.UTC(2026, 7, 9, 12, 0, 0),
    });

    // Deleting only the profile would leave an account that still signs in, to
    // an app holding nothing for it.
    const { data, error } = await admin.auth.admin.getUserById(doomed.id);

    expect(data?.user ?? null).toBeNull();
    expect(error).not.toBeNull();
  });

  itLocal('deletes by cascade rather than by naming each table', async () => {
    // The criterion's real target, and the reason it says *verified* rather
    // than assumed: `delete_account` removes exactly one row, and everything
    // else goes because the schema says it must. That is what makes a table a
    // later spec adds — declared with the same `references ... on delete
    // cascade` — covered without this function being edited to name it.
    //
    // Asserted on the constraint itself, because the alternative is a test that
    // has to invent a table to prove a rule about tables that do not exist yet.
    // `profile` is the live instance of that rule: the test above shows its row
    // disappearing, and this shows *why* it disappeared.
    const { data, error } = await admin
      .from('account_cascade_constraint')
      .select('constraint_name,delete_action')
      .eq('constraint_name', 'profile_id_fkey');

    expect(error).toBeNull();

    // `c` is Postgres's code for `on delete cascade`. A constraint set to
    // `no action` or `set null` would leave orphaned rows behind a deleted
    // account, which is the failure the criterion is aimed at.
    expect(data).toEqual([{ constraint_name: 'profile_id_fkey', delete_action: 'c' }]);
  });

  itLocal('leaves no table that would survive its owner being deleted', async () => {
    // The guard for the specs that have not been written yet. Every foreign key
    // in `public` must cascade, so a table added later is swept up by the same
    // deletion rather than quietly outliving the account it belonged to.
    //
    // This is the test that fails when someone adds a `sessions` table with a
    // default `no action` key — which is precisely how "deleted" accounts keep
    // their rows, and precisely what this issue says must not be assumed.
    const { data, error } = await admin
      .from('account_cascade_constraint')
      .select('constraint_name,delete_action');

    expect(error).toBeNull();

    const notCascading = (data ?? []).filter((row) => row.delete_action !== 'c');
    expect(notCascading).toEqual([]);
  });

  itLocal('deletes the caller and nobody else', async () => {
    // The function takes no argument, so there is nothing to forge — but the
    // claim worth a test is that a caller cannot reach past themselves. `ada`
    // is a bystander here and must survive.
    const doomed = await aDoomedUser('doomed-bystander');

    await runEffect(doomed.client, {
      type: 'DeleteAccount',
      writeId: 'write-delete-4',
      userId: doomed.id,
      at: Date.UTC(2026, 7, 9, 12, 0, 0),
    });

    const { data } = await admin.from('profile').select('id').eq('id', ada.id);
    expect(data).toEqual([{ id: ada.id }]);
  });

  itLocal('costs nothing when the same deletion is redelivered', async () => {
    // At-least-once delivery (ADR-0010) means a dropped acknowledgement sends
    // this twice. The second call runs against an account that is already gone.
    const doomed = await aDoomedUser('doomed-replay');

    const write = {
      type: 'DeleteAccount' as const,
      writeId: 'write-delete-5',
      userId: doomed.id,
      at: Date.UTC(2026, 7, 9, 12, 0, 0),
    };

    await runEffect(doomed.client, write);

    // The second delivery goes out on the same client, whose JWT now names a
    // user that no longer exists — which is exactly the state a real retry
    // would be in. It must not throw: a rejection would leave the write in the
    // queue forever, retrying a deletion that already happened.
    await expect(runEffect(doomed.client, write)).resolves.toBeUndefined();
  });

  itLocal('refuses an unauthenticated caller', async () => {
    const anon = createClient(LOCAL_URL, LOCAL_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await anon.rpc('delete_account');

    // Either the grant refuses it or the function's own null check does. Both
    // are the right answer; what must not happen is a silent success.
    expect(error).not.toBeNull();
  });
});

/**
 * The half of the offline queue that only a real server can answer: whether it
 * accepts the client's timestamp (ADR-0010), and whether replaying a write
 * keyed on a client-generated id leaves one row rather than two.
 *
 * Driven through the real `runEffect` rather than through hand-written SQL. A
 * test that issued its own statements would prove Postgres is idempotent and
 * say nothing about the statements the app actually sends — which is where the
 * duplicate would come from.
 */
describe('the write queue against a real server', () => {
  itLocal('accepts the timestamp the client sent, unchanged', async () => {
    // Deliberately in the past, and not close to now. A server that overwrote
    // the client's clock with its own — the behaviour ADR-0010 declines —
    // would land a value from today and fail this.
    const happenedAt = Date.UTC(2026, 0, 15, 9, 30, 0);

    await runEffect(ada.client, {
      type: 'PersistOnboardingAcknowledgement',
      writeId: 'write-acceptance-1',
      userId: ada.id,
      at: happenedAt,
    });

    const { data } = await ada.client
      .from('profile')
      .select('onboarding_acknowledged_at')
      .eq('id', ada.id)
      .single();

    // Compared as an instant rather than as a string: Postgres renders
    // `timestamptz` in its own format, and the claim is about the moment.
    expect(new Date(data!.onboarding_acknowledged_at).getTime()).toBe(happenedAt);
  });

  itLocal('leaves one row when a write is redelivered', async () => {
    // At-least-once delivery means the same write crosses the wire twice
    // whenever an acknowledgement is dropped. This is the assertion that the
    // second delivery costs nothing.
    const write = {
      type: 'PersistProfile' as const,
      writeId: 'write-replay-1',
      userId: grace.id,
      email: grace.email,
      at: Date.UTC(2026, 0, 15, 9, 30, 0),
    };

    await runEffect(grace.client, write);
    await runEffect(grace.client, write);

    const { data } = await grace.client.from('profile').select('id').eq('id', grace.id);

    expect(data).toHaveLength(1);
  });

  itLocal('does not clear an acknowledgement when the profile write replays', async () => {
    // The regression that would be invisible without a server: `PersistProfile`
    // replays on every reconnect, and an upsert naming the acknowledgement
    // column would wipe it and send a returning user back through onboarding.
    const acknowledgedAt = Date.UTC(2026, 0, 20, 8, 0, 0);

    await runEffect(grace.client, {
      type: 'PersistOnboardingAcknowledgement',
      writeId: 'write-ack-replay-1',
      userId: grace.id,
      at: acknowledgedAt,
    });

    await runEffect(grace.client, {
      type: 'PersistProfile',
      writeId: 'write-replay-2',
      userId: grace.id,
      email: grace.email,
      at: Date.UTC(2026, 0, 21, 8, 0, 0),
    });

    const { data } = await grace.client
      .from('profile')
      .select('onboarding_acknowledged_at')
      .eq('id', grace.id)
      .single();

    expect(new Date(data!.onboarding_acknowledged_at).getTime()).toBe(acknowledgedAt);
  });
});
