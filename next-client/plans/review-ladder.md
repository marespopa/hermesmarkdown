# Review ladder: daily → yearly

Roadmap for the five-level review workflow: daily captures, weekly synthesis, monthly review, quarterly check, yearly retrospective. Each level is a plain Markdown note in the vault, built from the level below it. That gives local-first storage, zero latency, and a portable knowledge base you own.

This file is the overview. The work itself is split into factory plans (`NNN-<slug>/brief.md`).

**Status (2026-10-12): superseded.** Generated rollups were removed. Weekly, monthly, quarterly and yearly sheets are now plain notes created from templates; see [worklog-funnel.md](worklog-funnel.md). This file is kept as history.

## What already ships

| Level | Already in the app |
|---|---|
| 1. Daily captures | **Today's sheet** (`2026-10-11.md`, Daily Sheets Folder, Journal/Daily template), **Quick jot** (one-line append from anywhere), slash menu (`/task`, `/code`, `/table`, …). Local vault storage (File System Access / OPFS). |
| 2. Weekly synthesis | Weekly sheets `2026-W41.md` (007): Done / Blocked / Still open built from daily **tasks**, Refresh rollup, `## Notes`. Split panes. |
| 3. Monthly review | Monthly sheets `2026-10.md` (007): tasks from the days plus each week's Notes. Interactive table editing. Token cost dialog (tokenizer worker). |
| 4. Quarterly check | Nothing. No quarter level, no PDF export. |
| 5. Yearly retrospective | Nothing beyond plain-text notes in the vault. |

## Gaps → plans

| # | Plan | Level | Fills the gap |
|---|---|---|---|
| 008 | `daily-slash-commands` | 1 | `/daily` opens or creates today's sheet; `/jot` sends the current line or selection (code, workout sets) to today's sheet without leaving the note. |
| 009 → funnel | `rollup-highlights` (superseded) | 2 | Collect `#win` / `#learned` / `#blocker` / `#decision` lines into a **Highlights** section, flag recurring blockers; **Review week** opens the weekly sheet with its days in a split pane. |
| 010 → funnel | `rollup-templates` (superseded) | 3 | `Journal/Weekly` / `Journal/Monthly` templates for the Notes area; a **Metrics** table carried forward from the previous period; per-section **token budgets** (`212 / 300 tokens`) for lean summaries. |
| 011 | `quarterly-yearly-rollups` | 4, 5 | `2026-Q4.md` and a yearly sheet: numbers from the days, the story from the Notes one level below (months → quarter → year). |
| 012 | `pdf-export` | 4 | Local-only **Export as PDF…** of the rendered note (print pipeline), respecting sensitive notes. |
| — | [`worklog-funnel.md`](worklog-funnel.md) | 1–5 | Masterplan: rollup templates + period tokens, Focus down / planned-vs-done up, Highlights + days overview, Metrics carry-forward, sheet links create sheets, shortcuts, Go to date, Review week. |

## Order and dependencies

```
008 daily-slash-commands      (independent)
012 pdf-export                (independent)
009 rollup-highlights   ──┐
010 rollup-templates    ──┼──▶ 011 quarterly-yearly-rollups
                          │     (works without 009/010; uses them if shipped)
007 rollups (merged) ─────┘
```

Suggested order: **008 → 009 → 010 → 011 → 012**. 008 and 012 are small and independent, so they can run in parallel with anything. 011 goes last among the rollup plans so it inherits highlights and templates instead of retrofitting them. Each plan touches `app/utils/rollup/*` in turn, so run 009 → 010 → 011 one at a time (the factory's "one build at a time" rail enforces this anyway).

## Decisions left to the architect (flagged in the briefs)

- 008: does `/jot` move the line out of the current note or copy it?
- 009: the final highlight tag names (`#blocker` vs `#blocked` confusion).
- 010: how a budget is written in Markdown (comment vs frontmatter); whether Metrics values are cleared or kept on carry-forward.
- 011: the yearly sheet's file name (`2026.md` clashes with ordinary notes); how to keep a year's Done list readable.
- 012: print pipeline vs client-side PDF library; whether to take over Cmd/Ctrl+P.

## Principles carried through every plan

- Plain Markdown on disk, readable in Obsidian / VS Code. No hidden databases.
- No AI in rollups: generated content is predictable and refreshable; only the region between `rollup:start` / `rollup:end` is ever rewritten.
- No new chrome beyond what a command needs; everything reachable from the palette and keyboard, and usable on touch.
- Sensitive notes stay gated (rollups inherit `sensitive: true`; export needs the unlock).

## Running it

No factory. All factory plans (004–012) are archived in `archive/`. The remaining work is the single plan [`worklog-funnel.md`](worklog-funnel.md), built directly phase by phase (1 → 7).
