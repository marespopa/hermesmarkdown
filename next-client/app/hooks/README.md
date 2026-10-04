# Hooks

React hooks organized by concern: UI primitives, sync orchestration, and the file-system facade.

## UI Primitives

| Hook | Purpose |
|------|---------|
| `use-dialog.ts` | Promise-based alert/confirm/prompt/select over the Jotai global dialog |
| `use-template-dialog.ts` | Promise-based `pickTemplate({ includeBlank, title })` / `askPrompts(labels, confirmLabel)` over `atom_templateDialog` (rendered by `components/TemplateDialog`); null = cancelled |
| `use-is-mobile.tsx` | Breakpoint detection (default 1052px) |
| `use-mobile-chrome.tsx` | 768px breakpoint for the mobile chrome (file indicator bar, full-screen overlays) |
| `use-keyboard-inset.tsx` | On-screen keyboard height via `visualViewport`, so fixed elements can stay clear of it |
| `use-back-button-close.ts` | Makes the device/browser back action close the open overlay instead of leaving the editor |
| `use-resolved-theme.ts` | Resolves `"system"` theme to `"light"` / `"dark"`, live with OS changes |
| `use-interval.tsx` | setInterval with null-delay pause support |

## Sync & Persistence

| Hook | Purpose |
|------|---------|
| `use-vault-sync.ts` | Re-scans the vault tree every 5min (1min for cloud-synced vaults) and on manual refresh |
| `use-file-watcher.ts` | Reloads open files changed outside the app: near-instant via `FileSystemObserver` where supported (Chromium), plus polling as fallback (backoff up to 5min, immediate on window focus). Changed open tabs' disk text also goes to the note-text index (`indexNoteContent`) |
| `use-auto-save.ts` | Debounced / on-blur / manual save modes; flushes pending writes on tab switch |
| `use-task-writeback.ts` | Writes checkbox toggles from the Tasks page back to the source line |

`Ctrl/Cmd+S` is handled by the editor page's global key handler (`app/editor/page.tsx`).

## File System Facade

- `use-file-system.ts` — composes the vault, browser vault, vault archive, editor, and CRUD hooks below into the editor's single entry point. Capability-gated via mount tracking (`isVaultSupported`, `isBrowserVaultSupported`, `isIdbSupported`).

## file-system/

### shared.ts

Cross-cutting primitives used by every file-system hook:

- `withRetry()` — retries "state changed" and `InvalidStateError` up to 2× with a flat 100ms delay.
- `withPickerLock()` — global singleton preventing overlapping `showOpenFilePicker` / `showSaveFilePicker` calls (500ms buffer).
- `metadataWorker` — Web Worker (`app/workers/metadata.worker.ts`) that indexes frontmatter, tags, links and tasks in the background. It also holds the note-text index for the palette's `/` scope (worker heap only; driven through `app/services/content-search-client.ts`, see `app/workers/README.md`).
- `isVaultSupported` (disk folder picker, Chromium), `isBrowserVaultSupported` (Origin Private File System, every modern browser), `isIdbSupported` — browser capability flags.

All file writes go through `writeFileContent()` in `app/services/file-writer.ts`, which works in every browser (see Services).

### Vault

- `vault-scan.ts` — pure helpers: directory listing, the recursive markdown walk for indexing (lists 8 folders at once; skips VCS/dependency/cache folders like `.git` and `node_modules`; with hidden files shown adds non-`.md` files from `.hermes/` only; never collects `.env` files; 60s cap), file reading for the worker, metadata merging, cloud-folder detection, parent-directory resolution.
- `vault-index.ts` — the indexing pipeline, built for large vaults. First a stat pass reads modified times only, so every note is dated and ordered at once. Notes whose modified time matches the IndexedDB cache (`services/metadata-cache`) or an earlier in-memory parse are reused without reading. The rest are read and parsed newest first in chunks of 100, each merged as it lands. The full index is then saved back to the cache. After that, `contentDone` backfills the worker's note-text index: it reads only the reused notes the index doesn't have yet (`needsContent`), newest first, and passes them to `indexContent`, so each note is read at most once per session and cold starts add no reads. `parseWithWorker()` matches worker results by request id (30s timeout); `reportCollectProblems()` shows the walk warnings.
- `use-vault-manager.ts` — open / restore / close the vault (local, browser, or GitHub), scan the directory tree, kick off metadata indexing through `vault-index.ts`. `indexVaultTags` resolves once notes are dated and cached parses are merged; parsing continues in the background, and a newer run supersedes an older one. The indexer returns to idle when parsing finishes. Persists the directory handle or descriptor to IndexedDB; auto-loads on mount; detects iCloud / OneDrive / Dropbox folders. Without disk folder access, `openVault()` opens the browser vault dialog. Marks parsed notes as text-indexed and starts the note-text backfill (`contentDone`).
- `use-vault-navigation.ts` — `useVaultNavigation({ vaultHandle, currentDirectoryHandle, scanVault })`: `syncCurrentDirectoryToPath`, `navigateTo`, `navigateBack` for the file views' current folder. Spread into `useVaultManager`'s return value.
- `use-content-index-sync.ts` — `useContentIndexSync()`: subscribes to `atom_fileMetadata` and removes paths that leave it (delete, files gone on a vault pass, vault close / switch) from the worker's note-text index. Mounted once, by `CommandPalette`.
- `stored-workspace.ts` — on mount, finds the browser or GitHub vault to reopen (these need no permission prompt).
- `use-browser-vault.ts` — create / open / list / delete browser vaults (OPFS). Opening asks for persistent storage and reminds about backups after two weeks without an export.
- `use-vault-archive.ts` — whole-vault export (zip download for any vault; folder copy on Chromium) and import (zip, folder, or loose files; never overwrites). Records the export time for browser vaults.
- `use-create-vault.ts` — the New Vault flow: pick a parent folder, create the vault folder (refusing to overwrite), then open it.

### File editor

| Hook | Purpose |
|------|---------|
| `use-file-editor.ts` | Composes open / save / export / index; registers background indexing on the active file |
| `use-open-file.ts` | Loads a file into the editor (and closes the home feed); retries stale handles. Saved content on disk always wins: differing unsaved browser text for that file is kept as a `local` snapshot on the tab, never prompted. Only an unsaved draft asks before being replaced |
| `use-save-file.ts` | Writes with exponential backoff (up to 8 retries for autosave, 2 for manual saves; capped at 1.5s); auto-enables cloud mode after repeated lock errors; updates metadata async |
| `use-export-file.ts` | Desktop picker → Web Share API → blob download fallback chain |
| `use-index-active-file.ts` | 1s-debounced re-index on content change (unsaved text included); the worker also updates the note-text index, and the path is marked text-indexed |
| `reconcile-disk.ts` | Pure `reconcileWithDisk()` — merges on-disk content into a tab's cached state (take disk if clean, keep local edits if disk unchanged; if both changed, disk wins and the local text is kept as a `local` snapshot — no conflict prompt). Shared by the file watcher and `atom_rebindHandles` |
| `file-observer.ts` | `createFileObserver()` — wraps Chromium's `FileSystemObserver`: `sync()` observes exactly the given path→handle map and fires a callback on change records. Returns `null` where unsupported; `isFileObserverSupported()` reports it. Used by the file watcher |

### CRUD

| Hook | Purpose |
|------|---------|
| `use-file-crud.ts` | Composes create / delete / rename / move / import and the template note hooks with shared callbacks |
| `use-template-notes.ts` | `readTemplate(entry)` (the saved file on disk, fresh handle, so edits apply on next use) and `instantiate(raw, title, confirmLabel)` (strips routing keys, asks `{{prompt:…}}` values, reads the clipboard only when `{{clipboard}}` is used, expands content and routing values with one context; null = cancelled) |
| `use-template-create.ts` | `createNoteFromMissingLink(link)`: the link decides the path (its folder from the vault root, or the New Notes Folder); a file already on disk is opened unchanged; a folder-name match (`rfcs/` ↔ `rfc.md`) confirms, otherwise the picker offers Blank note first; template `target_folder` / `file_name` are ignored. `createNoteFromTemplate()`: picker, title prompt, prompts, then `target_folder` / `file_name` (tokens expanded) place and name the note, never overwriting. `createTemplate()`: name prompt (empty cancels), then `<templates folder>/<name>.md` (name via `sanitizeTemplateFileName`) with the raw `TEMPLATE_STARTER` body; a template of the same name (registry, any case, or on disk) is opened unchanged instead of overwritten. `writeNewNote()` creates folders, writes, rescans, opens, and puts the caret at `{{cursor}}` via `atom_pendingScrollTarget`; `onExisting` is told when a file on disk was opened instead |
| `use-open-or-create-link.ts` | `openOrCreateLink(name)`: wikilink clicks open the resolved note, or start `createNoteFromMissingLink` (passed to the editor by `PaneLeaf`) |
| `use-create-item.ts` | Creates files / folders (one level at a time) and wikilink targets; auto-increments duplicate names (`filename (1).md`, `(2).md`…) and opens the new file. `createNewFile(dir?)` / `createFolder(dir?)` skip the folder picker when given a target directory (file tree folder menu) |
| `unique-file.ts` | `createUniqueFile()` (never overwrites: `name (1).md`, `(2)`…), `ensureVaultFolder()` (walks/creates a vault-relative folder), `normalizeFolderPath()` (trims slashes, drops `.`/`..`), `listVaultFolders()` (every non-hidden folder as a vault-relative path). Shared by file creation and the draft save flow (`app/editor/hooks/use-materialize-draft.ts`) |
| `use-duplicate-item.ts` | Duplicates a file into a chosen folder |
| `resolve-file-by-name.ts` | Resolves a `[[WikiLink]]` name (alias stripped) to a file: exact vault path, then path relative to the linking note's folder, then basename match — nearest folder to the linking note wins, then shortest path, then alphabetical |
| `directory-ops.ts` | `emptyDirectory()` (bottom-up delete) and `moveDirectoryByCopy()` (folder rename/move fallback when native `move()` is missing; refuses merges and self-moves, cleans up partial copies) |
| `use-delete-item.ts` | Recursive delete; cleans workspace tabs, `openFiles` and remembered folder expansion; up to 6 retries on lock errors |
| `use-rename-item.ts` | Tries native `.move()` first; falls back to copy + delete (files and folders); then `atom_remapVaultPaths` so open tabs under the item keep working; up to 6 retries |
| `use-move-item.ts` | Validates against self-move; copy + delete fallback (files and folders); then `atom_remapVaultPaths`; 3 retries |
| `use-import-item.ts` | `showOpenFilePicker` under the picker lock; opens the imported file |
