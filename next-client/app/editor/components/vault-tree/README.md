# vault-tree

Building blocks of [`VaultFileTree`](../VaultFileTree.md), the tree behind Files: the sidebar's Files section and the mobile Files page (`/editor/files`).

| File | Purpose |
|---|---|
| `tree-model.ts` | `VaultFileTreeProps`, `VaultFileTreeController`, drag/tree node types (a `DraggedEntry` may carry a `group`), `buildFileTree(files, folderPaths)` (folders inferred from paths, sorted folders-first), `flattenVisible` (rows in display order), entry helpers (`getEntryPath`, `getEntryId`, `ancestorPaths`, `isDescendantOrSelf`, `parentFolderPath`, `canDropInto`), and `VIRTUALIZE_THRESHOLD`. |
| [FileRow](FileRow.md) | One file row: in the tree a fixed-height list-view row (indented by depth, icon, optional Date Modified / Kind columns, selection, inline rename); in the flat search list a two-line row with the folder path. ⋯ / right-click open the shared menu; drag source. Exports `LIST_INDENT_PX`, `selectionClass`. |
| [FolderRow](FolderRow.md) | One folder row: disclosure triangle, folder icon, optional columns, active-chain weight, selection, inline rename, drop target with hover auto-expand; ⋯ / right-click open the shared menu. |
| `list-columns.tsx` | List-view columns: `ListHeader` (sticky Name / Date Modified / Kind titles), `ListColumns`, `formatModified` ("Today at 14:32"), `kindLabel` ("Markdown", "PNG image"). Date shows from `sm`, Kind from `md`. Rows use the `.list-rows` class (globals.scss): `--list-row` height (28px, 40px on touch) and `--row-stripe` alternating stripes. |
| `use-folder-expansion.ts` | `useFolderExpansion(activeAncestorPaths)` → `{ isFolderCollapsed, toggleFolder, expandFolder }`. Reads and writes the current vault's entry in `atom_fileTreeExpansion` (keyed by `atom_vaultKey`). |
| `use-active-row.ts` | `ancestorFolders(path)` (the folders above the active file, opened and marked) and `useSelectActiveRow({ activeFilePath, treeView, rows, selectOnly })`: selects the active file's row once per change of active file. |
| [TreeListStatus](TreeListStatus.md) | The status under the list: "Scanning vault…" / "No files yet" / "No file found" while nothing is listed, "Still scanning vault…" below listed rows. |
| `use-tree-reveal.ts` | `useTreeReveal({ rows, selectOnly, scrollToPath, scrollRef })` → the controller's `reveal(path)` (Show in Files): once the row at `path` is visible, selects it, focuses the tree and scrolls it into view. |
| `use-touch-tree-drag.ts` | `useTouchTreeDrag` → touch drag-to-move for tablets and phones (native drag and drop is unreliable on touch): long-press picks a row up, drop targets are hit-tested via `data-drop-folder`, the list edge-scrolls and hovered folders auto-expand. |
| [TreeNodes](TreeNodes.md) | Recursively renders a `TreeNode[]` as folder and file rows with continuation gutters. |
| [InlineNameField](InlineNameField.md) | The in-place name field for renaming and creating (Return / click away commits, Esc cancels). |
| [TreeContextMenu](TreeContextMenu.md) | The one menu for right-click and ⋯ buttons; `trashShortcut()` / `renameShortcut()` hints. |
| `tree-menu-items.tsx` | `treeMenuItems(target, props, actions)`: the row, multi-selection ("Move 3 Items to Trash") and empty-space menus. With `isPinned(path, kind)` / `togglePin(path, kind)` (kind `"file"` or `"folder"`), a note's menu has Pin / Unpin after Open, a folder's after New Note / New Folder and before Rename. |
| `use-tree-selection.ts` | `useTreeSelection(rows)`: Finder-style selection (click, ⌘/Ctrl-click, Shift-click range, select all) and the keyboard cursor; drops rows that stop being visible. |
| `use-tree-actions.ts` | `useTreeActions`: renaming and creating in place, Trash for the selection, opening, dragging the selection, and selecting/revealing what was just created, renamed or moved. |
| `tree-keyboard.ts` | `handleTreeKey(e, ctx)`: arrow keys, rename (Return on Mac, F2), open (⌘O / ⌘↓, Enter off Mac), Trash (⌘⌫ / Delete), undo, select all, Esc. |
| [FileIcon](FileIcon.md) | A file row's neutral glyph: the note's document type (`utils/note-type.ts`: frontmatter `type:` or a `type/…` tag) picks briefcase / check / people / bookmark; other text files (`utils/file-kinds.ts`) a code glyph; else the document glyph. Each row subscribes to its own note's type only. |
| [use-virtual-tree.ts](use-virtual-tree.ts) | The tree's flat lines (`treeItems`), virtualized past `VIRTUALIZE_THRESHOLD` (200): only the lines in view render, as rows against the scroll box (the sidebar's `data-scroll-root`, else the tree's own), offset by the sections above it (`scrollMargin`, kept by a `ResizeObserver`). `scrollToRow` scrolls to a row whose element may not exist yet. |
