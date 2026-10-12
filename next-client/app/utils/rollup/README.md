# utils/rollup

The pure engine behind weekly, monthly, quarterly and yearly rollup sheets. No React, no file
access, no AI: the same daily sheets always give the same rollup. The flows
that read and write the vault are `app/editor/hooks/use-rollups.ts` and
`use-rollup-sources.ts`.

| File | Purpose |
|------|---------|
| `period.ts` | `RollupPeriod` (`kind`, `name`, `start` / `end` local midnights, `anchor`, `heading`, `noun`). `weekPeriod(date, offset?)` (ISO week, Monday to Sunday, named by the ISO week-year: `2026-W53` runs Dec 28 2026 to Jan 3 2027), `monthPeriod(date, offset?)`, `quarterPeriod(date, offset?)` (`2026-Q4`, Q1 = January to March), `yearPeriod(date, offset?)` (`2026-year`: a bare `2026` is too likely an ordinary note), `periodOf(kind, date, offset?)`, `isoWeekOf`, `parseRollupName("2026-W41.md" \| "2026-10.md" \| "2026-Q4.md" \| "2026-year.md")` (rejects W00, weeks past the year's last, months 00 / 13, Q0 / Q5), `datesInPeriod`, `weeksOwnedByMonth` (weeks whose Thursday is in the month), `childPeriods` (a month's weeks, a quarter's months, a year's quarters). The anchor (the week's Thursday, the period's first day otherwise) picks the Daily Sheets folder. Local-date arithmetic only, so DST never shifts a day. |
| `daily-sheets.ts` | `pickDailySheets(paths, period, preferredFolder, skip?)`: every `YYYY-MM-DD.md` anywhere whose date is in the period, one file per date (`findSheetByName`: the Daily Sheets folder first, else the shallowest path), oldest first. |
| `collect.ts` | `collectRollup(sheets, { range, doneElsewhere })` over `extractTasks`: dedup by text (lowercased, whitespace collapsed), the latest day's occurrence wins (state, tags, link); `[x]` → `done`, `[!]` (on hold) → `blocked`, `[ ]` / `[/]` → `open`, `[-]` (cancelled) left out; with `range`, a `[x]` stamped `@done()` after the period counts as `open`; `doneElsewhere` (from `useRollupSources`: tasks in other notes stamped `@done()` in the period, from the index, private notes left out) adds them to `done`, dated by the stamp and linking their note (`source`), unless the daily sheets have the same text; each list by date, then line. `groupDone(items)`: by first custom tag, alphabetical, untagged last (`tag: null`, "Other"). |
| `render.ts` | `ROLLUP_START` / `ROLLUP_END` and their regexes, `renderSummary` (`N done · N open · N blocked`, or `No daily sheets this week` / `month` / `quarter` / `year`), `renderGeneratedBody(period, data, childNotes?)` (the lines between the markers) and `renderNewSheet(period, body, sensitive)` (`{ text, cursor }`, caret on the blank line under `## Notes`). |
| `sections.ts` | `spliceGenerated(content, body)`: replaces only the lines between the first start marker and the first end marker after it, byte for byte elsewhere, in the file's line endings; null when the markers are missing or out of order. `extractNotes(content)`: a sheet's own Notes text (after the end marker), for the sheet one level up. `generatedRegion(content)`: the text between the markers, or null. |
| `items.ts` | Reading a sheet back: `parseRollupItem(line)` (`{ text, date }` of `- text #tag · … · [[YYYY-MM-DD]]`, also in a callout), `findSourceTask(dayText, item)` (the last task with that text, by `rollupKey`), `parseSummary` / `summaryOf(content, startRegex)` (`{ done, open, blocked }`), `addedItemLines(previous, next)` (item lines a rebuild added; none for a new sheet). |

## Sheet layout

```markdown
# Week 41 · Oct 5 – 11, 2026

<!-- rollup:start · Refresh rollup rewrites everything down to rollup:end -->
2 done · 1 open · 1 blocked

## Done

### #bug
- Fix login redirect #auth · [[2026-10-06]]

### Other
- Update docs · [[2026-10-06]]

## Blocked
- Deploy billing service #infra · due 2026-10-14 · [[2026-10-08]]

## Still open
- Write release notes · in progress · [[2026-10-09]]
<!-- rollup:end -->

## Notes

```

A monthly sheet (`# October 2026`) folds each Done group into a callout
(`> [!success]- #bug · 7`) and ends its region with `## Weekly notes`: one
`### Week 41 · [[2026-W41]]` subsection per weekly sheet with Notes, copied
as written. Quarterly and yearly sheets fold Done the same way and end with
`## Monthly notes` (`### October · [[2026-10]]`) and `## Quarterly notes`
(`### Q4 · [[2026-Q4]]`).

## Marker contract

- One start/end pair of HTML comment lines around the whole generated region.
  Refresh rewrites only the lines between them; the marker lines, the heading,
  `## Notes` and anything else outside stay exactly as written.
- Missing or out-of-order markers make refresh refuse (nothing is written);
  the user deletes the sheet and runs the command again to rebuild it.
- Items are plain list items (`- text · [[YYYY-MM-DD]]`), never `- [ ]`, so
  a rollup never adds tasks to the Tasks page or counts its own lines. A text
  that itself starts with a task box is escaped (`\[ ]`).
- The region holds no timestamp, so a refresh with nothing new writes nothing.
