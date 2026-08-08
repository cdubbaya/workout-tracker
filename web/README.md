# Push-up Counter — web

The public web surface: a marketing page and the privacy policy. Hosted on Vercel per
[ADR-0010](../docs/adr/0010-supabase-direct-vercel-for-web.md).

## What this is not

**No application logic ships here.** No framework, no build step, no `package.json`, no
JavaScript — two hand-written HTML files, and a `vercel.json` at the repo root. The
`prototype/` directory is a throwaway and is deliberately **not** promoted into this
surface.

That constraint is enforced twice: `app/src/__tests__/web-surface.test.ts` fails if a script
file or an inline handler appears here, and the `Content-Security-Policy` in the config is
`default-src 'none'` with no `script-src`, so a browser refuses to execute one even if it
shipped.

Friend-invite landing pages (spec #6) are a later addition to this same surface.

## Layout

```
web/
├── index.html     marketing, served at /
└── privacy.html   the policy, served at /privacy

../vercel.json     rewrites, headers, no build
../.vercelignore   excludes everything that is not the surface
```

The Vercel config sits at the **repo root**, not here. Vercel reads `vercel.json` from
its Root Directory, and leaving that at the default `.` means the entire deploy is
configured in committed code with no dashboard setting that can drift or be forgotten on a
new project. `rewrites` map `/` and `/privacy` onto the files above.

The cost of serving the repo root is that every path in the repo is a candidate URL, so
`.vercelignore` excludes everything that is not the surface. Without it the vision doc, the
glossary and the whole app and prototype source would be publicly fetchable at their repo
paths.

It is written as a **denylist**, naming each excluded entry. The tidier-looking
deny-all-then-re-allow (`*` plus `!web/**`) does not work: the exclusion is applied before
the rewrites resolve, so `/` and `/privacy` end up pointing at files that were never
uploaded and both 404. Two tests guard the arrangement — one fails if a top-level entry is
neither published nor ignored, so adding a directory forces a decision rather than silently
publishing it, and one fails if `web/` is ever excluded.

Verify a config change against Vercel's own runtime rather than by reading it:

```bash
vercel dev --listen 3999          # from the repo root
curl -s localhost:3999/privacy | grep -o "<title>[^<]*</title>"
curl -s -o /dev/null -w '%{http_code}\n' localhost:3999/CONTEXT.md   # must be 404
```

Design tokens are ported by hand from `app/src/theme/tokens.ts` into the `:root` block of
each page, so the web surface and the app read as one product. They are copied rather than
imported on purpose — importing would couple this deploy to the Expo build, which the
"independent of the mobile app's build" requirement rules out. If the app's palette moves,
move it here too.

## Deploying

The Vercel project is `cdubbayas-projects/workout-tracker`, production URL
`workout-tracker-ashen-theta.vercel.app`. GitHub integration is connected, so **merging to
`main` deploys** and pull requests get preview deployments.

**No Vercel dashboard settings are required.** Root Directory stays at its default `.`,
and `vercel.json` does the rest: `buildCommand`, `installCommand` and `framework` are all
`null`, so the Expo app at `app/` is never detected or built even though it sits inside the
deployed root. That is what keeps this deploy independent of the mobile build — the test
suite asserts all three stay null.

To deploy by hand from a clean checkout, run from the **repo root** rather than from here:

```bash
vercel deploy --prod
```

Preview deployments are protected by Vercel authentication, so an unauthenticated `curl`
against a preview URL returns the Vercel login page with a `200` — check the page title,
not the status code, when verifying one.

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
