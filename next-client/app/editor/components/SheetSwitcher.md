# SheetSwitcher

Description: One quiet line at the top of a worklog sheet: a daily (`2026-10-11.md`), weekly (`2026-W41.md`) or monthly (`2026-10.md`) sheet, recognized by file name (`parseSheetName` in `app/utils/sheet-nav.ts`). On the left, **Day · Week · Month**, each with a dot in its level colour (day clay, week moss, month slate: the `--sheet-*` tokens, `sheet-level-classes.ts`); the sheet's own level is in its colour, underlined and `aria-current="page"`. On the right, **‹ label ›** steps through time at the sheet's level: "Sat, Oct 11", "Week 41 · Oct 5 – 11", "October 2026", followed by "· today" / "· this week" / "· this month" on the current one.

Where the controls lead (`levelTarget` / `stepTarget`):
- **Up** (day → week → month): the week or month holding the day; a week's month is the one holding its Thursday.
- **Down** (month → week → day): today when it's inside, else the latest day with a daily sheet (Day) or the month's last week (Week).
- **‹ ›**: days skip to the nearest day that has a sheet, and › from the latest one goes to today; weeks and months move by one.
- Never past today, and a day is only ever today or a day that already has a sheet, so browsing never creates empty past sheets. A control with nowhere to go is disabled. Weekly and monthly sheets are generated when missing, as the rollup commands do.

Days open through Today's sheet (`openTodayNote(date)`), weeks and months through `openRollup` (`use-sheet-navigation.ts`). Clicks are ignored while a sheet is opening. The line carries `typing-chrome`, so it fades with the rest of the chrome while typing. Rendered by `MarkdownEditor` above the text column, only with a vault open and not on template notes.

## Local State & Storage
- State: `busy` while a sheet opens; daily sheet dates from `atom_fileMetadata` (via `useSheetNavigation`).
- Persistence: None.

## Dependencies
- Core: `Button`, `useSheetNavigation`, `app/utils/sheet-nav`, `sheet-level-classes`, `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
const sheet = parseSheetName("2026-W41.md");
{sheet && <SheetSwitcher sheet={sheet} />}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| sheet | `Sheet` |  | The sheet the editor shows, from `parseSheetName` |
