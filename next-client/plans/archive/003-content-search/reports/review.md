# Content search: review

## Review 1

2026-10-03, reviewer (factory mode). Scope: the uncommitted working tree against `prd.md`, Phases 1–3.

### Verdict: Changes requested

The implementation is complete, follows the PRD closely, and typecheck, the full test suite and the build all pass. It's held up by **one lint error in a new test file**, which makes `corepack yarn lint` (and therefore CI) fail. That's a one-line fix. Two small robustness issues in the `/` hook are also worth fixing while the engineer is in there.

### Checks

| Check | Result | Caused by the change? |
|---|---|---|
| `corepack yarn tsc --noEmit` | ✅ pass | — |
| `corepack yarn lint` | ❌ fail | **Partly.** One real error is in a new file (below). The other ~25k errors all come from `next-client/next-client/.next/dev/…`, a stray, git-ignored build-output directory (someone ran `next dev` from the wrong folder). That directory is pre-existing and unrelated to this change, but it also fails lint locally; it should be deleted. |
| `corepack yarn vitest run` | ✅ pass: 126 files, 887 tests | — |
| `corepack yarn build` | ✅ pass | — |

Lint excerpt (from the change):
```
app/components/CommandPalette/CommandPalette.content-search.test.tsx
  43:3  error  Cannot reassign variables declared outside of the component/hook   react-hooks/globals
> 43 |   scrollTarget = useAtomValue(atom_pendingScrollTarget);
```
Running ESLint on only the changed and new files gives exactly this one error.

New test files that ran and passed:
- `app/workers/content-index.test.ts`
- `app/workers/content-search.test.ts`
- `app/services/content-search-client.test.ts`
- `app/hooks/file-system/use-content-index-sync.test.ts`
- `app/editor/hooks/use-scroll-to-pending-target.test.ts`
- `app/components/CommandPalette/palette-model.test.ts`
- `app/components/CommandPalette/CommandPalette.content-search.test.tsx`

Updated test files that ran and passed: `vault-index.test.ts`, `remap-vault-paths.test.ts`, `use-index-active-file.test.ts` and `CommandPalette.test.tsx`.

**Note on concurrent edits.** Other files changed in the working tree *during* this review and were not in the initial `git status`:
- `app/components/CommandPalette/PaletteSearchBar.tsx` (the ⌘K hint was removed);
- `.claude/agents/*`, `scripts/factory`, `plans/README.md`;
- staged archive renames under `plans/`.

None of them relate to content search, so I didn't review them as part of this change. Whoever owns the `PaletteSearchBar` edit should know that `CommandPalette.md`'s Layout bullet still says "after the ⌘K hint". The `formatShortcut` import in `PaletteSearchBar.tsx` may also now be unused.

### PRD coverage

| Requirement / AC | Status | Evidence |
|---|---|---|
| `/` scope, prefix stays in the input; other scopes unchanged | done | `palette-model.tsx:44`, `CommandPalette.tsx:74,184`; existing palette tests pass |
| Query: trim, fold, unique terms, 2-character minimum + hint | done | `content-search.ts:23-28`, `CommandPalette.tsx:323` (via `contentMessage`) |
| AND, case-insensitive substring match; no fuzzy; frontmatter skipped, code included | done | `content-search.ts:96`, `content-index.ts:84-90`; tests in `content-search.test.ts` |
| Line numbers include the frontmatter; 1M-character truncation | done | `content-search.ts:44-61`, `content-index.ts:76` |
| Ranking (line and note scores, ties on path) | done | `content-search.ts:106-130,151` |
| ≤3 rows per note, ≤50 hits, 12 visible | done | `content-search.ts:130,152`, `content-search-client.ts:21`, `CommandPalette.tsx:184` |
| Snippet: trim, 140-character window from 40 before the first match, `…`, relative highlights | done | `content-search.ts:64-83` |
| Two-line row: highlighted snippet, then `name:line` + folder | done | `PaletteRow.tsx:52-57` |
| Select: close, `openFile`, recents, `atom_pendingScrollTarget` with `column`, `/editor` from elsewhere | done | `CommandPalette.tsx:207-216` |
| Caret at the column (clamped); callers without `column` unchanged | done | `use-scroll-to-pending-target.ts:21-25` |
| Pin and context menu don't apply to content rows | done | `CommandPalette.tsx:250`, `PaletteRow.tsx:50` |
| Index state: pending footnote, capped footnote, unavailable message, empty-state hints | done | `CommandPalette.tsx:284-290,320,328,335` |
| Freshness: active-file re-indexer (unsaved text) | done | `metadata.worker.ts:91`, `use-index-active-file.ts:36` |
| Freshness: file watcher | done | `use-file-watcher.ts:58` |
| Rename/move remaps before the metadata update | done | `vault-atoms.ts:190` |
| Delete / close / switch drop entries | done | `use-content-index-sync.ts:16-25`, mounted once at `CommandPalette.tsx:73` |
| D1 warm-start backfill after `done`; no second read of parsed notes | done | `vault-index.ts:163-174`, `use-vault-manager.ts:148-162` |
| Privacy: sensitive notes never match; `_` follows the hidden-files setting | done | `use-palette-content-search.ts:35`, `content-search.ts:93` (second guard) |
| No atom holds note text; search in the worker; 150 ms debounce | done | `use-palette-content-search.ts:50`; text only in `ContentIndex` |
| `Ctrl/Cmd+Shift+F` → `/`; shortcut label | done | `use-editor-shortcuts.ts:69`, `KeyboardShortcutsOverlay.tsx:29` |
| Size: `use-vault-manager.ts` < 390, `CommandPalette.tsx` < 400, new files < 400 | done | 388 / 351; the largest new source file is 178 lines |
| `use-vault-navigation.ts` extraction, behavior unchanged | done | `use-vault-navigation.ts` is a verbatim move; `use-file-system.test.ts` passes |
| No raw `<button>`/`<input>`, tokens only, no network calls | done | `PaletteRow.tsx` uses `Button variant="menu-item"` and tokens; grep finds no `fetch`/URLs |
| Tests and docs listed in the PRD | done, except for the lint issue | see the gaps below |
| Works across backends and on mobile; 5k-vault responsiveness | not verifiable here (manual) | the shared `readFilesForIndexing` path; `min-h-11` on mobile chrome (`PaletteRow.tsx:44`) |

There's no scope creep. The two additions beyond the PRD are reasonable and documented:
- the 1 s pending re-search;
- the `get-started.tsx` label updates.

### Findings

**Major**

1. **A new test breaks lint (CI).** `app/components/CommandPalette/CommandPalette.content-search.test.tsx:41-44`
   - **Problem:** `ScrollTargetProbe` reassigns a module-level `let` during render, which `react-hooks/globals` rejects.
   - **Failure:** `corepack yarn lint` exits non-zero on this file.
   - **Fix:** drop the probe component. Render with `const store = createStore(); <Provider store={store}>…`, then assert `store.get(atom_pendingScrollTarget)` in a `waitFor`. Hydrate the metadata and privacy atoms with `store.set` before rendering. (`useScrollToPendingTarget` isn't mounted in this test, so the target isn't consumed.)

**Minor**

2. **An unreadable note stays "pending" forever and the palette re-searches every second.** `use-palette-content-search.ts:48`, `vault-index.ts:169-173`, `vault-scan.ts:103-114`
   - **Problem:** `readFilesForIndexing` silently drops files whose `getFile()` or `text()` throws, but they stay in `atom_fileMetadata` (with their stat placeholder), so they stay in the palette's `paths`. They're never upserted, so the worker counts them as `pending` forever.
   - **Failure:** with a vault containing one file that fails to read (a locked file, or a cloud placeholder that errors), open the palette and type `/foo`. The footnote reads "Indexing note text… 1 note left" indefinitely. While the scope is open, the hook posts a full search (query + ≤5k paths, a full scan in the worker) every 1 s for as long as the palette stays open. The same happens for a note whose worker parse throws: `markContentIndexed` already ran in the `parse` wrapper, so the backfill never retries it.
   - **Fix:** have the backfill (and the parse wrapper) report paths that weren't read or indexed, and stop counting them. One option: post `content:index` with a tombstone, or keep a "skipped" set in the client and pass it as excluded from `pending`. Also stop the 1 s refresh when `pending` hasn't decreased since the last poll. This doesn't change what the user sees once indexing has finished.

3. **A timed-out search leaves the scope blank, with no message and no retry.** `use-palette-content-search.ts:46,65`, `CommandPalette.tsx:290`
   - **Problem:** `searchNoteContent` resolves `null` both when superseded and after the 5 s timeout. The hook ignores `null`, so `result.query` never matches `trimmed`, and `status` stays `"searching"`. That status also suppresses the empty state, and the pending re-search loop stops.
   - **Failure:** the worker is busy for more than 5 s (for example, parsing a chunk of very large notes during a cold open). The user types `/budget` and the list stays empty, with no "No matches", no footnote and no message, until they edit the query.
   - **Fix:** in `run`, if `next === null && !cancelled`, the `null` was a timeout (a supersede only comes from a newer effect run, which sets `cancelled` first). Re-schedule `run` after `PENDING_REFRESH_MS`, or set an error/ready state so the empty state shows.

**Question (PRD gap, not the engineer's fault)**

4. **Discarded unsaved text can stick in the index for the session.** `content-index.ts:75` + `use-index-active-file.ts:32` (D6)
   - **Problem:** the re-indexer stamps unsaved text with `Date.now()`. If the user then discards those edits (autosave off, "Discard Changes"), the disk copy's `lastModified` is older than that stamp. Every later upsert (vault pass parse, backfill, watcher) is then ignored until the file is saved again.
   - **Failure:** `/` lists lines that aren't in the file, and the jump lands on the wrong line. Metadata itself does refresh, because it has no guard, so the two disagree.
   - **Options:** an explicit "replace" upsert for disk reads of a file whose tab is no longer dirty, or posting the reverted buffer on discard.
   - Flagging for the architect or a human. It follows D6 as specified, so it doesn't block this review.

### Tests & docs gaps
- Only the lint fix in finding 1 is needed. The PRD-listed test cases are all present.
- Nit: `CommandPalette.content-search.test.tsx:103` finds highlights with `strong.text-accent`, which asserts on a CSS class. Prefer `within(row).getAllByText` on the highlighted characters, or a `data-` attribute that `HighlightedText` already exposes, if any.
- No tests for the `use-file-watcher.ts` hook-up or the `Ctrl/Cmd+Shift+F` rebinding. Neither file has an existing test, and the PRD didn't list them. That's acceptable.
- Docs are complete:
  - `CommandPalette.md` / `README.md`, `PaletteRow.md` (new), `app/workers/README.md` (new);
  - `app/hooks/README.md`, `app/atoms/README.md`, `app/services/README.md`, `app/editor/README.md`;
  - `ARCHITECTURE.md`, the in-app docs and the repo `README.md`.

### Handoff (fix list for `hermes-engineer`)
1. **Required:** fix the `react-hooks/globals` lint error in `CommandPalette.content-search.test.tsx:41-44`. Use a `createStore()` store passed to `<Provider store>` and assert `store.get(atom_pendingScrollTarget)` instead of the module-level probe variable. Then confirm with `corepack yarn eslint app/components/CommandPalette`.
2. **Should fix:** stop "pending" forever for notes that can't be read or parsed (finding 2). Don't count them as pending, and stop the 1 s re-search once `pending` stops decreasing. Add a test in `use-palette-content-search` or `vault-index`.
3. **Should fix:** on a timeout (`null` while not cancelled), retry or move to a ready/empty state instead of staying in `"searching"` (finding 3). Add a test with `searchNoteContent` resolving `null` for the only query.
4. Optional: replace the `strong.text-accent` selector in the highlight test with a behavioral query.
