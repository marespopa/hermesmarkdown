# PaneModeSwitch

Description: The app-wide Edit | Preview switch, built on `ModeSwitch`. Preview is the read-only reading view (`codemirror/preview-mode.ts`). `PaneLeaf` shows it icon-only in the active pane's header, between dividers, and `MobileFileIndicator` shows it icon-only in the mobile bar. On desktop it has a tooltip with the Ctrl/Cmd+Alt+P shortcut.

## Local State & Storage
- State: `atom_viewMode` (read/write).
- Persistence: `localStorage["viewMode"]`. One mode applies to every pane and tab and survives a reload.

## Dependencies
- Core: `ModeSwitch`, `Tooltip`, `formatShortcut`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import PaneModeSwitch from "./PaneModeSwitch";

<PaneModeSwitch iconOnly={narrow} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| iconOnly? | `boolean` | `false` | Icons only |
| withTooltip? | `boolean` | `true` | Hover tooltip with the shortcut (off on touch) |
