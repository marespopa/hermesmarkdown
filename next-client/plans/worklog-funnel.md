# Worklog: daily sheets plus template-only periodic sheets

Single plan, built directly (no factory). It replaces the earlier "worklog funnel" masterplan and the archived factory plans 007, 009, 010 and 011.

## Decision (2026-10-12)

The app owns as little as possible of what's written in a note. It generates nothing inside a note and reads no meaning into headings or sections.

- **Daily sheet stays as is.** It's a plain dated note (`2026-10-12.md`) with an optional journal template. Quick jot, `/jot`, `/daily` and Today in the sidebar all depend on it.
- **Weekly, monthly, quarterly and yearly sheets are plain notes.** They're named by period (`2026-W42.md`, `2026-10.md`, `2026-Q4.md`, `2026-year.md`) and created from a Weekly / Monthly / Quarterly / Yearly template, or as a heading alone. After that the app never writes into them. How the user reviews a week is up to them.
- **No generated content.** No rollup regions or Refresh rollup, no Focus or highlight conventions, no metrics carry-forward, no token budgets.

## Done

### Templates and period tokens
- `matchPeriodTemplate(kind)` finds a template named Weekly / Monthly / Quarterly / Yearly (Week, Weekly review, Annual, …). The template is instantiated with the period: `now` = its first day, so last month's sheet says October.
- New tokens:
  - `{{weekSheet}}`, `{{monthSheet}}`, `{{quarterSheet}}`, `{{yearSheet}}`, with date math (`[[{{weekSheet-1w}}]]`).
  - In periodic sheets only: `{{period}}`, `{{periodHeading}}`, `{{previousPeriod}}`, `{{nextPeriod}}`.

### Rollups removed
- **Removed:**
  - Rollup generation: `collect`, `render`, `sections`, `items`.
  - Live refresh, ticking items from a rollup, and day-link jumps.
  - The editor's marker and region decorations.
  - The switcher's done bar.
  - Refresh rollup.
  - The note-saved event.
  - `{{focus}}`.
- **Renamed:** `utils/rollup` → `utils/periods`, `RollupPeriod` → `Period`, `openRollup` → `openPeriodSheet` (`use-period-sheets.ts`), `use-period-sheet-commands.ts`.
- **AI Chat's weekly review** now gets the week's daily sheets as its context (`useDailySheets`), not a computed rollup.
- **Existing sheets:** sheets created before this change keep their `rollup:start` / `rollup:end` comment lines as plain text. Nothing reads or rewrites them any more.

## Next

### Navigation
- **Sheet links create sheets.** In `useOpenOrCreateLink`, a missing target that `parseSheetName` recognises (`2026-10-13`, `2026-W42`, `2026-10`, `2026-Q4`, `2026-year`) is created through the same path as the palette (Daily Sheets Folder plus the matching template), not through the generic missing-link flow.
- **Shortcuts:**
  - Today's sheet: not Ctrl/Cmd+Shift+D, which is "Bookmark all tabs" in Chrome and Firefox. Candidate: ⌘⇧Y on Mac, Ctrl+Alt+Y elsewhere.
  - Previous / next sheet: not Alt+←/→. Candidate: ⌘⌥[ / ⌘⌥] on Mac, Ctrl+Alt+[ / ] elsewhere.
  - Add palette commands **Previous sheet** / **Next sheet**.
  - Verify each shortcut in Chrome, Edge, Firefox and Safari on Mac, Windows and Linux.
- **Go to date…:** reuses `DatePickerCallout`. Days with a sheet are marked. An empty day offers an explicit **Create sheet for <date>** button.

## Principles

- Plain Markdown on disk, readable anywhere. The app never writes into a sheet after creating it.
- No new chrome beyond what a command needs.
- Date-dependent tests use `vi.setSystemTime`.
