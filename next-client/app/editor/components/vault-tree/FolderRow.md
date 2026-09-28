# FolderRow

Description: A single folder row in the vault tree — collapse chevron, a subtle tint when it contains the active file, a drop target that auto-expands on hover while dragging, and a folder action menu (new file, new folder, rename, delete).

## Local State & Storage
- State: Drop-hover and auto-expand timer are local (`useState`/`useRef`); collapse state and drag state are owned by the parent.
- Persistence: None - transient UI state.

## Dependencies
- Core: `Button`, `react-icons`, `TreeGutter` (`FileRow.tsx`), `tree-model.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import { FolderRow } from "./vault-tree/FolderRow";

<FolderRow node={folder} isCollapsed={collapsed} onToggle={toggle} actionMenuOpen={null}
  setActionMenuOpen={setMenu} draggedEntry={null} setDraggedEntry={setDragged}
  onDropInto={moveInto} renameFile={rename} deleteFile={remove} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| node | `TreeFolderNode` | | Folder to render |
| isCollapsed / onToggle | `boolean` / `(path) => void` | | Collapse state |
| isActiveChain? | `boolean` | | Tint when the active file is inside |
| treeGutter? | `TreeGutterInfo` | | Gutter lines |
| draggedEntry / setDraggedEntry / onDropInto | | | Drag-and-drop moves |
| actionMenuOpen / setActionMenuOpen | menu state | | Shared action menu |
| resolveFolderHandle? / createNewFile? / createFolder? | | | Folder actions |
| renameFile / deleteFile | handlers | | Folder rename / delete |
