# PaneWindowActions

Description: The window-wide group of the desktop pane header: the Edit | Preview switch (`PaneModeSwitch`), the metadata toggle (`FrontmatterToggle`), then the command palette, AI chat (only when an AI key is set; same trigger as Ctrl/Cmd+Shift+B) settings (opens `/editor/settings`), documentation and help (opens `/documentation`), and — after a divider — **Hide toolbar** (chevron up; sets `atom_toolbarHidden`, also Ctrl/Cmd+Alt+T or the command palette). These change the whole app rather than one pane, so `PaneLeaf` renders this group once, in the top-right pane (`getTopTrailingLeaf` in `app/atoms/utils.ts`), where it stays put while focus moves between panes.

## Local State & Storage
- State: `atom_isAiConfigured`, `atom_aiBuilderRequest` (opens AI chat), `atom_toolbarHidden`; the switch and toggle read their own atoms.
- Persistence: None here.

## Dependencies
- Core: `PaneModeSwitch`, `FrontmatterToggle`, `CommandPaletteContext`, `Tooltip`, `Button`, `pane-header-classes.ts`, `react-icons/hi`, `next/navigation`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import PaneWindowActions from "./PaneWindowActions";

{hostsWindowActions && <PaneWindowActions />}
```

## Props Overview
None.
