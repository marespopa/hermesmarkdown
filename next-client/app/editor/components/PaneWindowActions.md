# PaneWindowActions

Description: The window-wide sections of the toolbar, each its own borderless capsule on a subtle translucent fill (`PANE_SECTION_CLASS`), set apart by space rather than dividers. **Tools**: Search (the command palette, Ctrl/Cmd+K) and AI Chat (only when an AI key is set; Ctrl/Cmd+Shift+B). **More**: a pull-down menu (`aria-haspopup="menu"`, `TabContextMenu` right-aligned under the button, `align="end"`) with Copy Markdown, Export as PDF… (`exportActivePdf`) and Export as HTML (`exportActiveHtml`), both handled by `PdfExport`, and, for a note in the open vault (not the draft), **Pin to Home** / **Unpin from Home** for the focused pane (the label and a filled accent pin show that the note is pinned; `canPinActiveNote`, `isActiveNotePinned`, `toggleActiveNotePin`), then Settings, and Documentation and Help. The commands come from `useWindowActions` (`hooks/use-window-actions.ts`). These change the whole app rather than one pane, so `PaneLeaf` renders them once, in the top-right pane (`getTopTrailingLeaf` in `app/atoms/utils.ts`), where they stay put while focus moves between panes. Every command here is also in the command palette; Split Pane Right and Show Token Cost are palette-only.

## Local State & Storage
- State: via `useWindowActions` — `atom_isAiConfigured`, `atom_aiBuilderRequest`, `atom_sidebarOpen`, `atom_activePaneId`, `atom_workspaceLayout`, `atom_splitPane`. The menu's open state is local.
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
