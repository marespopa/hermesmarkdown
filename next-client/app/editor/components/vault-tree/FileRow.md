# FileRow

Description: A single file row — file name with search highlighting, and either a list-view tree row (fixed height from `--list-row`, indented by `depth`, document icon, optional Date Modified / Kind columns, `role="treeitem"`) or a two-line flat search row with the parent folder. Shows selection (accent while the tree is focused, gray otherwise), the keyboard cursor outline, and an `InlineNameField` while being renamed. Its ⋯ button and right-click open the tree's shared menu. Drag source. Also exports `LIST_INDENT_PX`, `selectionClass()` and the `RowEditing` type.

## Local State & Storage
- State: None; selection, editing and the menu are owned by `VaultFileTree`.
- Persistence: None.

## Dependencies
- Core: `Button`, `react-icons`, `InlineNameField`, `list-columns.tsx`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import { FileRow } from "./vault-tree/FileRow";

<FileRow entry={entry} entryPath="notes/a.md" isActive={false} highlightQuery=""
  openFile={openFile} onOpenMenu={(x, y) => openMenu(x, y)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| entry / entryPath? | `any` / `string` | | File entry and its vault path |
| isActive | `boolean` | | Highlights the open file |
| highlightQuery | `string` | | Search text to highlight |
| openFile | `(handle, path?) => void` | | Opens the note (click with `singleClickOpen`, else double-click) |
| onOpenMenu | `(x, y) => void` | | ⋯ button and right-click |
| onClose? | `() => void` | | Called after opening (closes overlays) |
| singleClickOpen? | `boolean` | `false` | Open on a plain click instead of double-click |
| hideFolderPath? / depth? | `boolean` / `number` | | Tree rows: no folder line, indented by depth |
| showColumns? / modifiedAt? | `boolean` / `number` | `false` | Date Modified / Kind columns |
| isSelected? / isFocused? / treeFocused? | `boolean` | `false` | Selection, keyboard cursor, whether the tree has focus |
| onSelectClick? | `(mods) => boolean` | | Selection click; returns whether it was a plain click (only then does it open) |
| editing? | `RowEditing` | | Shows the inline name field |
| draggable? / onDragStartEntry? / onDragEndEntry? | | | Drag-to-move |
| onTouchDragStart? / isTouchPressing? / dropFolder? | | | Touch drag (`useTouchTreeDrag`); `dropFolder` is the folder a touch drop on this row goes into (its parent) |
