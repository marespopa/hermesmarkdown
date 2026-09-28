# TreeNodes

Description: Recursively renders a `TreeNode[]` (from `buildFileTree`) as `FolderRow`s and `FileRow`s, passing each row the continuation flags for its tree gutter. Collapsed folders don't render their children.

## Local State & Storage
- State: None; collapse, active-chain, and drag state come from `VaultFileTree`.
- Persistence: None.

## Dependencies
- Core: `FileRow`, `FolderRow`, `tree-model.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import { TreeNodes } from "./vault-tree/TreeNodes";

<TreeNodes nodes={tree} level={0} ancestorLines={[]} isFolderCollapsed={isCollapsed}
  isActiveAncestor={isActiveAncestor} onToggleFolder={toggle} rowProps={rowProps}
  draggedEntry={dragged} setDraggedEntry={setDragged} onDropInto={moveInto} folderRowExtras={extras} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| nodes / level | `TreeNode[]` / `number` | | Nodes and depth |
| ancestorLines | `boolean[]` | | Gutter continuation flags (`[]` at the root) |
| isFolderCollapsed / isActiveAncestor / onToggleFolder | functions | | Folder state |
| rowProps | `(entry) => FileRow props` | | Builds each file row's props |
| draggedEntry / setDraggedEntry / onDropInto | | | Drag-and-drop |
| folderRowExtras | partial `FolderRowProps` | | Shared folder actions |
