---
state: new
blocked_from:
rejections: 0
created: 2026-10-11T18:31:10Z
---

# Highlights and side-by-side weekly review

Part of the review ladder (`plans/review-ladder.md`), level 2: Weekly synthesis.

Depends on 007-rollups (weekly/monthly sheets, `rollup:start`/`rollup:end` markers, Refresh rollup). Build on it; don't duplicate it.

## Problem
Weekly sheets (007) roll up **task lines only**. A worklog also holds the things a weekly review is actually for: wins, decisions, what you learned, what kept getting in the way. Today those stay buried in seven daily sheets, and the only way to see them is to open each day by hand while the weekly sheet is in another tab.

## Desired behavior

### Highlights from daily sheets
- Lines in a daily sheet tagged with one of a small fixed set of tags are collected into the weekly sheet's generated region, in a **Highlights** section, grouped by tag:
  - `#win` (achievements, shipped work), `#learned` (learnings), `#blocker` (recurring friction, not a task), `#decision`.
  - The architect confirms the tag set and checks it doesn't clash with task status tags (`#hold`, `#blocked`, `#prog`). `#blocker` vs `#blocked` is deliberately different: `#blocked` marks a task, `#blocker` marks a note about friction. If that's too confusing, propose another name.
- Any line counts (a list item, a paragraph line or a task). A task line that is also a highlight shows in both its task section and Highlights.
- Each highlight links back to its day (`· [[2026-10-09]]`), oldest first. Same text on several days appears once (latest day), as for tasks.
- **Recurring blockers:** a `#blocker` whose text (normalised like `rollupKey`) appears on 2 or more days in the week is marked as recurring (e.g. `· 3 days`).
- Monthly sheets get the same Highlights section, computed from the month's daily sheets, compacted the way Done is (a folded callout per tag with a count).
- Summary line gains highlight counts only if they fit cleanly; architect's call.
- Refresh rollup keeps its guarantee: only the region between the markers is rewritten.

### Side-by-side review
- A palette command **Review week** (shown while a weekly sheet is open, and also from the palette for "last week") opens the weekly sheet in one pane and that week's daily sheets in a split pane to the right, using the existing split (Split Right / Close Pane).
- In the right pane you step through the week's days with the existing sheet navigation (previous/next day), limited to the week. Only days that have a sheet are shown.
- From a highlight or task in a daily sheet, one action copies the line into the weekly sheet's **Notes** section (not the generated region). The architect decides the gesture (slash entry, context action or palette command) and keeps it keyboard-only friendly.
- On mobile (single pane), Review week opens the weekly sheet and the day switcher; no split.

### Docs
- "Daily, weekly, monthly" gets a Highlights subsection with the tags, and Review week.

## Out of scope
- User-defined highlight tags (setting). Fixed set for now.
- AI summaries of the week.
- Quarterly/yearly (plan 011).
