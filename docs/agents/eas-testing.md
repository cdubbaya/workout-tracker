# Testing an implemented issue on a real iPhone

Every issue that changes the app needs a look on a device before it merges. Unit tests
prove the rules; they say nothing about whether copy fits a 390pt screen or whether a
permission prompt reads right.

This is the runbook for that. It is written for the loop that actually happens: an agent
implements an issue in a worktree, and you want it on your phone without re-solving
credentials each time.

**Expo Go will not work for this project** — see [../../app/README.md](../../app/README.md).
The rep detector needs native modules Expo Go does not ship, and `AsyncStorage` (which
holds the Supabase session) is already one of them. A build from Expo Go fails with
`Native module is null, cannot access legacy storage`.

## The one-time setup

Do this once per machine. Everything after it is two commands per issue.

### 1. Store the Supabase values on EAS

This is what removes the `.env` shuffling. The values live on EAS, so every build — from
any worktree, on any machine — gets them without a local file.

```bash
cd app
npx eas login
npx eas env:create --environment development --name EXPO_PUBLIC_SUPABASE_URL --value 'https://<ref>.supabase.co' --visibility plaintext
npx eas env:create --environment development --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value '<publishable-key>' --visibility plaintext
```

Both values come from the Supabase dashboard under **Settings → API**. Use the hosted
project's URL, not `127.0.0.1` — a phone cannot reach your laptop's localhost.

`plaintext` is correct here and not a shortcut: both values ship inside the app bundle
anyway, and RLS is the access layer (ADR-0010). Marking them `secret` would only hide them
from `env:pull`, which is the command that makes local Metro work.

**Never** store the `service_role` / `sb_secret_...` key. It bypasses RLS and would make
every policy in the schema decorative.

Confirm they landed:

```bash
npx eas env:list --environment development
```

### 2. Register your iPhone

```bash
npx eas device:create
```

Pick **Website** and open the link on the phone, which installs a provisioning profile.
Needed once per device. A build made before the device is registered will install on
nothing.

## Per issue: two commands

From the worktree holding the branch under test — not the main checkout, which sits on
`main` and would build without the change:

```bash
cd ~/Desktop/pushup-worktrees/<issue>/app
npm run bootstrap        # npm ci, then pull the env vars from EAS
npm run build:dev        # queue an iOS development build
```

`build:dev` prints a URL. When it finishes (typically 10–20 minutes, mostly queue), it
returns a QR code — scan it with the phone's camera to install.

Then point Metro at the installed build:

```bash
npm run start:dev
```

Scan that QR code with the **dev build**, not the camera app. Live reload works from here,
so JS-only changes need no rebuild.

## When you need a new build, and when you don't

Most iterations need no rebuild. Getting this wrong is the main way this workflow wastes
twenty minutes.

| Change | New build? |
|---|---|
| TypeScript, JSX, styles, copy | No — `start:dev` live-reloads it |
| A new JS-only dependency | No — restart Metro |
| A dependency with native code | **Yes** |
| Anything under `expo.ios` in `app.json`, including a permission purpose string | **Yes** |
| An Expo SDK upgrade | **Yes** |
| An `EXPO_PUBLIC_*` value | No for local Metro after `env:pull`; **yes** for a standalone build, since they inline at build time |

The rule behind the table: a development build is a native shell that loads JS from Metro.
Change the shell, rebuild. Change the JS, reload.

## Simulator builds

Faster to install and needs no device registration, but no camera — so it is useless for
spec #2 onward and fine for layout and copy.

```bash
npm run build:sim
```

## Verifying the flow on device

What unit tests cannot reach, and therefore what the device pass is actually for:

- Copy fits, and reads right at real size. The onboarding disclaimer is three cards of
  prose — the first thing to check on a small screen.
- The cold-start path. Force-quit and reopen: a user who has acknowledged onboarding must
  land on Home, not see the disclaimer again. That is a server round-trip, so it only
  proves out against the hosted project.
- Permission prompts, once spec #2 adds them: the in-app explainer and the iOS prompt
  should read as the same promise.
- Sign-out, then sign in as a different account. Acknowledgement is per user, not per
  phone.

## Troubleshooting

**`command not found: eas`** — `eas-cli` is a devDependency, so it resolves through
`npx eas` or the `npm run` scripts, not as a bare `eas`. Use those. Do not
`npm install -g eas-cli`; a global install drifts from the version `eas.json` pins.

**`Native module is null, cannot access legacy storage`** — the JS bundle is running in
Expo Go rather than the development build. Install the build from `build:dev` and connect
with `start:dev`.

**`relation "public.profile" does not exist`** — the hosted project is missing migrations.
Apply everything under `supabase/migrations/` in order, via the dashboard SQL editor or
`supabase db push`.

**Supabase CLI `link` fails with `SchemaError … at [2]["inserted_at"]`** — a client-side
validation bug, seen on 2.112.0. Upgrade the CLI. Hand-writing
`supabase/.temp/project-ref` to skip `link` does **not** work: `db push` then fails with
`IPv6 is not supported on your current network`, because `link` is what negotiates the
IPv4 connection. Use the dashboard SQL editor instead.

**The build installs but shows an old version** — a development build loads from Metro, so
check `start:dev` is running and the phone is on the same network.

**`Unknown error. See logs of the Install dependencies build phase`, failing in well under a
minute** — a Node version mismatch on the build server. React Native 0.86 requires
`^20.19.4 || ^22.13.0 || ^24.3.0 || >= 25.0.0`, which notably excludes Node 20 below
20.19.4 and all of 21 and 23. `eas.json` pins `node` in a `base` profile that every other
profile extends, and `package.json` declares the same range in `engines`; if EAS's default
image ever moves outside it, bump the pin rather than removing it.

A build that fails this fast has died at dependency install rather than compilation, which
is the quickest way to tell this apart from a real build error. `eas build:view <id>` shows
`buildDuration` — a few thousand milliseconds means install, not compile.

## Why the values live on EAS rather than in `.env`

`.env` is gitignored, which is correct — it means each new worktree starts without one.
Hand-copying it per worktree is the friction this file exists to remove, and it fails in a
way that wastes a build: a missing value does not error, it inlines as `undefined` and the
app fails at runtime against a URL that does not exist.

EAS environment variables make the server the source of truth. `npm run env:pull`
regenerates a local `.env` for Metro and the test suite when you need one, and the file
stays gitignored.

`.env.example` remains the documentation of shape, and a purely local
`npx expo run:ios` workflow still works from a hand-made `.env`.
