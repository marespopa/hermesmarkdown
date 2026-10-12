---
state: blocked
blocked_from: new
rejections: 0
created: 2026-10-11T18:31:10Z
---

> **Superseded** on 2026-10-12 by [worklog-funnel.md](../../worklog-funnel.md). Never built; kept for history.

# Weekly and monthly templates

Part of the review ladder (`plans/review-ladder.md`), level 3: Monthly review & refinement.

Depends on 004-vault-templates and 007-rollups. 007 left "Weekly and monthly templates (`Journal/Weekly`)" out of scope; this plan picks it up.

## Problem
A rollup sheet always ends with an empty `## Notes`. A monthly review is more structured than that: people track the same metrics every month (projects shipped, personal goals, fitness milestones) in a table, and answer the same questions ("What moved? What stalled? What changes next month?"). Today you rebuild that table and those headings by hand every month. And because monthly notes get pasted into status updates or fed to AI, people want to keep the summary short. The app can count tokens (Token cost dialog), but nothing nudges you while you write the summary.

## Desired behavior

### Templates for rollup sheets
- Optional vault templates `Journal/Weekly` and `Journal/Monthly` (and later `Journal/Quarterly` / `Journal/Yearly`, plan 011), resolved the same way the Journal/Daily template is for daily sheets. The architect confirms names and lookup.
- When a rollup sheet is **created**, the template's body replaces the empty `## Notes` section: everything after `rollup:end`. The generated region and heading stay as 007 renders them. Template tokens (`{{date}}`, `{{monthName}}`, `{{prompt:…}}`, `{{cursor}}`, …) expand as in 004.
- New rollup tokens for these templates, e.g. `{{period}}` (`2026-W41` / `2026-10`), `{{periodHeading}}`, `{{previousPeriod}}` (link target of the previous sheet). The architect picks the minimal set.
- Refresh rollup never touches template content: it's user content after creation.
- With no template, behaviour is exactly as today.
- **Monthly notes source:** 007's monthly "Weekly notes" collects each weekly sheet's `## Notes`. With templates, a weekly Notes area may have several headings. The architect decides what counts as the weekly notes (everything after `rollup:end`, or a named section) and keeps today's sheets working.

### Metrics table carry-forward
- If the previous period's sheet has a Markdown table directly under a heading named **Metrics**, a new sheet's template can pull it in with a token (e.g. `{{previousMetrics}}`): same columns and row labels, values cleared (or kept, the architect's call, with a reason). That gives a month-over-month tracker with zero setup, edited with the existing interactive table editing.
- No formulas or charts.

### Token budget for summaries
- A section heading can carry a budget, for example `## Summary <!-- tokens: 300 -->`, or a frontmatter key; the architect picks the cleanest form that survives other editors.
- While the cursor is in that section, the editor shows a quiet `212 / 300 tokens` count (over budget → warning colour), using the existing tokenizer worker, loaded lazily as the Token cost dialog does. No count anywhere else; no new chrome when no budget is set.
- The starter `Journal/Monthly` example in the docs uses it.

### Docs
- Templates docs: rollup templates, the new tokens, Metrics carry-forward, token budgets. Include a starter `Journal/Weekly` (Wins / Blockers / Learnings / Next week) and `Journal/Monthly` (Summary with a budget, Metrics table, Themes, Next month).

## Out of scope
- Shipping the templates as files in the vault automatically (docs only; users create them, e.g. with **New template…**).
- Formulas, totals or charts in tables.
- Token budgets in non-rollup notes (works there if it falls out for free, but not a requirement).
