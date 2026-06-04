# Hooks

React hooks organized by concern: UI primitives, sync orchestration, and the file-system facade.

## UI Primitives

| Hook | Purpose |
|------|---------|
| `use-autoresize.tsx` | Auto-expand textarea height to content (min 150px) |
| `use-command.tsx` | Register global keyboard shortcuts with modifiers |
| `use-document-title.tsx` | Reactive browser tab title |
| `use-dialog.ts` | Promise-based alert/confirm/prompt over the Jotai global dialog |
| `use-is-mobile.tsx` | Breakpoint detection (default 1052px) |
| `use-interval.tsx` | setInterval with null-delay pause support |
| `use-window-size.tsx` | Viewport dimensions, initialized on mount |
| `use-isomorphic-layout-effect.tsx` | `useLayoutEffect` on client, `useEffect` on server |

## Sync & Persistence

| Hook | Purpose |
|------|---------|
| `use-file-sync.ts` | Polls the active file every 60s; auto-syncs when clean; flags conflicts; refreshes on window focus |
| `use-vault-sync.ts` | Polls vault tree every 5min (1min for cloud); detects iCloud / OneDrive / Dropbox / Google Drive vaults |
| `use-auto-save.ts` | Debounced / on-blur / manual save modes; flushes pending writes on tab switch |
| `use-save.tsx` | Intercepts Ctrl+S to call the editor save handler |

## File System Facade

- `use-file-system.ts` — composes the vault, editor, and CRUD hooks below into the editor's single entry point. Capability-gated via mount tracking.

## file-system/

### shared.ts

Cross-cutting primitives used by every file-system hook:

- `withRetry()` — retries "state changed" and `InvalidStateError` up to 2× with 100ms backoff.
- `withPickerLock()` — global singleton preventing overlapping `showOpenFilePicker` / `showSaveFilePicker` calls (500ms buffer).
- `metadataWorker` — Web Worker that indexes tags in the background.
- `isVaultSupported`, `isIdbSupported` — browser capability flags.

### Vault

- `use-vault-manager.ts` — open / restore / close the vault, scan the directory tree, kick off tag indexing. Persists the directory handle to IndexedDB; auto-loads on mount; detects cloud-synced folders.

### File editor

| Hook | Purpose |
|------|---------|
| `use-file-editor.ts` | Composes open / save / export / index; registers background indexing on the active file |
| `use-open-file.ts` | Loads a file into the editor; retries stale handles; warns on unsaved changes |
| `use-save-file.ts` | Writes with exponential backoff (8 retries, 15 for cloud); auto-enables cloud mode after 2 failures; updates metadata async |
| `use-export-file.ts` | Desktop picker → Web Share API → blob download fallback chain |
| `use-index-active-file.ts` | 1s-debounced re-index on content change |

### CRUD

| Hook | Purpose |
|------|---------|
| `use-file-crud.ts` | Composes create / delete / rename / move / import with shared callbacks |
| `use-create-item.ts` | Auto-increments duplicate names (`filename (1).md`, `(2).md`…) and opens the new file |
| `use-delete-item.ts` | Recursive delete; cleans workspace tabs and `openFiles`; 3 retries on lock errors |
| `use-rename-item.ts` | Tries native `.move()` first; falls back to copy + delete; 3 retries |
| `use-move-item.ts` | Validates against self-move; copy + delete fallback; 3 retries |
| `use-import-item.ts` | `showOpenFilePicker` under the picker lock; opens the imported file |
