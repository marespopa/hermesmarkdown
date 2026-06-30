import { installVaultFiles, type ManagedFile } from "./vault-setup";
import type { StarterPackId } from "@/app/atoms/ui-atoms";

export interface StarterPack {
  id: StarterPackId;
  label: string;
  description: string;
  icon: string;
  files: ManagedFile[];
  entryPoint: string | null;
}

const notesPkmFiles: ManagedFile[] = [
  {
    path: "moc.md",
    description: "Map of Content — entry point for the Notes/PKM starter pack",
    content: `---
title: "moc"
status: active
scope: "Index note linking all key topics in this vault"
read_when: [orientation, vault overview, where to start]
related: ["atomic-notes-guide.md", "daily-note.md", "callout-demo.md"]
tags: [pkm, index]
---

# Map of Content

This note is your vault's entry point. Each link below points to a note covering a distinct topic.

## Writing

- [[atomic-notes-guide]] — Principles for writing atomic notes
- [[daily-note]] — A daily journal template

## Demos

- [[callout-demo]] — All supported callout block styles

---

> [!tip] WikiLinks
> Click any \`[[link]]\` to open the referenced note. Type \`[[\` in the editor to create a new one.
`,
  },
  {
    path: "atomic-notes-guide.md",
    description: "Zettelkasten one-idea-per-note principles",
    content: `---
title: "atomic-notes-guide"
status: active
scope: "Principles of writing one-idea-per-note (Zettelkasten style)"
read_when: [writing a note, note-taking strategy, zettelkasten, atomic notes]
related: ["moc.md"]
tags: [pkm, writing]
---

# Atomic Notes Guide

An atomic note captures exactly one idea — small enough to fit in your head, large enough to stand on its own.

## Why atomic?

- **Reusable.** A single-idea note can be linked from many contexts without duplication.
- **Findable.** Short notes are easier to search and surface in queries.
- **Composable.** Large ideas emerge from linking small ones, not from writing one huge file.

## What to put in a note

- One concept, argument, or observation per file.
- A \`scope\` field in frontmatter: a single sentence describing what the note covers.
- At least one \`related\` link — notes gain value by connecting to other notes.

## What not to put in a note

- Multiple unrelated ideas (split them into separate files instead).
- Raw captured text you haven't processed — that belongs in a daily note first.

## Related

- [[moc]] — Start here to navigate the vault
`,
  },
  {
    path: "daily-note.md",
    description: "Daily journal template with callout example",
    content: `---
title: "daily-note"
status: draft
scope: "Template for daily journaling and end-of-day reflection"
read_when: [journal, daily review, standup, morning pages]
related: ["moc.md"]
tags: [journal, template]
---

# Daily Note

> [!note] This is a template
> Replace the sections below with your own content. Duplicate this file for each day (e.g. \`2026-07-01.md\`).

## Today

What are you working on?

## Wins

What went well?

## Blockers

What slowed you down or is still unresolved?

## Tomorrow

What's the first thing you'll do when you sit down?
`,
  },
  {
    path: "callout-demo.md",
    description: "Demonstration of all supported callout block styles",
    content: `---
title: "callout-demo"
status: active
scope: "Shows all supported callout block styles available in HermesMarkdown"
read_when: [formatting, callout syntax, callout blocks, blockquote]
related: ["moc.md"]
tags: [demo, formatting]
---

# Callout Demo

HermesMarkdown supports Obsidian-compatible callout blocks. Use them to highlight key information.

## Note

> [!note] Plain note
> Use this for supplementary information that doesn't fit the main flow.

## Warning

> [!warning] Warning
> Use this when the reader must take care — a destructive action, a known gotcha, or a prerequisite.

## Tip

> [!tip] Tip
> Use this for shortcuts, best practices, or optional enhancements.

## Important

> [!important] Important
> Use this for must-read information that would cause problems if missed.

---

**Syntax:** \`> [!type] Optional title\` followed by the body on indented lines.
`,
  },
];

const engineeringFiles: ManagedFile[] = [
  {
    path: "AGENTS.md",
    description: "Vault overview for AI agents and LLMs",
    content: `---
title: "AGENTS"
status: active
scope: "Engineering vault overview — structure, conventions, and entry points for AI agents"
read_when: [always]
related: ["adr-001-choose-stack.md", "adr-002-local-first.md", "bug-tracker.md", "meeting-notes.md"]
tags: [agent, meta, engineering]
---

# AGENTS

This file gives AI agents and LLMs a map of the vault before they read anything else.

## Vault Structure

| Pattern | Purpose |
|---------|---------|
| \`adr-*.md\` | Architecture Decision Records — one per decision |
| \`bug-tracker.md\` | Open and in-progress bugs (table format) |
| \`meeting-notes.md\` | Recurring team meeting notes |

## Frontmatter Schema

Every file in this vault uses these six fields:

\`\`\`yaml
title: "kebab-case-name"
status: draft | active | archived
scope: "One sentence describing what this file covers."
read_when: [list, of, query, contexts]
related: ["path/to/related.md"]
tags: [domain, tags]
\`\`\`

The \`read_when\` field is a filter hint: load this file only when the agent's task matches one of the listed contexts. Set to \`always\` for files (like this one) that should always be in context.

## ADR Convention

ADRs follow the Nygard format: **Status → Context → Decision → Consequences**.
File them as \`adr-NNN-short-title.md\`. Never delete an ADR — set \`status: archived\` instead.

## Bug Tracker Convention

Bugs live in a single table in \`bug-tracker.md\`. Columns: ID, Description, Status, Owner.
Status values: \`open\`, \`in-progress\`, \`resolved\`.

## Agent Instructions

- Read \`read_when\` before loading any file — skip files that don't match the current task.
- Prefer \`scope\` fields for a quick summary before loading full content.
- Never modify \`adr-*.md\` files unless explicitly asked — they are decision records, not drafts.
`,
  },
  {
    path: "adr-001-choose-stack.md",
    description: "ADR: technology stack decision",
    content: `---
title: "adr-001-choose-stack"
status: active
scope: "Decision to adopt Next.js 14 with App Router as the project's web framework"
read_when: [architecture, stack decision, Next.js, framework choice]
related: ["AGENTS.md", "adr-002-local-first.md"]
tags: [adr, architecture, engineering]
---

# ADR 001 — Choose Stack

## Status

Active

## Context

The project needs a web framework that supports:
- Server and client components in the same codebase
- Fast iteration with hot reload
- Strong TypeScript support
- Easy deployment to Vercel or equivalent

Multiple frameworks were evaluated: Next.js 14 (App Router), Remix, SvelteKit, and a plain Vite SPA.

## Decision

Adopt **Next.js 14 with App Router**.

Reasons:
- App Router's React Server Components reduce client bundle size for content-heavy pages.
- File-based routing with layouts is well-matched to the product's multi-pane structure.
- Strong ecosystem and first-class TypeScript support reduce integration friction.

## Consequences

- Team must understand the Server Component / Client Component boundary — components that use hooks or browser APIs must be marked \`"use client"\`.
- Routing is opinionated; migrating away later would require significant rework.
- Bundle size savings from RSC only materialise if client components are kept lean.
`,
  },
  {
    path: "adr-002-local-first.md",
    description: "ADR: local-first storage via File System Access API",
    content: `---
title: "adr-002-local-first"
status: active
scope: "Decision to use the File System Access API for local-first vault storage"
read_when: [architecture, storage, local-first, File System Access API, offline]
related: ["AGENTS.md", "adr-001-choose-stack.md"]
tags: [adr, architecture, storage, engineering]
---

# ADR 002 — Local-First Storage

## Status

Active

## Context

Notes need to be stored somewhere. Options considered:

1. **Cloud-only** (database per user) — simple to implement but requires auth, costs scale with users, offline is a secondary concern.
2. **Local-only** (IndexedDB or localStorage) — no auth required but content is trapped in browser storage; not portable.
3. **File System Access API** — reads and writes real \`.md\` files on the user's disk; no auth, fully portable, works offline.

## Decision

Use the **File System Access API** (\`showDirectoryPicker\`, \`getFileHandle\`, \`createWritable\`) as the primary storage layer.

Google Drive is offered as an optional cloud sync path for users who want backup, but is not required.

## Consequences

- Works only in Chromium-based browsers (Chrome, Edge, Brave). Firefox and Safari do not support the API.
- Files live on the user's disk — no server-side data is required, which eliminates a class of privacy concerns.
- Permission must be re-granted after each browser restart (a known UX limitation of the API).
- The vault is a plain folder of \`.md\` files — users can open them in any editor.
`,
  },
  {
    path: "bug-tracker.md",
    description: "Open and in-progress bugs",
    content: `---
title: "bug-tracker"
status: active
scope: "Open and in-progress bugs for the current project"
read_when: [bugs, issues, backlog, what needs fixing]
related: ["AGENTS.md", "meeting-notes.md"]
tags: [engineering, bugs, tracking]
---

# Bug Tracker

| ID | Description | Status | Owner |
|----|-------------|--------|-------|
| BUG-001 | Sidebar width resets on hard refresh | open | — |
| BUG-002 | WikiLink preview flickers on hover | in-progress | — |
| BUG-003 | Formula engine ignores leading \`=\` in quoted strings | open | — |

---

**Status values:** \`open\` · \`in-progress\` · \`resolved\`
Add new rows above the separator. Move resolved bugs to an \`## Archive\` section below.
`,
  },
  {
    path: "meeting-notes.md",
    description: "Recurring team meeting notes template",
    content: `---
title: "meeting-notes"
status: draft
scope: "Template for recurring team meeting notes and action items"
read_when: [meeting, standup, team sync, retrospective, planning]
related: ["AGENTS.md", "bug-tracker.md"]
tags: [engineering, meeting, template]
---

# Meeting Notes

> [!note] Template
> Duplicate this file for each meeting, e.g. \`2026-07-01-standup.md\`.

## Attendees

-

## Agenda

1.
2.
3.

## Decisions

-

## Action Items

- [ ] Owner — task description
- [ ] Owner — task description
`,
  },
];

const financeFiles: ManagedFile[] = [
  {
    path: "budget-tracker.md",
    description: "Monthly budget with income, expenses, and net summary",
    content: `---
title: "budget-tracker"
status: active
scope: "Monthly income and expense budget with running totals, savings target, and net balance"
read_when: [budget, expenses, monthly finances, spending, income, savings]
related: ["debt-tracker.md", "recurring-expenses.md"]
tags: [finance, budget]
---

# Budget Tracker

## Income

| Source | Amount |
|--------|-------:|
| Salary | $5,000 |
| Freelance | $800 |
| Side project | $400 |
| Total | =SUM(B2:B4) |

## Expenses

| Category | Amount |
|----------|-------:|
| Rent | $1,800 |
| Groceries | $600 |
| Utilities | $250 |
| Transport | $200 |
| Subscriptions | $307 |
| Total | =SUM(B2:B6) |

## Summary

| | Amount |
|--|-------:|
| Income | $6,200 |
| Expenses | $3,157 |
| Net | =B2-B3 |
| Savings target (20%) | =20%*B2 |
| Saving enough? | =IF(B4>=B5,"Yes ✓","No ✗") |

---

> [!tip] Formulas
> Cells starting with \`=\` are live formulas — type \`=\` in any cell to see all available functions. The \`$\` currency symbol carries through to results automatically. \`=20%*B2\` is shorthand for 20 ÷ 100 × B2.
`,
  },
  {
    path: "debt-tracker.md",
    description: "Active debts, balances, interest costs, and payoff schedule",
    content: `---
title: "debt-tracker"
status: active
scope: "Active debts with balances, monthly payments, interest costs, and payoff schedule"
read_when: [debt, loans, payoff, liabilities, credit, interest]
related: ["budget-tracker.md", "recurring-expenses.md"]
tags: [finance, debt]
---

# Debt Tracker

| Creditor | Balance | Rate | Monthly Interest | Monthly Payment | Months Left |
|----------|--------:|-----:|-----------------:|----------------:|------------:|
| Bank loan | $12,000 | 8.5% | =8.5%*B2/12 | $500 | 24 |
| Credit card | $2,400 | 24% | =24%*B3/12 | $300 | 8 |
| Friend loan | $1,000 | 0% | $0 | $200 | 5 |
| **Total** | =SUM(B2:B4) | — | =SUM(D2:D4) | =SUM(E2:E4) | — |

## Payoff Stats

| | Value |
|--|------:|
| Total debt | =SUM(B2:B4) |
| Avg monthly interest | =AVERAGE(D2:D3) |
| Highest balance | =MAX(B2:B4) |

---

> [!tip] Avalanche method
> Pay minimums on all debts, then direct extra cash to the highest-rate one first — this minimises total interest paid. Sort by Rate descending to see the priority order.
`,
  },
  {
    path: "recurring-expenses.md",
    description: "Monthly subscriptions and fixed costs normalised to monthly amounts",
    content: `---
title: "recurring-expenses"
status: active
scope: "Monthly recurring subscriptions and fixed costs, normalised to monthly amounts with average and total"
read_when: [subscriptions, recurring, fixed costs, monthly outgoings]
related: ["budget-tracker.md", "debt-tracker.md"]
tags: [finance, expenses, subscriptions]
---

# Recurring Expenses

| Service | Billed | Frequency | Monthly |
|---------|-------:|:---------:|--------:|
| Internet | $60 | Monthly | $60 |
| Phone plan | $40 | Monthly | $40 |
| Streaming A | $45 | Monthly | $45 |
| Streaming B | $120 | Annual | =ROUND(B5/12,0) |
| Cloud storage | $36 | Annual | =ROUND(B6/12,0) |
| Gym | $150 | Monthly | $150 |
| News | $84 | Annual | =ROUND(B8/12,0) |
| Total | — | — | =SUM(D2:D8) |
| Average | — | — | =AVERAGE(D2:D8) |
| Share of $5,000 salary | — | — | =ROUND(D9/5000*100,1) |

---

> [!tip] Annual subscriptions
> Annual costs are divided by 12 using \`=ROUND(B/12, 0)\` so they compare fairly with monthly ones. The last row shows what percentage of a $5,000 salary these subscriptions consume.
`,
  },
];

export const STARTER_PACKS: StarterPack[] = [
  {
    id: "empty",
    label: "Empty Vault",
    description: "Start fresh — no example files.",
    icon: "🗂",
    files: [],
    entryPoint: null,
  },
  {
    id: "notes-pkm",
    label: "Notes / PKM",
    description: "Atomic notes, a daily journal template, a map of content, and callout examples.",
    icon: "📓",
    files: notesPkmFiles,
    entryPoint: "moc.md",
  },
  {
    id: "engineering",
    label: "Engineering",
    description: "AGENTS.md, two ADRs, a bug tracker table, and a meeting notes template.",
    icon: "⚙️",
    files: engineeringFiles,
    entryPoint: "AGENTS.md",
  },
  {
    id: "finance",
    label: "Personal Finance",
    description: "Budget, debt tracker, and recurring expenses — all with formula cells.",
    icon: "💰",
    files: financeFiles,
    entryPoint: "budget-tracker.md",
  },
];

export function getStarterPack(id: StarterPackId): StarterPack {
  return STARTER_PACKS.find((p) => p.id === id) ?? STARTER_PACKS[0];
}

export async function installStarterPack(
  packId: StarterPackId,
  vaultHandle: FileSystemDirectoryHandle,
): Promise<void> {
  const pack = STARTER_PACKS.find((p) => p.id === packId);
  if (!pack || pack.files.length === 0) return;
  await installVaultFiles(pack.files, vaultHandle, false, null, null);
}
