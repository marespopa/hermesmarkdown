---
name: factory
description: Drive the HermesMarkdown plan factory — create a plan folder, list plan states, advance plans through architect → engineer → review, or unblock a plan after the human answers questions. Use when the user says /factory, asks to queue/start/advance/run a feature through the pipeline, asks what plans are blocked or in review, or wants to unblock a plan.
---

# Factory

The factory moves plan folders in `next-client/plans/NNN-<slug>/` through these states:

`new → specced → building → review → (changes-requested → building → review) → approved → merged`

A plan can go to `blocked` at any point. Each stage is run by the matching agent:

| State | Agent | Next state |
|---|---|---|
| new | hermes-architect | specced / blocked |
| specced, building, changes-requested | hermes-engineer | review / blocked |
| review | hermes-review | approved / changes-requested (a 2nd rejection → blocked) |
| blocked (answers filled) | hermes-architect via `unblock` | the state it was blocked from |

The folder contract, frontmatter keys and the `blocked.md` format are in `next-client/plans/README.md`. Read it when you need detail.

## Commands

Run these from the repo root:

```bash
scripts/factory new <slug> [title...]   # scaffold brief.md (state: new)
scripts/factory list                    # table of plans and states
scripts/factory run [NNN]               # dry run: what would happen
scripts/factory run [NNN] --commit      # actually run the next stage
scripts/factory unblock NNN [--commit]  # fold answers in blocked.md, resume
scripts/factory set NNN merged          # human-only states
```

## How to use it

1. **Creating a plan.** Run `new`, then write the user's idea into the generated `brief.md` (Problem / Desired behavior / Out of scope). Leave the frontmatter as it is.
2. **Advancing.** Always run without `--commit` first and show the user the dry-run lines. Add `--commit` only when the user asked to run it. Stages are slow (each one is a full headless Claude session), so use `run_in_background` for `--commit` runs.
3. **Blocked plans.**
   - Show the user the questions in `blocked.md`, each with its `Recommended:` answer.
   - Write their answers on the `Answer:` lines.
   - Then run `unblock NNN` (a dry run first).
4. **After `approved`.** The change is uncommitted in the working tree. Committing, the PR and `set NNN merged` are the user's call. Never commit as part of a factory step unless the user explicitly asks.

## Rails (don't work around them)

- Agents never commit. `.claude/hooks/factory-guard.sh` blocks git writes when `HERMES_FACTORY=1`. The script also blocks the plan if HEAD or the branch moves during a stage.
- The script refuses to run on `trunk`/`main`.
- The script won't start a fresh build (`specced`) while code outside `plans/` is uncommitted, so plans don't mix their changes.
- If a stage fails 3 times in a row, the plan is blocked. If a stage stops part-way, a `RESUME:` note goes into `mailbox.md`.
- Testing hook: `FACTORY_CLAUDE=<stub>` replaces the `claude` binary, and `FACTORY_PERMISSION_MODE` overrides `acceptEdits`.
