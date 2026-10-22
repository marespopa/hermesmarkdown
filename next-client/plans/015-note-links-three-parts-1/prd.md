# Note links: backlinks, unlinked mentions, link rewrite on rename — engineering PRD

## Context

Brief: `plans/015-note-links-three-parts-1/brief.md`. The user wants to see a note's connections and keep them from breaking: (1) a "Linked from" list for the note in front, (2) "Unlinked mentions" (notes that name this note in plain text), (3) `[[wikilinks]]` rewritten across the vault when a note or folder is renamed or moved.

What exists:

1. **Link extraction.** `app/workers/parse-note.ts:11` (`REGEX_LINK = /\[\[(.*?)\]\]/g`) and `:71-73` put every `[[…]]` target, raw and trimmed (`Note`, `Note|alias`, `Note#Heading`, `folder/Note`, embeds `![[Note]]` too, frontmatter included, fenced code **not** skipped), into `FileMetadata.links` (`app/atoms/metadata.ts:8`), held in `atom_fileMetadata` (path → meta, `name` includes `.md`).
2. **Link resolution.** `app/hooks/file-system/resolve-file-by-name.ts:27` `resolveFileMetaByName(name, fileMetadata, fromPath)`: strips `|alias` (not `#heading`), exact case-insensitive vault path, then path relative to the linking note's folder (only when the name holds a `/`), then basename match with ties broken by tree distance → path depth → alphabetical. It is O(N) per call (`Object.values` + `find`/`filter`). Callers strip `#heading` themselves (`use-open-or-create-link.ts:22`).
3. **Note-text index** in the metadata worker: `app/workers/content-index.ts` (`ContentIndex`: `text`, same-length `folded`, `bodyStart`, `isPrivate`; private notes never returned), `content-search.ts` (`searchContent`, `buildSnippet`, `WORD_CHAR`, `handleContentMessage`), protocol `content-search-protocol.ts`, main-thread client `app/services/content-search-client.ts` (`searchNoteContent`: one global `supersede` slot, so a second caller would cancel the palette's search).
4. **Rename / move follow-up.** `app/atoms/vault-atoms.ts:170` `atom_remapVaultPaths` re-keys tabs, layout, `atom_fileMetadata`, worker index, pins. Called from `use-rename-item.ts:150-153`, `use-move-item.ts:149` (per item; `moveItems` `:175-199` rescans once), and undo `use-file-undo.ts:57-63`. "Open tabs already follow" (brief) — that is this atom. **Nothing rewrites link text, so links to a renamed/moved note break (missing).**
5. **The library** (code folder `app/editor/components/sidebar/`, desktop only: `EditorShell.tsx:51` `hasSidebar = !isMobileChrome && …`): `WorkspaceSidebar.tsx` renders Open Notes, then `SidebarOutline` (`≈:94-97`, only `onWorkspace && activeTabPath`), then Files. Sections use `SidebarSection` (`title`, `defaultCollapsed`, collapsed state remembered by title in `atom_sidebarCollapsed`; children are **not mounted while collapsed**). Row look: `sidebar-classes.ts#sidebarItemClass`, `SIDEBAR_ICON_CLASS`. Opening a note from the library: `sidebar/use-sidebar-navigation.ts#openHandle(handle, path)`.
6. **Open at a line:** `atom_pendingScrollTarget` (`app/atoms/ui-atoms.ts:289`, `{ path, line, column? }`, 1-based line, 0-based column) consumed by `app/editor/hooks/use-scroll-to-pending-target.ts`. The palette sets it after `openFile` (`CommandPalette.tsx:212`).
7. **Privacy:** `atom_noteDisplayItems` (`app/atoms/privacy-atoms.ts:36`) maps path → `NoteDisplayItem` (`title`, `isPrivate`); a private note is absent at the `hidden` level. Every note listing must go through it (`app/utils/note-display.ts` header).
8. **Write a note that may be open:** `app/hooks/file-system/use-note-buffer.ts#writeThrough(path, handle, transform)` — reconciles an open tab with disk (disk wins, no prompt), puts the result in the tab buffer, saves; `transform` returning `null` writes nothing.

Missing: (A) a backlink index and a "Linked from" UI; (B) a mentions search and UI; (C) link rewriting after rename / move / undo; (D) a fast, shared resolver and link scanner both need.

## Behavior

### Linked from (phase 1)
- A library section **"Linked from"** right under Outline (above Files), shown when the editor route is active, a vault is open and the note in front is a vault note (not `draft`). Same condition as Outline plus `activeTabPath !== "draft"`. Boards included.
- Lists every note whose `links` contain a target that resolves (resolver rules of Context 2, `#heading` and `|alias` stripped, resolved from the *source's* path) to the note in front. Embeds `![[X]]` count. Self-links excluded. One row per source note.
- Rows: the source's display title (`atom_noteDisplayItems`); sources absent from it (private at the `hidden` level) are left out. Sorted by title, case-insensitive, then path. Row `title` attribute = vault path. When two rows share a title, the row also shows the parent folder (or `/` for root) in `text-fg-faint` after the title.
- Empty: one quiet line `No notes link here` (`text-ui-footnote text-fg-faint`, row padding).
- Click / Enter: opens the source (`openHandle`), then puts the caret on the first wikilink in its text (skipping fenced/inline code, see `scanWikiLinks`) that resolves to the note in front, via `atom_pendingScrollTarget`. If none is found (e.g. the link is only in a code block), it just opens.
- Updates live: it is derived from `atom_fileMetadata`, so it follows edits once the note is re-indexed, rescans, renames.
- Mobile: no library, so no Linked from (same as Outline). See Deferred.

### Unlinked mentions (phase 2)
- Library section **"Unlinked mentions"** right under Linked from, same visibility, **collapsed by default** (`defaultCollapsed`). It searches only while expanded.
- Phrases searched: the note's file base name (no `.md`), plus its display title (`noteDisplayTitle` / `frontmatter.title`) if different case-insensitively. Phrases shorter than 2 characters after trimming are dropped; with none left show `Title too short to search`.
- A match: case-insensitive (`foldCase`), in the note body (after `bodyStart`), with a non-word character (`WORD_CHAR`) or line edge on both sides, and not inside a `[[…]]` span on that line. The note in front is excluded; private notes are never returned (worker rule); only paths in `atom_noteDisplayItems` are searched (privacy level + whatever the index lists).
- Results: up to 3 hits per note, 50 in total; notes ordered by number of matching lines (desc) then path; within a note by line. Each row: the note's display title, and under it the snippet (`buildSnippet`, 140 chars) in `text-ui-caption text-fg-muted`, truncated. Click / Enter opens the note and sets `atom_pendingScrollTarget({ path, line, column })`.
- States: while the first search runs, nothing below the header; no worker (`isContentSearchAvailable()` false) → `Search isn't available in this browser`; zero hits → `No unlinked mentions`; `pending > 0` → an extra faint line `Some notes are still being indexed`.
- Re-runs when the note in front changes, when its phrases change, and when `atom_fileMetadata` changes (debounced 600 ms). A newer search supersedes an older one; it never cancels the palette's search, and vice versa.
- No "link this mention" action (Deferred).

### Link rewrite on rename / move (phase 3)
- Triggers: `renameFile` (file or folder, every caller: Files tree, pane title…), `moveItems` / `moveItem` (drag, Move to…), and `undoFileOperation` for non-Trash moves (undoing a rename/move rewrites links back with the reverse mapping). Never for Trash / delete / restore-from-Trash.
- Always on, no prompt, no setting.
- Rule: a wikilink occurrence is rewritten **only if, as written, it resolved to note T before and no longer resolves to T's new path after** (from the source note's new path). So `[[Old]]` → `[[New]]` after a rename; a bare `[[Note]]` survives a move untouched; `[[Projects/Alpha]]` → `[[Work/Alpha]]` after a folder rename; relative links inside a moved note that would break are fixed too. Unresolved links (missing notes) are never touched. Case-only renames rewrite nothing (resolution is case-insensitive).
- New target text: if the original target had no `/` and the new base name resolves to T's new path from the source → the new base name; otherwise T's full vault-relative path. `.md` kept if the original had it. `#heading`, `|alias` and the `!` of an embed are preserved: `[[Old#Plan|the plan]]` → `[[New#Plan|the plan]]`.
- Not rewritten: occurrences inside fenced code blocks (``` / ~~~, including a board's `hermes-board` fence) and inline code spans.
- Which notes: every note in the pre-move `atom_fileMetadata` snapshot whose `links` contain a candidate (cheap filter); each is then rewritten on its current text (open tab reconciled with disk via `writeThrough`; unsaved edits survive per disk-wins rules). Notes not yet indexed at the time (first vault pass still running) are missed — accepted (Decisions).
- Feedback: rename → `toast.success("Updated links in N note(s)")` only when N > 0. Move → the existing toast message gets ` · updated links in N note(s)` appended when N > 0. Undo → no extra success toast. Any failed writes → `toast.error("Couldn't update links in N note(s)")`. A rewrite failure never fails or rolls back the rename/move.
- All vault backends (local FS Access, browser/OPFS, GitHub workspace) go through `writeThrough` → `saveFile`; GitHub sync diffs content (`github-vault-sync.ts:120`), so rewritten notes show up as modified on the next sync. No network calls.

## Design

### Pure core: `app/utils/note-links/` (new folder, `README.md` index)

`wikilink-scan.ts`
```ts
export interface WikiLinkTarget { target: string; heading: string | null; alias: string | null }
/** `Note#H|alias` → { target: "Note", heading: "H", alias: "alias" }; trims target. */
export function parseLinkTarget(raw: string): WikiLinkTarget;
export interface WikiLinkOccurrence extends WikiLinkTarget {
  from: number; to: number;            // the whole [[…]] (or ![[…]]) in the text
  targetFrom: number; targetTo: number; // the target's span (before any # or |), surrounding spaces excluded
  embed: boolean;
}
/** Every [[…]] outside fenced code and inline code spans, in order. */
export function scanWikiLinks(text: string): WikiLinkOccurrence[];
/** 1-based line and 0-based column of an offset. */
export function lineColumnAt(text: string, offset: number): { line: number; column: number };
```
Fence rule: copy `markdown-outline.ts:12` `FENCE = /^ {0,3}(`{3,}|~{3,})/` and its open/close logic (`:22-31`). Frontmatter is scanned too: links like `related: "[[X]]"` count as links in metadata. Inline code: on non-fence lines, mask backtick spans (matching run lengths) before matching `/\[\[([^\]\n]+)\]\]/g`.

`link-resolver.ts`
```ts
export interface LinkResolver { resolve(target: string, fromPath?: string | null): FileMetadata | null }
export function createLinkResolver(fileMetadata: Record<string, FileMetadata>): LinkResolver;
```
Builds once: `byPath: Map<lowercased path, meta>`, `byName: Map<lowercased name, meta[]>`. `resolve` has exactly the semantics of `resolveFileMetaByName` (strip `|alias`, add `.md`, exact path, relative-if-`/`, basename with the same tie-break). Move `folderOf` / `folderDistance` here. `resolve-file-by-name.ts#resolveFileMetaByName` becomes a one-line delegate `createLinkResolver(meta).resolve(name, fromPath)` so the existing tests (`resolve-file-by-name.test.ts`) prove parity.

`backlinks.ts`
```ts
/** target path → source paths (sorted, unique, self-links excluded). */
export function buildBacklinkIndex(fileMetadata: Record<string, FileMetadata>): Map<string, string[]>;
```
One resolver; for each source, each `parseLinkTarget(link).target` → `resolve(target, source.path)`.

`rewrite-links.ts`
```ts
export interface PathMove { from: string; to: string }
/** Applies the first move whose prefix matches (remapPath from app/atoms/utils.ts:92); else the path. */
export function mapMovedPath(path: string, moves: PathMove[]): string;
/** Old source paths whose metadata links may need rewriting. */
export function findRewriteCandidates(before: Record<string, FileMetadata>, after: Record<string, FileMetadata>, moves: PathMove[]): string[];
/** The rewritten text, or null when nothing changes. */
export function rewriteLinksInText(text: string, args: {
  sourceOldPath: string; sourceNewPath: string;
  before: LinkResolver; after: LinkResolver; moves: PathMove[];
}): string | null;
```
Per occurrence: `t = before.resolve(target, sourceOldPath)`; skip if null; `expected = mapMovedPath(t.path, moves)`; skip if `after.resolve(target, sourceNewPath)?.path === expected`; else replace `[targetFrom, targetTo)` with `formatTarget(expected, …)` (rules in Behavior). Replace from the end so offsets hold. `findRewriteCandidates` applies the same check to each `meta.links` entry (cheap superset filter; the text pass decides).

### State
`app/atoms/link-atoms.ts` (new):
```ts
export const atom_backlinkIndex = atom((get) => buildBacklinkIndex(get(atom_fileMetadata)));
```
Derived, lazy (computed only while Linked from is mounted); no persisted state. No other new atoms — mentions results are component state (like palette content hits; note text never in atoms).

### Worker: mentions
`app/workers/content-mentions.ts` (new, pure): `findMentions(index: ContentIndex, phrases: string[], paths: string[], limit: number): { hits: ContentHit[]; pending: number; capped: boolean }` — rules in Behavior. Export `WORD_CHAR` and `MAX_HITS_PER_NOTE` from `content-search.ts` and reuse `buildSnippet`. `[[…]]` spans per line via `/\[\[[^\]\n]*\]\]/g` on the folded line. Cap scanning per note at 200 occurrences (as `MAX_OCCURRENCES_PER_NOTE`).

Protocol (`content-search-protocol.ts:30-35`): add `| { type: "content:mentions"; searchId: number; phrases: string[]; paths: string[]; limit: number }` to `ContentRequest`; the reply reuses `ContentResults` (`type: "content:results"`). `content-search.ts#handleContentMessage`: add the case.

Client (`content-search-client.ts`): extract the promise body of `searchNoteContent` (`:78-105`) into a private `request(message: Omit<…,"searchId">, slot: "search" | "mentions")` using the shared `lastSearchId` counter (ids never collide) and a per-slot supersede map; add
```ts
export function findNoteMentions(phrases: string[], paths: string[], limit = DEFAULT_SEARCH_LIMIT): Promise<ContentSearchResult | null>;
```

### Hook: rewrite after moves
`app/hooks/file-system/use-rewrite-links.ts` (new):
```ts
export function useRewriteLinksAfterMove(): (before: Record<string, FileMetadata>, moves: PathMove[]) => Promise<{ updated: number; failed: number }>;
```
Reads `after = store.get(atom_fileMetadata)` (already remapped) and `atom_vaultHandle`; builds both resolvers; for each candidate (sequentially): `newPath = mapMovedPath(old, moves)`, fresh handle `resolveFileHandleAtPath(vaultHandle, newPath)` (`vault-atoms.ts:85`), `writeThrough(newPath, handle, (text) => rewriteLinksInText(text, …))` from `useNoteBuffer`. `"written"` → updated++; `"failed"` or a throw → failed++ (log with `console.warn`); `"unchanged"` → neither. Writable streams are closed inside `saveFile`/`file-writer` already; this hook opens none.

Why a post-move hook over rewriting inside `atom_remapVaultPaths`: the atom is synchronous state plumbing also used for paths that must not rewrite (Trash), and writing files needs `saveFile` (a hook). Why main-thread metadata for backlinks over a worker query: the links are already in `atom_fileMetadata`, it works without a worker, and it stays reactive for free; only mentions need note text, so only they go to the worker.

## Phase 1: shared link core + Linked from

- `app/utils/note-links/wikilink-scan.ts`, `link-resolver.ts`, `backlinks.ts`, `README.md` — new, per Design.
- `app/hooks/file-system/resolve-file-by-name.ts` — body replaced by a delegate to `createLinkResolver` (keep the doc comment, point it at `link-resolver.ts`).
- `app/atoms/link-atoms.ts` — new, `atom_backlinkIndex`. Add `export * from "./link-atoms";` to the `app/atoms/atoms.ts` barrel (`:5-13`).
- `app/editor/components/sidebar/LinkedFromSection.tsx` (+ `LinkedFromSection.md`) — new. Props `{ path: string; onOpen: (handle: FileSystemFileHandle, path: string) => Promise<void> }`. Reads `atom_backlinkIndex`, `atom_noteDisplayItems`, `atom_fileMetadata` (handles). Renders `<SidebarSection title="Linked from">`; rows are `Button variant="unstyled"` with `sidebarItemClass(false)` + `w-full`, a leading `HiOutlineDocumentText` (`react-icons/hi`, the Files tree's note icon, `vault-tree/FileRow.tsx:169`) at `size={14}` with `SIDEBAR_ICON_CLASS`, title `truncate`. On click: `await onOpen(meta.handle, source)`, then `const text = store.get(atom_openFiles)[source]?.content`; find the first `scanWikiLinks(text)` occurrence whose `createLinkResolver(store.get(atom_fileMetadata)).resolve(occ.target, source)?.path === path`; if found, `store.set(atom_pendingScrollTarget, { path: source, ...lineColumnAt(text, occ.from) })`. Keep under ~150 lines; put the click helper in `link-jump.ts` next to it if it grows.
- `app/editor/components/WorkspaceSidebar.tsx` — after the `SidebarOutline` block (`≈:94-97`) render `{onWorkspace && hasVault && activeTabPath && activeTabPath !== "draft" && <LinkedFromSection path={activeTabPath} onOpen={navigation.openHandle} />}`. Update the header comment (`:20-31`) to list the new section.

## Phase 2: Unlinked mentions

- `app/workers/content-mentions.ts` — new, `findMentions`.
- `app/workers/content-search.ts` — export `WORD_CHAR`, `MAX_HITS_PER_NOTE` (already exported), `buildSnippet` (already); add `case "content:mentions"` to `handleContentMessage` (`≈:162-180`) posting `{ type: "content:results", searchId, ...findMentions(...) }`.
- `app/workers/content-search-protocol.ts` — the new request variant.
- `app/services/content-search-client.ts` — `request` helper + `findNoteMentions` (Design). `searchNoteContent` behavior unchanged.
- `app/editor/components/sidebar/UnlinkedMentionsSection.tsx` (+ `.md`) — new. Props as Linked from. `<SidebarSection title="Unlinked mentions" defaultCollapsed>` wrapping an inner `MentionList` component (so the search runs only while expanded — collapsed sections don't mount children). `MentionList`: phrases from `atom_fileMetadata[path]` (`name` minus `.md`, `frontmatter.title`); paths = `[...atom_noteDisplayItems.keys()].filter(p => p !== path)`; effect with a 600 ms debounce on `[path, phrasesKey, fileMetadata]` calling `findNoteMentions(phrases, paths, 50)`; ignore a `null` (superseded) result; a stale-effect guard (`cancelled` flag). Rows: `Button variant="unstyled"` with `sidebarItemClass(false)` overridden to two lines (`h-auto py-1 flex-col items-start`), title + snippet. Click: `await onOpen(handle, hit.path)` then `setPendingScrollTarget({ path: hit.path, line: hit.line, column: hit.column })`. States per Behavior.
- `WorkspaceSidebar.tsx` — render it right after `LinkedFromSection`, same condition. File stays well under 400 (≈145 lines).

## Phase 3: rewrite links on rename / move / undo

- `app/utils/note-links/rewrite-links.ts` — new, per Design.
- `app/hooks/file-system/use-rewrite-links.ts` — new, per Design.
- `app/hooks/file-system/use-rename-item.ts` — `const store = useStore(); const rewriteLinks = useRewriteLinksAfterMove();`. Snapshot `const before = store.get(atom_fileMetadata)` just before `attemptRename()` (`≈:142`). In the follow-up block (`:150-153`), after `remapVaultPaths` and before `scanVault`: `const { updated, failed } = await rewriteLinks(before, [{ from: oldPath, to: newPath }])`, then the toasts from Behavior. Wrap in its own try/catch so a throw only logs + `toast.error` and the rescan still runs. Add `store`, `rewriteLinks` to the deps. (≈190 lines.)
- `app/hooks/file-system/use-move-item.ts#moveItems` (`:175-199`) — snapshot `before` before the loop; after `if (movedCount === 0) return;` and before `scanVault`, `await rewriteLinks(before, moves)` (moves holds `{from,to}` already; same shape as `PathMove`). Append ` · updated links in N note(s)` to `message` when `updated > 0`; error toast for `failed > 0`. (≈225 lines.)
- `app/hooks/file-system/use-file-undo.ts#undoFileOperation` — snapshot `before` before the loop (`:57`); collect the successfully remapped reverse moves `{ from: to, to: from }` (non-Trash branch only); after the loop and before `scanVault`, if any, `await rewriteLinks(before, reverseMoves)`; error toast on `failed > 0` (`id: "file-undo-links"`), no success toast. (≈95 lines.)
- `useFileCrud` needs no change (each hook calls `useRewriteLinksAfterMove` itself).

## Tests

All Vitest, fully mocked; Jotai `<Provider>` / `createStore()` per test; mock `next/navigation` (`useRouter`, `usePathname`) wherever a component under test imports navigation.

Phase 1
- `app/utils/note-links/wikilink-scan.test.ts` — `parseLinkTarget` for `Note`, `Note|a`, `Note#H`, `Note#H|a`, `folder/Note.md`, padded spaces; `scanWikiLinks` finds links and embeds with correct `from/to/targetFrom/targetTo/embed`, skips ``` and ~~~ fences (and a `hermes-board` fence), skips inline code (`` `[[x]]` ``, double-backtick spans), still finds frontmatter links; `lineColumnAt`.
- `app/utils/note-links/link-resolver.test.ts` — exact path, relative-with-slash, basename, tie-break (same folder first, then depth, then alphabetical), alias stripped, missing → null. Existing `resolve-file-by-name.test.ts` must pass unchanged.
- `app/utils/note-links/backlinks.test.ts` — sources for a target via bare, path, alias, heading and embed links; self-link excluded; unresolved ignored; duplicate-basename links go to the nearest note only; sorted unique.
- `app/editor/components/sidebar/LinkedFromSection.test.tsx` — store seeded with `atom_fileMetadata` (+ `atom_privacyLevel` via `store.set`); lists linking notes by display title; hides private sources at `hidden`; empty line; duplicate titles show the folder; click calls `onOpen` with the handle/path and sets `atom_pendingScrollTarget` to the link's line/column (seed `atom_openFiles[source].content` inside the mocked `onOpen`).
- `app/editor/components/WorkspaceSidebar.test.tsx` — "Linked from" shows for a vault note on `/editor`, not for `draft` or without a vault.

Phase 2
- `app/workers/content-mentions.test.ts` — on a real `ContentIndex`: whole-word, case-insensitive matches; no match inside `[[…]]`; no match in frontmatter; partial-word not matched (`Alpha` vs `Alphabet`); private notes excluded; excluded path (not in `paths`) skipped; `pending` for unindexed paths; ≤3 hits per note, `limit` respected, ordering; two phrases both match.
- `app/workers/content-search.test.ts` — `handleContentMessage` routes `content:mentions` to a `content:results` reply with the `searchId`.
- `app/services/content-search-client.test.ts` (extend) — mock `metadataWorker` from `@/app/hooks/file-system/shared`; a mentions request doesn't supersede a pending `searchNoteContent` and vice versa; a second mentions request resolves the first with `null`.
- `app/editor/components/sidebar/UnlinkedMentionsSection.test.tsx` — mock `findNoteMentions` and `isContentSearchAvailable`; collapsed by default → no call; expand → called with base name + distinct title and paths without the current note; renders hits; click → `onOpen` + `atom_pendingScrollTarget` with line/column; empty, unavailable, too-short and pending states. Use `vi.useFakeTimers()` for the debounce.

Phase 3
- `app/utils/note-links/rewrite-links.test.ts` — rename `[[Old]]`→`[[New]]`; heading/alias/embed preserved; `.md` kept; path link after folder rename; bare link untouched on move; bare link becomes a path when the new name is ambiguous from the source; relative link inside a moved note fixed; links in fences/inline code untouched; unresolved untouched; case-only rename → null; multiple occurrences in one line; returns null when nothing changes; `findRewriteCandidates` includes moved sources and linkers only.
- `app/hooks/file-system/use-rewrite-links.test.tsx` — mock `useNoteBuffer` (`writeThrough`) and `resolveFileHandleAtPath`; seed `atom_fileMetadata` as the post-remap state; asserts writes go to the new source paths with a transform producing the rewritten text, counts `updated`/`failed`, a thrown write counts as failed and doesn't stop the rest.
- Rename/move/undo hook tests (new `use-rename-item.test.tsx`, `use-move-item.test.tsx`, and extend the existing `use-file-undo.test.tsx`) — mock `useRewriteLinksAfterMove`: called after `remapVaultPaths` and before `scanVault` with the pre-move snapshot and the right moves (reverse moves for undo; not called for Trash undo); toast text with/without updated count; a rewrite throw still rescans.

## Docs

- New: `app/utils/note-links/README.md`; `sidebar/LinkedFromSection.md`, `sidebar/UnlinkedMentionsSection.md`.
- Update: `app/editor/components/sidebar/README.md` (two rows, and "the library (vault, Open Notes, Outline, Linked from, Unlinked mentions, Files)"); `WorkspaceSidebar.md`; `app/workers/README.md` (table row for `content-mentions.ts`, protocol bullet `content:mentions`); `app/hooks/README.md` (`use-rewrite-links.ts`); `app/atoms/README.md` (`link-atoms.ts`); `resolve-file-by-name.ts` comment; `next-client/ARCHITECTURE.md` "Metadata worker" / "Content search" bullet: one sentence on mentions and one on link rewriting after rename/move.
- In-app: `app/documentation/content/editor-writing.tsx` "wikilinks" section (`≈:429-449`) — one paragraph each: Linked from / Unlinked mentions in the library, and links following renames and moves (incl. undo). Add `linked from unlinked mentions rename` to its `keywords`. The file is already 542 lines (pre-existing); add paragraphs only, no restructuring in this change.

## Acceptance criteria

- [ ] Linked from lists exactly the notes whose wikilinks/embeds resolve to the note in front (bare, path, alias, heading forms), excludes self-links, and respects the `hidden` privacy level.
- [ ] Clicking a Linked from row opens the source with the caret on the first link to the note.
- [ ] Linked from / Unlinked mentions are hidden for the draft, without a vault, off the editor route, and on mobile chrome.
- [ ] Unlinked mentions is collapsed by default and makes no worker request until expanded.
- [ ] Mentions are whole-word, case-insensitive, body-only, never inside `[[…]]`, never from the note itself or private notes; click opens at the matching line/column.
- [ ] Palette `/` search and mentions search never cancel each other.
- [ ] Renaming a note rewrites `[[Old]]`, `[[Old#H]]`, `[[Old|a]]`, `![[Old]]` in other notes (open or closed) to the new name, keeping heading/alias/embed; a toast reports the count.
- [ ] Moving a note leaves bare links untouched unless they'd break or become ambiguous; path links are updated; renaming a folder updates path links to everything inside it.
- [ ] Links inside fenced code and inline code are never rewritten; unresolved links are never touched.
- [ ] Undoing a rename/move (⌘Z or the toast's Undo) restores the link text; Trash and its undo never rewrite links.
- [ ] An open tab with unsaved edits gets the rewrite in its buffer per disk-wins reconciliation; no conflict prompt appears.
- [ ] A failed link write shows an error toast and does not undo the rename/move or skip the rescan.
- [ ] `resolveFileMetaByName` behavior unchanged (existing tests pass).
- [ ] No new network calls; no raw `<button>`/`<input>`; only design tokens; every new/changed source file under 400 lines; docs above updated; tests above added.

## Decisions

- **Placement: the library, not the bottom of the note.** The brief allowed either. The library already hosts the note in front's Outline; a footer under the note would fight the minimal editor, preview mode and boards. Cost: no mobile surface (same as Outline today).
- **"Title" for mentions** = file base name plus the display title when different. Wikilinks resolve by file name, so that is what a link would use; the H1/frontmatter title catches prose that uses the readable name. Frontmatter `aliases` are not supported by the resolver today, so they're out.
- **Mentions are view-only** (no "Link" button); the brief asks to find them.
- **Rewrite is automatic, with a toast, no setting and no confirm** — matches the quiet rename (`use-rename-item.ts:19-20`) and the no-prompt rule; undo is the safety net, and undo restores link text by running the same rule in reverse.
- **Minimal-diff rule** (rewrite only links that would stop resolving to the same note) instead of "rewrite every link to the target" — keeps unrelated text and bare links stable across moves.
- **Code is skipped when rewriting and when jumping**, but metadata `links` (and so Linked from) still counts links inside code, as today; changing `parse-note.ts` would change tags/links behavior elsewhere.
- **Notes not yet indexed are missed** by the rewrite (first vault pass still running). Scanning every file's text on each rename would be slow on large vaults; the window is short.
- **Backlink index on the main thread** from `atom_fileMetadata` via a map-based resolver (O(links) per rebuild) rather than calling the O(N) `resolveFileMetaByName` per link.

## Out of scope / Deferred

- Mobile surface for Linked from / Unlinked mentions (e.g. a palette scope or overlay).
- "Link" action converting a mention into `[[…]]`; ignore-list for mentions.
- Frontmatter `aliases` in resolution, backlinks or mentions.
- Rewriting Markdown links `[text](Note.md)`, `/path` embed lines, image/attachment links, or links in non-`.md` files.
- Backlink context snippets in Linked from; a link graph view; link counts on Files rows.
- A setting to turn link rewriting off.

## Open questions

- Should Linked from also show on mobile in a later pass (palette "Links to this note" scope)? Not blocking.
- Is the move toast suffix (`· updated links in N notes`) the wording you want, or a separate toast? Not blocking.
