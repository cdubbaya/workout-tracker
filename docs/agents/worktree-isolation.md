# Worktree Isolation — one working tree per agent

Several agents may run against this repo at once — multiple Claude or Codex sessions, plus
a human at the keyboard. They share **one** `.git` object store. The failure mode:

> An agent runs `git switch -c agent/luna/issue-287` in the main checkout. A second agent
> switches that same checkout to a different branch. Now the first agent's uncommitted
> edits are staged onto the wrong branch, and whoever switched last owns the working tree.

A branch is **not** an isolation boundary — the *working tree* is. `git worktree` gives
each agent its own directory with its own HEAD, index, and files, all backed by the same
object store. Switching or committing in one never touches another.

## The rule

**Every agent works in its own worktree, keyed by its branch. No agent runs `git switch`
or `git checkout <branch>` in the main checkout (`~/Desktop/Pushup`).** Treat the main
checkout as a stable anchor — it stays on `main` and is used only to spawn worktrees and
to fetch or pull.

## Creating your worktree

Worktrees live in a sibling `../pushup-worktrees/` directory so editors, linters, and test
runners don't recurse into them.

New branch off `origin/main`:

```bash
git fetch origin
git worktree add ../pushup-worktrees/issue-287 -b agent/luna/issue-287 origin/main
cd ../pushup-worktrees/issue-287
```

Off an explicit base — substitute the base ref for `origin/main`.

Resume work on a branch that already exists (note: no `-b`):

```bash
git worktree add ../pushup-worktrees/issue-287 agent/luna/issue-287
```

Claude Code sessions can use their built-in worktree support instead. The point is the
same — one tree per agent.

## Everyday operations

- List active worktrees: `git worktree list`
- Remove when the PR merges: `git worktree remove ../pushup-worktrees/issue-287`
- Drop stale admin entries: `git worktree prune`

`git worktree add` fails rather than clobbering if the target directory exists or the
branch is already checked out elsewhere. That error is the isolation working — pick a
different path, or `cd` into the existing worktree.

## Cleaning up

When a branch's PR is merged or abandoned, remove its worktree so the list stays readable,
then delete the branch if you own it:

```bash
git worktree remove ../pushup-worktrees/issue-287
git branch -d agent/luna/issue-287
```

Run `git worktree prune` if a worktree directory was deleted by hand and git still lists it.

## Recovering from a collision

If two agents have already tangled the main checkout:

1. **Do not** `git reset` or `git switch` there while agents are live — that compounds the
   problem. Pause the agents first, or let them finish.
2. `git stash` or commit the stray edits onto the branch they belong to.
3. Move each agent into its own worktree before restarting.
4. `git worktree prune` to clear any stale entries.
