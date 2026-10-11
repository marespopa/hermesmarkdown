# 007 Rollups: engineer report

## Run 1

All three phases of `prd.md` are implemented. The mailbox was empty, so this was a fresh start with no fix list. I ran no tests, typecheck or build (project rule: only on request). Verification was a self-review of the diff against the acceptance criteria.

### Built

**Phase 1: engine and `#blocked`**
- `#blocked` status: `app/utils/taskExtractor.ts:9,20,23,29` (`REGEX_TASK_HOLD`, `STATUS_TAG_NAMES`, `REGEX_TASK_CLEANUP`, the `onHold` comment). The Tasks page needs no change, because `groupOf` already reads `onHold` (D5).
- Cache version 2: `app/services/metadata-cache.ts:14-15`.
- `findSheetByName`, with `findTodayNote` delegating to it: `app/utils/today-note.ts:31-56`.
- `app/utils/rollup/period.ts`: `isoWeekOf`, `weekPeriod`, `monthPeriod`, `parseRollupName`, `datesInPeriod` and `weeksOwnedByMonth`. Local-date arithmetic only.
- `app/utils/rollup/collect.ts`: `collectRollup` (dedup, latest day wins, blocked beats in-progress, date-then-line order) and `groupDone` (first tag, alphabetical, Other last).
- `app/utils/rollup/render.ts`: markers and regexes, `renderSummary`, `renderGeneratedBody` (weekly `### #tag` lists; monthly `> [!success]- #tag · N` callouts plus `## Weekly notes`) and `renderNewSheet` (caret on the blank line under `## Notes`, optional `sensitive: true` frontmatter).
- `app/utils/rollup/sections.ts`: `spliceGenerated` (byte-exact outside the markers, follows the file's CRLF style, null when markers are missing or out of order) and `extractNotes`.
- `app/utils/rollup/daily-sheets.ts` (new, not in the PRD): `pickDailySheets`, which applies the "one file per date" rule. It's a pure function, so it can be tested on its own.

**Phase 2: commands, create, refresh**
- `app/hooks/file-system/use-note-buffer.ts`: `readCurrentText` and `writeThrough`.
- `app/editor/hooks/use-quick-jot.ts:30-46`: now `ensureTodayNote` → `writeThrough`, with the same outcome mapping as before.
- `app/hooks/file-system/use-template-create.ts:185-201`: `resolveSheetFolder(date, title)`. `resolveTodayNote` (`:210-235`) uses it and is returned at `:317`.
- `app/hooks/file-system/use-file-crud.ts`: passes `writeNewNote` and `resolveSheetFolder` through to `useFileSystem()`.
- `app/editor/hooks/use-rollups.ts`: `openRollup` and `refreshRollup`, with toasts `Rollup refreshed`, `Refreshed · N daily sheet(s) couldn't be read`, `Rollup is up to date` and the missing-markers error. `indexVaultTags()` runs fire-and-forget after a write.
- `app/editor/hooks/use-rollup-sources.ts`: `loadSources` and `preferredFolder`. I split it out of `use-rollups.ts` as the PRD allows.
- `app/editor/hooks/use-rollup-commands.ts`: the four period commands (Navigation, with the keywords from the PRD) and `refresh-rollup` (Document). Refresh is registered only while the active path parses as a rollup name.
- `app/editor/hooks/use-home-feed.ts:63-74,127`: `beforeSheetOpen` (shared with `openToday`), the `vaultDisabledReason` option and the `useRollupCommands` call.
- `app/editor/page.tsx:218`: passes `vaultDisabledReason` ("Vault is loading" or "Open a vault first").
- `app/editor/settings/sections/FilesSettings.tsx:53`: the Daily Sheets Folder description now mentions weekly and monthly sheets.

**Phase 3: marker display**
- `app/editor/codemirror/rollup-markers.ts`: a `ViewPlugin` that adds the line class `cm-rollupMarker` plus a `RollupMarkerWidget` replace (hairline `border-top: 1px solid var(--border)`, start caption in `var(--fg-faint)`). The raw comment shows when the caret is on the line. The theme uses `EditorView.baseTheme`.
- `app/editor/codemirror/extensions.ts:33,87`: registered right after `liveMarkers`.

### Tests and docs

New tests:
- `app/utils/rollup/{period,collect,render,sections,daily-sheets}.test.ts`
- `app/hooks/file-system/use-note-buffer.test.tsx`
- `app/editor/hooks/use-rollups.test.tsx`
- `app/editor/hooks/use-rollup-commands.test.tsx`
- `app/editor/codemirror/rollup-markers.test.ts`: decoration builder plus one jsdom `EditorView` DOM check.

Updated tests:
- `app/utils/taskExtractor.test.ts`: four `#blocked` cases.
- `app/utils/today-note.test.ts`: `findSheetByName`.
- `app/hooks/file-system/use-template-notes.test.ts`: `resolveSheetFolder`.
- `use-quick-jot.test.tsx`: unchanged. Its existing mocks (`useFileSystem`, `useSaveFile`) still cover the new path.

Docs:
- `app/utils/rollup/README.md` (new)
- `app/README.md`
- `app/hooks/README.md`: the `use-template-create` row and a new `use-note-buffer` row.
- `app/editor/README.md`: hook rows for `use-home-feed`, `use-quick-jot`, `use-rollups`, `use-rollup-sources` and `use-rollup-commands`, plus a rollup markers bullet.
- `app/editor/components/HomeFeed.md`
- `app/editor/components/QuickJot.md`
- `ARCHITECTURE.md`: a Rollups line and `#blocked` next to the task parser.

In-app docs:
- New `app/documentation/content/rollups.tsx` (`rollupsItem`, id `daily-weekly-monthly`), added after `quickJotItem` in `get-started.tsx`.
- `editor-workspace.tsx`: the `#blocked` row, paragraph and keyword, and the commands in the palette list.
- `settings-mobile.tsx`: the Daily Sheets Folder row and keywords.

### Decisions

- **Sensitivity check:** a source counts as sensitive when `isSensitiveFrontmatter(meta.frontmatter)` **or** `isSensitiveContent(text)` is true. The text has just been read, so this also catches a flag the index hasn't seen yet. Weekly sheets count only when their Notes are actually copied.
- **Unreadable sheets on create:** after the `Created:` toast, a second toast says `N daily sheet(s) couldn't be read`. The PRD only specifies the refresh wording.
- **Failed weekly-sheet reads** in a monthly rollup are logged and skipped. They aren't counted in the "daily sheet couldn't be read" toast.
- **A failed refresh save** shows no extra toast, because `saveFile` already reports the reason under the `save-error` id. Unexpected errors show `Couldn't refresh the rollup`.
- **Task-box escaping:** an item whose text itself starts with a task box (`- [ ] [ ] foo`) is escaped to `\[ ]`. Without this the rollup line would turn back into a task, which breaks D3.
- **Stale index entry:** if a rollup sheet is indexed but missing on disk, `openRollup` creates it instead.
- **Hairline colour:** `--edge` doesn't exist as a CSS variable. The Tailwind `edge` token maps to `var(--border)`, so the hairline uses `var(--border)`.

### Not done / open

- The PRD's three open questions are still for the PRD author: sensitivity on refresh, whether monthly Done should start folded (`-`) or expanded (`+`), and whether to add Refresh rollup outside the palette.
- `#blocked` is not added to the editor's task-status cycling or to `TaskDialog`'s status list (`editor/components/constants.ts`, `TaskDialog.tsx`). The PRD only asked for the parser change.
- The rollup sheets' `### #tag` headings and item tags are indexed as vault tags like any other note's tags, so tag counts include them.

### To verify

From `next-client`:

```bash
corepack yarn tsc --noEmit
corepack yarn vitest run app/utils/rollup app/utils/taskExtractor.test.ts app/utils/today-note.test.ts \
  app/hooks/file-system/use-note-buffer.test.tsx app/hooks/file-system/use-template-notes.test.ts \
  app/editor/hooks/use-rollups.test.tsx app/editor/hooks/use-rollup-commands.test.tsx \
  app/editor/hooks/use-quick-jot.test.tsx app/editor/codemirror/rollup-markers.test.ts \
  app/editor/codemirror/extensions.test.ts
```

Riskiest to run: `rollup-markers.test.ts`, whose DOM case relies on jsdom rendering an `EditorView` (`extensions.test.ts` already does this), and the `toContain` locale assertions in `period.test.ts`.

Manual checks in the app:
1. With no vault, the four sheet commands are disabled with "Open a vault first".
2. With a vault and a few daily sheets that have tasks, run **This week's sheet**. Check the folder (Thursday rule when the pattern has `{{month}}`), the summary line, Done groups, Blocked (`#blocked` / `#hold`) and Still open. Check that the day links work and the caret lands under `## Notes`.
3. Write some Notes. Check off a task in a daily sheet and run **Refresh rollup**. Only the region changes, and Notes stay. Leave unsaved edits in the sheet and refresh again: no conflict prompt, edits are kept, the cursor stays, and Ctrl+Z restores the old region.
4. Run Refresh rollup again with nothing changed: you should see "Rollup is up to date".
5. Delete the `rollup:end` line and refresh: the error toast appears and nothing is written.
6. Run **This month's sheet**: Done is folded per tag with counts, and the weekly Notes appear under `## Weekly notes`.
7. The Tasks page shows no new entries from rollup sheets, and `- [ ] x #blocked` shows under On Hold.
8. Marker lines show as a thin rule with a caption, and the raw comment appears when the caret is on the line.
9. Quick jot still appends to today's sheet, including when the sheet is open and dirty.
