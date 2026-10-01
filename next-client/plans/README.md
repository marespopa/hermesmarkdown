# Plans

This folder holds engineering plans. There are two kinds:

- **Legacy flat plans** (`<feature-slug>.md`) and their reports in `reports/`. These are written when the `hermes-*` agents are used directly.
- **Factory plans** (`NNN-<slug>/`). These are driven by `scripts/factory`, which moves each plan through architect → engineer → review. Numbers are permanent and never reused.

## Factory folder contract

```
NNN-<slug>/
├── brief.md          # human: the product idea + frontmatter state (committed)
├── prd.md            # hermes-architect: engineering PRD (committed)
├── blocked.md        # any agent: questions for the human (committed)
├── mailbox.md        # agents + factory: handoffs, fix lists, RESUME notes (committed)
├── reports/
│   ├── architect.md
│   ├── engineer.md
│   └── review.md     # committed
├── .run.json         # factory bookkeeping: stage, attempts, last exit (gitignored)
└── .run.log          # last headless session output (gitignored)
```

`brief.md` frontmatter:

```yaml
---
state: new              # see States
blocked_from:           # state to resume at after unblock
rejections: 0           # review rejections since the last unblock
created: 2026-10-01T00:00:00Z
---
```

## States

| State | Set by | Next stage |
|---|---|---|
| `new` | `factory new` | hermes-architect writes `prd.md` |
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
scripts/factory new <slug> [title...]
scripts/factory list
scripts/factory run [NNN] [--commit]      # dry run unless --commit
scripts/factory unblock NNN [--commit]
scripts/factory set NNN <state>
```

## Rails

- **Agents never commit.**
  - Every stage runs with `HERMES_FACTORY=1`, and `.claude/hooks/factory-guard.sh` blocks git writes (commit, push, reset, checkout, rebase, stash, branch, …).
  - The script records HEAD and the branch before each stage. If either moved, it blocks the plan.
- **No runs on `trunk`/`main`.**
- **One build at a time.** A fresh build (`specced`) won't start while code outside `plans/` is uncommitted.
- **Retries.** A stage that ends without a valid state change leaves a `RESUME:` note in `mailbox.md` and keeps the old state. After 3 failed attempts in a row, the plan is blocked.
