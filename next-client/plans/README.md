# Plans

This folder holds engineering plans. There are two kinds:

- **Legacy flat plans** (`<feature-slug>.md`) and their reports in `reports/`. These are written when the `hermes-*` agents are used directly.
- **Factory plans** (`NNN-<slug>/`). These are driven by `scripts/factory`, which moves each plan through architect → engineer → review. Numbers are permanent and never reused.
- **Archived plans** (`archive/`). Shipped plans of either kind move here. They are history: they record why the code is the way it is, but the code may have changed since, so they are not the current spec. `scripts/factory` ignores them, except when it picks the next plan number. When archiving a factory plan, delete its `.run.json` and `.run.log` first.

## Factory folder contract

```
NNN-<slug>/
├── brief.md          # human: the product idea + frontmatter state (committed)
├── prd.md            # hermes-architect: engineering PRD; absent for small plans (committed)
├── blocked.md        # any agent: questions for the human (committed)
├── mailbox.md        # agents + factory: handoffs, fix lists, RESUME notes (committed)
├── reports/
│   ├── architect.md
│   ├── engineer.md
│   ├── review.md
│   ├── pr.md         # hermes-engineer: this change's section of the release PR
│   └── lessons.md    # factory learn: proposed rule changes (committed)
├── usage.tsv         # factory: cost, turns and tokens per stage run (committed)
├── .run.json         # factory bookkeeping: stage, attempts, last exit, session (gitignored)
└── .run.log          # last headless session output (gitignored)
```

`brief.md` frontmatter:

```yaml
---
state: new              # see States
size: normal            # small: skip the architect, brief.md is the spec
kind: feature           # or bug (ship: patch release, reproducing test first)
blocked_from:           # state to resume at after unblock
rejections: 0           # review rejections since the last unblock
created: 2026-10-01T00:00:00Z
---
```

## States

| State | Set by | Next stage |
|---|---|---|
| `new` | `factory new` | hermes-architect writes `prd.md` (small plans: hermes-engineer implements `brief.md`) |
| `specced` | architect | hermes-engineer implements |
| `building` | factory (engineer running or interrupted) | engineer resumes |
| `review` | engineer | hermes-review reviews the working tree |
| `changes-requested` | reviewer | engineer fixes; the second rejection blocks |
| `approved` | reviewer | human commits, opens the PR, merges |
| `merged` | human (`factory set NNN merged`) | none |
| `blocked` | any agent or the factory | human answers `blocked.md`, then `factory unblock NNN` |

## `blocked.md` format

```markdown
## Q1 — <short question>

<context: what the agent found and why it matters>

Recommended: <the agent's suggested answer>
Answer:
```

`factory unblock` refuses to run while any `Answer:` line is empty.

## Commands

```bash
scripts/factory ship "<request>" [--bug] [--small] [--commit]   # whole pipeline → release PR
scripts/factory ship NNN [--commit]                            # continue a plan to the PR
scripts/factory new <slug> [title...] [--small]
scripts/factory list
scripts/factory stats
scripts/factory run [NNN] [--commit]      # dry run unless --commit
scripts/factory unblock NNN [--commit]
scripts/factory learn NNN [--commit]
scripts/factory set NNN <state>
```

## Rails

- **Agents never commit.** Only `factory ship` commits, after review approves, and pushes the release PR.
  - Every stage runs with `HERMES_FACTORY=1`, and `.claude/hooks/factory-guard.sh` blocks git writes (commit, push, reset, checkout, rebase, stash, branch, …).
  - The script records HEAD and the branch before each stage. If either moved, it blocks the plan.
- **No runs on `trunk`/`main`.**
- **One build at a time.** A fresh build (`specced`) won't start while code outside `plans/` is uncommitted.
- **Retries.** A stage that ends without a valid state change leaves a `RESUME:` note in `mailbox.md` and keeps the old state, except a failed engineer stage, which stays `building` so its partial code doesn't trip the dirty-tree guard. The retry resumes the failed session (`--resume`) rather than starting cold. After 2 failed attempts in a row, the plan is blocked.

## Cost

- **Models per stage.** The architect runs on `opus`; the engineer and reviewer run on `sonnet`. Override with `FACTORY_MODEL_ARCHITECT`, `FACTORY_MODEL_ENGINEER` and `FACTORY_MODEL_REVIEW`.
- **Small plans** (`factory new <slug> --small`, or `size: small` in `brief.md`) skip the architect. Use them for changes a short brief fully describes.
- **Lean reading.** In factory mode the engineer and reviewer work from the PRD's citations, not `ARCHITECTURE.md`/`DESIGN.md`, so the PRD must cite everything they need.
- **Fewer loops.** The reviewer only requests changes for blocker or major findings.
- **Spend.** Each stage run appends a row to `usage.tsv`, and `factory list` shows each plan's total.
- **Metrics.** `factory stats` reads every `usage.tsv`, archived plans included. It shows each plan's runs, failed runs, fix rounds and spend, plus the totals: spend per done plan (approved or merged), the share of done plans approved on their first review, and spend by agent.

## Learning

`factory learn NNN` runs on an approved or merged plan. hermes-review reads the plan's mailbox, review and usage, compares the corrections against `AGENT_RULES.md`, `AGENTS.md`, `.claude/agents/` and the stage prompts, and writes up to 5 rule proposals to `reports/lessons.md`. It edits nothing else; the human applies the proposals they accept. Its cost is logged in `usage.tsv` with `from: learn`.
