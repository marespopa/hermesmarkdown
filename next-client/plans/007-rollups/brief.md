---
state: merged
blocked_from: 
rejections: 0
created: 2026-10-11T16:15:57Z
---

# Weekly and monthly rollups

## Problem
HermesMarkdown is a daily worklog: one sheet per day (`2026-10-09.md`, shipped in 6.4.0), filled through the day directly or with Quick jot. At the end of a week or month, you have to open each daily sheet, find what got done, what's still open and what's stuck, and rewrite it by hand into a status update. That busywork is exactly what a worklog should take off your hands.

The worklog should grow in levels: **daily → weekly → monthly**. You write each day. A week's sheet is built from its days, and a month's sheet from its days and weeks. Each level is a plain markdown note in the vault that you can read, edit and share.

## Desired behavior

### The three levels
- **Daily sheet** (exists): `2026-10-09.md`. Unchanged.
- **Weekly sheet**: `2026-W41.md`, an ISO week from Monday to Sunday.
- **Monthly sheet**: `2026-10.md`, a calendar month.
- Weekly and monthly sheets go in the Daily Sheets folder (Settings → Files → Daily Sheets Folder, with `{{year}}` / `{{month}}`). With a `{{month}}` folder, a week that spans two months goes in the month that holds its Thursday, as ISO does for weeks that span two years. The architect confirms this or proposes something simpler.

### Commands
- Palette commands **This week's sheet**, **Last week's sheet**, **This month's sheet**, **Last month's sheet**. "Last" matters: rollups are usually written on Monday morning or the 1st of the month, for the period that just ended.
- If the sheet doesn't exist, it is generated and opened. If it exists, it is opened as is; a separate **Refresh rollup** command (shown while a weekly or monthly sheet is open) regenerates it.
- Commands are disabled with a reason when no vault is open, the same way Today's sheet behaves. Shortcuts are optional; if added, they must not clash with existing ones or with the browser (see the Quick jot brief).

### What a rollup contains
Built only from the task lines in the period's daily sheets, using the existing task parser (`app/utils/taskExtractor.ts`). No AI; the result must be predictable and trustworthy enough to paste into a status report.

1. **Summary line**: e.g. `12 done · 4 open · 1 blocked`.
2. **Done**: checked tasks, grouped by their first custom `#tag` (e.g. `#bug`, `#feature`, `#meeting`), with untagged tasks last under "Other". Each item links back to the day it came from.
3. **Blocked**: open tasks tagged `#blocked` or `#hold`. `#blocked` is a new status tag, recognized like `#hold`. The architect decides whether the Tasks panel shows it as its own status.
4. **Still open**: unchecked tasks, carried to the next period.
5. **Notes**: an empty section for you to write in, e.g. highlights, decisions, what's next. It is never generated.

Duplicates: a task copied forward across several days (same text) appears once, in the state from the latest day it shows up, linked to that day. Ordering inside each section is by date, oldest first.

### Monthly builds on weekly
- A monthly sheet's Done / Blocked / Still open lists are computed from the month's **daily** sheets (exact dates, so weeks that span two months don't double count).
- It also collects the **Notes** you wrote in that month's weekly sheets, one subsection per week (`Week 41`) with a link to the weekly sheet. That's how the levels connect: the numbers come from the days, and the story comes from what you wrote each week.
- Done items in a monthly sheet may be compacted (e.g. a count per tag, with the full list folded under it) so a month stays readable. The architect proposes the format.

### Refresh never loses your writing
- **Refresh rollup** rewrites only the generated sections. The Notes section, and anything you added outside the generated sections, is kept exactly as written.
- How generated sections are marked (headings, HTML comments, frontmatter, …) is up to the architect. It must survive normal editing and look clean in the preview.
- The disk-content rules from Today's sheet and Quick jot apply here too: if the sheet is open with unsaved changes, refresh updates that buffer, with no conflict prompt.

### Edge cases
- Days with no sheet are skipped. A period with no daily sheets at all still produces a valid sheet with empty sections and a summary line saying `No daily sheets this week`.
- Daily sheets are found by file name (`YYYY-MM-DD.md`) anywhere in the vault, as `findTodayNote` does today, so sheets made before the folder setting changed are still counted.
- The week start is Monday (ISO). A setting for a Sunday start is out of scope.
- Docs: user documentation (a "Daily, weekly, monthly" section), the palette commands, and the `#blocked` tag next to `#prog` / `#hold`.

## Out of scope
- Copy as Slack / plain text. That will be a separate brief, applied to any note.
- Quarterly / yearly levels.
- Weekly and monthly templates (`Journal/Weekly`). The generated layout is fixed for now.
- Carrying open tasks into the next daily sheet automatically.
- Rolling up anything other than task lines (free text, time blocks, frontmatter fields).
- AI summaries.
- Tests use `vi.setSystemTime` for "this week" / "last month"; fixtures use tasks and products, never person names.
