# OutlineToggleButton

Description: Shows or hides the note's outline (`EditorOutline`) — the same setting as `Ctrl/Cmd+Shift+M`, **Toggle Outline** in the palette, Settings → Editor → View and the outline's own ×. On the editor (`/editor`, desktop) it sits just left of `CopyContentButton` in the window's top-right corner (`EditorShell`), in the pill's look (`PILL_BUTTON_CLASS`), with a lines icon. While the outline is on it's pressed (`aria-pressed`, a stronger fill and ink, no accent color). Its tooltip reads "Show Outline" / "Hide Outline" with the shortcut.

## Local State & Storage
- State: `atom_showOutline` (ui-atoms).
- Persistence: `localStorage["showOutline"]` through the atom.

## Dependencies
- Core: `Button`, `Tooltip`, `formatShortcut`, `pane-header-classes.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import OutlineToggleButton from "./OutlineToggleButton";

<OutlineToggleButton />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| className | `string` | `""` | Extra classes |
