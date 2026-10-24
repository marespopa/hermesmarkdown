# TreeNodes

Description: The tree's lines, flat. `treeItems(rows, pendingCreate, isFolderCollapsed)` turns the visible rows (`flattenVisible`, so collapsed folders' children are already left out) into `TreeItem`s, with the item being named (icon + `InlineNameField`) first in its folder while that folder is open. `TreeItemRow` renders one item: a `FolderRow`, a `FileRow` (indented by its depth) or the pending row. Folders don't wrap their children, so `VaultFileTree` can render the list whole or virtualized (`use-virtual-tree.ts`, past `VIRTUALIZE_THRESHOLD` lines) with the same rows.

## Local State & Storage
- State: None; collapse, selection, editing and drag state come from `VaultFileTree`.
- Persistence: None.

## Dependencies
- Core: `FileRow`, `FolderRow`, `InlineNameField`, `tree-model.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import { TreeItemRow, treeItems } from "./vault-tree/TreeNodes";

const items = treeItems(rows, pendingCreate, isFolderCollapsed);
items.map((item) => (
  <TreeItemRow key={item.key} item={item} pendingCreate={pendingCreate}
    isFolderCollapsed={isCollapsed} isActiveAncestor={isActiveAncestor} onToggleFolder={toggle}
    rowProps={rowProps} folderProps={folderProps} setDraggedEntry={setDragged}
    onDragStartFile={startDrag} touchDrag={touchDrag} />
));
```

## Props Overview (`TreeItemRow`)
| Prop | Type | Default | Description |
|---|---|---|---|
| item | `TreeItem` | | The line: a visible row, or the pending item with its depth |
| pendingCreate | `PendingCreate \| null` | | The new item being named, and where |
| isFolderCollapsed / isActiveAncestor / onToggleFolder | functions | | Folder state |
| rowProps / folderProps | `(entry) => …` / `(node) => …` | | Per-row props from the tree (selection, editing, menu, drag/drop) |
| setDraggedEntry / onDragStartFile | | | Drag-and-drop |
| touchDrag | `{ start, isPressing, dropTarget }` | | Touch drag from `useTouchTreeDrag` |
