# PaneWindowActions

Description: The window-wide sections of the toolbar, each its own borderless capsule on a subtle translucent fill (`PANE_SECTION_CLASS`), set apart by space rather than dividers. **Tools**: Search (the command palette, Ctrl/Cmd+K) and AI Chat (only when an AI key is set; Ctrl/Cmd+Shift+B). **More**: a pull-down menu (`aria-haspopup="menu"`, `TabContextMenu` anchored under the button) with Copy Markdown, Split Right and Token Cost (opens `TokenCostDialog`) for the focused pane, Settings, Documentation and Help, Free Tools (the `/tools` page), and Hide Toolbar (Ctrl/Cmd+Alt+T). The commands come from `useWindowActions` (`hooks/use-window-actions.ts`). These change the whole app rather than one pane, so `PaneLeaf` renders them once, in the top-right pane (`getTopTrailingLeaf` in `app/atoms/utils.ts`), where they stay put while focus moves between panes. Every command here is also in the command palette.

## Local State & Storage
- State: via `useWindowActions` — `atom_isAiConfigured`, `atom_aiBuilderRequest`, `atom_toolbarHidden`, `atom_activePaneId`, `atom_workspaceLayout`, `atom_splitPane`. The menu's open state is local.
- Persistence: None here.

## Dependencies
- Core: `PaneToolbarButton`, `TabContextMenu`, `useWindowActions`, `pane-header-classes.ts`, `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
{hostsWindowActions && <PaneWindowActions />}
```

## Props Overview
None.
