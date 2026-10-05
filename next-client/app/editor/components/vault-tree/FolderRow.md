# FolderRow

Description: A single folder row in the vault tree — collapse chevron, a subtle tint when it contains the active file, a drop target that auto-expands on hover while dragging, and a folder action menu (new file, new folder, rename, delete; each with an outline icon: document-add, folder-add, pencil, trash). "New File" and "New Folder" resolve this folder's handle and create inside it (no folder picker), then expand the folder so the new item is visible.

## Local State & Storage
- State: Drop-hover and auto-expand timer are local (`useState`/`useRef`); collapse state and drag state are owned by the parent.
- Persistence: None - transient UI state.

## Dependencies
- Core: `Button`, `react-icons`, `LIST_INDENT_PX` (`FileRow.tsx`), `list-columns.tsx`, `tree-model.ts`.
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
| depth | `number` | | Tree depth (indent) |
| showColumns? | `boolean` | `false` | Date Modified ("--") / Kind ("Folder") columns |
| draggedEntry / setDraggedEntry / onDropInto | | | Drag-and-drop moves |
| onTouchDragStart? / isTouchPressing? / isTouchDropTarget? | | | Touch drag (`useTouchTreeDrag`): long-press start, native-drag suppression, hover highlight |
| actionMenuOpen / setActionMenuOpen | menu state | | Shared action menu |
| resolveFolderHandle? / createNewFile? / createFolder? | | | Folder actions; create callbacks receive this folder's handle |
| expandFolder? | `(path) => void` | | Opens the folder after creating inside it |
| renameFile / deleteFile | handlers | | Folder rename / delete |
