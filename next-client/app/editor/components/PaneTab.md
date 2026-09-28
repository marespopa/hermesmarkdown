# PaneTab

Description: Draggable file tab with a save-state indicator, shortcut hint, and close button. It also exports `TabSaveState`, `statusDot` and `statusMeta`.

## Local State & Storage
- State: None (controlled).
- Persistence: None - transient UI state.

## Dependencies
- Core: `Tooltip`, `app/utils/platform`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import PaneTab from "./PaneTab";

<PaneTab fileName="notes.md" isActive saveState="dirty" isDraggedOver={false}
  onClick={select} onClose={close} onContextMenu={openMenu} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| fileName | `string` |  | Tab label |
| isActive | `boolean` |  | Active styling |
| saveState | `"idle" \| "dirty" \| "saving" \| "saved" \| "error"` |  | Status dot |
| saveErrorMessage? | `string` |  | Error tooltip |
| shortcutNumber? | `number` |  | `Ctrl/Cmd+N` hint |
| isDraggedOver | `boolean` |  | Drop-target styling |
| onClick / onClose / onContextMenu | `(e: MouseEvent) => void` |  | Handlers |
| draggable? / onDrag* / onDrop? | DnD handlers |  | Tab reordering |
