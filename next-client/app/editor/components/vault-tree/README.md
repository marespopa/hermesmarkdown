# vault-tree

Building blocks of [`VaultFileTree`](../VaultFileTree.md), the file tree used by the Explorer page (`/editor/files`) and the mobile file overlay.

| File | Purpose |
|---|---|
| `tree-model.ts` | `VaultFileTreeProps`, drag/tree node types, `buildFileTree(files, folderPaths)` (folders inferred from paths, sorted folders-first), entry helpers (`getEntryPath`, `getEntryId`, `isDescendantOrSelf`), and `VIRTUALIZE_THRESHOLD`. |
| [FileRow](FileRow.md) | One file row: name with search highlight, folder path line, tree gutter, action menu, drag source. Also exports `TreeGutter`. |
| [FolderRow](FolderRow.md) | One folder row: collapse toggle, active-chain tint, drop target with hover auto-expand, action menu. |
| `use-folder-expansion.ts` | `useFolderExpansion(activeAncestorPaths)` → `{ isFolderCollapsed, toggleFolder, expandFolder }`. Reads and writes the current vault's entry in `atom_fileTreeExpansion` (keyed by `atom_vaultKey`). |
| [TreeNodes](TreeNodes.md) | Recursively renders a `TreeNode[]` as folder and file rows with continuation gutters. |
