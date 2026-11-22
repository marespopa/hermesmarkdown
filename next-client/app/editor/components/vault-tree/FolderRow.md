# FolderRow

Description: A single folder row in the vault tree (`role="treeitem"`, `aria-expanded`) — disclosure triangle (always only opens/closes), folder icon, name or `InlineNameField` while renaming, optional columns, medium weight when it contains the active file, selection and keyboard-cursor styling, and a drop target that auto-expands after 400 ms of hovering. A plain click selects and toggles it; ⌘/Ctrl/Shift clicks only change the selection. Its ⋯ button and right-click open the tree's shared menu (New File, New Folder, Rename, Move to Trash). A library's added folder (`library: "mount"`, `services/library-roots.ts`) shows an outline folder icon, can't be dragged, and its menu has Remove from Library instead of Rename / Move to Trash; a locked one (`library: "locked"`, access lapsed) shows a lock, and a click asks for its access again (`onUnlock`, the click being the gesture the browser's prompt needs).

## Local State & Storage
- State: Drop-hover and the auto-expand timer are local; collapse, selection, editing and drag state are owned by `VaultFileTree`.
- Persistence: None.

## Dependencies
- Core: `Button`, `react-icons`, `InlineNameField`, `LIST_INDENT_PX` / `selectionClass` (`FileRow.tsx`), `list-columns.tsx`, `tree-model.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import { FolderRow } from "./vault-tree/FolderRow";

<FolderRow node={folder} depth={0} isCollapsed={collapsed} onToggle={toggle}
  draggedEntry={null} setDraggedEntry={setDragged} onDragStartFolder={startDrag}
  onDropInto={moveInto} onOpenMenu={(x, y) => openMenu(x, y)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| node / depth | `TreeFolderNode` / `number` | | The folder and its tree depth |
| isCollapsed / onToggle | `boolean` / `(path) => void` | | Expansion |
| isActiveChain? | `boolean` | `false` | Contains the active file |
| showColumns? | `boolean` | `false` | "--" / "Folder" columns |
| draggedEntry / setDraggedEntry / onDragStartFolder / onDropInto | | | Drag-and-drop (a selected folder drags the whole selection) |
| onTouchDragStart? / isTouchPressing? / isTouchDropTarget? | | | Touch drag |
| onOpenMenu | `(x, y) => void` | | ⋯ button and right-click |
| isSelected? / isFocused? / treeFocused? / onSelectClick? | | | Selection (see `FileRow`) |
| editing? | `RowEditing` | | Shows the inline name field |
| library? / onUnlock? | `"mount" \| "locked"` / `() => void` | | A library's added folder; a locked one asks for access on click |
