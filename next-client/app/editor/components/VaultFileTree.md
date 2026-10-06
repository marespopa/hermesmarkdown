# VaultFileTree

Description: Virtualized file list or folder tree for the vault, with search highlighting, inline rename, a row action menu, and drag-and-drop moves (mouse, or long-press on touch screens via `useTouchTreeDrag`, which shows a floating label under the finger).

## Local State & Storage
- State: `atom_indexerState`. Folder expansion comes from `useFolderExpansion` (collapsed by default, ancestors of the active file open automatically, manual toggles override). The dragged entry, drop highlights, and the action menu are local useState. Rows are virtualized with `useVirtualizer`. The active file is scrolled into view once each time the active file changes (or when it first appears while the vault is still scanning), never on a plain list refresh, so scanning and the file watcher can't pull the scroll position back.
- Persistence: Manual folder expand/collapse overrides are kept per vault in `atom_fileTreeExpansion` (`localStorage["hermes_file_tree_expansion"]`), so they survive reloads and are shared by the Explorer page and the mobile overlay. File operations run against local handles through the passed callbacks.

## Dependencies
- Core: `@tanstack/react-virtual`, and the row components and tree model in [`vault-tree/`](vault-tree/README.md) (`FileRow`, `FolderRow`, `TreeNodes`, `buildFileTree`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import VaultFileTree from "./VaultFileTree";

<VaultFileTree processedFiles={files} activeFilePath={path} openFile={open}
  renameFile={rename} deleteFile={remove} treeView folderPaths={folders} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| processedFiles | `any[]` |  | File entries to render |
| activeFilePath | `string \| null` |  | Highlighted file |
| openFile / openFileInPane? | `(handle, path?) => void` |  | Open actions |
| renameFile / deleteFile / duplicateFile? | handle callbacks |  | Row actions |
| treeView? | `boolean` | `false` | Tree layout instead of a flat list |
| columns? | `boolean` | `false` | Tree only: Finder-like list view with a sticky Name / Date Modified / Kind header (Explorer page) |
| folderPaths? | `string[]` | `[]` | Folders to include in the tree, so empty ones show (from `useVaultFileSearch`: the indexing walk's folders at every depth plus the latest listing) |
| isSearchActive? / highlightQuery? | `boolean` / `string` | `false` / `""` | Search mode |
| resolveFolderHandle? / createNewFile? / createFolder? / moveItem? | callbacks |  | Folder operations |
| onClose? | `() => void` |  | Closes the drawer after opening a file |
| singleClickOpen? | `boolean` | `false` | Open files on a single click (sidebar); otherwise double-click opens |
