---
name: factory
description: Drive the HermesMarkdown plan factory — ship a bug or feature end to end into a release PR, create a plan folder, list plan states, advance plans through architect → engineer → review, or unblock a plan after the human answers questions. Use when the user says /factory, gives the factory a bug or feature to ship, asks to queue/start/advance/run a feature through the pipeline, asks what plans are blocked or in review, or wants to unblock a plan.
---

# Factory

The factory moves plan folders in `next-client/plans/NNN-<slug>/` through these states:

`new → specced → building → review → (changes-requested → building → review) → approved → merged`

A plan can go to `blocked` at any point. Each stage is run by the matching agent:

| State | Agent | Next state |
|---|---|---|
| new | hermes-architect (small plans: hermes-engineer) | specced / blocked (small: review / blocked) |
| specced, building, changes-requested | hermes-engineer | review / blocked |
| review | hermes-review | approved / changes-requested (a 2nd rejection → blocked) |
| blocked (answers filled) | hermes-architect via `unblock` | the state it was blocked from |

The folder contract, frontmatter keys and the `blocked.md` format are in `next-client/plans/README.md`. Read it when you need detail.

## Ship: the default path

When the user hands the factory a bug or feature, use `ship`. It does everything:

```bash
scripts/factory ship "<feature, in the user's words>" [--small] [--commit]
scripts/factory ship --bug "<bug, in the user's words>" [--commit]
scripts/factory ship NNN [--commit]     # continue a plan, e.g. after its questions are answered
```

1. **Branch.** It stays on the current `release/<version>` branch if that version has no tag yet. Otherwise it starts `release/<next>` from `origin/trunk` and commits the version bump (minor for a feature, patch for a bug).
2. **Plan.** It writes the request into a new plan's `brief.md`. A bug is a small plan whose brief says to write a reproducing test first.
3. **Stages.** It runs architect → engineer → review until `approved`. If the plan blocks with unanswered questions, it stops (exit 3). Once every `Answer:` line is filled, `ship NNN` folds the answers in and carries on by itself.
4. **Learn.** If a stage failed or review sent the change back, it runs `learn` so `reports/lessons.md` ships with the change.
5. **Release PR.** It commits everything with the plan's title (no attribution trailers), pushes, then opens the `Release X.Y.Z` PR with the `release` label, or adds this change's section from `reports/pr.md` to the open one.

How to drive it: the user only hands over the request, answers questions, and gets a ready PR. Don't ask them anything else.
- **Start right away.** A bug or feature from the user is the go-ahead: skip the dry run and run `ship ... --commit` in the background (`run_in_background`). Each stage is a full headless session, so it takes a while. Pick `--bug` or `--small` yourself from the request. Tell the user in one line that it's running.
- **Dirty tree.** `ship` refuses to start while the working tree is dirty. If the changes are clearly finished work, ask once whether to commit them onto the current release branch first.
- **Blocked.** Ask the questions from `blocked.md` with AskUserQuestion: up to 4 per call, each with its `Recommended:` answer as the first option, labelled "(Recommended)". Write the answers on the `Answer:` lines, then run `scripts/factory ship NNN --commit` in the background again. No other steps are needed.
- **CI.** Once the PR is open, watch it in the background (`gh pr checks <n> --watch --interval 30`). If CI fails, fix it yourself, as the `release-pr` skill describes, and push again. Only come back to the user when the PR is green, or when a fix needs their decision.
- **Done.** Report once: the PR link, what shipped (from `reports/pr.md`), the cost (`scripts/factory stats`), and, if `reports/lessons.md` exists, one line saying rule proposals are waiting. Apply those proposals only when the user asks. Merging and `set NNN merged` are the user's call.

## Commands

Run these from the repo root:

```bash
scripts/factory ship "<request>" [--bug] [--small] [--commit]
scripts/factory new <slug> [title...] [--small]  # scaffold brief.md (state: new)
scripts/factory list                    # table of plans, states and spend
scripts/factory stats                   # spend, fix rounds, first-review approval rate
scripts/factory run [NNN]               # dry run: what would happen
scripts/factory run [NNN] --commit      # actually run the next stage
scripts/factory unblock NNN [--commit]  # fold answers in blocked.md, resume
scripts/factory learn NNN [--commit]    # propose rule changes from a finished plan
scripts/factory set NNN merged          # human-only states
```

## How to use it

1. **Creating a plan.** Run `new`, then write the user's idea into the generated `brief.md` (Problem / Desired behavior / Out of scope). Leave the frontmatter as it is. Add `--small` when the brief fully describes the change (one screen, no design decisions): it skips the architect, saving a whole session.
2. **Advancing.** Always run without `--commit` first and show the user the dry-run lines. Add `--commit` only when the user asked to run it. Stages are slow (each one is a full headless Claude session), so use `run_in_background` for `--commit` runs.
3. **Blocked plans.**
   - Show the user the questions in `blocked.md`, each with its `Recommended:` answer.
   - Write their answers on the `Answer:` lines.
   - Then run `unblock NNN` (a dry run first).
4. **After `approved` (without `ship`).** The change is uncommitted in the working tree. Committing, the PR and `set NNN merged` are the user's call; `ship NNN --commit` does the commit and PR when they want it.
5. **Learning from a plan.** When an approved plan needed fix rounds, failed runs or orchestrator notes, offer `learn NNN` (a dry run first). It only writes `reports/lessons.md`. Show the user each proposal and apply only the ones they accept, to the file the proposal names.
6. **Metrics.** When the user asks how the factory is doing, run `stats`. It reads every `usage.tsv`, archived plans included.

## Rails (don't work around them)

- Agents never commit. Only the script commits, in `ship`, after review approves. `.claude/hooks/factory-guard.sh` blocks git writes when `HERMES_FACTORY=1`. The script also blocks the plan if HEAD or the branch moves during a stage.
- The script refuses to run on `trunk`/`main`.
- The script won't start a fresh build (`specced`) while code outside `plans/` is uncommitted, so plans don't mix their changes.
- If a stage fails 2 times in a row, the plan is blocked. A retry resumes the failed session.
- Stages run on per-stage models (architect `opus`, engineer and reviewer `sonnet`; override with `FACTORY_MODEL_*`). Each run's cost goes into the plan's `usage.tsv`. If a stage stops part-way, a `RESUME:` note goes into `mailbox.md`.
- Testing hook: `FACTORY_CLAUDE=<stub>` replaces the `claude` binary, and `FACTORY_PERMISSION_MODE` overrides `acceptEdits`.
