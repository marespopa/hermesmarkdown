# Vault-wide find and replace — engineering PRD

## Context

Brief: `plans/001-vault-wide-find-and-replace/brief.md`. Users can find text across the vault (the palette's `/` scope) and replace inside one note (CodeMirror's find panel), but can't replace across files. This adds a **Replace in Files** page: a find field, a replace field and options, a live preview of every match as before → after, per-match and per-file opt-out, then one click that writes the changes, with Undo. It runs on the existing text-grep worker.

What exists:

1. **Text-grep worker** — `app/workers/text-grep.worker.ts` (dispatch, one search at a time via `currentId`), `app/workers/text-grep.ts` (`grepFiles`: 8 concurrent reads, skips files over `MAX_NOTE_CHARS` 1M or with a NUL in the first 8 KB, reports every 120 ms, yields every 8 ms; a bounded path → text cache, `remember()` :52, `readText()` :76, re-read only when modified time or size changed, not re-checked within 2 s), `app/workers/text-grep-protocol.ts` (`GrepFile { path, name, handle?, content?, isNote? }`, `grep:search` / `grep:cancel` / `grep:results`).
2. **Grep client** — `app/services/text-grep-client.ts`: one module-level worker, created lazily (`getWorker` :21); `withContent` :36 (text fallback where handles can't be posted); `grepTextFiles` :54 with a 2.5 s regex stall watchdog that terminates the worker (:70–80). **Every new search cancels the one before** (`cancelTextGrep` :46), so a second consumer of this module would cancel the palette's search and vice versa.
3. **The search matchers don't fit replace.** Text mode is AND-of-terms, case-folded, ranked (`content-search.ts#parseContentQuery` :23); regex mode (`regex-search.ts#parseRegexQuery` :12) trims the query and is always case-insensitive; `rankRegex` caps 200 matches per file and returns ranked snippets (≤3 per note), not offsets. Notes are searched after `stripBoardFence` (`app/utils/board/board-format.ts:91`), which blanks fence lines, so offsets in the cached `text` don't match the file on disk. → New pure matcher on raw text is needed.
4. **Writing a note that may be open** — `app/hooks/file-system/use-note-buffer.ts#writeThrough` :56: reads disk, reconciles an open tab (`reconcile-disk.ts#reconcileWithDisk`: disk wins, unsaved text kept as a snapshot, no prompt), applies a `transform(text) => string | null`, puts the result in the tab's buffer (`atom_openFiles`), saves via `useSaveFile().saveFile(next, handle, 0, true, path)`. Returns `{ result: "written" | "unchanged" | "failed", inBuffer }`. `use-rewrite-links.ts` :42–61 is the multi-file precedent (sequential, one failed note never stops the rest).
5. **Index refresh after writes** — `saveFile` re-derives tasks only (`use-save-file.ts:123–135`). Note text index: `app/services/content-search-client.ts#indexNoteContent(files: { path, name, content, modifiedAt }[])` :49. Tags/links: `useFileSystem().indexVaultTags()` (called after bulk changes in `use-file-undo.ts:88–89`).
6. **The palette's file list** — `app/components/CommandPalette/use-palette-files.ts#usePaletteFiles(showHiddenFiles)` returns `files: FileResult[]` (`path, name, handle, isPrivate, isText?`): indexed notes minus `_` paths unless hidden files are shown, private notes dropped in "hidden" Privacy Mode, then code/text files (`atom_vaultTextFiles`). `use-palette-content-search.ts:62–70` shows how it turns them into `GrepFile`s (private dropped; `isNote` for notes).
7. **A results page to model on** — `app/editor/changes/page.tsx` (ShellPage + `LoadingBar` + states + per-file sections), `use-open-change.ts` (open a file at a line: fresh handle via `resolveFileHandleAtPath`, `openFile`, `atom_pendingScrollTarget`, `router.push(editorFileHref(path))`), `diff-classes.ts` (`ADD_ROW`, `DEL_ROW`, `ADD_SIGN`, `DEL_SIGN`, `CODE_FONT`).
8. **Missing:** a raw-text matcher with offsets and replacement expansion; a scan mode in the worker that returns every match; a client that doesn't fight the palette's search; the page, apply and undo; entry points.

## Behavior

Entry points
- Palette command **Replace in Files…** (id `replace-in-files`, Navigation, `opens: "page"`) → `/editor/replace`. Disabled with "Already in Replace in Files" on that route (the `page()` helper in `AppCommands.tsx:100` does this).
- In the palette's `/` scope with a query typed, the footer shows a **Replace…** chip. It closes the palette and opens `/editor/replace?find=<query>` (plus `&regex=1` when the palette's Regex chip is on). Phase 3.
- No keyboard shortcut in v1 (Ctrl/Cmd+Shift+H is the browser's Home on Chrome for Mac and History on Firefox; Cmd+Alt+H hides other apps on macOS).

The page (`/editor/replace`, title "Replace in Files")
- **Find** field (autofocused), **Replace with** field, and three toggles: **Match case**, **Whole word**, **Regex**. The options, plus **Include code files**, are remembered (`hermes_replace_options`). `?find=` and `?regex=1` on load prefill and override the stored values once; `find` is then kept in the URL (`replaceUrlParam`) so a refresh comes back to it.
- Find is **not trimmed** (leading/trailing spaces are part of the match). One character is enough. Empty Find → no scan, the hint "Type what to find."
- Literal mode: the find text matches exactly (regex characters escaped); the replacement is inserted literally.
- Regex mode: JavaScript syntax, flags `gm` (+`i` unless Match case; +`u`, dropped if the pattern only compiles without it, as `parseRegexQuery` does). `^`/`$` match at line ends; `.` doesn't cross lines; a match may span lines (`\n` in the pattern). Empty matches are skipped. In the replacement `$&`, `$1`–`$99`, `$<name>` and `$$` expand; anything else is literal. An invalid pattern shows "Not a valid regular expression yet." A pattern that runs 2.5 s without progress stops the scan: "Search stopped: this pattern takes too long. Try a simpler one." (same wording as the palette).
- Whole word: the match must not have a letter, digit or `_` (Unicode) directly before or after it.
- **Which files:** every note in `usePaletteFiles(atom_showHiddenFiles).files` that isn't private (`isPrivate`), plus text/code files (`isText`) when Include code files is on. Never the Trash (`isTrashPath`, `app/services/vault-trash.ts:14`). A page note under the options says "Private notes are skipped." when the vault has any.
- **Notes are matched on their whole text, frontmatter included** (renaming a tag or property is a main use). **Board JSON is never matched**: matches overlapping a ` ```hermes-board ` fence (opening to closing line) are dropped.
- Files over 1M characters or binary-looking (NUL in the first 8 KB) are skipped, as in the grep.
- **Open tabs with unsaved edits** are previewed from the tab's text, not disk (the text the write will act on).
- **Preview** (updates 250 ms after typing stops, keeps the previous rows until the new scan answers): a summary line "N matches in M files" (`CountBadge`/`formatCount` numbers) with a scan status ("Searching… N of M files" while running), then one section per file, sorted by path: a checkbox, the file name, folder, the file's match count, an **Open** button (opens the file at the first match); then each match on its own row: checkbox, `line`, and the line around the match (≤60 characters each side, `…` where cut) with the matched text struck in the deleted tint and the replacement after it in the added tint. With an empty Replace field the replacement shows nothing (a deletion). Clicking a match row's line number opens the file at that line and column.
- Typing in **Replace with** re-renders the preview without rescanning.
- **Opt-out:** all matches start included. Unchecking a match excludes it; a file's checkbox includes/excludes all its matches (indeterminate when mixed). Any change to Find, options or the file list resets the exclusions.
- **Cap:** at most 5,000 matches previewed. Past that the scan stops, the list shows the first 5,000, and the page says "More than 5,000 matches. Narrow the search to replace." — the Replace button is disabled.
- **Replace button** (`primary`): "Replace N matches in M files" (singular forms), disabled while the scan runs, when it's capped, invalid or stalled, or when nothing is included. Replace is the confirmation — no extra dialog; the preview was it, and Undo is offered.
- **Applying** (optimistic): on click the button turns into "Replacing… K of M" (`aria-busy`), the `LoadingBar` shows (it delays itself), included file sections dim and lock their checkboxes, then files are written one at a time. Each file is re-read through the tab buffer; **if its text differs from what was previewed, it is skipped** (never a partial or stale replace). Each section ends in one state: replaced (collapses to a "Replaced N" line), skipped ("Changed since the preview — search again"), failed ("Couldn't write this file").
- **When done:** a toast "Replaced N matches in M files" with **Undo** (`showUndoToast`, `app/hooks/file-system/undo-toast.tsx:11`); skipped/failed counts are appended ("· 2 files skipped"); if nothing was written, an error toast instead. The page then shows a banner "Replaced N matches in M files" with an **Undo** button (`secondary`) until the next replace or vault change, and re-runs the preview (usually empty now).
- **Undo** writes each replaced file back to its previous text, but only if the file still holds exactly what the replace wrote; a file edited since is left alone and counted ("1 file changed since and was left as is"). Undo is offered once; after it the banner goes away. Undo isn't on the file-tree ⌘Z stack (that's moves only).
- A failed write leaves that file as it was (the transform is the only change) and the others go on; nothing is rolled back automatically.
- Open tabs: the new text goes into the tab's buffer (`writeThrough`), so the editor shows it; unsaved edits in that tab are saved along with it (writeThrough saves as an autosave).
- **Vault backends:** disk vault (File System Access): before the first write, if `vaultHandle.queryPermission({ mode: "readwrite" })` isn't `"granted"`, call `requestPermission` (the click is the user gesture); refused → toast "Write permission denied. Re-open the vault to restore access." and nothing is written. Browser vault (OPFS): writes go through `saveFile` → `services/file-writer.ts` (worker fallback where `createWritable` is missing); no permission step. There is no GitHub backend any more (legacy GitHub vaults are copied into browser vaults, `app/services/legacy-github-vaults.ts`).
- **States:** no vault → "Open a vault to replace text in its files."; restored vault awaiting access (`atom_isVaultPending`) → "Allow access to the vault's folder to replace text in it."; empty vault / no files → "No files to search."; no worker (`typeof Worker === "undefined"`) → "Replace in Files isn't available in this browser."; no matches → "No matches."
- **Mobile:** same page in `ShellPage` (← Editor in its bar). Fields and options stack; the Replace button sits under the fields; checkboxes get 44px hit areas (`min-h-11` on the row label) on touch.

## Design

**Pure engine** — `app/workers/replace-search.ts` (no DOM; imported by the worker and the main thread, as `use-palette-content-search.ts` imports `MIN_QUERY_CHARS` from `workers/content-search`):

```ts
export interface ReplaceOptions { matchCase: boolean; wholeWord: boolean; regex: boolean }
export interface ReplaceQuery extends ReplaceOptions { find: string }
export interface ReplaceMatch {
  ordinal: number;          // index among the file's matches (after board exclusion)
  from: number; to: number; // offsets in the raw file text
  line: number;             // 1-based, of `from`
  column: number;           // 0-based in that line
  before: string;           // ≤60 chars of the line before the match, "…" prefixed if cut
  text: string;             // the matched text (first line only when it spans lines, + "…")
  after: string;            // ≤60 chars after the match on the same line, "…" suffixed if cut
  groups?: (string | undefined)[]; // regex mode: $1…
  named?: Record<string, string | undefined>; // regex mode: $<name>
  full: string;             // the whole matched text (for $&)
}
export const MAX_PREVIEW_MATCHES = 5000;
export function buildReplacePattern(query: ReplaceQuery): RegExp | null; // null: empty or invalid; always has `g`
export function findMatches(text: string, pattern: RegExp, exclude: readonly [number, number][], cap: number): ReplaceMatch[];
export function expandReplacement(template: string, match: Pick<ReplaceMatch, "full" | "groups" | "named">, regex: boolean): string;
export function applyReplacements(text: string, pattern: RegExp, template: string, regex: boolean, exclude: readonly [number, number][], skip: ReadonlySet<number>): { text: string; count: number };
export function textFingerprint(text: string): string; // `${length}:${fnv1a32 hex}`
```

- `buildReplacePattern`: literal → escape `[.*+?^${}()|[\]\\]`; whole word wraps in `(?<![\p{L}\p{N}_])(?:…)(?![\p{L}\p{N}_])` (needs `u`; without `u`, `[A-Za-z0-9_]`). Flags `g` + `m` + (`i` unless `matchCase`) + `u` with the no-`u` fallback.
- `findMatches` resets `lastIndex`, steps past empty matches (`regex-search.ts:39–43` does the same), drops matches overlapping `exclude`, stops at `cap`. Line/column by one forward pass (as `regex-search.ts:60–78`). CRLF: a trailing `\r` is not part of `after`.
- `applyReplacements` re-runs the same matching over `text` and replaces every match whose ordinal isn't in `skip`, using `expandReplacement`. It must produce the same ordinals as `findMatches` on the same text (shared iterator; write it once, used by both).
- Board exclusion: add `export function boardFenceRanges(text: string): [number, number][]` to `app/utils/board/board-format.ts` (character ranges of each fence, opening line start to closing line end, via the existing `findFences` :41). Applied only to `.md` files.

**Worker side** — `app/workers/replace-scan.ts`: `scanForReplace(files, query, report, isCancelled)`, same shape as `grepFiles` (8 concurrent reads, 8 ms slices, report every 120 ms) but on **raw** text, returning all matches per file up to `MAX_PREVIEW_MATCHES` total. Each file with matches reports `{ path, fingerprint, count, matches }`. Reading uses the raw-text cache (below). Protocol additions in `text-grep-protocol.ts`:

```ts
| { type: "replace:scan"; scanId: number; query: ReplaceQuery; files: GrepFile[] }
| { type: "replace:cancel" }
export interface ReplaceFileResult { path: string; fingerprint: string; matches: ReplaceMatch[] }
export interface ReplaceScanResults {
  type: "replace:results"; scanId: number;
  files: ReplaceFileResult[]; // only files finished since the previous report (append)
  scanned: number; total: number; matchCount: number;
  done: boolean; capped?: boolean; invalid?: boolean;
}
```

`text-grep.worker.ts` dispatches `replace:*` to `scanForReplace` with its own `currentScanId` (independent of `currentId`).

**Raw-text cache** — extract `CachedText`'s storage (`cache`, `cachedChars`, `remember`, `clearGrepCache`, the modified/size/2 s recheck) out of `text-grep.ts` into `app/workers/text-cache.ts`:

```ts
export class TextCache<T extends { text: string }> {
  constructor(maxChars: number);
  get(path: string): T | undefined; set(path: string, entry: T): void; clear(): void;
}
export async function readFileText(file: GrepFile, cache: TextCache<CachedFile>, toEntry: (raw: string, modified: number, size: number) => CachedFile): Promise<CachedFile | null>;
```
`text-grep.ts` keeps its behavior (its `toEntry` still strips boards/frontmatter); `replace-scan.ts` uses its own `TextCache` storing raw text. Behavior of the palette's grep must not change (`text-grep.test.ts` must pass untouched).

**Client** — `app/services/replace-client.ts`: **its own worker instance** of `text-grep.worker.ts`, so the palette's search and the replace scan never cancel each other and a stalled regex terminates only this one:

```ts
export function isReplaceAvailable(): boolean;
export function scanForReplace(query: ReplaceQuery, files: GrepFile[], onProgress: (p: ReplaceScanProgress) => void): () => void; // returns stop
export function disposeReplaceWorker(): void; // terminate on page unmount (frees its cache)
export interface ReplaceScanProgress { files: ReplaceFileResult[] /* accumulated */; scanned: number; total: number; matchCount: number; done: boolean; capped?: boolean; invalid?: boolean; stalled?: boolean }
```
Copies the patterns of `text-grep-client.ts`: a newer scan supersedes (ignore stale `scanId`), the `withContent` fallback (export it from `text-grep-client.ts` rather than duplicate), the 2.5 s watchdog (regex mode only) that terminates the worker and reports `stalled`. Accumulates `files` across reports.

Why a second worker instance instead of sharing: the worker runs one search at a time and the client cancels on each call (point 2); a shared instance would let the palette (which opens over any page) kill the preview, and a regex stall would kill both. The cost is a second cache, only while the page is open.

**State** — `app/atoms/replace-atoms.ts` (new; `ui-atoms.ts` is at 395 lines):
```ts
export interface ReplacePrefs extends ReplaceOptions { includeCode: boolean }
export const atom_replacePrefs = atomWithStorage<ReplacePrefs>("hermes_replace_options", { matchCase: false, wholeWord: false, regex: false, includeCode: false });
export interface LastReplace { vault: FileSystemDirectoryHandle; matches: number; files: { path: string; before: string; afterFingerprint: string }[] }
export const atom_lastReplace = atom<LastReplace | null>(null); // session only; holds previous text for Undo
```
Find/Replace text, exclusions and per-file apply states are page-local (`useState`). `atom_lastReplace` is cleared when `atom_vaultHandle` differs from its `vault` (checked where read) and replaced by each replace.

**Hooks / components** — `app/editor/replace/`:
- `use-replace-files.ts` — `useReplaceFiles(includeCode): GrepFile[]`: from `usePaletteFiles(showHiddenFiles).files`, drop `isPrivate` and `isTrashPath`, drop `isText` unless `includeCode`; notes `isNote: true`; dirty open tabs (`atom_openFiles[path]` in layout per `use-note-buffer.ts:28–31`, `content !== lastSavedContent`) get `content` = tab text. Also returns `hasPrivate`.
- `use-replace-preview.ts` — `useReplacePreview(query: ReplaceQuery, files: GrepFile[], enabled)`: 250 ms debounce, calls `scanForReplace`, keeps the last result until the new one answers, re-runs on `refresh()`; `disposeReplaceWorker` on unmount. Returns `{ files, scanned, total, matchCount, done, capped, invalid, stalled, refresh }`. Rescan only when the **set of paths** or a dirty file's text changes (key by a joined signature), not on every array identity change from vault rescans.
- `use-apply-replace.ts` — `useApplyReplace()`: `apply(plan) => Promise<ApplyOutcome>` and `undo(last) => Promise<void>`. `plan = { query, template, files: { path, fingerprint, skip: Set<number> }[] }`. Sequential per file: fresh handle (`resolveFileHandleAtPath(vaultHandle, path)`), `writeThrough(path, handle, (text) => textFingerprint(text) !== fingerprint ? (changed = true, null) : applyReplacements(…).text)`. Collect `before` (the `text` the transform saw) and `textFingerprint(next)`. Reports progress through a callback. After the batch: `indexNoteContent` for written `.md` files (`modifiedAt` from `(await handle.getFile()).lastModified`), `void indexVaultTags()`, set `atom_lastReplace`, toast. Permission step before the first write (disk vault). `undo` uses `writeThrough` with `(text) => textFingerprint(text) === afterFingerprint ? before : null`.
- `components/ReplaceForm.tsx` — Find/Replace `BareInput`s on `FIELD_CLASS` (`app/components/Input`), the toggles as `Button variant="segment"` with `aria-pressed` on `SEGMENT_TRACK_CLASS`, Include code files as a `Toggle` (`app/components/Toggle`), the Replace `Button variant="primary"`.
- `components/ReplaceFileSection.tsx` — one file: header (checkbox, name, folder, count, Open `Button variant="small"`), match rows (`ReplaceMatchRow` inline or own file if it grows): checkbox (raw `<input type="checkbox">` is allowed), line number as `Button variant="unstyled"`, the line in `CODE_FONT` with `DEL_ROW`-style strike for `text` and `ADD_ROW` tint for the expanded replacement (from `diff-classes.ts`). Memoized; per-file state (replacing / replaced / skipped / failed).
- `components/ReplaceSummary.tsx` — counts, scan status (reuse `app/editor/changes/components/ScanStatus.tsx` if its props fit; otherwise a line "Searching… N of M files" that appears after 150 ms via `.loading-bar-appear`), the cap / invalid / stalled / private notes messages, the post-replace banner with Undo.
- `page.tsx` — composes the above in `ShellPage title="Replace in Files"` + `LoadingBar`, the states from Behavior, reads `?find` / `?regex` once on mount (`readUrlParam`, `app/editor/utils/editor-url.ts:32`), keeps `find` in the URL (`replaceUrlParam` :39). Opening a match: reuse `useOpenChange` (`app/editor/changes/use-open-change.ts`) — extend it with an optional `column` passed to `atom_pendingScrollTarget` (`{ path, line, column }`, `app/atoms/ui-atoms.ts:316`).

Styling: tokens only (`text-fg`, `text-fg-muted`, `text-fg-faint`, `bg-fill`, `border-edge-subtle`, `bg-surface`), type scale `text-ui-*` (headline 17, subhead 15, footnote 13, caption 12). No raw `<button>`/`<input type="text">`, no hard-coded colors. Buttons must look like buttons (filled `primary`/`secondary`, not text-only).

## Phase 1: Engine (worker scan, pure matcher, client)

- `app/workers/replace-search.ts` — new, per Design. Keep < 400 lines (≈180 expected).
- `app/utils/board/board-format.ts` — add `boardFenceRanges(text)` next to `stripBoardFence` :91, using `findFences` :41; offsets from line starts (`split("\n")` lengths + 1).
- `app/workers/text-cache.ts` — new: `TextCache` + `readFileText` extracted from `text-grep.ts` :35–93 (the `CachedText` cache, `remember`, `readText`'s handle/modified/size/2 s/1M/NUL logic). `text-grep.ts` imports it; `clearGrepCache` stays exported (wraps `cache.clear()`).
- `app/workers/replace-scan.ts` — new: `scanForReplace(files, query, report, isCancelled)`; per file: read raw text (own `TextCache`, raw entries), `exclude = isMarkdown(path) ? boardFenceRanges(text) : []` (`app/utils/file-kinds.ts#isMarkdownPath`), `findMatches(text, pattern, exclude, remaining)`; `fingerprint = textFingerprint(text)`; stop all workers' loops once `matchCount` reaches `MAX_PREVIEW_MATCHES` and report `capped: true, done: true`. Invalid pattern → one report `{ invalid: true, done: true }` when the find text isn't empty.
- `app/workers/text-grep-protocol.ts` — add the `replace:*` messages and result types (Design); update the header comment.
- `app/workers/text-grep.worker.ts` — dispatch `replace:scan` / `replace:cancel` with a separate `currentScanId`.
- `app/services/text-grep-client.ts` — `export` `withContent` (:36). No other change.
- `app/services/replace-client.ts` — new, per Design.

## Phase 2: Replace in Files page

- `app/atoms/replace-atoms.ts` — new, per Design.
- `app/editor/replace/page.tsx`, `use-replace-files.ts`, `use-replace-preview.ts`, `use-apply-replace.ts`, `components/ReplaceForm.tsx`, `components/ReplaceFileSection.tsx`, `components/ReplaceSummary.tsx` — new, per Design and Behavior. `page.tsx` ≤ ~150 lines (as `changes/page.tsx`); move any section > 150 lines into its own component.
- `app/editor/changes/use-open-change.ts` — `(path, line, column?)`; pass `column` into `atom_pendingScrollTarget` when given. Existing callers unchanged.
- `app/editor/utils/editor-url.ts` — add `FIND_PARAM = "find"`, `REGEX_PARAM = "regex"`, `editorReplaceHref(find?: string, regex?: boolean)` (uses `serialize`); add `/editor/replace?find=…` to the header comment.
- `app/components/CommandPalette/AppCommands.tsx` — add `page("replace-in-files", "Replace in Files…", "/editor/replace", "replace find rename substitute all files vault regex bulk")` to `pageCommands` :113. In `page()` :110 make the `disabledReason` strip a trailing `…` too (`label.replace(/^(Open|Show) /, "").replace(/…$/, "")`), so it reads "Already in Replace in Files". No other page label ends in `…`, so nothing else changes.
- `app/editor/components/RouteSkeletons.tsx` — add a `ReplaceSkeleton` (title header + two field bars + three row bars, same `SKELETON_BAR` pieces) and `if (pathname?.startsWith("/editor/replace"))` in `routeSkeleton` :314. File stays < 400 (323 now).
- Vault change: in `page.tsx`, ignore `atom_lastReplace` whose `vault !== vaultHandle` and set it to null.

## Phase 3: Palette handoff

- `app/components/CommandPalette/PaletteFooter.tsx` — new optional prop `replace?: { onReplace: () => void }`; when set, a **Replace…** chip after the Regex chip, same unstyled chip classes as Regex (:56–72), key cap `⇄` or the text "Replace", `aria-label="Replace in files"`, `title="Replace this search across files"`.
- `app/components/CommandPalette/CommandPalette.tsx` — at the `PaletteFooter` call (:378) pass `replace` when `!menu && scope === "content" && query.trim()`: `onReplace: async () => { close(); await nextPaint(); router.push(editorReplaceHref(query, contentSearch.regex)); }` (`nextPaint` from `app/utils/next-paint.ts`, already imported :13; `router` :45). File is 384 lines: if this pushes it past 400, move the footer props into a small `usePaletteFooterProps` in a new `use-palette-footer.ts`.
- The page reads `?find`/`?regex` on mount (Phase 2), so nothing else is needed.

## Tests

All Vitest, fully mocked (no real workers, file system or router); components under a Jotai `<Provider>`; `next/navigation` `useRouter`/`usePathname` mocked; dates via `vi.setSystemTime` if needed. Sample data uses products/tasks, never person names.

Phase 1
- `app/workers/replace-search.test.ts` (new): literal escaping (`a.b` doesn't match `axb`); Match case on/off; Whole word with ASCII and accented letters (`café` not matched inside `cafés`); regex flags (`^`/`$` per line, `i` only without Match case, `u` fallback for `\-`); invalid → null; empty find → null; find not trimmed (`" a"`). `findMatches`: offsets, 1-based line, column, `before`/`after` windows with `…`, CRLF, a match spanning lines (`text` cut with `…`), empty matches skipped, matches overlapping `exclude` dropped, cap. `expandReplacement`: `$&`, `$1`, `$10` vs `$1`+`0` when only one group, `$<name>`, `$$`, unknown `$x` literal, literal mode inserts `$1` verbatim. `applyReplacements`: all, with `skip` ordinals, ordinals equal to `findMatches`', board fence untouched. `textFingerprint` differs on one changed character and equal for equal text.
- `app/utils/board/board-format.test.ts` (existing or new): `boardFenceRanges` for none, one, unclosed fence; ranges cover exactly the fence text.
- `app/workers/text-cache.test.ts` (new): reuse within 2 s, re-read on modified/size change, eviction oldest-first at the char budget, skip > 1M and NUL.
- `app/workers/replace-scan.test.ts` (new): files given as `content` and as mocked handles; per-file `fingerprint` + matches; progress reports then one `done`; cap stops with `capped`; `isCancelled` stops without a final report; invalid regex; frontmatter included; board JSON excluded; `.ts` file with a ```` ```hermes-board ```` string isn't excluded.
- `app/workers/text-grep.test.ts` — unchanged and passing (guards the extraction).
- `app/services/replace-client.test.ts` (new): stub `Worker` (class with `postMessage`/`addEventListener`/`terminate` spies); posts `replace:scan`; ignores results of an older `scanId`; accumulates `files`; regex watchdog (`vi.useFakeTimers`, 2.5 s) terminates and reports `stalled`; text mode never terminates; `disposeReplaceWorker` terminates; `withContent` fallback when `postMessage` throws.

Phase 2
- `app/editor/replace/use-apply-replace.test.tsx` (new; mock `useNoteBuffer` → a fake `writeThrough` that runs the transform on a fixture map, `useFileSystem` → `vaultHandle`, `indexVaultTags`, `resolveFileHandleAtPath`, `content-search-client#indexNoteContent`, `react-hot-toast`): writes included matches only; fingerprint mismatch → skipped and counted, not written; a `failed` result counted and the rest continue; progress callback order; `indexNoteContent` for written notes only; `atom_lastReplace` set with `before`; undo restores only files whose text still matches `afterFingerprint`; disk-vault permission refused → nothing written, toast.
- `app/editor/replace/use-replace-files.test.tsx` (new): private notes and Trash paths dropped; code files only with `includeCode`; dirty open tab sends `content`; clean tab sends `handle` only.
- `app/editor/replace/page.test.tsx` (new; mock `replace-client`, `useFileSystem`, `next/navigation`): states (no vault, pending, unavailable, no matches); typing Find calls `scanForReplace` after the debounce with the stored options; preview renders files and match rows with the struck text and the replacement; typing Replace updates rows without a new scan; unchecking a match and a file updates the button label count; button disabled while scanning / capped / invalid / nothing included; `?find=foo&regex=1` prefill; clicking Replace calls `apply` with the right `skip` sets and shows "Replacing…"; the post-replace banner's Undo calls `undo`; private-notes note shown when `hasPrivate`.
- `app/components/CommandPalette/AppCommands.test.tsx` — `replace-in-files` registered, navigates to `/editor/replace`, disabled on that route.
- `app/editor/utils/editor-url.test.ts` — `editorReplaceHref` (no args, find with `/` and spaces, regex).
- `app/editor/components/RouteSkeletons.test.tsx` — `/editor/replace` returns a skeleton.

Phase 3
- `app/components/CommandPalette/CommandPalette.content-search.test.tsx` — in `/` with a query the Replace chip shows and pushes `/editor/replace?find=needle` (and `&regex=1` with Regex on); no chip with an empty query or outside `/`.

## Docs

- `app/workers/README.md` — rows for `replace-search.ts`, `replace-scan.ts`, `text-cache.ts`; extend the text-grep row with the `replace:scan` / `replace:cancel` / `replace:results` messages and that `replace-client.ts` runs its own instance.
- `app/services/README.md` — `replace-client.ts` row; note `withContent` is exported.
- `app/atoms/README.md` — `replace-atoms.ts` (`atom_replacePrefs` / `hermes_replace_options`, `atom_lastReplace` session-only).
- `app/editor/replace/README.md` (new) — file table like `app/editor/changes/README.md`; sibling `ReplaceForm.md`, `ReplaceFileSection.md`, `ReplaceSummary.md` (purpose, state, props, logic).
- `app/editor/README.md` — URL table row `/editor/replace?find=…` and a short "Replace in Files" section.
- `app/editor/changes/README.md` — `use-open-change.ts` now takes an optional column.
- `app/components/CommandPalette/CommandPalette.md` + `PaletteFooter.md` — the Replace… chip (Phase 3) and the `replace-in-files` command.
- `app/editor/components/RouteSkeletons.md` — the new skeleton.
- In-app docs: `app/documentation/content/editor-workspace.tsx` near the Search in Files paragraph (:200–215): a "Replace in Files" paragraph — how to open it (palette command, the Replace… chip in `/`), options, the preview and opting out, that changed-since-preview files are skipped, Undo, private notes and board drawings are never changed.
- Never write "sidebar"/"rail" for the file tree, nor name other editors.

## Acceptance criteria

- [ ] Palette → "Replace in Files…" opens `/editor/replace` with Find focused.
- [ ] Typing a literal finds exact matches across notes (frontmatter included), case-insensitive by default; Match case and Whole word narrow it; Regex with `$1` and `$<name>` previews the expanded replacement.
- [ ] Each match row shows line number, context, struck match and tinted replacement; editing Replace updates rows without a rescan.
- [ ] Private notes, Trash files and board JSON never appear and are never changed; code files appear only with Include code files on; `_` paths follow the hidden-files setting.
- [ ] Unchecking matches/files updates the button count; only included matches are written.
- [ ] A file edited between preview and Replace is skipped and reported, not written.
- [ ] An open tab gets the replaced text in its buffer; an open tab with unsaved edits is previewed from its own text.
- [ ] Replace shows immediate progress, ends with a toast with Undo and a banner with Undo; Undo restores files still holding the replaced text and leaves later-edited files alone.
- [ ] More than 5,000 matches → message, Replace disabled; invalid and runaway regex messages as specified.
- [ ] The palette's `/` search keeps working while the page scans (separate worker); `text-grep.test.ts` passes unchanged.
- [ ] Works on a disk vault (permission prompt when needed) and a browser vault; mobile layout usable.
- [ ] Phase 3: the `/` scope's Replace… chip opens the page prefilled (and with Regex when on).
- [ ] No new network calls; no raw `<button>`/text `<input>`; tokens only; every new/changed source file < 400 lines; docs updated.

## Decisions

- **A page, not the palette.** The palette is a 600 px quick surface capped at 50 ranked hits, ≤3 per note; a replace preview needs every match, opt-outs and progress. The palette stays the way in (command + `/` chip). The page follows the Changes page's shape.
- **Separate worker instance** for the replace scan (same script), so the palette's search and the scan never cancel each other and a regex stall only kills the scan. Terminated when the page unmounts.
- **New raw-text matcher**, not the search's ranked matchers: replace needs exact offsets on the file as saved, literal (not AND-of-terms) matching, untrimmed input and case options.
- **Frontmatter included**, board JSON excluded, private notes excluded (consistent with search: the preview would reveal their text), Trash excluded.
- **Code files opt-in** with a page option, off by default (mirrors the off-by-default Search Code Files).
- **Options** mirror the in-note find panel (`codemirror/find-replace.ts`: Match case, Whole word, Regex) and are remembered under `hermes_replace_options`.
- **Safety by fingerprint**: each file is replaced only if its text equals what was previewed; otherwise skipped. No conflict prompts (disk wins via `writeThrough`).
- **No confirm dialog**; the preview is the confirmation, Undo the safety net. Undo is session-only (holds previous text in memory), offered via toast and a page banner, not on the file ⌘Z stack.
- **No automatic rollback** of a partly failed batch; each file stands alone and failures are reported (Undo covers the rest).
- **5,000-match preview cap**, Replace disabled past it; 1-character finds allowed.
- **`$` expansion only in Regex mode**; supported tokens `$&`, `$n`, `$<name>`, `$$`.
- **No keyboard shortcut** in v1 (the obvious ones are taken by browsers/OS).

## Out of scope / Deferred

- Include/exclude folder or glob filters; replacing in file names; preserve-case replacement; `$\``/`$'` tokens.
- Replacing inside board drawings, private notes or the Trash.
- Adding Replace to the in-note find panel or to the editor's ⌘Z history.
- A persistent replace history, or Undo across reloads.
- A keyboard shortcut.

## Open questions

- Should private notes be replaceable when Privacy Mode is "show" (with their rows masked)? v1 skips them always.
- Is 5,000 the right preview cap, or should Replace work past the cap without a full preview?
- Should a later version add a folder filter ("files to include")? Likely the first follow-up.
