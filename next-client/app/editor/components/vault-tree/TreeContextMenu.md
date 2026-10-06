# TreeContextMenu

Description: The file tree's one menu, opened by right-click (at the pointer) or a row's ⋯ button. Items have an icon, an optional shortcut hint (`trashShortcut()`: ⌘⌫ / Del, `renameShortcut()`: ↩ / F2), an optional divider above, and destructive styling. It keeps itself on screen, focuses the first item, moves with ↑/↓, and closes on Escape, a choice, or a click outside. The items come from `treeMenuItems()` in `tree-menu-items.tsx` (row, multi-selection and empty-space menus).

## Local State & Storage
- State: Its on-screen position (measured after mount).
- Persistence: None.

## Dependencies
- Core: `Button`, `isMacPlatform`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import { TreeContextMenu } from "./vault-tree/TreeContextMenu";

<TreeContextMenu x={x} y={y} label="File actions" items={items} onClose={close} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| x / y | `number` | | Where it opens (viewport coordinates) |
| label | `string` | | Accessible name |
| items | `TreeMenuItem[]` | | `{ label, icon, onSelect, shortcut?, destructive?, separated? }` |
| onClose | `() => void` | | Closes it |
