# vault-tree

Building blocks of [`VaultFileTree`](../VaultFileTree.md), the file tree used by the Explorer page (`/editor/files`) and the mobile file overlay.

| File | Purpose |
|---|---|
| `tree-model.ts` | `VaultFileTreeProps`, drag/tree node types, `buildFileTree(files, folderPaths)` (folders inferred from paths, sorted folders-first), entry helpers (`getEntryPath`, `getEntryId`, `isDescendantOrSelf`, `parentFolderPath`, `canDropInto`), and `VIRTUALIZE_THRESHOLD`. |
| [FileRow](FileRow.md) | One file row: in the tree a fixed-height list-view row (indented by depth, icon, optional Date Modified / Kind columns); in the flat search list a two-line row with the folder path. Action menu, drag source. Exports `LIST_INDENT_PX`. |
| [FolderRow](FolderRow.md) | One folder row: disclosure triangle, folder icon, optional columns, active-chain weight, drop target with hover auto-expand, action menu. |
| `list-columns.tsx` | List-view columns: `ListHeader` (sticky Name / Date Modified / Kind titles), `ListColumns`, `formatModified` ("Today at 14:32"), `kindLabel` ("Markdown", "PNG image"). Date shows from `sm`, Kind from `md`. Rows use the `.list-rows` class (globals.scss): `--list-row` height (28px, 40px on touch) and `--row-stripe` alternating stripes. |
| `use-folder-expansion.ts` | `useFolderExpansion(activeAncestorPaths)` → `{ isFolderCollapsed, toggleFolder, expandFolder }`. Reads and writes the current vault's entry in `atom_fileTreeExpansion` (keyed by `atom_vaultKey`). |
| `use-touch-tree-drag.ts` | `useTouchTreeDrag` → touch drag-to-move for tablets and phones (native drag and drop is unreliable on touch): long-press picks a row up, drop targets are hit-tested via `data-drop-folder`, the list edge-scrolls and hovered folders auto-expand. |
| [TreeNodes](TreeNodes.md) | Recursively renders a `TreeNode[]` as folder and file rows with continuation gutters. |
