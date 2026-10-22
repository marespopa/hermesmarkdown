# TreeNodes

Description: Recursively renders a `TreeNode[]` (from `buildFileTree`) as `FolderRow`s and `FileRow`s. Collapsed folders don't render their children. While a new note or folder is being named, its pending row (icon + `InlineNameField`) shows first in the target folder.

## Local State & Storage
- State: None; collapse, selection, editing and drag state come from `VaultFileTree`.
- Persistence: None.

## Dependencies
- Core: `FileRow`, `FolderRow`, `InlineNameField`, `tree-model.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import { TreeNodes } from "./vault-tree/TreeNodes";

<TreeNodes nodes={tree} level={0} isFolderCollapsed={isCollapsed}
  isActiveAncestor={isActiveAncestor} onToggleFolder={toggle} rowProps={rowProps}
  folderProps={folderProps} pendingCreate={pending} setDraggedEntry={setDragged}
  onDragStartFile={startDrag} touchDrag={touchDrag} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| nodes / level / parentPath? | `TreeNode[]` / `number` / `string` | `""` | Nodes, depth and their folder |
| isFolderCollapsed / isActiveAncestor / onToggleFolder | functions | | Folder state |
| rowProps / folderProps | `(entry) => …` / `(node) => …` | | Per-row props from the tree (selection, editing, menu, drag/drop) |
| pendingCreate | `PendingCreate \| null` | | The new item being named, and where |
| setDraggedEntry / onDragStartFile | | | Drag-and-drop |
| touchDrag | `{ start, isPressing, dropTarget }` | | Touch drag from `useTouchTreeDrag` |
