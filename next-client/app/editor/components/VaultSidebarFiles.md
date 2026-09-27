# VaultSidebarFiles

Description: Virtualized file list or folder tree for the vault, with search highlighting, inline rename, a row action menu, and drag-and-drop moves.

## Local State & Storage
- State: `atom_indexerState`. Expanded and collapsed folder sets, the dragged entry, drop highlights, and the action menu are local useState. Rows are virtualized with `useVirtualizer`.
- Persistence: None itself. File operations run against local handles through the passed callbacks.

## Dependencies
- Core: `@tanstack/react-virtual`, `Button`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import VaultSidebarFiles from "./VaultSidebarFiles";

<VaultSidebarFiles processedFiles={files} activeFilePath={path} openFile={open}
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
| folderPaths? | `string[]` | `[]` | Folders to include in the tree |
| isSearchActive? / highlightQuery? | `boolean` / `string` | `false` / `""` | Search mode |
| resolveFolderHandle? / createNewFile? / createFolder? / moveItem? | callbacks |  | Folder operations |
| onClose? | `() => void` |  | Closes the drawer after opening a file |
