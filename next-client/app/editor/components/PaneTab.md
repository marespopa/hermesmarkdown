# PaneTab

Description: Draggable file tab, a rounded pill on the header's chrome. Inactive tabs sit on a subtle translucent fill that deepens on hover; the active tab is a raised paper pill (`bg-surface`) with a soft shadow and hairline ring. The close button sits on the tab's trailing edge (20px target), after the name: always visible on the active tab, shown on hover or keyboard focus on the others. While the file is unsaved, saving, or failed to save, a colored dot covers the close button and turns into it on hover or focus, so a tab with changes can still be closed by click; the tab's tooltip names the state too, and the tab's `Ctrl/Cmd+N` shortcut (kept off the tab itself so tabs stay narrow). Middle-click closes the tab (calls `onClose`). It also exports `TabSaveState`, `statusDot`, `statusMeta` (icon + label per save state) and `SaveStateIcon` — the save glyph used by the pane Save button and the mobile header: save icon, with a badge while unsaved, a check when saved, an exclamation mark on error, a spinner while saving, so states differ by shape, not only color.

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
| shortcutNumber? | `number` |  | `Ctrl/Cmd+N` shortcut, shown in the tooltip |
| isDraggedOver | `boolean` |  | Drop-target styling |
| onClick / onClose / onContextMenu | `(e: MouseEvent) => void` |  | Handlers; `onClose` also fires on middle-click |
| draggable? / onDrag* / onDrop? | DnD handlers |  | Tab reordering |
