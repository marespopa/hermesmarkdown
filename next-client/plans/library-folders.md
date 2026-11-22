# Several folders in one library

## Context
Only one vault can be open today. Everything walks from the single root handle in `atom_vaultHandle`: the Files tree, quick open, `/` search, grep, metadata and undo. Note ids are paths relative to that root.

You want several disk folders open at once and to find files across them. The shape you picked is **one library, many roots**:
- added folders appear as top-level sections in Files;
- quick open and full-text search cover every folder;
- there is no switcher and there are no spaces, so this keeps the 2026-11-20 decision.

Links between folders weren't asked for. They need no extra work, because names already resolve across the whole vault.

This plan was reviewed against the code by Opus 5.5, and its findings are folded in below.

## Approach: a composite root handle
About 25 files walk directories with `getDirectoryHandle`. Instead of rewriting all of them, the open vault's handle becomes a **composite directory handle**: the primary folder plus one virtual child per added folder ("mount"). Ids become `Work/notes/a.md`.

Metadata, the content and grep workers, `usePaletteFiles`, `useVaultFileSearch`, tabs and undo then work unchanged. They all key by path, and no handles are posted to workers (checked).

The composite can't be used everywhere unchanged. Native APIs that take a handle as an argument reject it: `move()`, `observe()`, IndexedDB writes, and `isSameEntry` on a real handle. Those call sites are listed in step 3.

## Steps

### 1. `app/services/library-roots.ts` (new)
`CompositeDirectoryHandle` is a **plain delegating class, not an ES Proxy**. A Proxy breaks `query.call(handle)` in `vault-health.ts:15`. The class:
- `getDirectoryHandle(name)`:
  - returns the mount's real handle;
  - throws `NotAllowedError` for a locked mount;
  - otherwise passes through to the primary.
- `entries()`/`values()`/`keys()`: the primary's entries, then the mounts. A primary entry with a mount's name is skipped.
- `resolve(h)`:
  - returns `[]` for itself;
  - otherwise tries `primary.resolve(h)`;
  - otherwise checks each mount: `[name]` when `mount.isSameEntry(h)`, or `[name, ...mount.resolve(h)]` for anything inside it.
- `isSameEntry(x)` unwraps `x`, so comparing two composites compares their primaries.
- `removeEntry(mountName)` throws.
- `name`, `kind`, `getFileHandle`, `queryPermission` and `requestPermission` pass through to the primary.

The file also exports these helpers:
- `realHandle(h)` / `primaryHandleOf(h)`
- `mountOf(path)`
- `stripMount(path)`
- `isMountRoot(path)`

**Mount name rules:**
- Names are compared case-insensitively.
- These names are reserved: the primary's own name, `SKIPPED_DIRS`, names starting with a dot, `.hermesmarkdown`, `assets`, `_templates`, and the names of top-level entries already in the primary folder.
- A clash adds ` (2)`, ` (3)` and so on.
- The chosen name is **saved**, never recomputed.

### 2. Persistence (`app/services/idb.ts`)
- One record, `libraryFolders:<vaultKey>` = `{ primary, mounts: {name, handle}[] }`.
- It is used only when `primary.isSameEntry(saved.primary)`. That stops two folders called `notes` from sharing mounts.
- Recent vaults stay as they are: reopening a recent vault finds the record by its key.
- Browser (OPFS) vaults hide the command.

### 3. Native API call sites → `realHandle()`
- **`move()`:**
  - `use-rename-item.ts:124`
  - `use-move-item.ts:152`
  - `directory-ops.ts:187`
  - Without this, every rename of a top-level file would become copy-and-delete.
- **Folder watching:** `use-vault-sync.ts:105` / `file-observer.ts:126` watch the primary and each mount separately, with the mount's paths prefixed.
- **Recent vaults:** `use-recent-vaults.ts:38,64` saves `primaryHandleOf(vaultHandle)`. Otherwise a DataCloneError would stop recent vaults being saved at all.
- **Companion chat:** `use-companion-chat.ts:115` needs the composite's `isSameEntry` unwrap, so the AI chat isn't wiped when a folder is added or unlocked.
- **Plain comparisons** work through the composite's `isSameEntry`; check each one:
  - `use-move-item.ts:118,129`
  - `use-create-item.ts:168`
  - `paste-image.ts`
  - `vault-scan.ts:287`

### 4. Opening and restoring
Build the composite **before `rebindHandles`** in every entry path:
- `initVaultFromHandle` (`use-open-vault.ts`; it persists only the primary)
- `restoreSavedVault`, `unlockVault` and `restoreVault` (`use-vault-restore.ts:72,100,117-139`)

A mount without permission:
- stays in the composite as **locked**;
- throws `NotAllowedError`, so `rebindHandles` keeps its tabs and unsaved edits instead of closing them as missing;
- shows as a locked row in Files. Clicking the row asks for that one folder's permission, which counts as the user gesture.

After an unlock, run `rebindHandles` again plus a full re-index. The metadata cache makes that cheap, and the scan guards in `use-vault-manager.ts:106,126` cancel any run that was still going.

`probeVault` (`vault-health.ts`) checks each mount too. When a mount loses access, its row turns locked.

### 5. Add / remove commands
- **Add Folder to Library…**
  - Runs `showDirectoryPicker`.
  - Optimistic: the row appears at once, a spinner shows only if it takes a while, and the row is rolled back if anything fails.
  - Then it saves, rebuilds the composite and runs a full re-index.
- **Remove Folder from Library**
  - Closes that folder's tabs.
  - Drops its metadata and content-index entries (`removeNoteContent`).
  - Never touches the disk.
- **Where they appear:** the palette (`AppCommands.tsx`), the vault menu (`use-vault-menu-items.tsx`), and the mount row's context menu in `VaultFileTree`.

### 6. Safety guards
- **`isMountRoot(path)`** is checked in the operation layer: `relocateEntry`, `moveOne`, rename, delete and duplicate. It is also checked in the tree menu and in drag-and-drop. Deleting, renaming or moving a mount row is refused before anything is written.
- **Moves between folders are blocked in v1**, inside `relocateEntry`, which also covers the AI `organise.move` tool. A toast says "Moving between library folders isn't supported yet."

### 7. Trash and hidden data per folder
- **`isTrashPath` / `isVaultDataPath`** run on `stripMount(path)`. Replace the literal `startsWith(".hermesmarkdown/")` checks with these helpers:
  - `vault-scan.ts:136`
  - `task-atoms.ts:16,34`
  - `WikiLinkDialog.tsx:68`
  - `search-tools.ts:36`
  - `use-note-tools.ts:35`
  - `useVaultFileSearch.ts:65`
  - `file-kinds.ts:66`
- **Deleting** a file sends it to the trash of the folder it came from. `.origin` keeps the full `Work/...` path.
- **The Trash page** (`editor/trash/page.tsx`):
  - `listTrash` merges every folder's trash;
  - `restoreFromTrash`, `deleteTrashSlot` and `removeEmptyTrashSlot` take the folder;
  - `purgeExpiredTrash` runs once per folder.

### 8. Paths inside a folder
- **Pasted images** go to `<mount>/assets` (`paste-image.ts:38`), so the folder still works on its own.
- **Root-relative links** such as `[[notes/a]]` from a note inside `Work` try `Work/notes/a.md` first (`link-resolver.ts:45`). That keeps links working in folders that were vaults in another app.
- **Link rewriting on rename** stays as it is today and covers the whole library. Links already resolve across folders, so rewriting only within one folder would quietly break them.
- **Export** (`use-vault-archive.ts:46,75`) covers the primary folder only (`primaryHandleOf`). The added folders are separate folders on disk.

### 9. UI
- Mount rows get a distinct folder icon and a "Remove from Library" item. They are listed after the primary folder's top level.
- If someone later creates a folder on disk with the same name as a mount, a warning appears.
- Quick open and `/` results already show the path, so the mount name shows up as the folder label.
- Nothing new goes in the chrome. There's no cache version bump: entries keyed by path and modified time stay valid.

## Main files
- New: `app/services/library-roots.ts`
- Storage and vault atoms: `app/services/idb.ts`, `app/atoms/vault-atoms.ts`
- Opening, restoring and health: `app/hooks/file-system/use-open-vault.ts`, `use-vault-restore.ts`, `use-vault-manager.ts`, `vault-health.ts`
- File operations: `use-rename-item.ts`, `use-move-item.ts`, `directory-ops.ts`, `trash-ops.ts`
- Scanning and watching: `vault-scan.ts`, `app/hooks/use-vault-sync.ts`, `file-observer.ts`
- Other callers: `app/editor/hooks/use-recent-vaults.ts`, `companion/use-companion-chat.ts`, `app/utils/paste-image.ts`, `app/utils/note-links/link-resolver.ts`, `app/editor/trash/page.tsx`
- UI: `VaultFileTree` + `vault-tree/*`, `AppCommands.tsx`, `use-vault-menu-items.tsx`

## Verification
- **Unit tests (vitest)**, using `app/services/memory-file-system.test-utils.ts`:
  - the composite's lookup, listing, a shadowed entry and `resolve()` (a mount, a file inside a mount, the composite itself);
  - `isSameEntry` unwrapping;
  - `structuredClone(composite)` throws, and the recent-vault entry stores the real primary;
  - mount name rules;
  - a scan over two roots gives prefixed paths and skips each folder's trash;
  - a restore with a locked mount keeps its tabs;
  - deleting or renaming a mount root, and moving between folders, are refused before anything is written;
  - root-relative links resolve inside the mount first;
  - the merged Trash lists and restores.
- **Checks:** typecheck, lint, tests and build run in CI on the open 6.59.2 release PR, not locally. No Playwright.
- **Please check by hand in Chrome:**
  1. Open a vault and add a folder. Both appear in Files.
  2. Ctrl+P finds a file in each.
  3. `/word` finds text in both.
  4. Rename a file at the top of the primary folder. It's instant.
  5. Reload. Both folders return, the AI chat is kept, and open tabs are kept.
  6. Deny permission for the added folder. Its row is locked, its tabs are kept, and a click unlocks it.
  7. Remove the folder. Its files leave quick open, and nothing is deleted on disk.
- **Afterwards:** update the `MEMORY.md` line for `project_no_vault_spaces.md`.
