# Atoms

Jotai state model. Each file owns a domain; `atoms.ts` is the barrel.

## Domains

| File | Domain | Persistence |
|------|--------|-------------|
| `file-atoms.ts` | Open files, live FS handles, content, save status, conflict state; the draft actions `atom_openDraft` (focus/add the draft tab) and `atom_materializeDraft` (turn the draft tab into the file just written for it, in place), plus `atom_materializedDraftPath` | `atom_openFiles` persisted via `atomWithStorage` (`localStorage["openFiles"]`); `atom_liveHandles` ephemeral (handles can't be serialized) |
| `vault-atoms.ts` | Vault handle, current directory, vault tree, cloud-vault flag, pending/loaded state, `atom_fileSystemVersion` (bumped on FS changes), `atom_vaultDescriptor` (GitHub vault), `atom_vaultKey` (stable per-vault key for persisted UI state), `atom_rebindHandles` action (reattaches handles for restored tabs and syncs their content with disk), `atom_remapVaultPaths` action (follows a file/folder rename or move: re-keys open tabs keeping unsaved edits, pane layouts, metadata and file tree expansion, and re-resolves fresh handles at the new paths), `atom_forgetFileTreePaths` action (drops expansion for a deleted folder), `resolveFileHandleAtPath()` | Ephemeral; the handle and GitHub descriptor are persisted to IndexedDB by `hooks/file-system/use-vault-manager.ts` (via `services/idb`) |
| `workspace-atoms.ts` | Pane tree layout, active pane id | `atom_workspaceLayout` → localStorage |
| `ui-atoms.ts` | Theme, editor font / size / line height, word wrap, line numbers, Vim mode, flow mode, autosave, vault-open behavior (`atom_onVaultOpen`: home feed or resume), new notes folder, auto-hide tabs, home feed visibility (`atom_homeFeedOpen`, ephemeral), onboarding & wizards, hidden files, file tree folder expansion (`atom_fileTreeExpansion`, per vault), frontmatter collapse, AI provider / keys / models, voice input, command-palette recents / pins / use counts, active `EditorView`, global dialog | Preferences persisted via `atomWithStorage`; focus, editor view, dialog and request counters ephemeral |
| `metadata.ts` | Per-file metadata index (`atom_fileMetadata`: frontmatter, tags, links, tasks, plain-text `preview`), custom workspaces | `atom_customWorkspaces` → localStorage |
| `task-atoms.ts` | Vault-wide tasks derived from the metadata index, task tags, search / tag / due-date filters, `atom_filteredTasks` | Ephemeral (derived) |
| `layout-actions.ts` | `atom_workspaceTabs` (derived tab list) and write-only actions: `atom_activateWorkspaceTab`, `atom_splitPane`, `atom_closePane`, `atom_closeTab`, `atom_moveTab` | n/a |

## Support

- `atoms.ts` — builds `contentStore` and re-exports every domain file except `task-atoms.ts`, which is imported directly (`@/app/atoms/task-atoms`). Treat as the public surface.
- `utils.ts` — pure helpers for the pane tree: `findLeaf()`, `getFirstLeaf()`, `updateLeaf()`, `removePathsFromLayout()`, `remapPath()`, `remapPathsInLayout()`, `getWorkspaceTabs()`, `generateId()`.

## Cross-domain reads

These edges matter when refactoring — break them carefully:

- `file-atoms` → `workspace-atoms` (the active pane decides the active file)
- `vault-atoms` → `file-atoms` + `workspace-atoms` + `ui-atoms` + `metadata` + `utils` (vault rebinding writes into `atom_liveHandles` / `atom_openFiles` and prunes closed paths from the layout)
- `task-atoms` → `metadata` (tasks are derived from `atom_fileMetadata`)
- `layout-actions` → `workspace-atoms` + `utils`

## Conventions

- Every atom is named `atom_<camelCase>`.
- Action atoms read like verbs (`atom_splitPane`, `atom_rebindHandles`).
- Anything that can't be JSON-serialized (FS handles, AbortControllers) stays ephemeral.
