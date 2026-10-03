# PaneLeaf

Description: One workspace pane. On desktop its header is the window's toolbar, following Apple's toolbar layout: navigation on the left, the tabs in the middle, actions on the right. Window-wide controls sit at fixed window corners rather than following focus: the **Sidebar** button that shows `WorkspaceSidebar` (tooltip "Show sidebar", Ctrl/Cmd+Alt+S) at the far left of the top-left pane, only while the sidebar is hidden — once open, the sidebar's own header carries the hide button — a Codicon (`react-icons/vsc`) panel glyph (`getFirstLeaf`; Home lives in the sidebar, not the toolbar), and `PaneWindowActions` (Mode, Tools, More menu) in the top-right pane (`getTopTrailingLeaf`); with one pane, that pane hosts both. **Pane actions** (`PaneActions`: Save, and Close Pane in a split) show in every pane, focused or not, so the header never reflows when focus moves. Sections are borderless capsules on a subtle translucent fill, set apart by space. The tab strip (`PaneTab` tabs inside `TabStripScroller`, with scroll arrows when tabs overflow) shows even for a single note; tabs are rounded pills on the header's chrome, and the header closes with a hairline (`PANE_HEADER_CLASS`); the editor below is its own paper panel. Toolbar buttons are icon-only, with the name in a tooltip. Right-clicking the toolbar opens its context menu (Hide Toolbar). Right-clicking a tab opens the tab menu (Copy Markdown for the active tab, Open in pane, close actions). **Hide toolbar** (`atom_toolbarHidden`, persisted in `localStorage["toolbarHidden"]`) slides every pane's header up under the pane's top edge (negative top margin matching the header height; the pane clips it) and makes it `inert`; the top-right pane then shows a small chevron-down **Show toolbar** handle in its corner. Header icons are Heroicons outline at `PANE_ICON_SIZE` (the Sidebar button's Codicon aside); header styling comes from `pane-header-classes.ts`. The editor remounts on tab switches, except when the draft is saved as a file (`atom_materializedDraftPath`), so the caret and undo history survive that switch. The editor sits inside `SensitiveNoteGate`, which carries the editor's key: a sensitive note shows `SensitiveNoteVeil` until it's revealed (per note or for the session), and the gate's "already shown" latch follows the editor instance.

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_openFiles`, `atom_activePaneId`, `atom_activeFilePath`, `atom_fileContent`, `atom_saveStatus`, the action atoms `atom_splitPane`/`atom_closePane`, `atom_isVoicePreviewVisible`, `atom_materializedDraftPath`, `atom_toolbarHidden` (hidden header) and `atom_sidebarOpen` (Sidebar button, shown while it's hidden). Tab drag-and-drop comes from `useTabDragDrop` (`hooks/use-tab-drag-drop.ts`); menu state is local.
- Persistence: `localStorage["workspaceLayout"]`, `localStorage["openFiles"]`. File saves go to the local vault through `usePaneFileActions`/`useFileSystem`.

## Dependencies
- Core: `MarkdownEditor`, `SensitiveNoteGate`, `PaneActions`, `PaneWindowActions`, `PaneToolbarButton`, `PaneTab`, `TabStripScroller`, `PaneEmptyState` (shown when no tabs are open), `TabContextMenu`, `Tooltip`, `Button`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import PaneLeaf from "./PaneLeaf";

<PaneLeaf leaf={leafNode} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| leaf | `PanelLeaf` (`app/types/workspace`) |  | Pane id, type, open tabs, active file |
