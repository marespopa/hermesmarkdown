# Atoms

Jotai state model. Each file owns a domain; `atoms.ts` is the barrel.

## Domains

| File | Domain | Persistence |
|------|--------|-------------|
| `file-atoms.ts` | Open files, live FS handles, content, save status, conflict state; the draft actions `atom_openDraft` (focus/add the draft tab) and `atom_materializeDraft` (turn the draft tab into the file just written for it, in place), plus `atom_materializedDraftPath` | `atom_openFiles` persisted via `atomWithStorage` (`localStorage["openFiles"]`); `atom_liveHandles` ephemeral (handles can't be serialized) |
| `vault-atoms.ts` | Vault handle, current directory, vault tree, `atom_vaultFolderPaths` (every folder the indexing walk found, so the file tree shows empty folders at any depth; remapped on rename/move), `atom_fileUndoStack` (undoable renames / moves / moves to Trash, see `hooks/file-system/use-file-undo.ts`), cloud-vault flag, pending/loaded state, `atom_fileSystemVersion` (bumped on FS changes), `atom_vaultDescriptor` (GitHub vault), `atom_vaultKey` (stable per-vault key for persisted UI state), `atom_recentVaults` (vaults opened on this device, newest first, loaded from and saved to IndexedDB by `editor/hooks/use-recent-vaults.ts`), `atom_rebindHandles` action (reattaches handles for restored tabs and syncs their content with disk), `atom_remapVaultPaths` action (follows a file/folder rename or move: re-keys open tabs keeping unsaved edits, pane layouts, metadata, the worker's note-text index (`remapNoteContent`, posted before the metadata update), file tree expansion and sensitive-note session reveals, and re-resolves fresh handles at the new paths), `atom_forgetFileTreePaths` action (drops expansion for a deleted folder), `resolveFileHandleAtPath()` | Ephemeral; the handle and GitHub descriptor are persisted to IndexedDB by `hooks/file-system/use-vault-manager.ts` (via `services/idb`) |
| `workspace-atoms.ts` | Pane tree layout, active pane id | `atom_workspaceLayout` → localStorage |
| `ui-atoms.ts` | Theme, editor font / size / line height, word wrap, line numbers, Vim mode, flow mode, hidden pane toolbar (`atom_toolbarHidden`), autosave, new notes folder, home feed visibility (`atom_homeFeedOpen`, ephemeral; `atom_resumeRequested`, a one-shot from the landing page's Resume that skips the feed once), onboarding & wizards (`atom_welcomeDeferred`: in-memory, holds the first-run tour while work handed over from a tool page is shown), hidden files, file tree folder expansion (`atom_fileTreeExpansion`, per vault), frontmatter collapse, AI provider / keys / models, voice input, command-palette recents / pins / use counts, active `EditorView`, `atom_pendingScrollTarget` (one-shot "open at line" signal: `{ path, line (1-based), column? (0-based caret offset in the line) }`, set by the Tasks page and palette `/` results), global dialog, Quick jot (`atom_quickJot`: input open flag and the text kept across an accidental close, ephemeral; `atom_jotTimePrefix`: Time on Quick Jots, persisted) | Preferences persisted via `atomWithStorage`; focus, editor view, dialog and request counters ephemeral |
| `metadata.ts` | Per-file metadata index (`atom_fileMetadata`: frontmatter, tags, links, tasks, plain-text `preview`), custom workspaces | `atom_customWorkspaces` → localStorage |
| `tool-atoms.ts` | Free tool pages (`/tools/*`): `atom_tableToolMarkdown`, `atom_mermaidToolSource`, `atom_tokenizerText`, `atom_cleanerInput` (all `null` until edited), `atom_tokenizerEncoding`, `atom_cleanerFormat`. Imported directly by tool code, never through the `atoms.ts` barrel | This tab's sessionStorage (`hermes_tool_*`) |
| `session-storage.ts` | `tabSessionStorage()`: the tab's `sessionStorage`, guarded for the server and blocked storage, for `atomWithStorage` atoms kept per tab | — |
| `privacy-atoms.ts` | Sensitive notes: Privacy Mode (`atom_privacyLevel`: `show_title` / `blurred` / `hidden`), `atom_noteDisplayItems` (every note's display item for listings, from the display factory `app/utils/note-display.ts`; excluded notes are absent), and the session-only editor reveal (`atom_revealAllSensitive`, `atom_revealedSensitivePaths`, action `atom_revealSensitivePath`) | `atom_privacyLevel` → `localStorage["hermes_privacy_mode"]`, read on init (no flash of the default level); reveals ephemeral |
| `task-atoms.ts` | Vault-wide tasks derived from the metadata index, skipping `.hermes/` and template files (`atom_allTasks`, raw, for writeback), `atom_visibleTasks` (`DisplayTask[]`: tasks from sensitive notes masked, or left out in Privacy Mode "hidden"), task tags and `atom_filteredTasks` (both from the visible list; masked tasks never match a text or tag filter), search / tag / due-date filters | Ephemeral (derived) |
| `home-pin-atoms.ts` | Home feed pins: derived `atom_homePinnedPaths` (the open vault's pins, newest first), `atom_toggleHomePin` (pin / unpin a path; no-op without a vault) and `atom_forgetHomePins` (unpin a deleted note or everything under a deleted folder). Renames and moves are followed in `atom_remapVaultPaths` | `atom_homePins` (in `ui-atoms`) → `localStorage["hermes_home_pins"]`, `vaultKey → paths` |
| `template-atoms.ts` | Vault templates: `atom_templateFolderSettings` (Settings → Templates Folder, `vaultKey → folder`), derived `atom_templatesFolder` (`{ folder, exists }`: the setting, else the first existing of `templates` / `_templates` / `Templates`) and `atom_templates` (direct `.md` children, sorted; follows every rescan of `atom_fileMetadata`; bodies are read from disk on use), and `atom_templateDialog` (the open template picker / prompts request, see `components/TemplateDialog`) | `atom_templateFolderSettings` → `localStorage["hermes_template_folders"]`; the rest derived or ephemeral |
| `layout-actions.ts` | `atom_workspaceTabs` (derived tab list) and write-only actions: `atom_activateWorkspaceTab`, `atom_splitPane`, `atom_closePane`, `atom_closeTab`, `atom_moveTab` | n/a |

## Support

- `atoms.ts` — builds `contentStore` and re-exports every domain file except `task-atoms.ts`, which is imported directly (`@/app/atoms/task-atoms`). Treat as the public surface.
- `utils.ts` — pure helpers for the pane tree: `isPathInLayout()` (a path is a tab in any pane), `findLeaf()`, `getFirstLeaf()`, `updateLeaf()`, `removePathsFromLayout()`, `remapPath()`, `remapPathsInLayout()`, `getWorkspaceTabs()`, `generateId()`.

## Cross-domain reads

These edges matter when refactoring — break them carefully:

- `file-atoms` → `workspace-atoms` (the active pane decides the active file)
- `vault-atoms` → `file-atoms` + `workspace-atoms` + `ui-atoms` + `metadata` + `utils` (vault rebinding writes into `atom_liveHandles` / `atom_openFiles` and prunes closed paths from the layout)
- `task-atoms` → `metadata` + `privacy-atoms` + `template-atoms` (tasks are derived from `atom_fileMetadata`; the visible list follows `atom_privacyLevel`; template files are skipped)
- `home-pin-atoms` → `ui-atoms` + `vault-atoms` (the stored map lives in `ui-atoms` so `vault-atoms` can remap it without a cycle; pins are keyed by `atom_vaultKey`)
- `template-atoms` → `metadata` + `vault-atoms` (the registry is derived from the index, the setting is keyed by `atom_vaultKey`)
- `privacy-atoms` → `metadata` (display items are derived from `atom_fileMetadata`)
- `vault-atoms` → `privacy-atoms` (path remaps carry `atom_revealedSensitivePaths`; imported from `./privacy-atoms`, not the barrel)
- `layout-actions` → `workspace-atoms` + `utils`

## Conventions

- Every atom is named `atom_<camelCase>`.
- Action atoms read like verbs (`atom_splitPane`, `atom_rebindHandles`).
- Anything that can't be JSON-serialized (FS handles, AbortControllers) stays ephemeral.
