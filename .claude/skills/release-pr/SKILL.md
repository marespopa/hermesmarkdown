---
name: release-pr
description: Ship HermesMarkdown work as a release pull request — start a release/<version> branch from the latest trunk with the version bumped, commit, push, open the "Release X.Y.Z" PR with the release label, and let CI run the typecheck, lint, tests and build (never locally) while you watch the result. Use when the user asks to create/open the PR, ship or release the current work, start a new release branch, or run the checks in CI.
---

# Release PR

Every change ships as a release: one `release/<version>` branch per release, one PR into `trunk`, labelled `release`. Merging that PR tags and publishes the release (`.github/workflows/release.yml`), and CI (`.github/workflows/ci.yml`) runs the checks on the PR.

## 1. Branch from the latest trunk, up front

Before writing code (or as soon as you notice the current branch was already released):

```bash
git fetch origin
git checkout trunk && git pull --ff-only
git checkout -b release/<version>
```

- Work only continues on a `release/*` branch whose version hasn't shipped yet. If `trunk` already has a later "Release X.Y.Z" commit or a `vX.Y.Z` tag for it, start a new branch from trunk.
- Pick the version now and never rename the branch afterwards: renaming closes the open PR.
- Work directly on the branch. No worktrees.

## 2. Bump the version

From `next-client/`:

```bash
node scripts/bump-version.mjs --minor   # new features
node scripts/bump-version.mjs --patch   # fixes only
```

`release/<version>` must match the new `package.json` version. Bump once per release, not per commit.

## 3. Commit

- Group related changes into commits with a short imperative subject and a body that says what changed for the user and why.
- **No attribution trailers.** Leave out `Co-Authored-By:` and any other Claude lines in commit messages.
- Don't commit generated noise. The `next dev` block in `next-client/AGENTS.md` is expected; keep it if it's there.

## 4. Push and open the PR

```bash
git push -u origin release/<version>
gh pr create --base trunk --head release/<version> --label release \
  --title "Release <version>" --body-file -   # body on stdin
```

The PR body follows earlier release PRs (`gh pr view <previous number>`):
- First line: what the release does in one sentence, plus "Bumps the version to X.Y.Z."
- One `##` section per feature or fix, as short bullets on behaviour first, then wiring worth a reviewer's attention.
- `## Docs`: user docs and component docs touched.
- `## Checks`: say that typecheck, lint, tests and build run in CI on the PR, and list honestly what was **not** checked (for example, visuals in a browser, a real device or OS).
- End with the PR attribution line from the session's instructions, if one is given.

Use sample data from products, tasks and statuses only. No person names, accounts or other personal details.

## 5. Checks run in CI, not locally

Don't run `tsc`, `eslint`, `vitest` or `next build` locally unless the user asks. The CI `Verify application` job runs, in `next-client/`:
`corepack yarn install --immutable` → `tsc --noEmit` → `lint` → `test --run` → `build`.

Watch it in the background and report the outcome:

```bash
gh pr checks <number> --watch --interval 30
```

- **Green:** tell the user the PR is ready to merge. Merging is the user's call.
- **Red:** read the failing step's log (`gh run view <run-id> --log-failed`), fix it on the same branch, push a follow-up commit (CI reruns on push), and watch again. Report what failed and what you changed. Never push a change you know still breaks the suite.

## 6. Follow-up work for the same release

Until the PR merges, more changes go on the same branch: commit, push, update the PR body (`gh pr edit <number> --body-file -`) so it still describes the whole release, then watch CI again. After it merges, the next change starts again at step 1.
