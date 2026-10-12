---
state: merged
blocked_from: 
rejections: 0
created: 2026-10-11T18:31:10Z
---

# Quarterly and yearly rollups

Part of the review ladder (`plans/review-ladder.md`), levels 4 and 5: Quarterly strategic check and Yearly retrospective.

Depends on 007-rollups (and uses 009/010 if they've shipped; it must not require them). 007 left "Quarterly / yearly levels" out of scope; this plan adds them.

## Problem
The worklog stops at a month. A quarter's strategic check means opening three monthly sheets and stitching them by hand; a yearly reflection means opening twelve (or four quarterly notes that don't exist). The ladder should keep going: **daily → weekly → monthly → quarterly → yearly**, each level a plain Markdown note built from the one below it, so the vault becomes a portable personal knowledge base you own.

## Desired behavior

### Two more levels
- **Quarterly sheet**: `2026-Q4.md`, calendar quarters (Q1 = Jan–Mar).
- **Yearly sheet**: the architect picks the name. `2026.md` is the natural choice but a bare year is a likely ordinary note name, and daily sheets are found by name anywhere in the vault. Propose `2026.md` vs `2026-Y.md` / `2026-annual.md` and decide. Existing notes with that name must not suddenly be treated as rollups unless they carry the markers.
- Both go in the Daily Sheets Folder, with `{{year}}` / `{{month}}` resolved from the period's anchor (first month of the quarter / January), as monthly sheets do.
- `RollupKind`, `parseRollupName`, `parseSheetName` and the level switcher (`SHEET_LEVELS`) grow to include them; previous/next navigation works at every level.

### Commands
- **This quarter's sheet**, **Last quarter's sheet**, **This year's sheet**, **Last year's sheet**: same behaviour as the week/month commands (open or create; disabled with a reason without a vault). **Refresh rollup** works on them.

### What they contain
- The numbers come from the **daily** sheets (exact dates, no double counting), as monthly does: summary line, Done (compacted per tag, folded), Blocked, Still open. For a year, Still open/Blocked should probably list only what's open at year end; the architect proposes how to keep a year readable (e.g. counts per tag with month breakdown, top N).
- The story comes from the level below, the way monthly collects weekly notes:
  - Quarterly collects each **monthly** sheet's Notes (one subsection per month, linked).
  - Yearly collects each **quarterly** sheet's Notes (one subsection per quarter, linked).
- If 009 has shipped, Highlights at these levels show only `#win` and `#learned` (or counts per tag), not every line; architect's call.
- If 010 has shipped, `Journal/Quarterly` and `Journal/Yearly` templates work the same way. A suggested quarterly layout for the docs: Macro trends, Bottlenecks, Momentum, Adjust for next quarter. Yearly: Major achievements, Growth, Evergreen insights.
- Refresh never loses writing; same disk-content and open-buffer rules as 007.

### Edge cases
- Weeks don't nest in quarters cleanly; quarterly doesn't use weekly sheets at all (monthly → quarterly → yearly only).
- A period with no sheets below it still produces a valid sheet with empty sections and a "No monthly sheets this quarter" line.
- Tests use `vi.setSystemTime`; fixtures use tasks and products, never person names.

### Docs
- "Daily, weekly, monthly" becomes "Daily to yearly" (keep the old anchor id working), with the new names, commands and the nesting rule.

## Out of scope
- Fiscal years or custom quarter starts.
- AI summaries.
- A "digital garden" publish/site export. Plain notes in the vault are the knowledge base.
