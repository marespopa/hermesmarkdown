# Nested folders plan, adapted to HermesMarkdown

## Context
The pasted plan (tree builder, recursive tree component, folder CRUD, drag and drop) is mostly built already:
`vault-tree/tree-model.ts#buildFileTree`, `VaultFileTree.tsx` + `vault-tree/{TreeNodes,FolderRow,FileRow}.tsx`, HTML5 DnD → `use-move-item.ts`, recursive delete in `use-delete-item.ts`.
Folders are real directories (File System Access / OPFS / GitHub workspace), so the plan's "path-keyed storage" and `fileTreeAtom`/`activeFileIdAtom` don't apply. We keep the current derived tree (`useMemo` over `processedFiles`) and `atom_activeFilePath`.

Saving nested files already works by path (`use-save-file.ts` resolves `vaultHandle.resolve(handle)`, `use-open-file.ts` keys tabs by full path). What breaks is editing the *structure* of nested trees. This plan covers only what is actually missing:

1. **Expansion state isn't persisted.** `VaultFileTree.tsx:38-39` keeps `manuallyExpanded`/`manuallyCollapsed` in `useState`, so it resets on reload and differs between `/editor/files` and `MobileFileOverlay`.
2. **Creating from a folder's menu ignores that folder.** In `FolderRow.tsx`, "New File" / "New Folder" call `createNewFile()` / `createFolder()` without a target, so the user has to pick the folder again in a dialog.
3. **Renaming or moving a folder leaves stale child paths.** `use-rename-item.ts` only patches `fileMetadata[oldPath]` (the folder's own key, which never exists). `use-move-item.ts` patches nothing but the active file. Open tabs (`atom_openFiles` keys), `atom_workspaceLayout` pane paths, `atom_activeFilePath` and metadata for files *inside* the folder keep their old paths until the next rebind closes them as missing. The same is true for moving a single non-active open file.

4. **Tabs under a renamed or moved folder can't save.** Child handles go stale (see Phase 3).
5. **Folder rename/move has no fallback** when native `move()` is missing (see Phase 4).
6. **Wiki links pick an arbitrary file** when the same name exists in several subfolders (see Phase 5).

Naming: "file tree" / "Explorer" only, never "sidebar"/"rail". Use design tokens (`bg-chrome`, `text-ui-*`, `sage`), not `neutral-800`.

## Phase 1: Persisted expansion state
- `app/atoms/ui-atoms.ts`: add
  `atom_fileTreeExpansion = atomWithStorage<Record<string, { expanded: string[]; collapsed: string[] }>>("hermes_file_tree_expansion", {})`, keyed by vault.
- `app/atoms/vault-atoms.ts`: add a derived `atom_vaultKey` from `atom_vaultDescriptor` + `atom_vaultHandle`:
  `browser:<id>`, `github:<owner>/<repository>@<branch>`, `local:<vaultHandle.name>`, null if no vault.
- New hook `app/editor/components/vault-tree/use-folder-expansion.ts`. It returns `{ isFolderCollapsed, toggleFolder, expandFolder }` and keeps today's semantics: collapsed by default, ancestors of the active file open automatically, manual toggles override. It reads and writes the atom entry for the current vault key and takes `activeAncestorPaths` as input.
- `VaultFileTree.tsx`: replace the two `useState` sets and the `isFolderCollapsed`/`toggleFolder` bodies with the hook. `TreeNodes` props stay the same.

## Phase 2: Create inside the clicked folder
- `use-create-item.ts`: `createNewFile(targetDir?)` skips `chooseTargetDirectory()` when a target is given. `createFolder(targetDir?)` skips `selectTargetDirectory()` and goes straight to `promptAndCreateFolder(targetDir)`. Existing no-argument callers (toolbar buttons, command palette in `document-vault-commands.ts`, `use-editor-command-context.ts`) behave as before.
- `tree-model.ts#VaultFileTreeProps`: widen the signatures to `createNewFile?: (dir?: FileSystemDirectoryHandle) => …` and `createFolder?: (dir?) => …`.
- `FolderRow.tsx`: in the menu handlers, `const dir = await resolveFolderHandle?.(node.path)`, then call `createNewFile(dir ?? undefined)` / `createFolder(dir ?? undefined)`, then `expandFolder(node.path)` so the new item is visible. Pass `expandFolder` down through `folderRowExtras` in `TreeNodes`.
- `app/editor/files/page.tsx:57`: its wrapper around `createNewFile` must forward the argument.

## Phase 3: Remap paths on folder rename or move (and on delete for expansion)
- `app/atoms/utils.ts`: add pure helpers next to `removePathsFromLayout`:
  - `remapPath(path, oldPrefix, newPrefix)`: exact match or `oldPrefix + "/"` prefix, using `isDescendantOrSelf` semantics (move that helper here or import it from tree-model).
  - `remapPathsInLayout(node, fn)`: same traversal as `removePathsFromLayout`, mapping `openFilePaths` and `activeFilePath`.
- `app/atoms/vault-atoms.ts`: new write-only action atom `atom_remapVaultPaths` taking `{ oldPath, newPath }`. It updates:
  `atom_openFiles` (re-key entries and their `activeFilePath` field), `atom_workspaceLayout`, `atom_activeFilePath`, `atom_fileMetadata` (key + `.path`), `atom_liveHandles(newPath)` (copy, then clear the old key), and the current vault's `atom_fileTreeExpansion` entry.
- `use-rename-item.ts`: after a successful rename, call `remapVaultPaths({ oldPath, newPath })` for files and folders alike. This replaces the single-key `setFileMetadata` patch at lines 148-165. The `oldPath`/`newPath` computation there is reused.
- `use-move-item.ts`: compute `oldPath` from `vaultHandle.resolve(freshHandle)` before the move and `newPath` from `resolve(targetDir) + name` after it, then call the same action. Keep the existing `setActiveFileHandle` logic.
- `use-delete-item.ts`: after deletion, drop the deleted path and its descendants from the expansion entry. The layout and openFiles cleanup already exists at ~line 160.
- **Saving tabs under a moved folder.** Handles are path-based, so moving a directory makes the child file handles stale. A later `saveFile` (`use-save-file.ts`) would write through `atom_liveHandles(oldPath)` and fail. Its retry (lines ~254-262) walks `targetPath` with `getDirectoryHandle`, which also fails because the old folder is gone. To fix this, `atom_remapVaultPaths` re-resolves a fresh handle for every remapped open tab by walking `newPath` from `vaultHandle`. It reuses the same walk as `atom_rebindHandles` (factor it into a small `resolveFileHandleAtPath(vault, path)` helper in `vault-atoms.ts`). It stores the result in `atom_liveHandles(newPath)` and, for the active tab, in `atom_activeFileHandle`. Dirty tab content (`content !== lastSavedContent`) is carried over unchanged, so unsaved edits survive and save to the new location.

## Phase 4: Folder rename/move when native `move()` is missing
Today `use-rename-item.ts` throws "Folder renaming not supported in this browser" and `use-move-item.ts` rethrows for directories when `FileSystemHandle.move` is unavailable or fails. Safari/Firefox OPFS support varies, and browser and GitHub vaults are OPFS-backed.
- New `app/hooks/file-system/copy-directory.ts`: `copyDirectory(src, destParent, name)`. It recursively creates `name` and copies files with `writeFileContent(newHandle, await file.getFile())` so binary attachments keep their bytes, wrapped in `withRetry`. It refuses if `destParent` is inside `src` (resolve `src.resolve(destParent)` !== null).
- On success, delete the source with the existing bottom-up emptier in `use-delete-item.ts` (export it from there rather than duplicating it).
- Use it as the directory fallback in both hooks, before `atom_remapVaultPaths`. If the copy fails partway, leave the source intact and remove the partial copy.
- If a folder with the target name already exists at the destination, show an error instead of merging.

## Phase 5: Resolve wiki links in nested trees
`resolve-file-by-name.ts` falls back to the *first* basename match in `fileMetadata`. With nested folders, `[[notes]]` becomes ambiguous across `a/notes.md` and `b/notes.md`.
- Add an optional `fromPath` argument. When several basename matches exist, prefer the one in the same folder as `fromPath`, then the nearest ancestor/descendant (fewest differing path segments), then the shortest path. Keep the result deterministic (sort before picking).
- Pass `activeFilePath` from `use-open-file.ts` (`openFileByName`, ~line 193) and from the cross-file tables caller.
- Relative-path links (`[[sub/notes]]`) already hit the exact-path branch; also try them relative to `fromPath`'s folder before falling back.

## Out of scope
- New DnD library (native DnD already works).
- New atoms mirroring the tree or the active file.

## Verification
Per project rules, build, tests and screenshots only run when the user asks. When asked:
- Unit tests: `app/atoms/utils` remap helpers (exact, prefix, sibling-with-shared-prefix like `a/b` vs `a/bc`, layout traversal). Extend `app/atoms/file-atoms.test.ts`-style tests for `atom_remapVaultPaths`. Extend `VaultFileTree.test.tsx` for expansion surviving a remount and for the folder-menu New File passing the folder handle.
- `copyDirectory` against `app/services/memory-file-system.test-utils.ts`: nested copy, binary bytes preserved, refusal to copy into self, cleanup after a partial failure.
- `resolveFileMetaByName` with duplicate basenames across folders, checking that the same-folder match wins.
- `atom_remapVaultPaths` with a dirty open tab under the folder: content is kept and the live handle is re-resolved at the new path.
- `yarn tsc --noEmit` and `yarn vitest run` in `next-client`.
- Manual check (by you): expand folders, reload, and confirm they're still open. Folder ⋯ → New File creates a file inside it with no picker. Rename or drag a folder that contains an open tab: the tab stays open under the new path, unsaved edits survive, and saving writes to the moved file (no copy recreated at the old path). In a vault with `a/notes.md` and `b/notes.md`, `[[notes]]` from `b/x.md` opens `b/notes.md`.
