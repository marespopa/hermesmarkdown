# PaneTab

Description: Draggable file tab. The close button sits on the tab's leading edge (20px target): always visible on the active tab, shown on hover or keyboard focus on the others. While the file is unsaved, saving, or failed to save, a colored dot covers the close button and turns into it on hover or focus, so a tab with changes can still be closed by click; the tab's tooltip names the state too. A `Ctrl/Cmd+N` shortcut hint follows the name. It also exports `TabSaveState`, `statusDot`, `statusMeta` (icon + label per save state) and `SaveStateIcon` — the save glyph used by the pane Save button and the mobile header: save icon, with a badge while unsaved, a check when saved, an exclamation mark on error, a spinner while saving, so states differ by shape, not only color.

## Local State & Storage
- State: None (controlled).
- Persistence: None - transient UI state.

## Dependencies
- Core: `Tooltip`, `Button`, `app/utils/platform`, `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import PaneTab, { SaveStateIcon } from "./PaneTab";

<PaneTab fileName="notes.md" isActive saveState="dirty" isDraggedOver={false}
  onClick={select} onClose={close} onContextMenu={openMenu} />

<SaveStateIcon state="dirty" size={17} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| fileName | `string` |  | Tab label |
| isActive | `boolean` |  | Active styling; keeps the close button visible |
| saveState | `"idle" \| "dirty" \| "saving" \| "saved" \| "error"` |  | Dot over the close button for dirty / saving / error |
| saveErrorMessage? | `string` |  | Error tooltip |
| shortcutNumber? | `number` |  | `Ctrl/Cmd+N` hint |
| isDraggedOver | `boolean` |  | Drop-target styling |
| onClick / onClose / onContextMenu | `(e: MouseEvent) => void` |  | Handlers |
| draggable? / onDrag* / onDrop? | DnD handlers |  | Tab reordering |
