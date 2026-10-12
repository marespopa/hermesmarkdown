# utils/periods

Periods for the worklog's weekly, monthly, quarterly and yearly sheets: their
names, dates and headings. Pure: no React, no file access. The sheets
themselves are plain notes, opened or created from a template by
`app/editor/hooks/use-period-sheets.ts`; the app never writes into them after
that.

| File | Purpose |
|------|---------|
| `period.ts` | `Period` (`kind`, `name`, `start` / `end` local midnights, `anchor`, `heading`, `noun`). `weekPeriod(date, offset?)` (ISO week, Monday to Sunday, named by the ISO week-year: `2026-W53` runs Dec 28 2026 to Jan 3 2027), `monthPeriod(date, offset?)`, `quarterPeriod(date, offset?)` (`2026-Q4`, Q1 = January to March), `yearPeriod(date, offset?)` (`2026-year`: a bare `2026` is too likely an ordinary note), `periodOf(kind, date, offset?)`, `isoWeekOf`, `parsePeriodName("2026-W41.md" \| "2026-10.md" \| "2026-Q4.md" \| "2026-year.md")` (rejects W00, weeks past the year's last, months 00 / 13, Q0 / Q5), `datesInPeriod`. The anchor (the week's Thursday, the period's first day otherwise) picks the Daily Sheets folder. Local-date arithmetic only, so DST never shifts a day. |
| `daily-sheets.ts` | `pickDailySheets(paths, period, preferredFolder, skip?)`: every `YYYY-MM-DD.md` anywhere whose date is in the period, one file per date (`findSheetByName`: the Daily Sheets folder first, else the shallowest path), oldest first. Used by AI Chat's weekly review (`useDailySheets`). |
