# PaneLeaf

Description: One workspace pane. On desktop its header is the window's toolbar, following Apple's toolbar layout: navigation on the left, the tabs in the middle, actions on the right. Window-wide controls sit at fixed window corners rather than following focus: the **Sidebar** button that shows and hides `WorkspaceSidebar` (Ctrl/Cmd+Alt+S) at the far left of the top-left pane, always shown, as in a code editor's title bar — a Codicon (`react-icons/vsc`) panel glyph, filled while the sidebar is open, with `aria-pressed` (`getFirstLeaf`; Home lives in the sidebar, not the toolbar), and `PaneWindowActions` (Mode, Metadata, Tools, More menu) in the top-right pane (`getTopTrailingLeaf`); with one pane, that pane hosts both. **Pane actions** (`PaneActions`: Save, and Close Pane in a split) show in every pane, focused or not, so the header never reflows when focus moves. Sections are borderless capsules on a subtle translucent fill, set apart by space. The tab strip (`PaneTab` tabs inside `TabStripScroller`, with scroll arrows when tabs overflow) shows even for a single note; tabs run edge-to-edge at full header height, and the header's bottom line is an `::after` hairline (`PANE_HEADER_CLASS`) the active tab covers to join the editor. **Toolbar style** (`atom_toolbarDisplayMode`): Icon Only, or Icon and Text (labels under icons, taller header); a header narrower than `LABELS_MIN_WIDTH` (or `LABELS_MIN_WIDTH_WITH_WINDOW_ACTIONS` in the top-right pane) falls back to icons. `PaneLeaf` passes the effective style to its buttons through `ToolbarModeContext`. Right-clicking the toolbar opens its context menu (Icon Only / Icon and Text, Hide Toolbar). Right-clicking a tab opens the tab menu (Copy Markdown for the active tab, Open in pane, close actions). **Hide toolbar** (`atom_toolbarHidden`, persisted in `localStorage["toolbarHidden"]`) slides every pane's header up under the pane's top edge (negative top margin matching the header height; the pane clips it) and makes it `inert`; the top-right pane then shows a small chevron-down **Show toolbar** handle in its corner. Header icons are Heroicons outline at `PANE_ICON_SIZE` (the Sidebar button's Codicon aside); header styling comes from `pane-header-classes.ts`. The editor remounts on tab switches, except when the draft is saved as a file (`atom_materializedDraftPath`), so the caret and undo history survive that switch. The editor sits inside `SensitiveNoteGate`, which carries the editor's key: a sensitive note shows `SensitiveNoteVeil` until it's revealed (per note or for the session), and the gate's "already shown" latch follows the editor instance.

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_openFiles`, `atom_activePaneId`, `atom_activeFilePath`, `atom_fileContent`, `atom_saveStatus`, the action atoms `atom_splitPane`/`atom_closePane`, `atom_isVoicePreviewVisible`, `atom_materializedDraftPath`, `atom_toolbarHidden` (hidden header), `atom_toolbarDisplayMode` (toolbar style) and `atom_sidebarOpen` (Sidebar button). Tab drag-and-drop comes from `useTabDragDrop` (`hooks/use-tab-drag-drop.ts`); menu state is local.
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
