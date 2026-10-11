# Weekly and monthly rollups — engineering PRD

## Context

Source: [brief.md](brief.md). The worklog gets two more levels: a **weekly sheet** (`2026-W41.md`) built from that week's daily sheets, and a **monthly sheet** (`2026-10.md`) built from the month's daily sheets plus the Notes written in its weekly sheets. Each is a plain note. The generated part (summary, Done, Blocked, Still open) comes from task lines only, with no AI, and **Refresh rollup** rewrites only that part. Everything the user writes is kept.

What already exists:

1. **Daily sheet naming and lookup.** `app/utils/today-note.ts`: `todayNoteName` (`:20`), `resolveTodayFolder(pattern, date)` (`:12`, expands `{{year}}` / `{{month}}` from the date it is given), and `findTodayNote(paths, now, folder)` (`:31`, preferred folder first, else the shallowest same-named file anywhere).
2. **Sheet creation.** `use-template-create.ts#resolveTodayNote` (`app/hooks/file-system/use-template-create.ts:192-227`) asks for the Daily Sheets folder the first time (`atom_todayFolder`, `ui-atoms.ts:242`; prompt at `:206-215`) and writes through `writeNewNote(folder, baseName, expanded, { unique, onExisting, open })` (`:68-107`). `writeNewNote` opens an existing file unchanged (disk wins), scans and indexes after creating, and moves the caret to `expanded.cursor`. `writeNewNote` is returned by the hook (`:307`), but `use-file-crud.ts:67,95` doesn't pass it on.
3. **Writing to a note that may be open (disk wins).** `use-quick-jot.ts:36-67` reads disk with the sheet's handle, reconciles an open tab with `reconcileWithDisk` (`app/hooks/file-system/reconcile-disk.ts`), sets the buffer, and saves with `saveFile(next, handle, 0, true, path)`. The open editor applies outside changes as a minimal range (`text-diff.ts#changedRange`, `:64`), so the cursor and undo history stay put. This logic is inline in Quick jot. There's no shared helper.
4. **Task parser.** `app/utils/taskExtractor.ts#extractTasks` (`:42`) returns `checked`, `inProgress` (`[/]` or `#prog`), `onHold` (`#hold`, only when not in progress), `tags` (custom tags, lowercase, in order), `dueDate`, and `text` (with tags and metadata stripped). `STATUS_TAG_NAMES` (`:22`) and `REGEX_TASK_CLEANUP` (`:28`) list the status tags. **There is no `#blocked`.** The Tasks page groups by `groupOf` (`TasksList.tsx:73-79`) and sorts by `statusRank` (`task-sort.ts:16-21`). Both read `onHold`.
5. **Commands.** "Today's sheet" is registered in `use-home-feed.ts:107-114`, with `disabledReason: hasVault ? undefined : "Open a vault first"`. `openToday` (`:59-63`) closes the feed and saves a non-empty draft first. `useRegisterCommand(null)` registers nothing (`CommandPaletteContext.tsx:187-209`), so a command can be shown conditionally.
6. **Wikilinks by base name.** `resolve-file-by-name.ts#resolveFileMetaByName` falls back to a base-name match, closest folder first. So `[[2026-10-06]]` and `[[2026-W41]]` resolve wherever the sheets live.
7. **HTML comments.** The home feed preview already strips `<!-- … -->` (`markdown-preview.ts:33`). The editor shows them as raw text. There is no separate preview mode any more; live markers (`codemirror/live-markers.ts`) are the reading view.
8. **Collapsible callouts.** `> [!type]- title` is folded by default in the editor (`callout-fold.ts`). The `success` / `done` types exist (`constants/callouts.ts`).
9. **Metadata cache.** `services/metadata-cache.ts:14` `METADATA_CACHE_VERSION = 1` caches parsed tasks per file. A parser change needs a version bump, or old `#blocked` tasks stay as plain to-dos until their file changes.

Missing: ISO week and month period math, collecting tasks across the daily sheets of a period, the rollup renderer, the marked generated region and the splice that replaces it, the open/create and refresh flows, the four period commands plus **Refresh rollup**, the `#blocked` status, how the marker lines look in the editor, and docs.

## Behavior

**Names and periods**
- Weekly: `YYYY-Www.md`, an ISO week (Monday to Sunday). `YYYY` is the ISO week-year, so 2026-12-28 to 2027-01-03 is `2026-W53.md`. Monthly: `YYYY-MM.md`, a calendar month.
- "This week" and "this month" are the local week and month at the moment the command runs. "Last week" is the ISO week before it, and "last month" the month before it (January → December of the previous year).
- **Folder** (when created): the Daily Sheets folder pattern, expanded for an anchor date. The anchor is the week's **Thursday** for a weekly sheet and the **1st** for a monthly sheet. So with `journal/{{year}}/{{month}}`, `2026-W53` goes to `journal/2026/12`, and a week from Sep 28 to Oct 4 (Thursday Oct 1) goes to `journal/2026/10`. This confirms the brief (Decision D1). If the pattern hasn't been set yet, the same first-time folder prompt as Today's sheet appears. Cancelling it does nothing.
- **Lookup** (existing sheet): by file name anywhere in the vault, preferred folder first, else the shallowest path, exactly like `findTodayNote`.

**Commands** (palette, category Navigation)
- **This week's sheet**, **Last week's sheet**, **This month's sheet**, **Last month's sheet**.
  - If the sheet exists, open it as is: no regeneration, no write.
  - If it doesn't exist, generate it, write it, and open it with the caret on the empty line under `## Notes`. Toast `Created: <path>` (from `writeNewNote`).
  - Each closes the home feed and saves a non-empty draft first, like Today's sheet.
- **Refresh rollup**: registered only while the active tab's file name is a weekly or monthly sheet name. It regenerates that sheet's generated region (see Refresh).
- With no vault, every command is disabled with `Open a vault first`. With the vault still restoring or pending, the reason is `Vault is loading`.
- No keyboard shortcuts (Decision D7).

**Source daily sheets**
- Every indexed path (`atom_fileMetadata` keys) whose file name matches `^\d{4}-\d{2}-\d{2}\.md$` and whose date falls in the period. Paths in `.hermes/` and in the templates folder are skipped, as `atom_allTasks` does (`task-atoms.ts:15`).
- If several files share a date, use one: the one in the Daily Sheets folder for that date, else the shallowest path, then sort by path. This is the same rule as `findTodayNote`.
- Text is read from disk with a fresh handle. If the sheet is open in a tab, the text is `reconcileWithDisk(tab, disk, mtime).content`. That is what the tab shows after reconciling: unsaved edits count when the disk file is unchanged, and disk wins otherwise. Reading never changes the tab.
- A sheet that fails to read is skipped and counted. The success toast then says `Refreshed · 1 daily sheet couldn't be read`.

**Collecting tasks** (pure; `collectRollup`)
- `extractTasks(path, text)` per sheet. Tasks whose `text` is empty after stripping are skipped.
- **Dedup key:** `text` lowercased, with whitespace collapsed. When the same key shows up on several days, the occurrence from the **latest** day wins: its state, its tags and its link. Within one day, the last occurrence wins.
- **State of the winning occurrence:**
  - `checked` → Done.
  - Unchecked and tagged `#blocked` or `#hold` (on the raw line, even if it is also `[/]` or `#prog`) → Blocked.
  - Any other unchecked task → Still open. It is marked "in progress" when `inProgress`.
- **Ordering inside each section:** by the winning occurrence's date, oldest first, then by line number.
- Done is grouped by `tags[0]` (the first custom tag). Groups are sorted alphabetically, with tasks that have no custom tag last under **Other**.

**Item line format**
- `- <text>[ #tag …][ · in progress][ · due YYYY-MM-DD] · [[YYYY-MM-DD]]`
  - Tags are the task's custom tags, minus the Done group's own tag.
  - `in progress` appears in Still open only.
  - The due date appears in Blocked and Still open only, when present.
  - The link points to the day the item came from.
- Items are plain list items, **never `- [ ]` / `- [x]`**. A rollup's lines therefore never show up as tasks on the Tasks page, and a rollup never counts its own lines (Decision D3).

**Weekly layout** (generated on creation; the region between the markers is regenerated on refresh)

```markdown
# Week 41 · Oct 5 – 11, 2026

<!-- rollup:start · Refresh rollup rewrites everything down to rollup:end -->
12 done · 4 open · 1 blocked

## Done

### #bug
- Fix login redirect · [[2026-10-06]]

### Other
- Update pricing page copy #web · [[2026-10-08]]

## Blocked
- Deploy billing service #infra · due 2026-10-14 · [[2026-10-08]]

## Still open
- Write release notes · in progress · [[2026-10-09]]
<!-- rollup:end -->

## Notes

```

- The heading's date range uses `toLocaleDateString(undefined, …)`, like `todayNoteHeading`, with month `short` and day `numeric`. The year is the Sunday's year. When the week crosses a month, both months are shown: `Sep 28 – Oct 4, 2026`. When it crosses a year, both years are shown.
- **Summary line:** `N done · N open · N blocked`. "open" counts Still open only; Blocked is separate (Decision D4). If the period has no daily sheets, the line is `No daily sheets this week` (or `this month`) and the sections are empty headings.
- An empty section is its heading followed by a blank line.

**Monthly layout**
- Heading `# October 2026`, using `toLocaleDateString(undefined, { month: "long", year: "numeric" })`.
- Same summary and markers.
- Done, Blocked and Still open are computed from the month's **daily** sheets by exact date.
- **Done is compacted:** one folded callout per tag group, with the item count in the title:
  ```markdown
  > [!success]- #bug · 7
  > - Fix login redirect · [[2026-10-06]]
  ```
  Blocked and Still open stay plain lists.
- A generated `## Weekly notes` section comes after Still open, inside the markers. It has one subsection per week whose **Thursday** falls in the month and whose weekly sheet exists (found by name anywhere): `### Week 41 · [[2026-W41]]`, followed by that sheet's Notes text, copied as written. Weeks whose Notes are empty or whitespace are left out. If no week has notes, the section is the heading alone.
- **A weekly sheet's Notes text:** the lines after the first `## Notes` heading (case-insensitive) that comes after `<!-- rollup:end -->`. If there is no end marker, the first `## Notes` heading anywhere is used. The text runs up to the next line starting with `# ` or `## `, or the end of the file. Blank lines at either end are trimmed.
- The user's own `## Notes` section follows the end marker, as in the weekly layout.

**Refresh**
- The target is the active tab's sheet, identified by its file name. Its period comes from the name, not from the date of the refresh.
- In the current text (reconciled with disk, as above), find the first line matching the start marker, then the first end-marker line after it. Replace everything **between** them with the newly generated body. The marker lines themselves, and every line outside them, stay byte for byte. The line-ending style follows the file (`\r\n` if the file contains it).
- **Markers missing, or the end marker comes before the start:** nothing is written. Error toast: `Can't refresh: the rollup:start / rollup:end lines are missing. Delete the sheet and run the command again to rebuild it.`
- **Nothing changed:** nothing is written. Quiet toast `Rollup is up to date`.
- **Otherwise:**
  - If the sheet is open in any tab, set the reconciled buffer to the new text, then save with `saveFile(…, isAutoSave = true)`. Unsaved edits outside the region are saved with it, as Quick jot does (D3 there).
  - If it isn't open, it is just written.
  - Toast `Rollup refreshed`. A visible editor updates in place through `changedRange`. Undo in that editor restores the old region.
- Edits the user made **inside** the markers are replaced. The start marker's text says so.
- Every backend uses the same path, `saveFile` → `writeFileContent`: local folder, browser vault (OPFS, worker fallback) and GitHub workspace (the change goes out with the next commit).

**Sensitive sheets**
- When a rollup is **created** and any of its source daily or weekly sheets is sensitive (`isSensitiveFrontmatter(meta.frontmatter)`), the new sheet starts with `---\nsensitive: true\n---\n\n`.
- Refresh never touches frontmatter (Decision D6).

**Marker lines in the editor** (Phase 3)
- When the caret is not on a marker line, the comment text is hidden and the line shows a hairline rule. The start line also shows a faint caption, `Generated · Refresh rollup rewrites this part`.
- When the caret is on the line, the raw comment shows in `--fg-faint`.
- The home feed preview already strips comments.

**`#blocked`**
- It is a status tag like `#hold`. An unchecked task tagged `#blocked` has `onHold: true` and shows in the Tasks page's **On Hold** group (Decision D5). `#blocked` is stripped from the display text and is not a custom tag.

**Mobile:** every command is reachable from the palette (the **Search files** button and the palette button). There is nothing mobile-specific.

## Design

**Pure modules** (new folder `app/utils/rollup/`, each file well under 200 lines):

`period.ts`
```ts
export type RollupKind = "week" | "month";
export interface RollupPeriod {
  kind: RollupKind;
  name: string;        // "2026-W41" | "2026-10"
  start: Date;         // local midnight, first day
  end: Date;           // local midnight, last day (inclusive)
  anchor: Date;        // Thursday (week) / 1st (month), for the folder pattern
  heading: string;     // "Week 41 · Oct 5 – 11, 2026" | "October 2026"
  noun: "week" | "month";
}
export function isoWeekOf(date: Date): { year: number; week: number };
export function weekPeriod(date: Date, offset?: number): RollupPeriod;   // offset -1 = last week
export function monthPeriod(date: Date, offset?: number): RollupPeriod;
export function parseRollupName(fileName: string): RollupPeriod | null; // "2026-W41.md" | "2026-10.md"; rejects W00 / W54 / W53 in 52-week years, month 00/13
export function datesInPeriod(period: RollupPeriod): string[];          // "YYYY-MM-DD", in order
export function weeksOwnedByMonth(period: RollupPeriod): RollupPeriod[];  // ISO weeks whose Thursday is in the month
```
Use local-date arithmetic (`new Date(y, m, d)`), never UTC. That keeps DST and time zones from shifting days.

`today-note.ts`: generalize the lookup and keep `findTodayNote` as a wrapper:
```ts
export function findSheetByName(paths: Iterable<string>, fileName: string, folder?: string): string | null;
export function findTodayNote(paths, now, folder = "") { return findSheetByName(paths, `${todayNoteName(now)}.md`, folder); }
```

`collect.ts`
```ts
export interface RollupItem { key: string; date: string; line: number; text: string; tags: string[]; inProgress: boolean; dueDate: string | null; }
export interface RollupData {
  sheetCount: number;
  done: RollupItem[]; blocked: RollupItem[]; open: RollupItem[];
}
export function collectRollup(sheets: { date: string; text: string }[]): RollupData;
```
It is built on `extractTasks`. Blocked is detected with `REGEX_TASK_HOLD` on `raw` (that regex now covers `#blocked`).

`render.ts`
```ts
export const ROLLUP_START = "<!-- rollup:start · Refresh rollup rewrites everything down to rollup:end -->";
export const ROLLUP_END = "<!-- rollup:end -->";
export const REGEX_ROLLUP_START = /^<!--\s*rollup:start\b.*-->\s*$/;
export const REGEX_ROLLUP_END = /^<!--\s*rollup:end\b.*-->\s*$/;
export interface WeekNotes { name: string; week: number; notes: string }
export function renderSummary(data: RollupData, period: RollupPeriod): string;
export function renderGeneratedBody(period: RollupPeriod, data: RollupData, weekNotes?: WeekNotes[]): string; // lines between the markers
export function renderNewSheet(period: RollupPeriod, body: string, sensitive: boolean): { text: string; cursor: number }; // cursor = blank line under "## Notes"
```

`sections.ts`
```ts
export function spliceGenerated(content: string, body: string): string | null; // null = markers missing/out of order
export function extractNotes(content: string): string;                         // weekly Notes text, trimmed
```

**Disk-wins buffer helpers** (new `app/hooks/file-system/use-note-buffer.ts`, ~90 lines). These are extracted from `use-quick-jot.ts:44-58` so that Quick jot and rollups share one path:
```ts
export interface WriteThroughResult { result: "written" | "unchanged" | "failed"; inBuffer: boolean }
export function useNoteBuffer(): {
  // Disk text, reconciled with an open tab (the tab isn't changed).
  readCurrentText: (path: string, handle?: FileSystemFileHandle) => Promise<string>;
  // Reconcile the open tab with disk, apply `transform`, set the buffer (if open), and save.
  // transform → null = nothing to write ("unchanged"); a throw in transform propagates.
  writeThrough: (path: string, handle: FileSystemFileHandle, transform: (text: string) => string | null) => Promise<WriteThroughResult>;
};
```
- With no `handle`, `readCurrentText` resolves a fresh one with `resolveFileHandleAtPath(atom_vaultHandle, path)`.
- "Open" means `isPathInLayout(rootContainer, path) && openFiles[path]`, as Quick jot checks it today.
- `use-quick-jot.ts#run` then becomes `ensureTodayNote` → `writeThrough(path, handle, (t) => appendJotLine(t, line))`. Its outcome mapping is unchanged.

**Sheet folder** (`use-template-create.ts`): extract the prompt at `:194-216` into
```ts
// The Daily Sheets folder for `date` (pattern expanded, normalized), asking for the pattern the first time. null = cancelled.
const resolveSheetFolder = useCallback(async (date: Date, title = "Today's sheet"): Promise<string | null> => …)
```
`resolveTodayNote` uses it, and its behavior is unchanged. Return `resolveSheetFolder` and pass `writeNewNote` and `resolveSheetFolder` through `use-file-crud.ts`, so they reach `useFileSystem()`.

**Flows** (new `app/editor/hooks/use-rollups.ts`, ~170 lines; it uses `useFileSystem()`, `useNoteBuffer()` and `useStore()`):
```ts
export type RollupTarget = { kind: RollupKind; offset: 0 | -1 };
export function useRollups(): {
  openRollup: (target: RollupTarget, now?: Date) => Promise<void>;
  refreshRollup: (path: string) => Promise<void>;
};
```
- `loadSources(period)`: picks the daily sheet paths (see Behavior) and reads each with `readCurrentText`. For a month, it also finds `weeksOwnedByMonth` sheets by name and reads their `extractNotes`. It returns `{ sheets, weekNotes, failed, sensitive }`.
- `openRollup`:
  1. `period = kind === "week" ? weekPeriod(now, offset) : monthPeriod(now, offset)`.
  2. Look the path up with `findSheetByName(paths, name + ".md", folderFor(pattern, period.anchor))`.
  3. If a path is found and `findExisting` returns a handle, `openFile(handle, path, true)` and stop.
  4. Otherwise, `folder = await resolveSheetFolder(period.anchor, "Weekly sheet" | "Monthly sheet")`. Null means cancelled; stop.
  5. `loadSources` → `renderNewSheet` → `writeNewNote(folder, name, { text, cursor }, { unique: false, open: true })`.
- `refreshRollup`:
  1. `period = parseRollupName(basename)`. If null, return.
  2. `loadSources`, then `body = renderGeneratedBody(…)`.
  3. Call `writeThrough(path, freshHandle, (t) => { const next = spliceGenerated(t, body); if (next === null) throw new MarkersMissing(); return next === t ? null : next; })`.
  4. Map the outcome to the toasts in Behavior.
  5. Fire-and-forget `indexVaultTags()` after a write.

**Commands** (new `app/editor/hooks/use-rollup-commands.ts`, ~80 lines):
```ts
export function useRollupCommands(opts: { disabledReason?: string; beforeOpen: () => Promise<void> }): void;
```
- It registers four commands with `useRegisterCommand`:
  - ids `open-this-week-sheet`, `open-last-week-sheet`, `open-this-month-sheet`, `open-last-month-sheet`.
  - keywords `week weekly rollup review status report worklog summary` (and the `month monthly …` equivalents).
  - Each action is `await beforeOpen(); await openRollup(…)`.
- It registers `refresh-rollup` (label **Refresh rollup**, category Document, keywords `rollup refresh regenerate weekly monthly summary`) only when `parseRollupName(basename(atom_activeFilePath))` is non-null. Otherwise it passes `null`.
- It is called from `useHomeFeed`, which already owns `openToday`'s pre-steps:
  - `beforeOpen = async () => { setIsOpen(false); await materializeDraft(undefined, { background: true }); }`.
  - `disabledReason` comes from a new `vaultDisabledReason?: string` option.
  - `page.tsx:212` passes `isVaultLocked ? "Vault is loading" : !vaultHandle ? "Open a vault first" : undefined`.
  - The existing Today's sheet command keeps its own reason.

**Marker display** (new `app/editor/codemirror/rollup-markers.ts`, ~90 lines): a `ViewPlugin` like `live-markers.ts`.
- For visible lines matching `REGEX_ROLLUP_START` / `REGEX_ROLLUP_END` that the selection doesn't touch (or any such line when the editor is unfocused), add `Decoration.line({ class: "cm-rollupMarker" })` plus `Decoration.replace({ widget: new RollupMarkerWidget(kind) })` over the line text.
- When the selection touches the line, add only the line class. That class gives raw text in `var(--fg-faint)` at caption size.
- The widget is a hairline (`border-top: 1px solid var(--edge)`) with the start caption in `var(--fg-faint)`, styled by `EditorView.baseTheme`. Check the token names in `globals.scss`; no hard-coded colors.
- Register it in `extensions.ts` right after `liveMarkers` (`:85`).

**Why buffer-through refresh rather than writing to disk and letting the watcher reload?** For an open sheet with unsaved edits, the watcher would make disk win and push those edits into a snapshot. That is the conflict the brief rules out. Quick jot made the same choice.

**Why HTML-comment markers rather than fixed headings?** Headings can be renamed or duplicated by the user, and then a refresh would cut into their writing. A start/end pair gives one exact region. It is invisible on GitHub and in other renderers, and stripped from the feed preview. Phase 3 hides it in the editor. Frontmatter can't delimit a body region.

## Phase 1: Engine and `#blocked`

- `app/utils/taskExtractor.ts`:
  - `REGEX_TASK_HOLD = /#(?:hold|blocked)\b/i` (`:20`).
  - Add `"blocked"` to `STATUS_TAG_NAMES` (`:22`).
  - Change `REGEX_TASK_CLEANUP` (`:28`) to `\(\s*#(?:todo|prog|hold|blocked|done)\s*\)`.
  - Update the `onHold` comment in `TaskItem` (`:9`) to say `#hold or #blocked`.
- `app/services/metadata-cache.ts:14`: `METADATA_CACHE_VERSION = 2`, with a comment that #blocked changed the parsed tasks.
- `app/utils/today-note.ts`: `findSheetByName`. `findTodayNote` delegates to it.
- `app/utils/rollup/period.ts`, `collect.ts`, `render.ts`, `sections.ts` (new), as designed.

## Phase 2: Commands, create and refresh

- `app/hooks/file-system/use-note-buffer.ts` (new): `useNoteBuffer` with `readCurrentText` and `writeThrough`.
- `app/editor/hooks/use-quick-jot.ts`: use `writeThrough`. Behavior and outcomes are unchanged, and the existing `use-quick-jot.test.tsx` must pass with only its mocks adjusted.
- `app/hooks/file-system/use-template-create.ts` (308 → ~318 lines): `resolveSheetFolder`. `resolveTodayNote` calls it. Return it.
- `app/hooks/file-system/use-file-crud.ts:67,95`: destructure and return `writeNewNote` and `resolveSheetFolder`.
- `app/editor/hooks/use-rollups.ts` (new): `openRollup`, `refreshRollup`, `loadSources`. If it grows past ~200 lines, move `loadSources` into `use-rollup-sources.ts`.
- `app/editor/hooks/use-rollup-commands.ts` (new).
- `app/editor/hooks/use-home-feed.ts`: add the `vaultDisabledReason` option and call `useRollupCommands({ disabledReason: vaultDisabledReason, beforeOpen })`. Update the header comment (`:29-34`). The file grows to ~140 lines.
- `app/editor/page.tsx:212` (389 lines, +1): pass `vaultDisabledReason`.
- `app/editor/settings/sections/FilesSettings.tsx`: the Daily Sheets Folder description mentions that weekly and monthly sheets go there too.

## Phase 3: Marker display

- `app/editor/codemirror/rollup-markers.ts` (new), as designed.
- `app/editor/codemirror/extensions.ts:85`: add `rollupMarkers` after `liveMarkers`.

## Tests

All dates use `vi.setSystemTime` or explicit `new Date(y, m, d)`. Fixtures use tasks and products, never person names.

Phase 1:
- `app/utils/taskExtractor.test.ts`:
  - `- [ ] Deploy billing #blocked` is `onHold`, its tags exclude `blocked`, and its text is `Deploy billing`.
  - `(#blocked)` is stripped without leaving `()`.
  - `#blockedby` is not a status tag.
  - A checked task with `#blocked` is not `onHold`.
- `app/utils/today-note.test.ts`: `findSheetByName` follows the same preference rules. The existing `findTodayNote` cases still pass.
- `app/utils/rollup/period.test.ts`:
  - `isoWeekOf` for 2026-10-09 (W41), 2026-12-31 and 2027-01-03 (2026-W53), and 2027-01-04 (2027-W01).
  - `weekPeriod(now, -1)` on a Monday gives the previous Monday to Sunday.
  - `monthPeriod(Jan, -1)` gives December of the previous year.
  - Anchors: Thursday and the 1st.
  - The heading across a month boundary and across a year boundary (assert with `toContain`, since the locale can vary).
  - `parseRollupName`: valid names; rejects `2026-W00`, `2026-W54`, `2027-W53` (2027 has 52 weeks), `2026-13`, `notes.md`.
  - `weeksOwnedByMonth(2026-10)` gives W40–W44 (W40's Thursday is Oct 1).
  - A DST-change week has 7 dates.
- `app/utils/rollup/collect.test.ts`:
  - Done, blocked (`#hold` and `#blocked`, including `[/] … #blocked`) and open.
  - Dedup: a task open on Monday and checked on Wednesday counts once, as Done, linked to Wednesday.
  - Dedup: a task checked Monday and reopened Tuesday counts as open.
  - Case and whitespace differences dedupe.
  - Ordering by date, then line.
  - Done groups by first tag, alphabetically, with Other last.
  - Empty-text tasks are skipped.
  - `sheetCount`.
- `app/utils/rollup/render.test.ts`:
  - The weekly body matches a snapshot-free expected string for a small fixture.
  - The summary line for a period with sheets, and `No daily sheets this week` / `this month`.
  - Extra tags, `in progress` and `due` placement.
  - Items never start with `- [`.
  - The monthly Done uses `> [!success]- #tag · N` callouts.
  - The weekly notes section only contains weeks with notes.
  - `renderNewSheet` puts the cursor on the line after `## Notes`, and adds the sensitive frontmatter when asked.
- `app/utils/rollup/sections.test.ts`:
  - `spliceGenerated` keeps every byte outside the markers: text before and after, user lines just above the start marker, and CRLF files.
  - It returns null with no markers, with only one marker, or with the end before the start.
  - It uses the first start marker and the first end marker after it.
  - `extractNotes` takes Notes after the end marker, stops at the next `##`, keeps `###` lines inside, trims, and returns `""` when there is no Notes heading.

Phase 2 (mock `useFileSystem`, `useSaveFile`, `next/navigation` `useRouter`, Toastr; Jotai `<Provider>` / `createStore`):
- `app/hooks/file-system/use-note-buffer.test.tsx`:
  - `readCurrentText` returns disk text for a closed note.
  - For an open, dirty tab with an unchanged disk file, it returns the tab's text, and the tab is unchanged.
  - For an open, dirty tab with a changed disk file, it returns the disk text.
  - `writeThrough` covers the four Quick jot cases (not open, open and clean, open and dirty with disk unchanged, open and dirty with disk changed → snapshot). `null` from the transform gives `unchanged` and no save.
- `app/editor/hooks/use-quick-jot.test.tsx`: still passes.
- `app/editor/hooks/use-rollups.test.tsx`:
  - `openRollup({week, 0})` with an existing indexed `2026-W41.md` opens it without writing.
  - With none, it reads the week's daily sheets (including one in an old folder) and writes `<folder>/2026-W41.md` through `writeNewNote`. The folder is resolved for the Thursday. It opens the new sheet.
  - A cancelled folder prompt writes nothing.
  - Last week on Monday 2026-10-12 targets W41.
  - Last month on 2026-11-01 targets `2026-10`.
  - The monthly sheet includes the Notes of W41's weekly sheet and leaves out a week with empty notes.
  - A daily sheet that fails to read is skipped and the toast mentions it.
  - Refresh on an open, dirty sheet updates the buffer with no conflict, keeps the user's Notes and the lines outside the markers, and saves.
  - Refresh with markers missing writes nothing and shows the error toast.
  - Refresh with no changes shows `Rollup is up to date` and doesn't save.
  - A source sheet with `sensitive: true` frontmatter makes the new sheet sensitive.
- `app/editor/hooks/use-rollup-commands.test.tsx`:
  - The four commands are registered and disabled with the given reason.
  - Running one calls `beforeOpen`, then `openRollup` with the right target.
  - **Refresh rollup** is registered only while the active path is `…/2026-W41.md` or `…/2026-10.md`, and not for `2026-10-09.md` or `notes.md`.
- `app/hooks/file-system/use-template-notes.test.ts`: the existing `openTodayNote` / `ensureTodayNote` cases still pass. Add a case for `resolveSheetFolder(anchor)`: it prompts once, then expands `{{month}}` from the anchor.

Phase 3:
- `app/editor/codemirror/rollup-markers.test.ts`:
  - With the caret elsewhere, both marker lines get `cm-rollupMarker` and a widget, and the comment text isn't in the DOM.
  - With the caret on a marker line, its raw text shows.
  - A comment that isn't a rollup marker is not decorated.

## Docs

- `app/utils/rollup/README.md` (new): the four modules and the marker contract. `app/README.md`: add a row for `utils/rollup/` if utils are listed there.
- `app/hooks/README.md`:
  - New row for `use-note-buffer.ts`.
  - In the `use-template-create.ts` row: `resolveSheetFolder`, and `writeNewNote` now exposed through `useFileSystem`.
  - In the `use-quick-jot` row: it now uses `writeThrough`.
- `app/editor/README.md` (or the hooks index it holds): `use-rollups.ts`, `use-rollup-commands.ts`, `rollup-markers.ts`.
- `app/editor/components/home-feed/README.md` / the `use-home-feed` notes: the rollup commands and the `vaultDisabledReason` option.
- `ARCHITECTURE.md`, Runtime Components: one **Rollups** line. It covers the pure engine in `utils/rollup/`, `use-rollups.ts`, the reads and writes through `use-note-buffer.ts` (disk wins), and the marker region. Also add `#blocked` where the task parser is mentioned, if it is.
- **In-app docs:**
  - New `app/documentation/content/rollups.tsx` exporting `rollupsItem` (id `daily-weekly-monthly`, title **Daily, weekly, monthly**). Add it to `get-started.tsx`'s `items` right after `quickJotItem` (`:287`).
  - It covers:
    - the three levels and their names (ISO week, Monday start);
    - where the sheets go (the Daily Sheets folder, the Thursday rule);
    - the four commands and **Refresh rollup**;
    - what's in each section, the dedup rule and the ordering;
    - that only the part between the markers is rewritten, and Notes and everything outside are kept;
    - how the monthly sheet collects weekly Notes;
    - the folded Done groups in the monthly sheet;
    - that rollup items are plain list items, not tasks.
  - Keywords: `weekly monthly rollup week month review status report summary worklog daily sheet refresh blocked`.
- `app/documentation/content/editor-workspace.tsx:17-30`:
  - Add the row `{ label: "- [ ] task #blocked", value: "On Hold" }`.
  - Mention `#blocked` next to `#hold` in the paragraph, and in the item's `keywords`.
- `app/documentation/content/editor-workspace.tsx` command palette section: list the new commands if it lists commands.
- `app/documentation/content/settings-mobile.tsx`: the Daily Sheets Folder description mentions weekly and monthly sheets.

## Acceptance criteria

- [ ] **This week's / Last week's / This month's / Last month's sheet** are in the palette and disabled with `Open a vault first` (or `Vault is loading`).
- [ ] A missing sheet is generated, written to the Daily Sheets folder (Thursday / 1st rule for `{{month}}`) and opened with the caret under `## Notes`. An existing sheet is opened unchanged.
- [ ] On Monday, **Last week's sheet** targets the week that just ended. On the 1st, **Last month's sheet** targets the month that just ended. `2026-W53` covers Dec 28 2026 to Jan 3 2027.
- [ ] Daily sheets are found by file name anywhere in the vault. Days without a sheet are skipped. A period with none gives a valid sheet saying `No daily sheets this week` / `this month`.
- [ ] The summary line reads `N done · N open · N blocked`. Done is grouped by first tag with Other last. Blocked holds open `#blocked` / `#hold` tasks. Each item links to its day. Ordering is oldest first.
- [ ] A task carried across days appears once, in its state on the latest day, linked to that day.
- [ ] Rollup items are not tasks: the Tasks page shows no new entries after a rollup is created.
- [ ] The monthly sheet counts by exact daily dates, folds Done per tag with counts, and collects non-empty weekly Notes under `### Week N · [[YYYY-Www]]`.
- [ ] **Refresh rollup** appears only on a weekly or monthly sheet. It rewrites only the region between the markers; Notes and every line outside are unchanged byte for byte.
- [ ] Refresh on an open sheet with unsaved edits updates the buffer with no conflict prompt and keeps the edits. The cursor stays put, and undo restores the old region.
- [ ] Refresh with removed markers writes nothing and explains how to rebuild.
- [ ] `#blocked` shows in the Tasks page's On Hold group and is stripped from the task text. Cached metadata is re-parsed once (cache version 2).
- [ ] Marker lines show as a hairline and caption unless the caret is on them.
- [ ] Quick jot behaves exactly as before.
- [ ] Works on local folder, browser and GitHub vaults, and from the palette on mobile.
- [ ] Docs updated. Every touched source file is under 400 lines. No new network calls.

## Decisions

- **D1. Folder by the week's Thursday: confirmed.** It is the same rule ISO uses to give a week its year, so the week-year in the file name and the `{{year}}` / `{{month}}` folder always agree. `2026-W53` is in `2026/12`, never `2027/01`. The simpler alternative (the folder of the Monday) breaks that agreement for `W01` weeks that start in December.
- **D2. One start/end HTML comment pair around the whole generated region.** Notes, the heading and the user's additions sit outside it. Per-section markers would add noise and buy nothing, since Notes is the only section the user writes. Missing markers make refresh refuse, never guess.
- **D3. Rollup items are plain list items, not task lines.** Copying `- [ ]` would duplicate every open task on the Tasks page and invite checking off a copy that doesn't write back to the day. The day link is the way back to the source task.
- **D4. "open" in the summary excludes blocked**, matching the brief's example `12 done · 4 open · 1 blocked`, where the sections don't overlap.
- **D5. `#blocked` maps to the existing On Hold status**, not to a new Tasks-page group. Both mean "not moving, waiting on something". A fifth group would add UI for little gain. In rollups, a `#blocked`/`#hold` tag wins over `[/]`/`#prog`, because a blocked item matters most in a status update. The Tasks page keeps its existing precedence (in progress wins), so that is unchanged.
- **D6. Sensitivity is copied on creation only.** A rollup quotes task text, so a sheet built from a sensitive day starts as sensitive. Refresh doesn't edit frontmatter: `updateFmFields` reflows notes without frontmatter (`frontmatter-utils.ts:80-84`), which would break "kept exactly as written".
- **D7. No shortcuts.** These run once a week or month. The palette is enough, and it avoids another browser/OS clash review.
- **D8. Source text is read from disk, reconciled with an open tab without changing it.** The rollup then reflects what the user sees, and disk wins. The metadata index's tasks are not used: they can lag behind external changes, and they hold no unsaved text.
- **D9. Several files for one date: one is used**, picked by `findSheetByName`'s rule (the Daily Sheets folder first, then the shallowest). This is the same sheet Today's sheet would open. Merging two same-dated files would double count copied tasks.
- **D10. Weekly Notes in the monthly sheet are copied verbatim**, including any task lines the user wrote there (those then show on the Tasks page, as the user wrote them). Weeks belong to the month that holds their Thursday, so each week's notes appear in exactly one monthly sheet.
- **D11. No timestamp in the generated region.** A refresh with no new tasks then writes nothing (`Rollup is up to date`), and the file doesn't churn in GitHub vault commits.
- **D12. Shared buffer write path.** Quick jot's inline reconcile-and-save moves into `use-note-buffer.ts#writeThrough`, so rollups and jots follow one disk-wins path.

## Out of scope / Deferred

- Copy as Slack / plain text; quarterly and yearly levels; weekly and monthly templates; carrying open tasks into the next daily sheet; rolling up anything other than task lines; AI summaries (per the brief).
- A Sunday week start.
- Automatic refresh (on open, on a schedule, or when a daily sheet changes).
- Keyboard shortcuts for the rollup commands.
- Home feed rows for this week or month.
- Rebuilding a sheet whose markers were deleted (the user deletes the file and runs the command again).
- Updating frontmatter (sensitivity) on refresh.

## Open questions

- Should a rollup built from a sensitive daily sheet also become sensitive on **refresh** (D6 only does it on creation)? It is cheap to add with a careful frontmatter insert if wanted.
- Monthly Done is folded per tag (`> [!success]- #bug · 7`). Is folded-by-default right, or should the groups start expanded (`+`)?
- Should **Refresh rollup** also be offered on the home feed or in the sheet's tab menu, or is the palette enough?
