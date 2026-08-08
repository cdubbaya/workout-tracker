# Push-up Counter — web

The public web surface: a marketing page and the privacy policy. Hosted on Vercel per
[ADR-0010](../docs/adr/0010-supabase-direct-vercel-for-web.md).

## What this is not

**No application logic ships here.** No framework, no build step, no `package.json`, no
JavaScript — two hand-written HTML files and a `vercel.json`. The `prototype/` directory at
the repo root is a throwaway and is deliberately **not** promoted into this surface.

That constraint is enforced twice: `app/src/__tests__/web-surface.test.ts` fails if a script
file or an inline handler appears here, and the `Content-Security-Policy` in `vercel.json`
is `default-src 'none'` with no `script-src`, so a browser refuses to execute one even if it
shipped.

Friend-invite landing pages (spec #6) are a later addition to this same surface.

## Layout

```
web/
├── index.html     marketing
├── privacy.html   the policy, served at /privacy
└── vercel.json    headers, clean URLs, no build
```

Design tokens are ported by hand from `app/src/theme/tokens.ts` into the `:root` block of
each page, so the web surface and the app read as one product. They are copied rather than
imported on purpose — importing would couple this deploy to the Expo build, which the
"independent of the mobile app's build" requirement rules out. If the app's palette moves,
move it here too.

## Deploying

The Vercel project is `cdubbayas-projects/workout-tracker`, production URL
`workout-tracker-ashen-theta.vercel.app`.

**Root Directory must be set to `web/`** in the Vercel project settings. This is the setting
that makes the deploy independent of the mobile app: with the default root of `.`, Vercel
would detect the Expo app at `app/` and try to build it.

With Git integration connected, every push to `main` deploys. To deploy by hand from a
clean checkout:

```bash
cd web
vercel deploy --prod
```

There is nothing to install and nothing to build — `buildCommand` is `null` and the output
directory is the directory itself.

## The privacy claim

The sentence the product commits to is fixed by ADR-0010 and §11 of the vision doc:

> Video and pose landmarks never leave your device; workout results and your friends list do.

State it precisely rather than expansively. A server does hold identity, a friend graph, an
XP ledger and Rep Logs, and the policy names all four — overstating the claim is worse than
saying nothing. `web-surface.test.ts` asserts both halves of the sentence and each disclosed
category, so weakening the policy fails the suite.

## Tests

The web surface has no runner of its own; its tests live in the app's Jest project because
that is the only runner in the repo.

```bash
cd app
npx jest web-surface
```
