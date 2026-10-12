# SheetSwitcher

Description: One quiet line at the top of a worklog sheet: a daily (`2026-10-11.md`), weekly (`2026-W41.md`), monthly (`2026-10.md`), quarterly (`2026-Q4.md`) or yearly (`2026-year.md`) sheet, recognized by file name (`parseSheetName` in `app/utils/sheet-nav.ts`). On the left, **Day · Week · Month**, plus **Quarter** and **Year** once the vault has a sheet at that level or the open sheet is one (`switcherLevels`), each with a dot in its level colour (day clay, week moss, month slate, quarter plum, year ochre: the `--sheet-*` tokens, `sheet-level-classes.ts`); the sheet's own level is in its colour, underlined and `aria-current="page"`. The row wraps on narrow screens. On the right, **‹ label ›** steps through time at the sheet's level: "Sat, Oct 11", "Week 41 · Oct 5 – 11", "October 2026", "Q4 2026 · October – December", "2026", followed by "· today" / "· this week" / "· this month" / "· this quarter" / "· this year" on the current one.

Where the controls lead (`levelTarget` / `stepTarget`):
- **Up** (day → week → month → quarter → year): the period holding the day; a week's month, quarter and year are the ones holding its Thursday.
- **Down**: today when it's inside, else, in a past sheet, the latest day with a daily sheet (Day) or the last week / month / quarter it owns (a week is owned by the period holding its Thursday). Nothing below a sheet in the future.
- **‹ ›**: days skip to the nearest day that has a sheet, and › from the latest one goes to today; other levels move by one.
- Never past today, and a day is only ever today or a day that already has a sheet, so browsing never creates empty past sheets. A control with nowhere to go is disabled. A missing week, month, quarter or year is created from its template, as the palette commands do.

Days open through Today's sheet (`openTodayNote(date)`), the other levels through `openPeriodSheet` (`use-sheet-navigation.ts`). A new sheet can wait on a folder prompt or its template's questions, so the tapped level takes its colour and underline at once, pulsing while the sheet opens (the date label pulses on ‹ ›), and the line is `aria-busy`. `onPendingChange` reports the level being opened, then `null`, so `MarkdownEditor` can cover the old text with a [SheetSkeleton](SheetSkeleton.md). Clicks are ignored while a sheet is opening. The line carries `typing-chrome`, so it fades with the rest of the chrome while typing. Rendered by `MarkdownEditor` above the text column, only with a vault open and not on template notes.

## Local State & Storage
- State: `pending`, the level being opened, while a sheet opens; daily sheet dates from `atom_fileMetadata` (via `useSheetNavigation`).
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
| onPendingChange? | `(level: SheetLevel \| null) => void` |  | Called with the level being opened, then `null` once it's open or failed |
