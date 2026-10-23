# Atoms

Jotai state model. Each file owns a domain; `atoms.ts` is the barrel.

## Domains

| File | Domain | Persistence |
|------|--------|-------------|
| `file-atoms.ts` | Open files, live FS handles, content, save status, conflict state; the draft actions `atom_openDraft` (focus/add the draft tab) and `atom_materializeDraft` (turn the draft tab into the file just written for it, in place), plus `atom_materializedDraftPath` | `atom_openFiles` persisted via `atomWithStorage` (`localStorage["openFiles"]`); `atom_liveHandles` ephemeral (handles can't be serialized) |
| `vault-atoms.ts` | Vault handle, current directory, vault tree, `atom_vaultFolderPaths` (every folder the indexing walk found, so the file tree shows empty folders at any depth; remapped on rename/move), `atom_fileUndoStack` (undoable renames / moves / moves to Trash, see `hooks/file-system/use-file-undo.ts`), cloud-vault flag, pending/loaded state, `atom_fileSystemVersion` (bumped on FS changes), `atom_vaultDescriptor` (GitHub vault), `atom_vaultKey` (stable per-vault key for persisted UI state), `atom_recentVaults` (vaults opened on this device, newest first, loaded from and saved to IndexedDB by `editor/hooks/use-recent-vaults.ts`), `atom_rebindHandles` action (reattaches handles for restored tabs and syncs their content with disk), `atom_remapVaultPaths` action (follows a file/folder rename or move: re-keys open tabs keeping unsaved edits, the pane's tabs, metadata, the worker's note-text index (`remapNoteContent`, posted before the metadata update), file tree expansion and private-note session reveals, and re-resolves fresh handles at the new paths), `atom_forgetFileTreePaths` action (drops expansion for a deleted folder), `atom_showFolderInFiles` action (opens a folder and those above it in the file tree, then Show Files with that folder to reveal), `resolveFileHandleAtPath()` | Ephemeral; the handle and GitHub descriptor are persisted to IndexedDB by `hooks/file-system/use-vault-manager.ts` (via `services/idb`) |
| `workspace-atoms.ts` | The one pane's layout (versioned, `version: 3`; older layouts normalized once at load by `layout-normalize.ts`), `atom_activePaneId` (derived: always that pane's id; writes are no-ops) | `atom_workspaceLayout` → localStorage |
| `layout-normalize.ts` | Pure `normalizeWorkspaceLayout`: merges a legacy split layout into one pane (every pane's notes, the first front note), drops pane types and sizes | n/a |
| `ui-atoms.ts` | Theme, editor font / size / line height, word wrap, line numbers, word count (`atom_showWordCount`, off by default), Vim mode, Focus (`atom_focusMode`: off / hide / dim), autosave (`atom_autosaveMode`: afterDelay / manual; `AUTOSAVE_DELAY` is fixed at 2s), new notes folder, Show Files (`atom_showFiles` action: sidebar shown, Files unfolded, feed closed, `atom_filesFocusRequested` set for `WorkspaceSidebar` to focus the tree; `atom_filesRevealPath`, the folder it should reveal instead, set by `atom_showFolderInFiles` in `vault-atoms.ts`), home feed visibility (`atom_homeFeedOpen`, ephemeral; `atom_resumeRequested`, a one-shot from the landing page's Resume that skips the feed once), first run (`atom_hasCompletedOnboarding`, set after the first visit by `useFirstRun`; `atom_folderPromptDismissed`, in-memory "Not Now" on `FolderPrompt`), hidden files, file tree folder expansion (`atom_fileTreeExpansion`, per vault), folded heading sections (`atom_headingFolds`, per note path, in memory for the visit), AI models (provider, keys, the AI Features switch `atom_aiEnabled` and `atom_isAiConfigured` are in `ai-atoms.ts`, re-exported here), command-palette recents / pins / use counts, active `EditorView`, `atom_pendingScrollTarget` (one-shot "open at line" signal: `{ path, line (1-based), column? (0-based caret offset in the line) }`, set by the Tasks page and palette `/` results), global dialog | Preferences persisted via `atomWithStorage` (`atom_focusMode` and `atom_autosaveMode` via `atomWithChoiceStorage`, so a stored value this version doesn't offer reads as the default); focus, editor view, heading folds, dialog and request counters ephemeral |
| `metadata.ts` | Per-file metadata index (`atom_fileMetadata`: frontmatter, tags, links, tasks, plain-text `preview`) | In memory |
| `board-atoms.ts` | Boards: `atom_boardViewports` (scroll and zoom per path, never in the file), `atom_boardMarkdownPaths` (boards opened as Markdown this session, in memory) and `atom_toggleBoardMarkdown`. Imported directly, not through the `atoms.ts` barrel | `atom_boardViewports`: this tab's sessionStorage (`hermes_board_viewport`) |
| `tool-atoms.ts` | Free tool pages (`/tools/*`): `atom_tableToolMarkdown`, `atom_mermaidToolSource`, `atom_tokenizerText`, `atom_cleanerInput` (all `null` until edited), `atom_tokenizerEncoding`, `atom_cleanerFormat`. Imported directly by tool code, never through the `atoms.ts` barrel | This tab's sessionStorage (`hermes_tool_*`) |
| `session-storage.ts` | `tabSessionStorage()`: the tab's `sessionStorage`, guarded for the server and blocked storage, for `atomWithStorage` atoms kept per tab | — |
| `privacy-atoms.ts` | Private notes (`private: true` or a `private` tag): Privacy Mode (`atom_privacyLevel`: `show_title` "Mask in lists" / `hidden` "Hide from lists"; a stored `blurred` reads as `show_title`), `atom_noteDisplayItems` (every note's display item for listings, from the display factory `app/utils/note-display.ts`; excluded notes are absent), and the session-only editor reveal (`atom_revealAllPrivate`, `atom_revealedPrivatePaths`, action `atom_revealPrivatePath`) | `atom_privacyLevel` → `localStorage["hermes_privacy_mode"]`, read on init (no flash of the default level); reveals ephemeral |
| `task-atoms.ts` | Vault-wide tasks derived from the metadata index, skipping `.hermes/` and template files (`atom_allTasks`, raw, for writeback), `atom_visibleTasks` (`DisplayTask[]`: tasks from private notes masked, or left out in Privacy Mode "hidden"), task tags and `atom_filteredTasks` (both from the visible list; masked tasks never match a text or tag filter), search / tag / due-date filters | Ephemeral (derived) |
| `ai-atoms.ts` | AI provider, Claude / Gemini keys, the AI Features switch (`atom_aiEnabled`; never stored reads as on when a key exists) and derived `atom_isAiConfigured` (switch on and the provider's key set). Re-exported from `ui-atoms` | `localStorage` `hermes_ai_provider`, `hermes_claude_key`, `hermes_gemini_key`, `hermes_ai_enabled` |
| `print-atoms.ts` | Export as PDF's page setup, `atom_pdfSettings` (read through `normalizePrintSettings`) | `localStorage["hermes_pdf_settings"]` |
| `note-pin-atoms.ts` | Pinned notes (first in the command palette and at the top of the sidebar's Files): derived `atom_pinnedNotePaths` (the open vault's pins, newest first), `atom_toggleNotePin` (pin / unpin a path; no-op without a vault) and `atom_forgetNotePins` (unpin a deleted note or everything under a deleted folder). Renames and moves are followed in `atom_remapVaultPaths` | `atom_notePins` (in `ui-atoms`) → `localStorage["hermes_home_pins"]`, `vaultKey → paths` |
| `template-atoms.ts` | Vault templates: derived `atom_templatesFolder` (`{ folder, exists }`: always `templates` at the vault root, created on first use) and `atom_templates` (`.md` files directly in `templates/` or one folder down, a pack; sorted; follows every rescan of `atom_fileMetadata`; bodies are read from disk on use), and `atom_templateDialog` (the open template picker, with an optional `preselect`, or prompts request, see `components/TemplateDialog`) | Derived or ephemeral |
| `recovery-atoms.ts` | `atom_recoveryIssue`: what stops notes reaching disk or browser storage (`access-lost`, `vault-missing`, `storage-full`, `storage-low`), shown by `editor/components/RecoveryBanner`; `reportRecoveryIssue()` / `clearRecoveryIssue()` set it from anywhere through the default store (a vault issue outranks a storage one), `isQuotaError()`, `LARGE_NOTE_CHARS`, `STORAGE_LOW_RATIO` | Ephemeral |
| `layout-actions.ts` | `atom_workspaceTabs` (derived tab list) and write-only actions: `atom_activateWorkspaceTab`, `atom_closeTab`, `atom_reorderOpenNote` | n/a |

## Support

- `atoms.ts` — builds `contentStore` and re-exports every domain file except `task-atoms.ts`, which is imported directly (`@/app/atoms/task-atoms`). Treat as the public surface.
- `choice-storage.ts` — `atomWithChoiceStorage(key, choices, fallback)`: a `localStorage` setting limited to fixed values; an unknown stored value reads as `fallback` (`normalizeChoice`).
- `utils.ts` — pure helpers for the pane: `isPathInLayout()` (a path is an open tab), `findLeaf()`, `updateLeaf()`, `removePathsFromLayout()`, `remapPath()`, `remapPathsInLayout()`, `getWorkspaceTabs()`, `generateId()`.

## Cross-domain reads

These edges matter when refactoring — break them carefully:

- `file-atoms` → `workspace-atoms` (the pane's front note is the active file)
- `vault-atoms` → `file-atoms` + `workspace-atoms` + `ui-atoms` + `metadata` + `utils` (vault rebinding writes into `atom_liveHandles` / `atom_openFiles` and prunes closed paths from the layout)
- `task-atoms` → `metadata` + `privacy-atoms` + `template-atoms` (tasks are derived from `atom_fileMetadata`; the visible list follows `atom_privacyLevel`; template files are skipped)
- `note-pin-atoms` → `ui-atoms` + `vault-atoms` (the stored map lives in `ui-atoms` so `vault-atoms` can remap it without a cycle; pins are keyed by `atom_vaultKey`)
- `template-atoms` → `metadata` (the registry is derived from the index)
- `privacy-atoms` → `metadata` (display items are derived from `atom_fileMetadata`)
- `vault-atoms` → `privacy-atoms` (path remaps carry `atom_revealedPrivatePaths`; imported from `./privacy-atoms`, not the barrel)
- `layout-actions` → `workspace-atoms` + `utils` + `file-atoms`

`link-atoms.ts`: `atom_backlinkIndex`, a derived map (target path to the notes linking to it) built from `atom_fileMetadata` links.

## Conventions

- Every atom is named `atom_<camelCase>`.
- Action atoms read like verbs (`atom_closeTab`, `atom_rebindHandles`).
- Anything that can't be JSON-serialized (FS handles, AbortControllers) stays ephemeral.
