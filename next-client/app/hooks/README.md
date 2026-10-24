# Hooks

React hooks organized by concern: UI primitives, sync orchestration, and the file-system facade.

## UI Primitives

| Hook | Purpose |
|------|---------|
| `use-dialog.ts` | Promise-based alert/confirm/prompt/select over the Jotai global dialog |
| `use-template-dialog.ts` | Promise-based `pickTemplate({ includeBlank, title, preselect })` / `askPrompts(labels, confirmLabel)` over `atom_templateDialog` (rendered by `components/TemplateDialog`); `preselect` lists a template first, highlighted; null = cancelled |
| `use-is-mobile.tsx` | Breakpoint detection (default 1052px) |
| `use-mobile-chrome.tsx` | 768px breakpoint for the mobile chrome (file indicator bar, full-screen overlays) |
| `use-show-files.ts` | **Show Files**: on desktop sets `atom_showFiles` (sidebar shown, its Files section unfolded, home feed closed, tree focus requested) and returns to `/editor` from other routes; on mobile opens `/editor/files`. Takes an optional `navigate` (the editor page's unsaved-changes guard) |
| `use-keyboard-inset.tsx` | On-screen keyboard height via `visualViewport`, so fixed elements can stay clear of it |
| `use-visible-viewport.ts` | While an overlaying keyboard is open (iOS Safari), a style pinning a full-window fixed layer to the visible area; the editor page uses it so the top bar stays put and the editor ends at the keyboard |
| `use-tap-refocus.ts` | Android Chrome: the first touch tap on a field that script focused (dialog, palette, autoFocus) refocuses it silently so the on-screen keyboard types into it. Mounted once by `MainPage` |
| `use-back-button-close.ts` | Makes the device/browser back action close the open overlay instead of leaving the editor |
| `use-resolved-theme.ts` | Resolves `"system"` theme to `"light"` / `"dark"`, live with OS changes |
| `use-interval.tsx` | setInterval with null-delay pause support |

## Sync & Persistence

| Hook | Purpose |
|------|---------|
| `use-vault-sync.ts` | Keeps the vault tree in step with the disk: watches the vault folder recursively where the browser has `FileSystemObserver` (`observeVault` in `file-system/file-observer.ts`; files appearing, going away or moving, not edits or hidden folders) and rescans the whole vault `VAULT_WATCH_DEBOUNCE` (500ms) after a burst; also rescans on window focus and every 5min (1min for cloud-synced vaults). Each sync first runs `checkVaultHealth` and stops if the folder lost permission or went away (the RecoveryBanner then shows); a dropped observation triggers a sync too. Mounted by the editor page and the Files page; `syncVault(true)` is the palette's Refresh vault |
| `use-pins-sync.ts` | `usePinsSync(enabled)`, mounted once by `EditorShell` (enabled while the vault is unlocked): keeps `atom_pinsState` equal to the open vault's `.hermes/pins.yaml`. Reads it when the vault opens (resetting the pins first, to the ones this device last read for that vault, `pins-cache.ts`, so they show at once; every valid read is cached; the YAML parser's chunk starts loading on mount; a late read for an earlier vault never lands), on every `atom_fileSystemVersion` bump (focus, rescan timers, the folder watcher, file operations, a GitHub Pull), when the file's own tab is saved, and 250ms after a per-file `FileSystemObserver` reports a change (once the file exists). An invalid file keeps the pins last read (`status: "invalid"`). After the first valid read for a vault it moves that vault's legacy pinned notes in once per session (`pins-migration.ts`) |
| `pins-cache.ts` | `PINS_CACHE_KEY` (`hermes_pins_cache`): the pins last read for each vault on this device (`readCachedPins(vaultKey)`, null when never read; `cachePins`), so the sidebar shows them the moment a vault opens. A cache only: the file always wins |
| `pins-migration.ts` | `LEGACY_NOTE_PINS_KEY` (`hermes_home_pins`, the per-device pinned notes from before the pins file), `readLegacyNotePins(vaultKey)` (tolerant) and `forgetLegacyNotePins(vaultKey)` (removes the key once empty). The only code that reads that key |
| `use-pins.ts` | `usePins()`: the vault's pins for components (`pins`, `isPinned(kind, target)`) and each change (`pin`, `togglePin`, `unpin`, `setIcon`, `move` to a listed position); at most `PINS_MAX` (9) are listed, and adding past that toasts `PINS_FULL_MESSAGE`, written at once through `atom_updatePins`. Tags are normalised (`utils/tag-normalize.ts`) |
| `use-file-watcher.ts` | Reloads open files changed outside the app: near-instant via `FileSystemObserver` where supported (Chromium), plus polling as fallback (backoff up to 5min, immediate on window focus). Changed open tabs' disk text also goes to the note-text index (`indexNoteContent`) |
| `use-auto-save.ts` | After-delay (debounced) and manual save modes; flushes pending writes on tab switch |
| `use-task-writeback.ts` | Writes Tasks page status changes back to the source line (`setTaskStatus`, `toggleTask`, with @started/@done stamps) and puts a changed line back for Undo (`restoreTaskLine`); an open tab (`isPathInLayout` from `atoms/utils.ts`) gets the change in its buffer too |

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

- `vault-scan.ts` — pure helpers: directory listing, the recursive markdown walk for indexing (lists 8 folders at once; skips VCS/dependency/cache folders like `.git` and `node_modules`; with hidden files shown adds non-`.md` files from `.hermes/` only; never collects `.env` files; 60s cap; streams each folder's notes to an `onFiles` callback, in batches of 100, as they're listed), file reading for the worker, metadata merging, cloud-folder detection, parent-directory resolution.
- `vault-index.ts` — the indexing pipeline, built for large vaults and streamed: `startVaultIndex()` loads the IndexedDB cache (`services/metadata-cache`) in parallel with the walk, and `add()` takes each batch of notes the walk finds. A batch is stat'ed (modified times only), so its notes are dated and ordered at once; notes whose modified time matches the cache or an earlier in-memory parse are reused without reading. Merges into the metadata atom are throttled (first at once, then at most every 150ms). The rest are read and parsed newest first (of what's queued) in chunks of 100. `complete()` runs once the walk is over: notes no longer listed drop out (`listed`), parsing finishes, and the full index is saved back to the cache (`done`). After that, `contentDone` backfills the worker's note-text index: it reads only the reused notes the index doesn't have yet (`needsContent`), newest first, and passes them to `indexContent`, so each note is read at most once per session and cold starts add no reads. `parseWithWorker()` matches worker results by request id (30s timeout); `reportCollectProblems()` shows the walk warnings.
- `run-vault-index.ts` — one streaming indexing run with the metadata worker: wires the walk to `startVaultIndex()` with the cache, worker and note-text deps.
- `use-vault-manager.ts` — open / restore / close the vault (local, browser, or GitHub), scan the directory tree, kick off metadata indexing through `run-vault-index.ts`. Notes appear as the walk lists their folders; `indexVaultTags` resolves once the walk is over and removed notes are gone; parsing continues in the background, and a newer run supersedes an older one. The indexer returns to idle when parsing finishes. Persists the directory handle or descriptor to IndexedDB; auto-loads on mount, keeping the saved tabs (`keepTabs`; opening another vault starts from an empty pane); opening or restoring binds the open notes first (`rebindHandles`, re-read from disk), then lists the top folder, and only then indexes the whole vault, so the editor shows (`onReadable`, the gate's "Vault restored") without waiting for the walk; detects iCloud / OneDrive / Dropbox folders. Without disk folder access, `openVault()` opens the browser vault dialog. Marks parsed notes as text-indexed and starts the note-text backfill (`contentDone`).
- `use-vault-navigation.ts` — `useVaultNavigation({ vaultHandle, currentDirectoryHandle, scanVault })`: `syncCurrentDirectoryToPath`, `navigateTo`, `navigateBack` for the file views' current folder. Spread into `useVaultManager`'s return value.
- `use-content-index-sync.ts` — `useContentIndexSync()`: subscribes to `atom_fileMetadata` and removes paths that leave it (delete, files gone on a vault pass, vault close / switch) from the worker's note-text index. Mounted once, by `CommandPalette`.
- `stored-workspace.ts` — on mount, finds the browser or GitHub vault to reopen (these need no permission prompt).
- `use-browser-vault.ts` — create / open / list / rename / delete browser vaults (OPFS). Rename changes only the display name (registry, saved descriptor, open vault, recents); the storage folder and `atom_vaultKey` stay, so pins and filters carry over. Opening asks for persistent storage and reminds about backups after two weeks without an export.
- `use-vault-archive.ts` — whole-vault export (zip download for any vault; folder copy on Chromium) and import (zip, folder, or loose files; never overwrites). Records the export time for browser vaults.
- `use-create-vault.ts` — the New Vault flow: pick a parent folder, create the vault folder (refusing to overwrite), then open it.

### File editor

| Hook | Purpose |
|------|---------|
| `use-file-editor.ts` | Composes open / save / export (background indexing runs once, in `ActiveFileIndexer`) |
| `use-open-file.ts` | Loads a file into the editor (and closes the home feed; the sidebar stays as it is); retries stale handles. Saved content on disk always wins: differing unsaved browser text for that file is kept as a `local` snapshot on the tab, never prompted. Only an unsaved draft asks before being replaced |
| `use-save-file.ts` | Writes with exponential backoff (up to 8 retries for autosave, 2 for manual saves; capped at 1.5s); auto-enables cloud mode after repeated lock errors; updates metadata async |
| `use-export-file.ts` | Desktop picker → Web Share API → blob download fallback chain |
| `use-index-active-file.ts` | 1s-debounced re-index on content change (unsaved text included); the worker also updates the note-text index, and the path is marked text-indexed. Mounted once, by `editor/components/ActiveFileIndexer.tsx` (not inside `useFileSystem`) |
| `reconcile-disk.ts` | Pure `reconcileWithDisk()` — merges on-disk content into a tab's cached state (take disk if clean, keep local edits if disk unchanged; if both changed, disk wins and the local text is kept as a `local` snapshot — no conflict prompt). Shared by the file watcher and `atom_rebindHandles` |
| `vault-health.ts` | `probeVault(handle)` — `"ok"`, `"access-lost"` (readwrite permission not granted) or `"vault-missing"` (listing the folder fails with `NotFoundError`); `applyVaultHealth` / `checkVaultHealth` report or clear the matching `atom_recoveryIssue` |
| `file-observer.ts` | `createFileObserver()` — wraps Chromium's `FileSystemObserver`: `sync()` observes exactly the given path→handle map and fires a callback on change records. `observeVault(root, onChange, onError?)` watches a whole vault folder recursively and calls back when its file list changes (`changesFileList`: appeared / disappeared / moved / unknown, outside hidden folders), and `onError` when the browser drops the observation (`errored`); null without the API. Returns `null` where unsupported; `isFileObserverSupported()` reports it. Used by the file watcher |

### CRUD

| Hook | Purpose |
|------|---------|
| `use-file-crud.ts` | Composes create / delete / rename / move / import, the template note hooks and `useFileUndo` with shared callbacks |
| `use-file-undo.ts` | `recordUndo(label, moves)` keeps renames, moves and moves to Trash (`atom_fileUndoStack`, last 20, per vault); `undoFileOperation(expected?)` moves the latest action's items back (`to` → `from`), tidies Trash slots, follows open tabs, rescans. A toast's Undo passes its own action and only works while it is the latest |
| `undo-toast.tsx` | `showUndoToast(message, onUndo, { id? })`: success toast with an Undo button (6 s); toasts sharing an id replace each other |
| `trash-ops.ts` | `moveToTrash(vault, path, now, index)` (into its own `.hermes/trash/<time>-<n>/` slot), `removeEmptyTrashSlot()`, `purgeExpiredTrash()` (slots older than 30 days; run when a vault opens) |
| `use-template-notes.ts` | `readTemplate(entry)` (the saved file on disk, fresh handle, so edits apply on next use) and `instantiate(raw, title, confirmLabel, selection?)` (`templateContent`: frontmatter comments and the retired `target_folder` / `file_name` keys out; asks `{{prompt:…}}` values, reads the clipboard only when `{{clipboard}}` is used, expands the content; null = cancelled) |
| `use-template-create.ts` | Notes made from links: the note goes in the link's folder (vault-root relative) when it has one, else the New Notes folder, and the link names it; a note of that name already there is opened (or linked) unchanged, never ` (1)`, never overwritten (`writeNewNote`). `createNoteFromMissingLink(link)`: an existing note opens; otherwise the picker with Blank note, the template the name points to (`matchTemplateForName`) first and highlighted (`preselect`). `createWikiLinkFile(name)` / `createLinkedNoteFromTemplate(name, entry)`: the WikiLink dialog's Create and link / From template; creates the note without opening it (blank, or from the template with the name as its title) and resolves its link path, or the existing note's. `createNoteFromTemplate(entry)`: the palette's `~` templates; asks the name (prefilled with the template's), creates the note from the template the same way and opens it, resolving its path (null when cancelled). `createTemplate(pack?)`: a name prompt (empty cancels), then `templates[/<pack>]/<name>.md` (name via `sanitizeTemplateFileName`) with `NEW_TEMPLATE_BODY` (`# {{title}}`, `{{cursor}}`); a template of the same name in the same place (registry, any case, or on disk) is opened unchanged instead; true once a template is open. `writeNewNote()` creates folders, writes, rescans, opens, and puts the caret at `{{cursor}}` via `atom_pendingScrollTarget`; `onExisting` is told when a file on disk was opened instead; it resolves to `{ path, handle }` (null on error), and `open: false` skips the open and the caret target. `writeNewNote` is passed through `use-file-crud.ts`, so it reaches `useFileSystem()` |
| `use-template-packs.ts` | The Templates page's pack actions (a pack is a folder in `templates/`): `addBuiltinPack(pack)` writes a built-in pack's templates into `templates/<pack>/`, skipping files that exist, and resolves to the number written (a second call for the same pack while it runs joins that run, so a double tap never writes it twice); `createPack()` asks a name (`sanitizePackName`; a taken name is refused) and makes the folder; `duplicatePack(pack)` copies its templates as saved into a new pack; `deletePack(pack)` asks, then moves the folder to the vault's Trash (`trashItems`, Undo); `deleteTemplate(template)` does the same for one template file |
| `use-note-buffer.ts` | `useNoteBuffer()`: the shared disk-wins path for reading or writing a note that may be open (AI Chat's reads). `readCurrentText(path, handle?)` reads disk (a fresh handle via `resolveFileHandleAtPath` when none is given) and returns what an open tab would show after `reconcileWithDisk`, without changing the tab. `writeThrough(path, handle, transform)` reconciles an open tab (in the layout with cached state), applies `transform`, sets the buffer and saves with `saveFile(…, isAutoSave = true)`; `null` from `transform` is `unchanged` (no save), a failed save is `failed`, and `inBuffer` says whether the text is already in the tab |
| `use-open-file-link.ts` | `openFileLink(href, fromPath?)`: Markdown file link clicks (`[Editor](./app/editor/README.md)`) open the vault file `resolveFileLink` finds from the linking note's folder (`utils/note-links/file-link.ts`); a missing path shows a toast and creates nothing (passed to the editor by `PaneLeaf`) |
| `use-open-or-create-link.ts` | `openOrCreateLink(name)`: wikilink clicks open the resolved note, or start `createNoteFromMissingLink` (passed to the editor by `PaneLeaf`) |
| `use-create-item.ts` | Creates files / folders (one level at a time); auto-increments duplicate names (`filename (1).md`, `(2).md`…) and opens the new file. `createNewFile(dir?, name?)` / `createFolder(dir?, name?)` skip the folder picker when given a target directory and the name prompt when given a name (the file tree's inline field; a taken folder name becomes `name 2`, quietly). WikiLink targets are created by `use-template-create.ts` |
| `unique-file.ts` | `createUniqueFile()` (never overwrites: `name (1).md`, `(2)`…; for text that already exists, a draft's first save and the file tree's new files), `ensureVaultFolder()` (walks/creates a vault-relative folder), `normalizeFolderPath()` (trims slashes, drops `.`/`..`). Shared by file creation and the draft save flow (`app/editor/hooks/use-materialize-draft.ts`) |
| `use-duplicate-item.ts` | Duplicates a file into a chosen folder |
| `use-rewrite-links.ts` | `useRewriteLinksAfterMove()`: after a rename, move or undo, rewrites `[[wikilinks]]` that would stop resolving to the same note (via `writeThrough`, disk wins); returns `{ updated, failed }` |
| `resolve-file-by-name.ts` | Resolves a `[[WikiLink]]` name (alias stripped) to a file: exact vault path, then path relative to the linking note's folder, then basename match — nearest folder to the linking note wins, then shortest path, then alphabetical |
| `directory-ops.ts` | `emptyDirectory()` (bottom-up delete), `moveDirectoryByCopy()` (folder rename/move fallback when native `move()` is missing; refuses merges and self-moves, cleans up partial copies), `directoryAtPath()` / `entryAtPath()` (walk vault paths), `relocateEntry(vault, from, to)` (path-to-path move/rename, never overwrites; used by Trash and undo), `uniqueFolderName()` |
| `use-delete-item.ts` | `deleteFile` / `trashItems(items)` move items to the vault's Trash (one action, Undo toast; items inside a trashed folder go with it); permanent recursive delete only when the Trash fails or the path is unknown, after a confirmation. Cleans workspace tabs, `openFiles`, metadata, folder lists and remembered folder expansion; up to 6 retries on lock errors |
| `use-rename-item.ts` | Tries native `.move()` first; falls back to copy + delete (files and folders); then `atom_remapVaultPaths` so open tabs under the item keep working; records Undo; quiet on success; resolves to the new path; up to 6 retries |
| `use-move-item.ts` | `moveItem(handle, dir)` / `moveItems(handles, dir)`: validates against self-move; copy + delete fallback (files and folders); then `atom_remapVaultPaths`; one rescan, one toast with Undo per action; 3 retries |
| `use-import-item.ts` | `showOpenFilePicker` under the picker lock; opens the imported file |
