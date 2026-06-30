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
    description: "Vault entry point — project overview, frontmatter schema, and navigation map",
    content: `---
title: "AGENTS"
status: active
scope: "Entry point for the Lighthouse project vault — orients agents and human readers, links to all other files"
read_when: [always]
related: ["architecture.md", "adr-001-database.md", "adr-002-repo-structure.md", "bug-tracker.md", "meeting-notes.md"]
tags: [meta, agent, index]
---

# AGENTS

This file is the entry point for every agent and reader. Read it before opening anything else.

## Project

**Lighthouse** tracks deployment health across services. It collects metrics from CI pipelines, surfaces anomalies, and routes alerts to on-call engineers.

## Vault Map

| File | Purpose |
|------|---------|
| [[architecture]] | System architecture — authoritative reference for how components fit together |
| [[adr-001-database]] | ADR: why PostgreSQL was chosen over MongoDB |
| [[adr-002-repo-structure]] | ADR: why a monorepo was chosen over polyrepo |
| [[bug-tracker]] | Open and in-progress bugs (severity, status, date) |
| [[meeting-notes]] | Team meeting notes — most recent first |

## Frontmatter Schema

Every file in this vault uses these six fields:

\`\`\`yaml
title: "kebab-case-filename"
status: draft | active | archived
scope: "One sentence describing what this file covers."
read_when: [context-a, context-b]
related: ["path/to/related.md"]
tags: [domain, tags]
\`\`\`

**\`read_when\`** is an agent filter hint: load a file only when the task matches one of its listed contexts. Set to \`always\` for files (like this one) that should always be in context.

## Conventions

- **ADRs** follow Nygard format: Status → Context → Decision → Consequences. File as \`adr-NNN-short-title.md\`. Set \`status: archived\` rather than deleting.
- **Bugs** go in [[bug-tracker]] — one row per issue; update \`status\` in place.
- **Meeting notes** go in [[meeting-notes]] — most recent first, informal register.
- **Architecture changes** belong in [[architecture]] or a new ADR, not in meeting notes.
`,
  },
  {
    path: ".hermes/index.yaml",
    description: "Machine-readable vault index with scope and read_when metadata per file",
    content: `version: 1

# Vault index for the Lighthouse Engineering starter pack.
# read_when values are agent filter hints — load a file only when the task
# context matches one of the listed terms. scope is a one-line summary
# suitable for quick relevance filtering before loading full content.

files:
  - path: AGENTS.md
    scope: "Entry point for the Lighthouse project vault — orients agents and readers, links to all other files"
    read_when: [always]

  - path: architecture.md
    scope: "System architecture overview — components, data flow, deployment topology, and known constraints"
    read_when:
      - architecture
      - system design
      - how does X work
      - deployment topology
      - data flow
      - component relationships
      - known constraints

  - path: adr-001-database.md
    scope: "Decision record for choosing PostgreSQL as the primary datastore over MongoDB"
    read_when:
      - database choice
      - storage decision
      - why PostgreSQL
      - schema design
      - architecture decisions

  - path: adr-002-repo-structure.md
    scope: "Decision record for adopting a monorepo over separate per-service repositories"
    read_when:
      - repo structure
      - monorepo
      - code organisation
      - build pipeline
      - architecture decisions

  - path: bug-tracker.md
    scope: "Open and recently resolved bugs — severity, status, and date logged"
    read_when:
      - bugs
      - open issues
      - what is broken
      - severity
      - incident follow-up

  - path: meeting-notes.md
    scope: "Informal team meeting notes — decisions, blockers, and action items by date"
    read_when:
      - meeting
      - team sync
      - what was decided
      - recent discussions
      - action items
      - retrospective
`,
  },
  {
    path: "architecture.md",
    description: "System architecture overview — the pack's denser reference doc with callout blocks",
    content: `---
title: "architecture"
status: active
scope: "System architecture overview — components, data flow, deployment topology, and known constraints for the Lighthouse project"
read_when: [architecture, system design, how does X work, deployment topology, data flow, component relationships, known constraints]
related: ["AGENTS.md", "adr-001-database.md", "adr-002-repo-structure.md", "bug-tracker.md"]
tags: [architecture, reference]
---

# System Architecture Overview

Authoritative reference for how Lighthouse is structured. Architectural decisions belong here or in a linked ADR — not in meeting notes or PR descriptions.

## Components

Lighthouse has three runtime services and one shared library, all in a monorepo (see [[adr-002-repo-structure]]).

| Component | Role |
|-----------|------|
| **API** | Public-facing HTTP service — authentication, alert configuration, dashboard queries |
| **Ingestor** | Consumes metric events from the upstream Kafka topic; normalises and persists to Postgres |
| **Notifier** | Polls for unacknowledged alerts; routes to PagerDuty, Slack, or webhook targets |
| **\`@lighthouse/core\`** | Shared TypeScript library — type definitions, validation schemas, database client |

## Data Flow

\`\`\`
Upstream services
      |
   [Kafka]
      |
 [Ingestor] --writes--> [Postgres] <--reads-- [API] --> Dashboard / clients
                                                  |
                                            alert state
                                                  |
                                           [Notifier] --> PagerDuty / Slack / Webhook
\`\`\`

The Ingestor is the **only writer** to the \`metrics\` and \`deployments\` tables. The API is read-only against those tables and read-write against \`alerts\` and \`users\`. The Notifier is read-only.

> [!note] Datastore
> PostgreSQL with JSONB columns handles semi-structured webhook payloads without a separate document store. See [[adr-001-database]] for the full rationale and trade-offs.

## Deployment Topology

All three services run as Docker containers on Kubernetes (single region, two availability zones).

| Service | Resource | Replicas |
|---------|----------|---------|
| API | \`Deployment\` + HPA | 2–8 (CPU-scaled) |
| Ingestor | \`Deployment\` | 2 (fixed) |
| Notifier | \`Deployment\` | 2 (fixed) |

> [!warning] Single-region risk
> A full AZ outage leaves the dashboard read-only (API replicas in the surviving AZ continue serving reads) but halts metric ingestion. Multi-region replication is not scheduled — flag this before any SLA commitment to enterprise customers.

## CI Pipeline

Runs on GitHub Actions. Turborepo-aware so only affected packages rebuild — see [[adr-002-repo-structure]] for why this matters.

On every pull request:
1. \`turbo run lint build\` — affected packages only.
2. \`turbo run test\` — unit and integration tests for affected packages. Integration tests hit a real Postgres instance spun up as a GitHub Actions service container.
3. Docker image build and push to GHCR — on merge to \`main\` only.

> [!warning] No staging environment
> There is no full end-to-end staging environment mirroring production topology. Kafka consumer-group behaviour (see [[bug-tracker]], BUG-012) is not exercised by CI and issues reach production undetected.

## Known Constraints

| Constraint | Tracked |
|------------|---------|
| Ingestor buffer ceiling: in-memory queue caps at 10,000 messages; excess metrics are dropped with no back-pressure to the upstream queue | [[bug-tracker]] BUG-012 |
| Alert deduplication state is in-memory and resets on restart | [[bug-tracker]] BUG-011 |
| No \`/healthz\` endpoint on the Ingestor reflecting queue pressure; load balancers cannot route around a saturated instance | Agreed fix, unticketted |
`,
  },
  {
    path: "adr-001-database.md",
    description: "ADR 001: PostgreSQL over MongoDB as the primary datastore",
    content: `---
title: "adr-001-database"
status: active
scope: "Decision record for choosing PostgreSQL as the primary datastore over MongoDB"
read_when: [database choice, storage decision, why PostgreSQL, schema design, architecture decisions]
related: ["AGENTS.md", "architecture.md", "adr-002-repo-structure.md"]
tags: [adr, architecture, database]
---

# ADR 001 — Database Choice

## Status

Active

## Context

Lighthouse needs to store metric snapshots, alert configurations, and deployment event history. Two candidates were evaluated:

- **PostgreSQL** — relational, strong ACID guarantees, mature operational tooling.
- **MongoDB** — document-oriented, flexible schema, horizontally scalable writes.

The data model has two distinct shapes:

1. **Structured records** (deployments, alerts, users) with clear foreign-key relationships.
2. **Semi-structured payloads** (CI pipeline JSON, webhook bodies) that vary by integration source.

See [[architecture]] for how the datastore fits into the overall system.

## Decision

Adopt **PostgreSQL** with JSONB columns for semi-structured payloads.

Reasons:
- Foreign-key constraints enforce referential integrity between deployments and alerts at the database level — enforcing this in application code is error-prone and harder to audit.
- JSONB covers the semi-structured use case without sacrificing relational joins.
- The team has deeper operational experience with Postgres: backup tooling, vacuum configuration, and index strategies are well-understood.

## Consequences

- Schema migrations are required for structural changes to core tables. Use a migration tool (Flyway or golang-migrate) from day one — ad-hoc \`ALTER TABLE\` in production is not acceptable.
- JSONB query syntax (\`->>\`, \`@>\`) is less ergonomic than native document queries; comment non-obvious queries in code.
- Horizontal write scaling (sharding) is harder than with MongoDB. Current load projections do not require it for at least 18 months; revisit if sustained ingest volume exceeds 5k events/sec.
`,
  },
  {
    path: "adr-002-repo-structure.md",
    description: "ADR 002: monorepo over polyrepo for all Lighthouse services",
    content: `---
title: "adr-002-repo-structure"
status: active
scope: "Decision record for adopting a monorepo over separate per-service repositories"
read_when: [repo structure, monorepo, code organisation, build pipeline, architecture decisions]
related: ["AGENTS.md", "architecture.md", "adr-001-database.md"]
tags: [adr, architecture, repo, ci]
---

# ADR 002 — Repository Structure

## Status

Active

## Context

Lighthouse consists of three services (API, Ingestor, Notifier) and a shared library (\`@lighthouse/core\`) of type definitions and utilities. Options considered:

- **Polyrepo** — one Git repository per service; shared library versioned and published to a private registry.
- **Monorepo** — all services and the shared library in a single repository, managed with Turborepo and pnpm workspaces.

See [[architecture]] for the service breakdown.

## Decision

Adopt a **monorepo** managed with Turborepo.

Reasons:
- **No dependency drift.** Atomic commits across service and library boundaries prevent a breaking library change from being deployed before consuming services are updated.
- **Incremental CI.** Turborepo's dependency graph means CI only rebuilds and retests packages affected by a given diff. See [[architecture#CI Pipeline]] for how this is configured.
- **No publish cycle.** Shared types are imported directly as a workspace package — faster iteration and no semver overhead during early development.

## Consequences

- Repository size grows over time. Configure sparse checkout for contributors who only work on one service.
- The CI pipeline must be Turborepo-aware; a naive "run everything" approach negates the incremental build savings.
- Onboarding requires familiarity with pnpm workspaces. Document the \`pnpm install && turbo run build\` bootstrap in the repo README.
- If services need divergent Node.js major versions in future, the monorepo constraint becomes a friction point; evaluate then.
`,
  },
  {
    path: "bug-tracker.md",
    description: "Open and in-progress bugs with severity, status, and date logged",
    content: `---
title: "bug-tracker"
status: active
scope: "Open and recently resolved bugs — severity, status, and date logged"
read_when: [bugs, open issues, what is broken, severity, incident follow-up]
related: ["AGENTS.md", "meeting-notes.md", "architecture.md"]
tags: [bugs, tracking]
---

# Bug Tracker

| ID | Description | Severity | Status | Logged |
|----|-------------|:--------:|--------|-------:|
| BUG-012 | Ingestor drops metrics when in-memory buffer exceeds 10k messages | high | open | 2026-06-18 |
| BUG-011 | Alert deduplication window resets on API restart (state is in-memory) | high | in-progress | 2026-06-14 |
| BUG-010 | Webhook signature validation skipped for GitHub event source | medium | in-progress | 2026-06-10 |
| BUG-009 | Dashboard sparklines misalign on Safari 17 | low | open | 2026-06-07 |
| BUG-008 | Deployment event timestamps stored in local time instead of UTC | medium | resolved | 2026-05-29 |

---

**Severity:** \`high\` · \`medium\` · \`low\`
**Status:** \`open\` · \`in-progress\` · \`resolved\`

Add new rows at the top. Move resolved rows to the archive once the sprint closes.

Context on open high-severity items:
- **BUG-012** — root cause and short-term fix discussed in [[meeting-notes]] (2026-06-18 retro). See also [[architecture#Known Constraints]].
- **BUG-011** — fix in progress; PR expected 2026-06-27.

## Archive

| ID | Description | Severity | Resolved |
|----|-------------|:--------:|---------:|
| BUG-007 | Notifier sent duplicate pages for the same alert window | high | 2026-05-22 |
| BUG-006 | Password reset link expired after 2 min instead of 30 | medium | 2026-05-10 |
`,
  },
  {
    path: "meeting-notes.md",
    description: "Informal team meeting notes, most recent first",
    content: `---
title: "meeting-notes"
status: active
scope: "Informal team meeting notes — decisions, blockers, and action items by date"
read_when: [meeting, team sync, what was decided, recent discussions, action items, retrospective]
related: ["AGENTS.md", "bug-tracker.md", "architecture.md"]
tags: [meeting, team]
---

# Meeting Notes

Most recent first. Architectural decisions go in [[architecture]] or a new ADR — not here.

---

## 2026-06-25 — Sprint Planning

Attendees: Priya, Sam, Dev, Mira

BUG-011 is blocking the notifier release — Sam is on it, PR by Friday. BUG-012 stays in the backlog unless it reproduces in staging; Mira suspects it's a Kafka consumer-group config issue rather than a code bug and wants to confirm before writing a fix.

Didn't get to the Safari sparkline bug (BUG-009). Low priority, pushed again.

Actions:
- [ ] Sam — BUG-011 fix PR by 2026-06-27
- [ ] Mira — investigate Kafka consumer-group lag; update [[bug-tracker]] with findings
- [ ] Dev — review [[architecture]] before the infra sync next week

---

## 2026-06-18 — Incident Retrospective

Attendees: Priya, Sam, Dev

Post-mortem on the metric drop (BUG-012, ~40 min gap in production). Root cause: ingestor's in-memory buffer hit its ceiling with no back-pressure to the upstream queue. No data loss — metrics were buffered at the source — but the dashboard had a gap.

Short-term: make the buffer ceiling a config flag. Medium-term: add back-pressure and a \`/healthz\` endpoint so load balancers can route away from a saturated ingestor. Neither fix is ticketed yet — Dev to add to [[architecture#Known Constraints]] and open issues.

Process gap: no staging environment that exercises Kafka at production scale (noted in [[architecture#CI Pipeline]]).

---

## 2026-06-11 — Architecture Review

Attendees: Priya, Dev, Mira

Reviewed the draft [[architecture]] doc. Two open questions going in:

1. **Notifier: separate service or a module inside the API?**
   Agreed: keep it separate. Rationale — independent deploy cadence and it needs its own retry queue. Dev to update [[architecture]].

2. **Monorepo vs polyrepo?**
   Already captured in [[adr-002-repo-structure]]. Decision made; closed.

No new action items beyond Dev pushing the architecture update before the next planning session.
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
| Total | =SUM(B) |

## Expenses

| Category | Amount |
|----------|-------:|
| Rent | $1,800 |
| Groceries | $600 |
| Utilities | $250 |
| Transport | $200 |
| Subscriptions | $307 |
| Total | =SUM(B) |

## Summary

| | Amount |
|--|-------:|
| Income | =SUM(Income!B) |
| Expenses | =SUM(Expenses!B) |
| Net | =B2-B3 |
| Savings target (20%) | =20%*B2 |
| Saving enough? | =IF(B4>=B5,"Yes ✓","No ✗") |

---

> [!tip] Formulas
> Cells starting with \`=\` are live formulas. \`Income!B\` references column B of the Income table above — tables are linked by their heading names. The \`$\` currency symbol carries through to results automatically.
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
| **Total** | =SUM(B) | — | =SUM(D) | =SUM(E) | — |

## Payoff Stats

| Metric | Value |
|--------|------:|
| Total debt | =SUM("Debt Tracker"!B) |
| Monthly interest | =SUM("Debt Tracker"!D) |
| Monthly payments | =SUM("Debt Tracker"!E) |

---

> [!tip] Avalanche method
> Pay minimums on all debts, then direct extra cash to the highest-rate one first — this minimises total interest paid. The Payoff Stats table reads live from the table above: \`=SUM("Debt Tracker"!B)\` references column B of any table whose heading matches.
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

---

> [!tip] Annual subscriptions
> Annual costs are divided by 12 using \`=ROUND(B5/12, 0)\` so they compare fairly with monthly ones. The last row shows what percentage of a $5,000 salary these subscriptions consume — it references the Total row directly with \`=ROUND(D9/5000*100,1)\`.
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
    description: "AGENTS.md, system architecture overview, two ADRs, a bug tracker, and meeting notes — interlinked via WikiLinks.",
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
