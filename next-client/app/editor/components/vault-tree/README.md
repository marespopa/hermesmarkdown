# vault-tree

Building blocks of [`VaultFileTree`](../VaultFileTree.md), the file tree used by the sidebar, the Explorer page (`/editor/files`) and the mobile file overlay.

| File | Purpose |
|---|---|
| `tree-model.ts` | `VaultFileTreeProps`, `VaultFileTreeController`, drag/tree node types (a `DraggedEntry` may carry a `group`), `buildFileTree(files, folderPaths)` (folders inferred from paths, sorted folders-first), `flattenVisible` (rows in display order), entry helpers (`getEntryPath`, `getEntryId`, `ancestorPaths`, `isDescendantOrSelf`, `parentFolderPath`, `canDropInto`), and `VIRTUALIZE_THRESHOLD`. |
| [FileRow](FileRow.md) | One file row: in the tree a fixed-height list-view row (indented by depth, icon, optional Date Modified / Kind columns, selection, inline rename); in the flat search list a two-line row with the folder path. ⋯ / right-click open the shared menu; drag source. Exports `LIST_INDENT_PX`, `selectionClass`. |
| [FolderRow](FolderRow.md) | One folder row: disclosure triangle, folder icon, optional columns, active-chain weight, selection, inline rename, drop target with hover auto-expand; ⋯ / right-click open the shared menu. |
| `list-columns.tsx` | List-view columns: `ListHeader` (sticky Name / Date Modified / Kind titles), `ListColumns`, `formatModified` ("Today at 14:32"), `kindLabel` ("Markdown", "PNG image"). Date shows from `sm`, Kind from `md`. Rows use the `.list-rows` class (globals.scss): `--list-row` height (28px, 40px on touch) and `--row-stripe` alternating stripes. |
| `use-folder-expansion.ts` | `useFolderExpansion(activeAncestorPaths)` → `{ isFolderCollapsed, toggleFolder, expandFolder }`. Reads and writes the current vault's entry in `atom_fileTreeExpansion` (keyed by `atom_vaultKey`). |
| `use-touch-tree-drag.ts` | `useTouchTreeDrag` → touch drag-to-move for tablets and phones (native drag and drop is unreliable on touch): long-press picks a row up, drop targets are hit-tested via `data-drop-folder`, the list edge-scrolls and hovered folders auto-expand. |
| [TreeNodes](TreeNodes.md) | Recursively renders a `TreeNode[]` as folder and file rows with continuation gutters. |
| [InlineNameField](InlineNameField.md) | The in-place name field for renaming and creating (Return / click away commits, Esc cancels). |
| [TreeContextMenu](TreeContextMenu.md) | The one menu for right-click and ⋯ buttons; `trashShortcut()` / `renameShortcut()` hints. |
| `tree-menu-items.tsx` | `treeMenuItems(target, props, actions)`: the row, multi-selection ("Move 3 Items to Trash") and empty-space menus. |
| `use-tree-selection.ts` | `useTreeSelection(rows)`: Finder-style selection (click, ⌘/Ctrl-click, Shift-click range, select all) and the keyboard cursor; drops rows that stop being visible. |
| `use-tree-actions.ts` | `useTreeActions`: renaming and creating in place, Trash for the selection, opening, dragging the selection, and selecting/revealing what was just created, renamed or moved. |
| `tree-keyboard.ts` | `handleTreeKey(e, ctx)`: arrow keys, rename (Return on Mac, F2), open (⌘O / ⌘↓, Enter off Mac), Trash (⌘⌫ / Delete), undo, select all, Esc. |
