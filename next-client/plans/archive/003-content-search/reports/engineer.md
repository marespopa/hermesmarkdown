# Content search: engineer report

## Run 1

All three phases of `prd.md` are implemented. The mailbox was empty: no RESUME notes and no fix list. Per the agent rules, I didn't run typecheck or tests (the handoff didn't ask for them). I verified by self-review against the acceptance criteria.

### Built
**Phase 1: worker index and search**
- Protocol types: `app/workers/content-search-protocol.ts:1-42`.
- `foldCase`, `REGEX_FRONTMATTER` (moved here from the worker), `MAX_NOTE_CHARS` / `MAX_TOTAL_CHARS`, and `ContentIndex` (upsert with the `modifiedAt` guard, truncation, the cap, the `sensitive` flag and `bodyStart`; remove; remap through `remapPath`): `app/workers/content-index.ts:9-138`.
- `parseContentQuery` (:23), `buildSnippet` (:64), ranking per Behavior (`rankNote`), `searchContent` (:134) and `handleContentMessage` (:157): `app/workers/content-search.ts`.
- `metadata.worker.ts`: a typed-message dispatch at the top of `onmessage` (:44), and an upsert after each successful parse (:91). Search replies carry no `results` and no `requestId`.
- Main-thread client: `app/services/content-search-client.ts`. It provides `isContentSearchAvailable`, `markContentIndexed` / `needsContentIndex`, `indexNoteContent`, `removeNoteContent`, `remapNoteContent`, and `searchNoteContent`, which resolves `null` when superseded or after 5 s.

**Phase 2: keeping the index current**
- `vault-index.ts`: added `needsContent?` / `indexContent?` deps and the `contentDone` backfill (:163). It reads only cache-reused notes that `needsContent` reports, newest first, in chunks, after `done`, and checks `isCurrent()` before and after each read. The early `idle` return includes `contentDone`.
- `use-vault-manager.ts:148-162`: `parse` is wrapped with `markContentIndexed`, the backfill deps are passed, and `contentDone.catch(...)` is attached. Navigation moved into the new `use-vault-navigation.ts`, which brings the file from 426 to 388 lines.
- `use-index-active-file.ts:36`: calls `markContentIndexed` before posting.
- `use-file-watcher.ts:58`: calls `indexNoteContent` with the disk text of changed open tabs.
- `vault-atoms.ts:190`: calls `remapNoteContent` before the metadata re-key.
- `use-content-index-sync.ts`: a `store.sub` on `atom_fileMetadata` that removes the paths that disappeared. It's mounted once, in `CommandPalette.tsx:73`.

**Phase 3: the palette `/` scope and the jump**
- `ui-atoms.ts:189`: `atom_pendingScrollTarget` gains an optional `column`. `use-scroll-to-pending-target.ts:21` sets the anchor to `line.from + clamp(column)`.
- `palette-model.tsx`: the `content` scope (:44), the `content` row kind and `ContentRow` type (:58-59), and `buildContentRows` (:88).
- `use-palette-content-search.ts`: a 150 ms debounce over the non-sensitive palette files. It keeps the previous rows, drops `null` responses, and reports status, `pending` and `capped`.
- `PaletteRow.tsx` / `PaletteRow.md`: the row markup is extracted here. Content rows use a two-line layout.
- `CommandPalette.tsx`:
  - the content scope and rows: :73-78, :184;
  - the execute branch that sets the scroll target: :204-214;
  - the short-query and unavailable messages, plus the pending / capped footnote: :284-290, :323, :335;
  - empty-state hints that now mention `/`;
  - net size: 351 lines.
- `use-editor-shortcuts.ts:69`: `Ctrl/Cmd+Shift+F` now calls `openCommandPalette("/")`. `KeyboardShortcutsOverlay.tsx:29` reads "Search note text".

### Tests/docs
- **New tests:**
  - `app/workers/content-index.test.ts`
  - `app/workers/content-search.test.ts`
  - `app/services/content-search-client.test.ts`
  - `app/hooks/file-system/use-content-index-sync.test.ts`
  - `app/editor/hooks/use-scroll-to-pending-target.test.ts`
  - `app/components/CommandPalette/palette-model.test.ts`
  - `app/components/CommandPalette/CommandPalette.content-search.test.tsx`
- **Updated tests:**
  - `vault-index.test.ts`: backfill tests.
  - `remap-vault-paths.test.ts`: remap order.
  - `use-index-active-file.test.ts`: `markContentIndexed`.
  - `CommandPalette.test.tsx`: the empty-state hint string.
- **Docs:**
  - new: `app/workers/README.md`, `PaletteRow.md`;
  - updated: `CommandPalette.md`, `CommandPalette/README.md`, `app/hooks/README.md`, `app/atoms/README.md`, `app/services/README.md`, `app/editor/README.md`, `ARCHITECTURE.md` (diagram, principle 2, the "Content search" component), the in-app docs (`editor-workspace.tsx` palette section, `get-started.tsx` shortcut rows), and the repo `README.md` (prefix list and shortcut table).

### Decisions
- **Content tests in a separate file.** I put the palette `/` tests in `CommandPalette.content-search.test.tsx` instead of adding them to the 729-line `CommandPalette.test.tsx`, so the client mock stays scoped. They use real timers with `waitFor` instead of fake timers; the 150 ms debounce stays well inside `waitFor`'s timeout.
- **Pending refresh.** While `pending > 0` (and not capped), the hook searches again every 1 s. The warm-start backfill doesn't touch metadata, so without this the "N notes left" footnote would freeze.
- **Footnote priority.** The capped message wins over the pending one, because cap-skipped notes count as pending forever. While a first search is in flight there's no "No matches" flash: the empty state is hidden when status is `searching`.
- **Accessible name.** A content row's name is `snippet name:line folder`.
- **`ContentHit.score`** carries the line score. Hits arrive already in rank order: notes by note score, then lines by line score.
- **`foldCase`** keeps any character whose lowercase form changes length (such as `İ`) as is. The query is folded the same way, so matching stays consistent.
- **A cap hit on an update** removes the stale copy instead of keeping outdated text. The cap resets when the index empties (vault close or switch).
- **Navigation hook setters.** `useVaultNavigation` uses `useAtom` setters, not `useSetAtom`, because `use-file-system.test.ts` mocks `useAtom` for `setIsVaultPending`.
- **Shortcut labels.** The in-app `get-started.tsx` rows were also relabelled "Search note text", to match the rebinding (D8).

### Not done / open
- No test for the `use-file-watcher.ts` change: there is no existing watcher test, and the PRD didn't list one. The `Ctrl/Cmd+Shift+F` binding also has no test, because `use-editor-shortcuts` has none.
- Unreadable notes (read failures) and notes whose parse threw are never indexed, so they stay in the `pending` count. The footnote can then show a small non-zero count indefinitely. Possible fix: have the backfill mark failures as done.
- The architect's open questions remain open: the Tasks page off-by-one (`task.line` is 0-based), skipping the backfill for cloud vaults, and a masked "N sensitive notes match" row (not built, per D4).

### To verify
```bash
cd next-client
corepack yarn tsc --noEmit
corepack yarn vitest run app/workers app/services/content-search-client.test.ts app/hooks/file-system/vault-index.test.ts app/hooks/file-system/use-content-index-sync.test.ts app/hooks/file-system/use-index-active-file.test.ts app/atoms/remap-vault-paths.test.ts app/editor/hooks/use-scroll-to-pending-target.test.ts app/components/CommandPalette app/hooks/use-file-system.test.ts
```
Manual checks in the app:
- Type `/word1 word2` in the palette. Rows should show highlighted snippets and `name:line`, with phrase matches first and at most 3 rows per note.
- Press Enter on a row. The note should open with the caret on the match, both from `/editor` and from the home feed.
- Reload with a warm cache. The "Indexing note text… N notes left" footnote should count down to nothing.
- Mark a note `sensitive: true`. It should never appear in `/` results.
- Rename a folder, then search. Results should show the new path.
- `Ctrl/Cmd+Shift+F` should open the palette with `/` prefilled.
- Check the mobile sheet layout, and typing responsiveness on a large vault.
