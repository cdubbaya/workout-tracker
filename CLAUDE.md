# workout-tracker

AI push-up counter. On-device pose estimation counts valid reps; sessions earn XP feeding a weekly streak, a movement ladder, and friend challenges. See [pushup-counter-vision.md](pushup-counter-vision.md).

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `cdubbaya/workout-tracker`, via the `gh` CLI. External PRs are **not** a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles use their default strings, unmapped. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Worktree isolation

One working tree per agent. Never `git switch` in the main checkout. See
`docs/agents/worktree-isolation.md`.

### Device testing

An issue that changes the app gets a look on a real iPhone before it merges — unit tests
say nothing about whether copy fits a phone screen. Builds go through EAS from the issue's
own worktree; the Supabase values live as EAS environment variables rather than in a `.env`
copied per worktree. `eas-cli` is a devDependency, so it is `npx eas` or an `npm run`
script, never a bare `eas`. See `docs/agents/eas-testing.md`.

Agents: this is a step for the human reviewer, not one you can perform — it needs a
physical device and an Apple account. Name it in the PR's **Human Steps** rather than
claiming it was done.
