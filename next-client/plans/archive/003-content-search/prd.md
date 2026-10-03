# Content search — engineering PRD

## Context
Source: [`brief.md`](brief.md). Users need to find a phrase inside any note without remembering which file holds it. This adds a command-palette scope that searches note text across the vault. The index lives in the metadata worker and is fed by the reads the indexer already does. Matching is case-insensitive AND matching, results are ranked, and choosing one opens the note at the matching line. Sensitive notes never match.

What exists today:
1. **Palette scopes.** `app/components/CommandPalette/palette-model.tsx:38-43` defines `#` tag, `>` command, `!` task and `@` heading scopes. `scopeFromPrefix` (:89) only looks at `value[0]`. `CommandPalette.tsx:71-151` builds scoped rows synchronously in a `useMemo`, and `rows` (:177) caps them at `MAX_VISIBLE_ROWS` = 12. The file is 353 lines, so this feature needs extractions (Phase 3).
2. **`@` jump works only in the active editor.** `CommandPalette.tsx:223-225` dispatches a selection on `atom_activeEditorView`. To open a *different* note at a line, the codebase uses `atom_pendingScrollTarget` (`app/atoms/ui-atoms.ts:187`, `{ path, line }`, a one-shot signal). `useScrollToPendingTarget` (`app/editor/hooks/use-scroll-to-pending-target.ts:9`, mounted in `MarkdownEditor.tsx:245`) consumes it: it treats `line` as **1-based**, places the caret at the start of the line, centers it and flashes it. `app/editor/tasks/page.tsx:29-33` calls `openFile` and then sets the target.
3. **The worker sees text only for notes it parses.** `app/workers/metadata.worker.ts:36-90` receives `{ files: [{path,name,content,modifiedAt}], requestId? }`, keeps nothing between messages, and replies `{ results, requestId }`. Two senders post to it:
   - the vault pass: `vault-index.ts#indexVaultFiles` (:211) → `parseWithWorker` (:283), wired in `use-vault-manager.ts:147-154`;
   - the active-file re-indexer, `use-index-active-file.ts:27-40`, which posts the **unsaved buffer** 1 s after edits, without a `requestId`.
4. **Missing piece: warm starts read almost nothing.** `indexVaultFiles` reuses IndexedDB cache entries (`services/metadata-cache.ts`) whose modified time matches (`reusableEntry`, :190), and those notes are **never read** (:249-251). After the first session, the metadata pass reads only changed notes. "Build the index in the same pass" alone would leave most of the vault unsearchable after a reload. The brief's premise only holds on a cold cache. See Decision D1.
5. **Change paths.**
   - The file watcher (`app/hooks/use-file-watcher.ts:99-126`, triggered by `file-observer.ts`) reads changed **open** tabs from disk and reconciles `atom_openFiles`. It doesn't re-index metadata itself: the active tab reaches the worker through `atom_content` → (3), and other open tabs wait for the next vault pass.
   - Rename/move goes through `atom_remapVaultPaths` (`app/atoms/vault-atoms.ts:134`), which re-keys `atom_fileMetadata` (~:186).
   - Delete drops metadata keys directly (`use-delete-item.ts:150-154`).
   - Vault open and close reset `atom_fileMetadata` to `{}` (`use-vault-manager.ts:184, 331`).
   - Every create, delete, rename, move, duplicate or import ends with `indexVaultTags()` (non-fresh pass).
6. **Privacy.** `isSensitiveFrontmatter` (`app/utils/note-privacy.ts`) is pure and worker-safe. `usePaletteFiles` (`use-palette-files.ts:232`) returns `files`, which already drops `_`-prefixed paths (unless hidden files are shown) and drops sensitive notes in `hidden` mode. Each `FileResult` has `isSensitive`. The `!` scope never matches masked tasks by text (`palette-model.tsx:66-78`).
7. `Ctrl/Cmd+Shift+F` ("Search files", `use-editor-shortcuts.ts:66`) currently just opens the palette, the same as `Ctrl/Cmd+K`.
8. `use-vault-manager.ts` is already **426 lines**, over the 400-line limit. Phase 2 touches it, so it must shrink (Phase 2 extraction).

Missing: the in-worker content index and search (3, 4), keeping it current (5), the palette scope and jump (1, 2), privacy filtering (6), and the shortcut (7).

## Behavior
**Scope.** Prefix `/` ("Note text"). Typing `/` first in the palette switches to the scope, the same way `#`, `>`, `!` and `@` do; the prefix stays in the input. `Ctrl/Cmd+Shift+F` opens the palette with `/` prefilled.

**Query.**
- The query is trimmed and lowercased, then split on whitespace into unique terms.
- Under 2 characters (after trimming): no search. The list shows the hint "Type at least 2 characters to search note text."
- A note matches when **every** term occurs somewhere in its body as a case-insensitive substring. The terms don't have to be on the same line, and there's no fuzzy or per-character matching.
- There's no quote, regex or operator syntax: characters like `"` and `*` are literal.

**What is searched.**
- The note body, **excluding YAML frontmatter**, and including fenced code blocks and raw Markdown syntax.
- Line numbers count from the top of the file, frontmatter included, so the jump lands on the right line.
- Notes over 1,000,000 characters are indexed up to that length.

**Results.**
- Each row has two lines:
  - first line: the snippet of the matching line, with every term occurrence highlighted (`HighlightedText`);
  - second line: the note's file name and `:line`, with the parent folder right-aligned, like file rows.
- At most **3 rows per note**. Rows are grouped by note: notes in score order, and within a note, rows by line score.
- The worker returns at most 50 rows, and the palette shows the usual 12.

**Ranking.**
- Line score:
  - +100 for each distinct term on the line;
  - +500 when the line contains the whole query as typed, with whitespace collapsed (multi-term queries only);
  - +30 for each term that starts a word;
  - +50 for a heading line (`^#{1,6}\s`).
- Note score:
  - its best line score;
  - +1000 when the body contains the whole phrase (multi-term queries only);
  - +200 when the file name contains any term;
  - +5 × min(total term occurrences, 10).
- Ties break on path.
- An exact phrase therefore beats scattered words, and one note can't take more than 3 of the 12 rows.

**Snippet.**
- The snippet is the matching line, trimmed of leading and trailing whitespace.
- If it's longer than 140 characters, the window starts 40 characters before the first match. A `…` is added on each side that was cut.
- Highlight indices are relative to the snippet string.

**Selecting a row.**
- The palette closes (after `nextPaint()`), then calls `openFile(handle, path)`.
- The path goes to the front of `atom_recentFilePaths`.
- `atom_pendingScrollTarget` is set to `{ path, line, column }`, so the editor puts the caret at the **first match on that line**, scrolls it into view and flashes it.
- From outside `/editor` the palette navigates to `/editor`, the same as file rows.
- If the note is already open and active, it jumps the same way.
- Pin (`Ctrl/Cmd+D`) and the right-click menu don't apply to content rows.

**Index state.**
- While notes are still being indexed (first pass or warm-start fill-in), results cover what's indexed so far. A muted footnote row reads "Indexing note text… N notes left".
- If the index size cap is hit, the footnote reads "Note text search covers part of this vault (size limit reached)."
- Without a worker (`metadataWorker === null`), the scope shows "Note text search isn't available in this browser."
- No matches: the existing empty state. Its hint lines (`CommandPalette.tsx:311, 318`) gain "/ for note text".

**Freshness.**
- Edits in the active tab are searchable about 1 s after typing stops (the existing re-indexer), unsaved text included, the same as tags and tasks.
- Disk changes to open tabs (file watcher) are searchable when the watcher picks them up.
- Other notes changed outside the app are picked up on the next vault pass (`indexVaultTags`: the periodic `use-vault-sync`, or any create, delete, rename or move). Metadata works the same way today.
- Rename and move keep a note's entries under the new path without re-reading it. Delete, vault close and vault switch drop the entries.

**Privacy.**
- Sensitive notes **never match**, in every Privacy Mode. In `hidden` they don't exist for search at all. In `show_title` and `blurred` they still don't appear: listing a title would reveal that the note contains the phrase.
- This is consistent with `!`, where masked tasks never match by text.
- Session reveals don't change this. Listings follow `atom_privacyLevel` alone.

**Backends.** Local File System Access, browser/OPFS and GitHub vaults share the handle-based read path (`readFilesForIndexing`), so they behave the same. The file watcher only covers native handles, as today.

**Mobile.** Same palette (sheet variant). Content rows use the 44 px minimum height (`min-h-11`) like other rows. They grow to fit two lines.

## Design

### Data flow
```
vault pass (parse chunk) ─┐                    ┌─ metadata results → atom_fileMetadata (unchanged)
active-file re-indexer ───┼─► metadata.worker ─┤
watcher / backfill ───────┘   (content:index)  └─ ContentIndex (worker heap only)
palette "/" scope ── content:search ─► worker ── content:results ─► usePaletteContentSearch (local state)
remap atom ── content:remap ─►  ;  useContentIndexSync ── content:remove ─►
```
Full note text lives **only in the worker heap**. No atom gets text: hits carry 140-character snippets in palette component state.

### Worker (pure modules, no DOM, React or Jotai)
`app/workers/content-search-protocol.ts`: shared types.
```ts
export interface ContentHit { path: string; name: string; line: number /* 1-based */; column: number /* 0-based, first match in line */; snippet: string; highlights: number[]; score: number }
export type ContentRequest =
  | { type: "content:index"; files: { path: string; name: string; content: string; modifiedAt: number }[] }
  | { type: "content:remove"; paths: string[] }
  | { type: "content:remap"; oldPath: string; newPath: string }
  | { type: "content:search"; searchId: number; query: string; paths: string[]; limit: number };
export interface ContentResults { type: "content:results"; searchId: number; hits: ContentHit[]; pending: number; capped: boolean }
```

`app/workers/content-index.ts`: storage.
```ts
export const MAX_NOTE_CHARS = 1_000_000;
export const MAX_TOTAL_CHARS = 32_000_000;
export function foldCase(text: string): string; // toLowerCase(), but per UTF-16 unit when lengths differ, so offsets map 1:1
export interface ContentEntry { name: string; text: string; folded: string; bodyStart: number; sensitive: boolean; modifiedAt: number }
export class ContentIndex {
  upsert(path: string, name: string, content: string, modifiedAt: number): void; // ignored when modifiedAt < existing.modifiedAt; frontmatter → bodyStart + sensitive via parseFmFields/isSensitiveFrontmatter; truncates to MAX_NOTE_CHARS; skips (capped = true) when the total would pass MAX_TOTAL_CHARS
  remove(paths: string[]): void;
  remap(oldPath: string, newPath: string): void; // remapPath() from app/atoms/utils.ts (worker-safe: type-only imports); file or folder prefix
  get(path: string): ContentEntry | undefined;
  has(path: string): boolean;
  readonly capped: boolean;
}
```
Frontmatter detection uses the worker's existing `REGEX_FRONTMATTER` (`metadata.worker.ts:8`). Move it into `content-index.ts` and export it, then import it back into the worker, so there's a single source.

`app/workers/content-search.ts`: query, rank and snippet.
```ts
export function parseContentQuery(query: string): { terms: string[]; phrase: string } | null; // null when trimmed length < 2
export function searchContent(index: ContentIndex, query: string, paths: string[], limit: number): { hits: ContentHit[]; pending: number; capped: boolean };
```
- Iterate `paths`. Skip sensitive entries, and count paths without an entry as `pending`.
- AND-check with `folded.indexOf(term, bodyStart)`.
- Collect candidate lines from term occurrences, capped at 200 occurrences per note. Score lines as described in Behavior.
- Count line numbers in one forward pass per matched note.
- Build snippets from `text`, taking highlight offsets from `folded` (the same length, thanks to `foldCase`).

`metadata.worker.ts` (:36):
- Dispatch on `event.data.type`. Messages without `type` are the existing parse request.
- After a file parses successfully, call `index.upsert(path, name, content, modifiedAt)`. This covers both the vault pass and the active-file re-indexer, with no extra read.
- `content:index` → upsert only, no reply. `content:remove` and `content:remap` → mutate, no reply. `content:search` → `postMessage(ContentResults)`.
- The search reply has no `results` and no `requestId` key, so `parseWithWorker` (:293) and `useIndexActiveFile` (:52) ignore it. Keep it that way.

**Memory budget.** About 2 bytes for each indexed ASCII character: `text` plus `folded`, both one-byte V8 strings. Non-Latin-1 text takes about 4 bytes per character.
- Typical vault: 5,000 notes × 4 KB ≈ 40 MB of worker heap.
- Hard cap: 32M characters, about 64–128 MB. Past the cap, more notes aren't indexed and `capped` is reported.
- Main-thread cost: hit arrays of at most 50 rows × 140 characters.

**Query cost.** A linear `indexOf` scan of about 20M characters for each term, in the worker. Expect tens of milliseconds at 5,000 notes. The main thread only debounces (150 ms) and posts the query plus the `paths` list (≤5k strings) per search, so typing never waits on it.

### Main-thread client
`app/services/content-search-client.ts`. It imports `metadataWorker` from `app/hooks/file-system/shared.ts`. Every function is a no-op or empty result when the worker is null.
```ts
export function isContentSearchAvailable(): boolean;
export function markContentIndexed(files: { path: string; modifiedAt: number }[]): void; // records path → modifiedAt in a module Map
export function needsContentIndex(path: string, modifiedAt: number): boolean;     // map.get(path) !== modifiedAt
export function indexNoteContent(files: ReadableFile[]): void;                     // marks + posts content:index
export function removeNoteContent(paths: string[]): void;                          // map delete + post
export function remapNoteContent(oldPath: string, newPath: string): void;          // remap map keys (remapPath) + post
export function searchNoteContent(query: string, paths: string[], limit?: number): Promise<Omit<ContentResults, "type" | "searchId"> | null>;
// resolves null when superseded by a newer search, or after a 5 s timeout with no reply; one listener per call, removed on settle
```

### Keeping the index current
- **Vault pass.** `use-vault-manager.ts` wraps the `parse` dep with `markContentIndexed(files)` before calling `parseWithWorker`.
- **Warm-start backfill (D1).** `vault-index.ts#indexVaultFiles` gains optional deps:
  ```ts
  needsContent?: (path: string, modifiedAt: number) => boolean;
  indexContent?: (files: ReadableFile[]) => void;
  ```
  and returns `{ done, contentDone }`.
  - `contentDone` starts after `done` resolves: (a) reusable (cache-hit) stats, (b) where `needsContent` is true, (c) newest first, (d) read in `chunkSize` chunks through `deps.read`, (e) passed to `indexContent`, (f) checking `isCurrent()` after each await.
  - `atom_indexerState` still goes idle on `done`, so the home feed's indexing indicator doesn't stretch.
  - A note is read at most once per session for content: the metadata pass reads changed notes, and the backfill reads the rest.
- **Active file.** No change. The worker upserts on parse. The re-indexer also calls `markContentIndexed` for the posted file (`use-index-active-file.ts:34`).
- **File watcher.** In `use-file-watcher.ts:112`, after `remoteContent` is read, call `indexNoteContent([{ path, name: handle.name, content: remoteContent, modifiedAt: file.lastModified }])`. Disk content wins, as it does for the tab.
- **Rename/move.** `atom_remapVaultPaths` calls `remapNoteContent(oldPath, newPath)` just before `set(atom_fileMetadata, …)` (~:186). Worker messages are processed in order, so the remap lands before any later remove.
- **Delete / close / switch.** New `app/hooks/file-system/use-content-index-sync.ts#useContentIndexSync()`.
  - It subscribes (`store.sub`) to `atom_fileMetadata` and keeps the previous key set in a ref.
  - On each change it posts `removeNoteContent(removedKeys)` when the list isn't empty.
  - Mount it **once**, in `CommandPalette` (always mounted by `MainPage.tsx:35`), not in `useFileSystem`, which many components call.

**Alternatives.**
- A separate search worker would need its own copy of every note's text: a second read, or posting the text to two workers. Rejected.
- An inverted index can't serve substring matches without n-gram blowup, and a scan is fast enough at 5k notes. Rejected.

### Palette
- `palette-model.tsx`: add the scope `{ id: "content", prefix: "/", label: "Note text" }` (:38). Add a row kind:
  ```ts
  | { kind: "content"; id: string /* `${path}:${line}` */; label: string /* snippet */; detail: string /* `${name}:${line}` */; file: FileResult; line: number; column: number; titleIndices: number[] /* highlights */; detailIndices: number[]; score: number }
  ```
  plus `export function buildContentRows(hits: ContentHit[], filesByPath: Map<string, FileResult>): Extract<Row, { kind: "content" }>[]`, which drops hits whose path isn't in `filesByPath`.
- New `app/components/CommandPalette/use-palette-content-search.ts`:
  ```ts
  export function usePaletteContentSearch(active: boolean, query: string, files: FileResult[]): { rows: ContentRow[]; status: "idle" | "short" | "searching" | "ready" | "unavailable"; pending: number; capped: boolean }
  ```
  - Searchable paths = `files.filter((f) => !f.isSensitive)`.
  - 150 ms debounce. Results from a superseded search (`null`) are dropped, and the previous rows stay visible while a newer search runs.
  - While `active` is false it returns idle and posts nothing.
- New `app/components/CommandPalette/PaletteRow.tsx`: the row `Button` markup moves here from `CommandPalette.tsx:321-336`, along with `resultContext` and `isPinned`'s inputs as props. Content rows render the two-line layout. Write a sibling `PaletteRow.md`.

## Phase 1: Worker content index and search
- `app/workers/content-search-protocol.ts`: new (types above).
- `app/workers/content-index.ts`: new: `foldCase`, `REGEX_FRONTMATTER` (moved), `ContentIndex`.
- `app/workers/content-search.ts`: new: `parseContentQuery`, `searchContent`, snippet and highlight helpers.
- `app/workers/metadata.worker.ts`:
  - import `REGEX_FRONTMATTER` from `./content-index`;
  - create a module-level `const contentIndex = new ContentIndex()`;
  - in the parse loop (:81), after `results.push`, call `contentIndex.upsert(...)`;
  - add the `type` dispatch at the top of `onmessage` (:36).
  - Keep the file under about 130 lines. Extract the dispatch into `content-search.ts#handleContentMessage(index, data, post)` if needed.
- `app/services/content-search-client.ts`: new (API above).
- `app/workers/README.md`: new directory index (none exists yet) listing the four worker files and the message protocol.

## Phase 2: Keep the index current (depends on 1)
- `app/hooks/file-system/vault-index.ts`:
  - `VaultIndexDeps` (:156): add `needsContent?` and `indexContent?`;
  - `indexVaultFiles` (:211): return `{ done, contentDone }`. `contentDone` chains on `done`, as in Design. The early `idle` return (:216) also gets `contentDone: Promise.resolve()`.
- `app/hooks/file-system/use-vault-manager.ts`:
  - deps (:147-154): wrap `parse` with `markContentIndexed`; add `needsContent: needsContentIndex` and `indexContent: indexNoteContent`;
  - after :159, `void contentDone.catch((err) => console.error("Failed to index note text:", err))`.
  - **Extraction (required, the file is 426 lines):** move `syncCurrentDirectoryToPath`, `navigateTo` and `navigateBack` (:280-325) into a new `app/hooks/file-system/use-vault-navigation.ts#useVaultNavigation({ vaultHandle, currentDirectoryHandle, scanVault })`. It returns the three callbacks, and `useVaultManager` spreads them into its return value. Behavior must not change. Target under 390 lines.
- `app/hooks/file-system/use-index-active-file.ts:34`: call `markContentIndexed([{ path: activeFilePath, modifiedAt }])` before posting.
- `app/hooks/use-file-watcher.ts:112`: call `indexNoteContent(...)` after `file.text()`.
- `app/atoms/vault-atoms.ts`: in `atom_remapVaultPaths`, call `remapNoteContent(oldPath, newPath)` before `set(atom_fileMetadata, …)`.
- `app/hooks/file-system/use-content-index-sync.ts`: new hook (Design).

## Phase 3: Palette `/` scope and jump (depends on 1; can ship after 2)
- `app/atoms/ui-atoms.ts:187`: change `atom_pendingScrollTarget` to `atom<{ path: string; line: number; column?: number } | null>`, and update its comment to cover palette text results.
- `app/editor/hooks/use-scroll-to-pending-target.ts:20`: set the anchor to `line.from + Math.min(Math.max(0, column ?? 0), line.length)`. Scroll and flash stay as they are. Callers that don't pass `column` behave as before.
- `palette-model.tsx`: add the scope, the `content` row kind and `buildContentRows`.
- `PaletteRow.tsx` / `PaletteRow.md`: new (extraction plus the content layout). Use `Button variant="menu-item"` and tokens only (`text-fg-muted`, `text-accent` highlights through `HighlightedText`).
- `CommandPalette.tsx`:
  - call `useContentIndexSync()`;
  - call `usePaletteContentSearch(scope === "content", query, files)`;
  - in `scopedRows` (:71), return `[]` for `"content"`, because rows come from the hook;
  - `rows` (:178): for the content scope, use the hook's rows capped at `MAX_VISIBLE_ROWS`;
  - `execute` (:195): a `content` branch that mirrors the file branch, plus `setPendingScrollTarget({ path, line, column })` after `openFile`;
  - status rows: short, unavailable, and a pending/capped footnote shown as a muted `<p>` under the list, not a row;
  - empty-state hints (:311, :318) gain `/`;
  - row markup moves to `PaletteRow`.
  - Net size must stay under 400 lines (expect about 340).
- `app/editor/hooks/use-editor-shortcuts.ts:68`: `openCommandPalette("/")`. `openCommandPalette` is `useCommandPalette().open` (:36), which already takes `initialQuery` (`CommandPaletteContext.tsx:24`), and the palette parses the prefix on open (`CommandPalette.tsx:62`).
- `app/components/KeyboardShortcutsOverlay/KeyboardShortcutsOverlay.tsx:29`: change the label to "Search note text".

## Tests
Fully mocked; Jotai `<Provider>` per test; mock `next/navigation` `useRouter`/`usePathname` and `useFileSystem` wherever components render.

**Phase 1**
- `app/workers/content-index.test.ts` (new):
  - `foldCase` keeps length for `"İstanbul"`;
  - upsert stores `bodyStart` past the frontmatter;
  - a sensitive frontmatter sets `sensitive`;
  - an older `modifiedAt` is ignored;
  - `remove`;
  - `remap` of a file, and of a folder prefix (`a/b` doesn't touch `a/bc`);
  - truncation at `MAX_NOTE_CHARS`;
  - `capped` once `MAX_TOTAL_CHARS` is hit (inject small limits through constructor options).
- `app/workers/content-search.test.ts` (new):
  - case-insensitive match;
  - multi-word AND across different lines matches; a missing term doesn't;
  - single characters aren't fuzzy-matched across the note;
  - a term only in the frontmatter doesn't match;
  - line numbers count the frontmatter lines;
  - a term inside a fenced code block matches;
  - an exact-phrase note outranks a scattered-words note;
  - ≤3 hits per note;
  - `limit` respected;
  - `paths` filter respected;
  - a sensitive note never returned;
  - `pending` counts unindexed paths;
  - snippet window with `…`, and highlights at the right offsets after trimming;
  - `column` = first match in line;
  - query < 2 characters → `parseContentQuery` null.
- `app/services/content-search-client.test.ts` (new), with a fake `Worker` (mock `@/app/hooks/file-system/shared`):
  - `needsContentIndex` after `markContentIndexed`, `remove` and `remap`;
  - `searchNoteContent` resolves only on its `searchId`; an older call resolves `null` when superseded; timeout → `null`;
  - null worker → unavailable and no throw.

**Phase 2**
- `app/hooks/file-system/vault-index.test.ts` (update):
  - `contentDone` reads only cache-reused notes for which `needsContent` is true, newest first, and passes them to `indexContent`;
  - it never reads notes that were parsed;
  - it stops when `isCurrent()` turns false;
  - `done` resolves before the backfill reads.
- `app/hooks/file-system/use-content-index-sync.test.ts` (new):
  - deleting metadata keys calls `removeNoteContent` with exactly those paths;
  - `setFileMetadata({})` removes all;
  - adding keys calls nothing.
- `app/atoms/remap-vault-paths.test.ts` (update): `remapNoteContent` is called with old and new paths, before the metadata update.
- `app/hooks/file-system/use-index-active-file.test.ts` (update): `markContentIndexed` is called with the posted path.

**Phase 3**
- `app/components/CommandPalette/CommandPalette.test.tsx` (update; mock `@/app/services/content-search-client`, use fake timers for the debounce):
  - typing `/foo bar` switches to the scope and calls `searchNoteContent("foo bar", paths)`;
  - `paths` excludes sensitive notes (show_title), `_` paths, and hidden-mode notes;
  - rows show the snippet with highlighted terms plus `name:line`;
  - Enter on a row calls `openFile(handle, path)` and sets `atom_pendingScrollTarget` to `{ path, line, column }`;
  - `/a` shows the 2-character hint and doesn't search;
  - `pending > 0` shows the indexing footnote;
  - unavailable → message;
  - a stale (`null`) response keeps the previous rows.
- `app/components/CommandPalette/palette-model` tests (add to `command-search.test.ts` or a new `palette-model.test.ts`):
  - `scopeFromPrefix("/x")` → content scope;
  - `buildContentRows` drops hits without a `FileResult`.
- `app/editor/hooks/use-scroll-to-pending-target.test.ts` (new): with a real `EditorView` over a 3-line doc, a target with `column` puts the caret at `line.from + column`; without `column` it goes to line start; out-of-range values are clamped.

## Docs
- `app/components/CommandPalette/CommandPalette.md` and `README.md`:
  - `/` scope, ranking, the per-note cap, privacy (sensitive notes never match), the jump through `atom_pendingScrollTarget`;
  - new files `use-palette-content-search.ts` and `PaletteRow.tsx`;
  - the "All search runs in memory" note: content search runs in the metadata worker.
- `PaletteRow.md`: new.
- `app/workers/README.md`: new index plus the message protocol.
- `app/hooks/README.md`:
  - `shared.ts`'s `metadataWorker` also holds the note-text index;
  - `use-content-index-sync.ts`, `use-vault-navigation.ts`;
  - `use-file-watcher.ts` feeds changed open tabs to the index.
- `app/atoms/README.md`: the `atom_pendingScrollTarget` `column` field; `atom_remapVaultPaths` also remaps the note-text index.
- `ARCHITECTURE.md`: the worker box adds "note-text index + search". Add a flow line from the palette to the worker, and a "Content search" bullet under Runtime Components covering D1 backfill and the memory cap. Principle 2: the note-text index is rebuildable derived state, held in memory only.
- `app/documentation/content/editor-workspace.tsx:197-207`: remove "there is no full-text search", add a `/` row to the KV table, and add a sentence on sensitive notes being excluded.
- Repo `README.md:40`: add "note text (`/`)" to the prefix list. Update the `Ctrl/Cmd+Shift+F` row in the shortcuts table (:122) to "Search note text".

## Acceptance criteria
- [ ] `/` in the palette searches note text across the vault. `#`, `>`, `!`, `@` and plain file search are unchanged.
- [ ] Matching is case-insensitive and AND-across-note. There's no fuzzy per-character matching. Frontmatter isn't searched, code blocks are.
- [ ] Rows show the highlighted snippet plus `name:line` and folder. At most 3 rows per note, and phrase matches rank above scattered words.
- [ ] Choosing a row opens the note with the caret at the first match on that line, scrolled into view. This also works when the note is already active, and from outside `/editor`.
- [ ] Sensitive notes never appear in `/` results in any Privacy Mode. `_`-prefixed notes follow the hidden-files setting.
- [ ] After a reload with a warm metadata cache, every note becomes searchable without a second read of notes the metadata pass already read. The footnote shows progress until then.
- [ ] Unsaved edits in the active tab become searchable about 1 s after typing stops. Disk changes to open tabs become searchable when the watcher sees them.
- [ ] Rename/move keeps results under the new path. Delete, vault close and vault switch drop them.
- [ ] No atom holds note text. Search runs in the worker, and typing in the palette stays responsive on a 5k-note vault (manual check).
- [ ] Works for local File System Access and OPFS browser vaults, on desktop and on the mobile sheet.
- [ ] `Ctrl/Cmd+Shift+F` opens the palette in `/` scope.
- [ ] `use-vault-manager.ts`, `CommandPalette.tsx` and every new file are under 400 lines.
- [ ] No raw `<button>`/`<input>` and no hard-coded colors. No network calls.
- [ ] The tests and docs listed above are added or updated.

## Decisions
- **D1: Warm-start backfill instead of "parse pass only".** The metadata pass skips cache-hit notes (Context 4), so content indexing alone would leave most of the vault unsearchable after a reload. Persisting the index is out of scope. A background backfill after `done` reads only the notes the pass skipped, so each note is read at most once per session for indexing, and cold starts add no reads at all. That keeps to the brief's "no second full vault read". Rebuild time is roughly a cold-start parse, which works today, so this isn't blocked.
- **D2: Prefix `/`.** It's free (no clash with `#`, `>`, `!`, `@`), and `/` is familiar for "search". A file query can no longer start with `/`, which matters little because palette paths never start with a slash.
- **D3: Frontmatter skipped; code blocks included.** Frontmatter is reachable through `#` tags and file titles, and keys like `sensitive: true` would only add noise. Code is legitimately searched for.
- **D4: Sensitive notes are excluded, not masked.** A masked row still reveals that the note contains the phrase. This matches `!`, where masked tasks never match by text. Enforced twice: the palette omits them from `paths`, and the worker refuses entries flagged `sensitive`.
- **D5: The index lives in the metadata worker.** It already receives every parsed text, so a second worker would need a second copy. Plain `indexOf` scan, no inverted index (substring semantics, simple, fast enough).
- **D6: The active tab's unsaved text is what's indexed**, consistent with tags and tasks (`useIndexActiveFile`). The `modifiedAt` guard keeps a stale disk read from overwriting it.
- **D7: No new background re-reads of closed notes changed outside the app.** They refresh on the next vault pass, as metadata does today. The brief asked to reuse the existing paths.
- **D8: `Ctrl/Cmd+Shift+F` is rebound to the `/` scope.** It duplicated `Ctrl/Cmd+K`, and "search in files" is the common meaning of that shortcut.
- **D9: The jump uses `atom_pendingScrollTarget` with a new optional `column`.** `@` works only inside the active view, and cross-note jumps already use this signal (Tasks page).
- **D10: Limits.** 2-character minimum, 150 ms debounce, 3 hits per note, 50 hits per response, 140-character snippet, 1M characters per note, 32M characters in total.

## Out of scope / Deferred
- Regex, quoted-phrase syntax, operators, search-and-replace, saved searches, fuzzy or semantic search, a full-page search panel, and persisting the index (IndexedDB).
- Re-indexing closed notes changed outside the app between vault passes (D7).
- Changing the `!` scope or the Tasks page's jump behavior. Note: Tasks pass a 0-based `task.line` into a 1-based target (`tasks/page.tsx:32`, `taskExtractor.ts:6`), which looks like an off-by-one. Don't fix it here (see Open questions).
- Showing several matches of the same line as separate rows.

## Open questions
- The Tasks page passes `task.line` (0-indexed) to `atom_pendingScrollTarget`, which is read as 1-based. It probably lands one line above the task. Should that get a separate fix?
- On cloud-synced folders with on-demand files (OneDrive and similar), the warm-start backfill reads every note once per session, which may download placeholder files. That's acceptable for now (cold starts already do the same). Should backfill be skipped when `atom_isCloudVault` is set?
- Should `show_title` mode list sensitive notes as a single masked "N sensitive notes match" row? The recommendation is no (D4).
