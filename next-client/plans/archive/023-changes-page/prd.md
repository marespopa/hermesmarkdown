# Changes page — engineering PRD

## Context

Source: [brief.md](brief.md). Add a **Changes** page that works like the "Files changed" tab of a GitHub pull request. It lists every file in a disk vault that differs from HEAD, each with its unified diff, and clicking a file or line opens it in the editor. The page is read-only: like Git Changes (plan 022), it reads `.git` and never runs or writes git.

What exists (paths under `next-client/app/`):

1. **Git reader** (plan 022, `services/git/`, pure TypeScript over `FileSystemDirectoryHandle`, safe to run in a worker):
   - `git-repo.ts#openRepo(vault)` returns `{ gitDir }`. It returns null for no `.git` directory at the root, a `.git` file, or a sha256 repo.
   - `git-refs.ts#resolveHead(gitDir)` returns `{ commit | null, stamp }`.
   - `git-objects.ts#readObject(gitDir, id)` reads loose or packed objects. It keeps an LRU cache of 64 objects / 16 MB.
   - `git-tree.ts#blobAtPath(gitDir, commit, path)` (40 lines) walks one path. Its private `findEntry` parses tree entries (`<mode> <name>\0<20 bytes>`).
   - `git-pack.ts:72#bytesToHex`.
   - `git-read.ts` (63 lines) has `readHead` / `readHeadBlob`, a repo cache `repoFor` (`:22`) and `MAX_BLOB_BYTES = 2 MB` (`:7`). Its binary rule is a NUL in the first 8 KB (`:56`).
   - `git-fs.ts` has `getFileAt`, `readTextAt` and `readBytes`.
   - Test helpers: `git-test-utils.ts` (`looseObject`, `treeData`, `commitData`, `buildPack`, `makeRepoVault(files)` `:175`) and `services/memory-file-system.test-utils.ts` (`MemoryDirectoryHandle` `:63`, `MemoryFileHandle` `:33`, `fakeFile(name, content, path, lastModified)` `:20`).
2. **Worker pattern.** `workers/git-read.worker.ts` + `git-read-protocol.ts`, and the client `services/git-read-client.ts`.
   - The client creates the worker lazily (`getWorker` `:17`) and matches responses by `requestId` (`pending` map, `ask` `:31`).
   - It falls back to inline calls when `Worker` is missing.
   - It answers one response per request and has **no progress or cancel support**.
3. **Diff logic.** `editor/codemirror/git-changes.ts` (177 lines):
   - `gitDiff(base, doc, chunks)` (`:33-63`) turns `@codemirror/merge` `Chunk`s into added line numbers plus deleted runs. It drops the lines both sides share at a chunk's edges (`:43-50`).
   - It mixes this pure logic with view code (`Decoration`, `WidgetType`, theme).
   - The look to match is the theme at `:157-163`: added lines on `color-mix(in srgb, var(--task-done) 22%, transparent)` with a `+` in `var(--task-done)`, removed lines on `color-mix(in srgb, var(--danger) 16%, transparent)` with a `−` in `var(--danger)` and text in `var(--fg-muted)`, signs in `var(--font-code)`.
   - **Missing:** old/new line numbers per change and unified-diff rows with context. `gitDiff` only gives new-side positions.
   - `@codemirror/merge` is pinned at `6.12.3` (`package.json:26`). CodeMirror guards every DOM access at module load (`@codemirror/view/dist/index.js:6-7`), so it loads in a worker.
4. **Vault walk.** `hooks/file-system/vault-scan.ts` (303 lines):
   - `SKIPPED_DIRS` (`:90`) is not exported.
   - `isSecretFile` (`:105`) is exported.
   - Trash: `services/vault-trash.ts#isTrashPath`.
   - The scan collects only notes and text files, so it **can't be reused** for "every file". The worker walks the vault itself.
5. **Pages.** Each page is a route folder under `editor/` that renders inside `ShellPage` (`editor/components/ShellPage.tsx`, `title` + children). Example: `editor/trash/page.tsx`, with the empty state at `:83-87` and the list card classes at `:91`.
   - `components/CommandPalette/AppCommands.tsx:87-106` registers page commands via `page(id, label, href, keywords)`. Its `disabledReason` strips `"Open "` from the label (`:96`).
   - Route skeletons: `editor/components/RouteSkeletons.tsx` (298 lines). `TrashSkeleton` is at `:257` and `routeSkeleton` at `:290-298`.
6. **Open at a line.** `editor/tasks/page.tsx:20-24` calls `openFile(handle, path)`, sets `atom_pendingScrollTarget` (`atoms/ui-atoms.ts:316`, `{ path, line (1-based), column? }`), then `router.push(editorFileHref(path))` (`editor/utils/editor-url.ts:22`).
   - `editor/hooks/use-scroll-to-pending-target.ts` places the caret and flashes the line.
   - A fresh handle comes from `atoms/vault-atoms.ts:87#resolveFileHandleAtPath(vault, path)`.
   - Openable kinds: `utils/file-kinds.ts#isMarkdownPath` / `isPlainTextPath` (`:33,39`).
7. **Atoms.**
   - `atoms/git-atoms.ts` (16 lines) holds `atom_showGitChanges`, `atom_gitAvailable` and `atom_gitLoading`.
   - `atoms/vault-atoms.ts`: `atom_vaultHandle` (`:15`), and `atom_vaultDescriptor` (`:57`, `kind: "local"` for disk vaults).
   - `useFileSystem()` (`hooks/use-file-system.ts`) exposes `vaultHandle` and `openFile`.
8. **UI pieces.**
   - `components/LoadingBar` shows after a ~150 ms delay (`.loading-bar-appear`, `globals.scss:318`).
   - `components/CountBadge#formatCount(count, [one, many])` (`:18`).
   - `Button` variants (`components/Button/Button.component.tsx:103-165`) include `small`, `icon-small` and `unstyled`.
   - Tailwind tokens: `text-task-done`, `text-danger`, `text-fg-muted`, `text-fg-faint`, `bg-surface`, `bg-surface-raised`, `border-edge-subtle`.
9. **`.gitignore` matcher.** No direct dependency has one. `ignore@7.0.5` is already resolved in `yarn.lock` (`:6102`, pulled in by ESLint).

Missing, which is what this plan builds:
- **M1** — a worker scan that finds changed files: the HEAD tree, `.git/index`, a vault walk, `.gitignore`, and blob hashing.
- **M2** — unified-diff data per file.
- **M3** — the page, its hook and components.
- **M4** — the palette command, route skeleton and docs.

## Behavior

1. **Entry.** The palette command **Show Changes** (category Navigation, `opens: "page"`) goes to `/editor/changes` from any route. It is disabled with "Already in Changes" while you're on the page. It is always offered, and the page explains when there's nothing to show.
2. **States.**
   - **No vault:** "Open a vault to see its changes."
   - **Browser vault** (`vaultDescriptor.kind !== "local"`), or `openRepo` returns null: "No git repository here. Changes reads the `.git` folder at the root of a vault on disk." Nothing runs.
   - **Repo with no changes:** "No changes since the last commit." followed by the short commit id (7 characters).
   - **Read error:** "Couldn't read the repository." with a **Try Again** button (`variant="small"`). The error is logged once with `console.warn`. No toast.
3. **Which files count.** A file is listed when one of these holds:
   - **Added:** a working file whose path isn't in HEAD's tree, including untracked files that aren't ignored.
   - **Modified:** a path in both whose content differs.
   - **Deleted:** a path in HEAD with no working file.
   - **Repo with no commits:** every non-ignored file counts as added.
4. **Never listed.**
   - Anything under `SKIPPED_DIRS` at any depth (`node_modules`, `vendor`, `.git`, `.svn`, `.hg`, `__pycache__`, `.venv`, `.cache`, `.Trash`). HEAD paths there are not listed as deleted either.
   - The Trash (`isTrashPath`).
   - Secret files (`isSecretFile`: `.env*`), which are never read.
   - Symlinks (tree mode `120000`) and submodules (mode `160000`, plus any subfolder holding a `.git` entry of either kind).
   - Untracked paths that git ignores: the `.gitignore` files in each folder plus `.git/info/exclude`. Tracked paths (in HEAD or the index) are never treated as ignored. An ignored folder is not walked unless it holds tracked paths.
   - Paths under a folder that couldn't be read are neither walked nor reported as deleted.
   - Dotfiles and dotfolders are included (`.obsidian/…`, `.github/…`) whatever the Show Hidden Files setting is, as `git status` does.
5. **Line endings.** Both sides are split on `/\r?\n/`. A file whose only difference is CRLF vs LF is not listed.
6. **No diff for some files.** These files are listed, but without a diff:
   - **Binary:** a NUL in the first 8 KB of either side. Shows "Binary file".
   - **Too large:** over 2 MB or over 20,000 lines on either side. Shows "File too large to show".
   - **Read error:** shows "Couldn't read this file".
   - **Over the payload budget:** once more than 300 files have diffs, or 100,000 diff lines have been sent, the remaining files show "Diff not loaded — too many changes".
   - Their +/− counts are still shown when they're text files (counted in the worker), and shown as "—" for binary files.
7. **Disk content.** The page compares files **on disk**. Unsaved edits in an open tab are not included, in line with the disk-wins rule.
8. **Summary** (top of the page):
   - "**N files changed**", then `+A` in `text-task-done` and `−R` in `text-danger` (both from `formatCount`), then the short commit id.
   - Below it, a file list: one row per file with a status letter (A / M / D, coloured `text-task-done` / `text-fg-muted` / `text-danger`), the path and the row's +/−. Clicking a row scrolls its section into view (`scrollIntoView({ block: "start" })`) and expands it if collapsed.
   - **Collapse All / Expand All** buttons (`variant="small"`).
9. **Order.** Files are sorted by path, comparing UTF-16 code units, the same as git.
10. **File section.**
    - A sticky header (`sticky top-0 bg-surface`) holds a chevron toggle (`Button variant="icon-small"`, `aria-expanded`, label "Collapse <path>" / "Expand <path>"), the path, a status word (Added / Modified / Deleted) and the +/−.
    - The path is a `Button variant="unstyled"` when the file can be opened: not deleted, and `isMarkdownPath || isPlainTextPath`. Otherwise it is plain text.
    - The body shows the unified diff in the same look as the editor's inline diff (Context 3), in `var(--font-code)` at the UI footnote size. Each row has two line-number columns (old, new) in `text-fg-faint`, a sign column and the text, with `whitespace-pre-wrap` and `break-words`.
    - **Added rows:** the task-done 22% tint and a `+`.
    - **Removed rows:** the danger 16% tint, a `−` and `text-fg-muted`.
    - **Context rows:** no tint.
    - An added file with no text shows "Empty file".
11. **Context and gaps.**
    - Around each change, 3 unchanged lines show on each side. A longer unchanged stretch collapses into one gap row: "Show N unchanged lines" (`Button variant="unstyled"`, full width, `text-fg-faint`, `bg-surface-raised`).
    - Clicking it expands the whole stretch. Expanded gaps stay open until the next scan result for that file.
    - The stretch before the first change and after the last change works the same way, with context only on the change side.
12. **Initial collapse.**
    - A section starts collapsed when its diff has more than 400 rows.
    - Sections start expanded, in path order, only while the running total of expanded rows stays at or under 3,000. Later sections start collapsed, so a huge first commit stays fast.
    - A collapsed section renders no rows.
    - Each section also gets `[content-visibility:auto]` with `[contain-intrinsic-size:auto_200px]`.
    - Collapse state is page-local React state, kept across rescans by path and not persisted.
13. **Opening a file.**
    - Clicking the path opens the file at its first change's new-side line, or line 1.
    - Clicking an added or context row opens it at that row's new line number.
    - Clicking a removed row opens it at the new-side line where the deletion sits, clamped to ≥ 1.
    - Deleted files and files that can't be opened have no click targets: rows show `cursor-default` and don't react.
    - Steps (Tasks page pattern):
      1. Resolve a fresh handle with `resolveFileHandleAtPath`.
      2. Call `openFile`.
      3. Set `atom_pendingScrollTarget`.
      4. Call `router.push(editorFileHref(path))`.
    - If the file is gone, show `toast.error("Couldn't open <name>")`.
14. **Refresh.**
    - A scan starts when the page mounts, when the window regains focus and when the page becomes visible. A focus while a scan runs queues one rescan after it.
    - The last result for the same vault handle is cached in an atom, so reopening the page shows it at once while the new scan runs.
    - Leaving the page cancels the running scan.
15. **Progress.**
    - While a scan runs, `LoadingBar` (label "Checking changes") shows after its built-in delay.
    - With no cached result, the body shows "Listing files…" during the walk, then "Checking 1,204 of 3,010 files…". This text uses the `loading-bar-appear` class, so fast scans show nothing.
    - The UI never blocks: all reading, hashing and diffing runs in a worker.
16. **Mobile.** The same page. Disk vaults exist on Chromium Android. The two line-number columns shrink to `min-w-[2.5ch]`, and long lines wrap.
17. **Unchanged.** The editor's Git Changes diff, `git-read` worker, the vault scan, saving and the file watcher all keep their current behavior.

## Design

### Why a second worker
The scan imports `@codemirror/merge` (which pulls in `@codemirror/view` / `language`), `ignore` and SHA-1 hashing, and it can run for seconds. Adding it to `git-read.worker.ts` would make the worker the editor loads for Git Changes much heavier, and a long scan would delay the editor's blob reads. So: a new `workers/git-changes.worker.ts` that reuses the `services/git/*` modules. Only the object cache is per worker, and that's cheap.

### Shared line diff: `services/git/git-line-diff.ts` (new, pure: `@codemirror/merge` + `@codemirror/state` only)

```ts
/** One change in 1-based, inclusive line numbers; an empty side has last = first - 1. */
export interface LineChange { firstA: number; lastA: number; firstB: number; lastB: number }
/** Chunk.build's chunks as whole-line changes, the lines both sides share at each edge dropped. */
export function lineChanges(base: Text, doc: Text, chunks: readonly Chunk[]): LineChange[];
export interface GitDiff { added: number[]; deleted: { before: number; lines: string[] }[]; hunks: number[] }
export function gitDiff(base: Text, doc: Text, chunks: readonly Chunk[]): GitDiff; // moved from git-changes.ts
```

- `lineChanges` is the per-chunk loop body of today's `gitDiff` (`git-changes.ts:42-50`). It returns only the changes that are non-empty after trimming.
- `gitDiff` keeps its `base.length === 0` special case and is rebuilt on top of `lineChanges`, with identical output.
- `git-changes.ts` imports `gitDiff` from here and re-exports it: `export { gitDiff, type GitDiff } from "@/app/services/git/git-line-diff";`. That way `git-changes.test.ts` and any other importers don't change.

### Scan data (`services/git/git-changes-types.ts`, new, types only; shared by the worker, protocol, client and UI)

```ts
export type FileStatus = "added" | "modified" | "deleted";
export interface DiffChange { oldStart: number; removed: string[]; newStart: number; newCount: number }
export type FileDiff =
  | { kind: "text"; changes: DiffChange[]; lines: string[] } // lines: new side (empty for deleted files)
  | { kind: "binary" } | { kind: "too-large" } | { kind: "error" } | { kind: "skipped" };
export interface ChangedFile { path: string; status: FileStatus; added: number | null; removed: number | null; diff: FileDiff }
export type ChangesResult =
  | { status: "no-repo" }
  | { status: "error" }
  | { status: "ok"; commit: string | null; files: ChangedFile[] };
export interface ChangesProgress { phase: "listing" | "comparing"; done: number; total: number }
```

How each status fills `DiffChange`:
- `added`: one change `{ oldStart: 0, removed: [], newStart: 1, newCount: lines.length }`.
- `deleted`: `{ oldStart: 1, removed: oldLines, newStart: 1, newCount: 0 }` with `lines: []`.
- `modified`: one entry per `LineChange` (`oldStart = firstA`, `removed = base lines firstA..lastA`, `newStart = firstB`, `newCount = lastB - firstB + 1`).
- `added` / `removed` = the sum of `newCount` / `removed.length`, or `null` for binary.
- An empty file (`""`) has zero lines (special-case it, don't use `[""]`).

### Worker-side modules (`services/git/`, all pure, each < 400 lines)

| File                        | Exports                                                                                                                                                                                                                                                            | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `git-tree.ts` (extend)      | `listTreeFiles(gitDir, commitId): Promise<Map<string, { id: string; mode: string }>>`                                                                                                                                                                              | Recursive walk from the commit's tree, reusing `findEntry`'s parsing. Refactor it into `parseTreeEntries(data): { mode; name; id }[]` and keep `findEntry` on top. Recurse into mode `40000`. Record `100644` / `100755` blobs. Skip `120000` (symlink) and `160000` (submodule), but return the submodule paths in a second set: the return type becomes `{ files: Map<…>; submodules: Set<string> }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `git-index.ts` (new)        | `readIndex(gitDir): Promise<{ entries: Map<string, IndexEntry>; mtimeMs: number } \| null>`, `IndexEntry = { id; size; mtimeSec; stage; mode }`                                                                                                                    | Parses `.git/index`: `DIRC`, versions 2, 3 and 4. Each entry is ctime(8), mtime(8: sec, nsec), dev, ino, mode, uid, gid, size (4 bytes each), a 20-byte id and 2-byte flags (stage = `(flags >> 12) & 3`, extended flag `0x4000` → 2 more bytes in v3+). The path is NUL-terminated. v2/3 pad the entry to a multiple of 8 bytes. v4 has no padding and a prefix-compressed path (varint "strip N bytes from the previous path" + suffix). Ignore extensions and the checksum. Skip sparse directory entries (mode `040000`). A missing or unparsable index (bad signature or version) returns null and the scan hashes everything. `mtimeMs` = the index file's `lastModified`                                                                                                                                                                                                                        |
| `git-hash.ts` (new)         | `blobId(bytes: Uint8Array): Promise<string \| null>`                                                                                                                                                                                                               | SHA-1 of `"blob " + length + "\0" + bytes` via `crypto.subtle.digest("SHA-1", …)`, as hex. Returns null when `crypto.subtle` is missing; the caller then falls back to comparing bytes with the HEAD blob                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `git-worktree.ts` (new)     | `walkWorktree(vault, opts): Promise<{ files: Map<string, File>; failedDirs: string[] }>` with `opts = { tracked: Set<string>; trackedDirs: Set<string>; submodules: Set<string>; exclude: string \| null; isCancelled(): boolean; onListed(count: number): void }` | Walks the vault concurrently (8 folders at a time, like `vault-scan.ts:95` `WALK_CONCURRENCY`), calling `getFile()` for each file. Skips `SKIPPED_DIRS` (export it from `vault-scan.ts:90`), `isTrashPath`, `isSecretFile`, submodule paths and any subfolder holding a `.git` entry (that folder's root is the vault root itself; the vault root's own `.git` is skipped by `SKIPPED_DIRS`). Ignore rules: each folder's `.gitignore` is read before its children are filtered. Keep a stack of `{ base: string; ig: Ignore }` with root level 0 = `ignore().add(exclude ?? "")`. A path is ignored when the deepest level whose `ig.test(relative)` reports `ignored` or `unignored` says ignored. Folders are tested as `relative + "/"`. Paths in `tracked` are never ignored, and an ignored folder is walked only if it's in `trackedDirs`. A folder that throws on listing goes in `failedDirs` |
| `git-changes-scan.ts` (new) | `scanChanges(vault, { onProgress, isCancelled }): Promise<ChangesResult \| "cancelled">`                                                                                                                                                                           | Steps below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `git-file-diff.ts` (new)    | `buildFileDiff(oldText: string \| null, newText: string \| null): Extract<FileDiff, { kind: "text" }>` and `classifyBytes(bytes): "ok" \| "binary" \| "too-large"`                                                                                                 | Splits on `/\r?\n/`, uses `Text.of`, `Chunk.build` and `lineChanges`. The 20,000-line cap (reuse `MAX_GIT_LINES` from `git-changes.ts:15`, after moving it to `git-line-diff.ts` and re-exporting it) is checked by the caller. `classifyBytes` holds the 2 MB and NUL rules, and `git-read.ts:55-56` switches to using it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

**`scanChanges` steps:**

1. `openRepo(vault)`. Null returns `{ status: "no-repo" }`.
2. `resolveHead(gitDir)`. If there's a commit, run `listTreeFiles`; otherwise use an empty map.
3. `readIndex(gitDir)`. Read `.git/info/exclude` with `readTextAt`.
4. `tracked` = HEAD paths ∪ index paths. `trackedDirs` = every ancestor folder of those.
5. `walkWorktree`. Report `{ phase: "listing", done: listed, total: 0 }`, throttled to one message every 100 ms.
6. Compare HEAD ∪ working paths in sorted order, reporting `{ phase: "comparing", done, total }` (throttled). Check `isCancelled()` before each file, and return `"cancelled"` when it's set.
   - **Working and in HEAD.** Find the working id:
     - Index entry (stage 0) with `entry.id === head.id`, `entry.size === file.size`, `entry.mtimeSec === floor(file.lastModified / 1000)` and `floor(file.lastModified / 1000) < floor(index.mtimeMs / 1000)`: the file is unchanged, with no read (the last condition is the racy-git guard).
     - Index entry equal to HEAD but a different size: the file is modified, with no hashing.
     - Otherwise read the bytes and `blobId`. If they're equal to `head.id`, the file is unchanged.
     - If modified: read the HEAD blob (`readObject`) and classify both sides. Text gets `buildFileDiff`. If that yields zero changes (CRLF only), drop the file.
   - **Working only:** added. Classify the bytes and diff against null.
   - **HEAD only:** deleted, unless the path is under a skipped or failed folder (or is a secret, trash or submodule path). Read the blob and diff null against nothing.
   - **Payload budget:** keep counting `+/−` for text, but once 300 diffs or 100,000 `lines` + `removed` lines have been sent, replace `diff` with `{ kind: "skipped" }`.
   - A per-file exception gives `diff: { kind: "error" }` and a single `console.warn` naming the path.
7. Return `{ status: "ok", commit, files }`. A top-level exception returns `{ status: "error" }`.

### Worker, protocol, client

- `workers/git-changes-protocol.ts` (new):
  - in: `{ type: "changes:scan"; requestId; vault }` and `{ type: "changes:cancel"; requestId }`
  - out: `{ type: "changes:progress"; requestId; progress: ChangesProgress }` and `{ type: "changes:result"; requestId; result: ChangesResult | "cancelled" }`
- `workers/git-changes.worker.ts` (new, ~30 lines): keeps a `Set` of cancelled request ids, and `onmessage` dispatches to `scanChanges`.
- `services/git-changes-client.ts` (new, ~80 lines):

  ```ts
  export function startChangesScan(vault: FileSystemDirectoryHandle, onProgress: (p: ChangesProgress) => void): { result: Promise<ChangesResult | "cancelled">; cancel(): void };
  ```

  Lazy worker as in `git-read-client.ts:17`. It keeps `pending` + `progress` maps by request id. When `Worker` is missing, or `postMessage` throws, it runs `scanChanges` inline with a local cancelled flag.

### UI (`editor/changes/`)

| File | Responsibility |
|---|---|
| `page.tsx` | `ShellPage title="Changes"`. Reads `useFileSystem()` (`vaultHandle`, `openFile`), `atom_vaultDescriptor` and `useGitChanges`. Renders the states (Behavior 2), `LoadingBar`, `ChangesSummary` and a `FileDiffSection` per file in `<main className="min-h-0 flex-1 overflow-y-auto custom-scrollbar"><div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8 sm:px-8">` (as `trash/page.tsx:72-73`, but wider). Owns `collapsed: Set<string>` (seeded per Behavior 12 by `initialCollapsed(files)` from `diff-layout.ts` when a result arrives; paths seen before keep their state) and `openAt(path, line)` (Behavior 13) |
| `use-git-changes.ts` | `useGitChanges(vault: FileSystemDirectoryHandle \| null, enabled: boolean): { result: ChangesResult \| null; scanning: boolean; progress: ChangesProgress \| null; rescan(): void }`. Seeds from `atom_gitChangesCache` when `cache.vault === vault`. Starts a scan on mount and on `enabled` / vault changes, on `focus` and on `visibilitychange` (visible). A trigger during a scan sets a rerun ref. Cancels on unmount and on vault change. A `"cancelled"` result is ignored. Writes the cache on `ok` / `no-repo`. Ignores a stale result (token ref) |
| `diff-layout.ts` | Pure functions. `layoutDiff(diff: TextFileDiff, expandedGaps: ReadonlySet<number>, context = 3): DiffRow[]`, `firstChangeLine(file): number`, `initialCollapsed(files): Set<string>`, and `rowCount(file)` (`DiffRow` types below) |
| `components/ChangesSummary.tsx` | Counts line, file list and Collapse/Expand All (Behavior 8). Props: `files`, `commit`, `onJump(path)`, `onCollapseAll()`, `onExpandAll()` |
| `components/FileDiffSection.tsx` | Header and body (Behavior 10). Props: `file`, `collapsed`, `onToggle()`, `onOpen?(line)` (undefined when the file can't be opened), `id` (`"change-" + index`, used for the jump). Owns `expandedGaps` state, reset when `file.diff` changes identity. Renders a message for non-text diffs |
| `components/DiffLines.tsx` | Renders `DiffRow[]`, one `div` per row (`grid grid-cols-[auto_auto_1.25em_1fr]`). One `onClick` on the container reads `data-line` from the clicked row (event delegation, so thousands of rows add no handlers). Gap rows are `Button variant="unstyled"`. Props: `rows`, `onOpen?`, `onExpandGap(id)` |
| `diff-classes.ts` | The tint and sign class strings (`bg-[color-mix(in_srgb,var(--task-done)_22%,transparent)]`, `bg-[color-mix(in_srgb,var(--danger)_16%,transparent)]`, `text-task-done`, `text-danger`, `[font-family:var(--font-code)]`), with a comment that they mirror `codemirror/git-changes.ts`'s theme |

```ts
export type DiffRow =
  | { kind: "context"; oldNo: number; newNo: number; text: string }
  | { kind: "add"; newNo: number; text: string }
  | { kind: "del"; oldNo: number; openLine: number; text: string }
  | { kind: "gap"; id: number; count: number };
```

`layoutDiff`:
- Walk `changes` in order, keeping `delta = oldNo - newNo` for unchanged lines (it starts at 0, and after each change grows by `removed.length - newCount`).
- Unchanged lines come from `lines`. Gap `i` is the stretch before change `i`, and gap `changes.length` the stretch after the last change.
- A stretch longer than `2 × context` (between changes) or longer than `context` (at either end) shows its edge context and one `gap` row, unless its id is in `expandedGaps`.
- Removed rows come before the change's added rows. `openLine = max(1, min(newStart, lines.length))`.

### Atom

`atoms/git-atoms.ts`: `export const atom_gitChangesCache = atom<{ vault: FileSystemDirectoryHandle; result: ChangesResult } | null>(null);`, with a comment: the Changes page's last scan, shown at once on return. It is a plain atom, not persisted.

## Phase 1: Scan in a worker

- `package.json`: add `"ignore": "7.0.5"` (exact) to `dependencies`. Run `corepack yarn install` to update `yarn.lock` (the resolution already exists at `:6102`).
- `services/git/git-line-diff.ts` (new): `lineChanges`, `gitDiff`, `GitDiff` and `MAX_GIT_LINES`, moved from `editor/codemirror/git-changes.ts:15,22-63`.
- `editor/codemirror/git-changes.ts`: delete the moved code and import and re-export it (Design). Behavior is unchanged.
- `services/git/git-changes-types.ts` (new): the types.
- `services/git/git-tree.ts`: `parseTreeEntries` and `listTreeFiles`. `blobAtPath` is unchanged.
- `services/git/git-index.ts`, `git-hash.ts`, `git-worktree.ts`, `git-file-diff.ts`, `git-changes-scan.ts` (new).
- `services/git/git-read.ts:55-56`: use `classifyBytes`.
- `hooks/file-system/vault-scan.ts:90`: `export const SKIPPED_DIRS`.
- `workers/git-changes-protocol.ts`, `workers/git-changes.worker.ts`, `services/git-changes-client.ts` (new).

## Phase 2: Page

- `atoms/git-atoms.ts`: `atom_gitChangesCache`.
- `editor/changes/page.tsx`, `use-git-changes.ts`, `diff-layout.ts`, `diff-classes.ts`, `components/ChangesSummary.tsx`, `components/FileDiffSection.tsx`, `components/DiffLines.tsx` (new). `page.tsx` should stay under ~150 lines. Put the opening logic in `editor/changes/use-open-change.ts` if it grows.
- `components/CommandPalette/AppCommands.tsx:100-106`: add `page("show-changes", "Show Changes", "/editor/changes", "git changes diff modified added deleted commit head status review files changed pull request")` after `open-tags`. Change `:96` to `label.replace(/^(Open|Show) /, "")`.
- `editor/components/RouteSkeletons.tsx`: `ChangesSkeleton` (title "Changes", a summary bar and two section blocks, modelled on `TrashSkeleton` `:257`). Add a `routeSkeleton` line for `/editor/changes`. Stays under 320 lines.

## Phase 3: Docs (below)

## Tests

All tests are fully mocked: no real worker, file system or network. Directory handles are `MemoryDirectoryHandle` / `makeRepoVault`. Page tests mock `next/navigation` `useRouter`, `@/app/hooks/use-file-system` and `@/app/services/git-changes-client`, and wrap the page in a Jotai `<Provider>`.

**Phase 1:**
- `services/git/git-line-diff.test.ts`: `lineChanges` for a change in the middle, a pure insert, a pure delete and Enter at a line end (no spurious change). The existing `editor/codemirror/git-changes.test.ts` still passes, unchanged.
- `services/git/git-tree.test.ts` (extend): `listTreeFiles` on a nested tree. A symlink is skipped. A submodule appears in `submodules` and not in `files`.
- `services/git/git-index.test.ts`: build index bytes in the test (add `buildIndex(entries, version)` to `git-test-utils.ts`). Cover v2 with padding, v3 with an extended-flags entry, and v4 prefix compression. Stage-2 entries are reported with `stage: 2`. A bad signature returns null.
- `services/git/git-hash.test.ts`: `blobId` of `"hello\n"` is `ce013625030ba8dba906f756967f9e9ca394464a`, and of the empty blob is `e69de29bb2d1d6484b8b6248b29a6b8b0c0d9a5e`.
- `services/git/git-worktree.test.ts`:
  - `SKIPPED_DIRS`, the Trash, `.env` and a nested folder with `.git` are skipped.
  - A root `.gitignore` ignores `*.log` and `build/`.
  - A nested `.gitignore` re-includes with `!keep.log`.
  - `info/exclude` applies.
  - A tracked file inside an ignored folder is still returned.
  - A folder whose listing throws goes in `failedDirs`.
- `services/git/git-file-diff.test.ts`:
  - Modified gives the right `oldStart` / `removed` / `newStart` / `newCount`.
  - Added and deleted shapes are correct.
  - An empty added file has zero lines.
  - CRLF-only gives zero changes.
  - `classifyBytes`: NUL means binary, over 2 MB means too-large.
- `services/git/git-changes-scan.test.ts` (`makeRepoVault`, `fakeFile` with `lastModified`):
  - added, modified, deleted and unchanged are classified, and results come back sorted.
  - The index fast path skips reading: spy on `getFile().arrayBuffer`.
  - A racy mtime forces a hash.
  - A size mismatch marks the file modified without hashing.
  - No commits means everything is added.
  - No `.git` returns `no-repo`.
  - A binary file has `added: null`.
  - The budget turns later diffs into `skipped`.
  - `isCancelled` returns `"cancelled"`.
  - A HEAD path under `node_modules` is not reported as deleted.
- `services/git-changes-client.test.ts`: with `Worker` undefined, it runs inline and forwards progress. With a stub `Worker`, progress messages reach `onProgress`, the result resolves the promise and `cancel()` posts `changes:cancel`.

**Phase 2:**
- `editor/changes/diff-layout.test.ts`:
  - A 3-line context window.
  - A gap between two far-apart changes, plus leading and trailing gaps.
  - An expanded gap shows every line.
  - Old and new numbers stay right after a change that removes more lines than it adds.
  - `openLine` for a deletion at the end of the file.
  - `initialCollapsed`: a file over 400 rows is collapsed, and so are files past the 3,000-row budget.
- `editor/changes/use-git-changes.test.tsx` (mocked client):
  - A scan starts on mount.
  - A `focus` event during a scan queues exactly one rescan.
  - Unmount calls `cancel`.
  - The cache is shown at once for the same vault and not for a different one.
  - A stale result after a vault change is ignored.
- `editor/changes/page.test.tsx`:
  - The no-vault, browser-vault, `no-repo`, no-changes and error states (Try Again calls the scan again).
  - The summary counts.
  - Clicking a jump row expands a collapsed section.
  - Clicking a path calls `openFile` and sets `atom_pendingScrollTarget` to the first change line, and `router.push` gets `/editor?…` via `editorFileHref`.
  - Clicking a removed row opens at its `openLine`.
  - A deleted file's path is not a button.
  - "Show N unchanged lines" reveals the lines.
  - A binary file shows "Binary file".
- `components/CommandPalette/AppCommands.test.tsx` (extend, or create alongside existing palette tests): **Show Changes** pushes `/editor/changes`, and is disabled on that route with "Already in Changes".
- `editor/components/RouteSkeletons` test (if one exists, extend it): `/editor/changes` returns the Changes skeleton.

## Docs

- Component docs (new): `editor/changes/components/ChangesSummary.md`, `FileDiffSection.md`, `DiffLines.md`, and `editor/changes/README.md`, which indexes `page.tsx`, the hook, `diff-layout.ts` and `diff-classes.ts`.
- `editor/README.md:43`: add `/editor/changes` (Changes: a read-only diff of every file changed since HEAD; the scan runs in `workers/git-changes.worker.ts`). At `:85`, note that `gitDiff` now lives in `services/git/git-line-diff.ts`.
- `workers/README.md`: a row for `git-changes.worker.ts` + `git-changes-protocol.ts`, with its messages.
- `services/README.md:18-19`: `git-changes-client.ts`, and the new `git/` files (`git-index`, `git-hash`, `git-worktree`, `git-file-diff`, `git-line-diff`, `git-changes-scan`, `git-changes-types`).
- `atoms/README.md`: `atom_gitChangesCache`.
- `editor/components/RouteSkeletons.md`: `ChangesSkeleton`. `CommandPalette` docs (`AppCommands` section, if present): Show Changes.
- In-app docs:
  - `documentation/content/vault.tsx`, `git` section (`:155-182`): add a paragraph after the Git Changes one. Name **Show Changes**, say it lists every file changed since the last commit with its diff (like a pull request's file list), that ignored files and tool folders are left out, that clicking a line opens the file there, that it compares the saved files on disk, and that it only reads `.git` at the vault root. Add `changes status review` to `keywords` (`:158`).
  - `documentation/content/editor-workspace.tsx:294`: add "Show Changes" to the Navigate list.
- Don't name other editors or products anywhere.

## Acceptance criteria

- [ ] **Show Changes** in the palette opens `/editor/changes` from any route, and is disabled on the page itself.
- [ ] In a disk vault with `.git` at its root, the page lists every added, modified and deleted file compared with HEAD, sorted by path, with the correct status and +/− counts. The summary shows the total files, `+A` and `−R`.
- [ ] Untracked, non-ignored files are listed as added. Files matched by `.gitignore` (any level) or `.git/info/exclude` are not. Tracked files inside ignored folders still are.
- [ ] `node_modules`, `.git` and the other skipped folders, the Trash, `.env*` files, symlinks, submodules and nested repos never appear, as added or as deleted.
- [ ] Each diff matches the editor's inline-diff look (green `+` rows, red `−` rows, theme tokens only). It shows 3 lines of context, and "Show N unchanged lines" expands a collapsed stretch.
- [ ] Sections collapse and expand. Collapse All / Expand All work. The file list jumps to a section and expands it. Large diffs and sections past the 3,000-row budget start collapsed.
- [ ] Clicking a path opens the file at its first change, and clicking a line opens it at that line. Deleted and non-text files have no click targets.
- [ ] Binary, too-large and over-budget files are listed with a message instead of a diff.
- [ ] A CRLF-only difference is not listed.
- [ ] Browser vaults, vaults without a root `.git`, `.git` files and sha256 repos show "No git repository here…", and no scan runs.
- [ ] Reopening the page shows the last result at once and refreshes it. Focusing the window rescans. Leaving the page cancels the scan.
- [ ] Progress appears only after a short delay. Scanning, hashing and diffing run in `git-changes.worker.ts`, and the page stays responsive during a scan.
- [ ] Nothing writes to `.git`, and no network calls are added.
- [ ] Git Changes in the editor works as before (`git-changes.test.ts` passes unchanged).
- [ ] The listed tests pass in CI. Every new or changed source file is under 400 lines. If able, the engineer notes the scan time on a vault of a few thousand files.
- [ ] Component docs, READMEs and the in-app docs are updated.

## Decisions

- **Separate worker** (`git-changes.worker.ts`) instead of growing `git-read.worker.ts`. This keeps `@codemirror/merge`, `ignore` and long scans out of the worker the editor loads for Git Changes. The `services/git/*` code is shared.
- **Untracked files count as added**, matching `git status` and the brief's "ignored files are not listed".
- **`.gitignore` via the `ignore` package** (7.0.5, already in the lockfile) rather than a home-made matcher. Git's pattern rules (negation, anchoring, `**`, dir-only) are subtle, and this package is the standard implementation. Global excludes (`core.excludesFile`) live outside the vault, can't be read, and are skipped.
- **Index fast path plus SHA-1 hashing.** The brief allows both. Stat-matching index entries skip reads, and everything else is hashed, so a fresh clone and a vault whose mtimes changed both come out right. The racy-git guard re-hashes files modified in the same second the index was written.
- **Compare disk, not unsaved tab text.** Disk content wins, and HEAD vs working tree is what git shows.
- **Dotfiles are included** whatever Show Hidden Files says: the page reflects the repository, not the file tree.
- **Path click opens at the first change.** That's the most useful place to land, and line 1 is the fallback.
- **Gaps expand whole** (one click) rather than in 20-line steps, which keeps the UI simpler.
- **Payload and render budgets** (300 diffs / 100,000 lines from the worker; 400 rows per section and 3,000 rows expanded at first) keep a huge first commit from freezing the page. Counts stay complete.
- **Row clicks by event delegation** on a container `div`, with no `Button` per line. Keyboard users open files with the path button.
- **Label "Show Changes"**, as in the brief, even though other pages use "Open …". The `disabledReason` logic is extended to strip it.
- **Not pinnable.** Pins (`PINNED_PAGES`, `services/pins-model.ts`) are left unchanged.

## Out of scope / Deferred

- Staging, committing, reverting, discarding, or any write to `.git`. Running git.
- Comparing with anything but HEAD: the index or staged view, other commits, branches, pull requests.
- Word-level highlights, side-by-side view, renames (a rename shows as one delete and one add), mode-only changes (exec bit).
- Vaults inside a repo (`.git` above the vault root), worktrees and submodules (`.git` file), sha256 repos, LFS (pointer text is diffed as is), `core.excludesFile`, `core.autocrlf` beyond the CRLF-only rule.
- A pinned-page entry, keyboard shortcut, or live updates while the page is open and focused (no polling, only focus and visibility).

## Open questions

- None blocking. The product owner may want **Show Changes** pinnable in the file tree's pinned pages, and a link from the editor's Git Changes corner button to this page. Neither is in this plan.
