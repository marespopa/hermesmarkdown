# Hooks

React hooks organized by concern: UI primitives, sync orchestration, and the file-system facade.

## UI Primitives

| Hook | Purpose |
|------|---------|
| `use-dialog.ts` | Promise-based alert/confirm/prompt/select over the Jotai global dialog |
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
| `use-file-watcher.ts` | Polls open files for external changes (backoff up to 5min, immediate on window focus) and raises conflicts |
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
- `metadataWorker` — Web Worker (`app/workers/metadata.worker.ts`) that indexes frontmatter, tags, links and tasks in the background.
- `isVaultSupported` (disk folder picker, Chromium), `isBrowserVaultSupported` (Origin Private File System, every modern browser), `isIdbSupported` — browser capability flags.

All file writes go through `writeFileContent()` in `app/services/file-writer.ts`, which works in every browser (see Services).

### Vault

- `vault-scan.ts` — pure helpers: directory listing, the recursive markdown walk for indexing (skips node_modules/vendor, 60s cap), file reading for the worker, metadata merging, cloud-folder detection, parent-directory resolution.
- `use-metadata-worker-results.ts` — merges the metadata worker's results back into `atom_fileMetadata`, re-attaching file handles.
- `use-vault-manager.ts` — open / restore / close the vault (local, browser, or GitHub), scan the directory tree, kick off metadata indexing. Persists the directory handle or descriptor to IndexedDB; auto-loads on mount; detects iCloud / OneDrive / Dropbox folders. Without disk folder access, `openVault()` opens the browser vault dialog.
- `stored-workspace.ts` — on mount, finds the browser or GitHub vault to reopen (these need no permission prompt).
- `use-browser-vault.ts` — create / open / list / delete browser vaults (OPFS). Opening asks for persistent storage and reminds about backups after two weeks without an export.
- `use-vault-archive.ts` — whole-vault export (zip download for any vault; folder copy on Chromium) and import (zip, folder, or loose files; never overwrites). Records the export time for browser vaults.
- `use-create-vault.ts` — the New Vault flow: pick a parent folder, create the vault folder (refusing to overwrite), then open it.

### File editor

| Hook | Purpose |
|------|---------|
| `use-file-editor.ts` | Composes open / save / export / index; registers background indexing on the active file |
| `use-open-file.ts` | Loads a file into the editor; retries stale handles; warns on unsaved changes |
| `use-save-file.ts` | Writes with exponential backoff (up to 8 retries for autosave, 2 for manual saves; capped at 1.5s); auto-enables cloud mode after repeated lock errors; updates metadata async |
| `use-export-file.ts` | Desktop picker → Web Share API → blob download fallback chain |
| `use-index-active-file.ts` | 1s-debounced re-index on content change |
| `reconcile-disk.ts` | Pure `reconcileWithDisk()` — merges on-disk content into a tab's cached state (take disk if clean, keep local edits if disk unchanged, else raise a conflict). Shared by the file watcher and `atom_rebindHandles` |

### CRUD

| Hook | Purpose |
|------|---------|
| `use-file-crud.ts` | Composes create / delete / rename / move / import with shared callbacks |
| `use-create-item.ts` | Creates files / folders (one level at a time) and wikilink targets; auto-increments duplicate names (`filename (1).md`, `(2).md`…) and opens the new file |
| `use-duplicate-item.ts` | Duplicates a file into a chosen folder |
| `resolve-file-by-name.ts` | Resolves a `[[WikiLink]]` name (alias stripped) to a file: exact path match, then fuzzy basename match |
| `use-delete-item.ts` | Recursive delete; cleans workspace tabs and `openFiles`; up to 6 retries on lock errors |
| `use-rename-item.ts` | Tries native `.move()` first; falls back to copy + delete; up to 6 retries |
| `use-move-item.ts` | Validates against self-move; copy + delete fallback; 3 retries |
| `use-import-item.ts` | `showOpenFilePicker` under the picker lock; opens the imported file |
