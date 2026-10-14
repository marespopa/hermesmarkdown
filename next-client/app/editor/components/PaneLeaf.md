# PaneLeaf

Description: One workspace pane. On desktop its header is the window's toolbar, following Apple's toolbar layout: navigation on the left, the tabs in the middle, actions on the right. Window-wide controls sit at fixed window corners rather than following focus: the **Sidebar** button that shows `WorkspaceSidebar` (tooltip "Show sidebar", Ctrl/Cmd+Alt+S) at the far left of the top-left pane, only while the sidebar is hidden — once open, the sidebar's own header carries the hide button — a Codicon (`react-icons/vsc`) panel glyph (`getFirstLeaf`; Home lives in the sidebar, not the toolbar), and `PaneWindowActions` (Mode, Tools, More menu) in the top-right pane (`getTopTrailingLeaf`); with one pane, that pane hosts both. **Pane actions** (`PaneActions`: Save, and Close Pane in a split) show in every pane, focused or not, so the header never reflows when focus moves. Sections are borderless capsules on a subtle translucent fill, set apart by space. The tab strip (`PaneTab` tabs inside `TabStripScroller`, with scroll arrows when tabs overflow) shows even for a single note; tabs are rounded pills on the header's chrome, and the header closes with a hairline (`PANE_HEADER_CLASS`); the editor below is its own paper panel. The header floats over the pane (absolutely positioned, frosted glass `.glass-bar`): the pane sets `--pane-header-inset` (`PANE_HEADER_INSET`, the header's 44px), which the editor's scroller uses as top padding and scroll padding so the sheet starts below the header and scrolls under its glass (other content takes the inset as padding here); showing or fading the header never reflows the text. In a pane on the window's leading edge (`isOnLeadingEdge`), the header starts at `--sidebar-inset` (set by `page.tsx`: the sidebar's width while it's open), so the floating sidebar never covers the tabs; only the header moves, never the text. Toolbar buttons are icon-only, with the name in a tooltip. Right-clicking a tab opens the tab menu (Copy Markdown for the active tab, Open in pane, **Pin to Home** / **Unpin from Home** for a note in the open vault via `atom_toggleHomePin` (not for the draft), close actions). The header carries `.typing-chrome`, so it fades while you type when the Focus setting hides the interface (`useFadeChromeWhileTyping`); the pane itself carries `.typing-page`, so behind the faded header it takes the sheet's paper and the window reads as one page. Header icons are Heroicons outline at `PANE_ICON_SIZE` (the Sidebar button's Codicon aside); header styling comes from `pane-header-classes.ts`. The editor remounts on tab switches, except when the draft is saved as a file (`atom_materializedDraftPath`), so the caret and undo history survive that switch. The editor sits inside `PrivateNoteGate`, which carries the editor's key: a private note shows `PrivateNoteVeil` until it's revealed (per note or for the session), and the gate's "already shown" latch follows the editor instance. Clicking a `[[link]]` in the editor goes through `openOrCreateLink` (`useFileSystem`): a resolved link opens its note, and a missing one starts the create-from-template flow (`createNoteFromMissingLink`: the note is created at the link's own path after a confirm or the template picker; the link text is never changed).

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_openFiles`, `atom_activePaneId`, `atom_activeFilePath`, `atom_fileContent`, `atom_saveStatus`, the action atoms `atom_splitPane`/`atom_closePane`, `atom_materializedDraftPath` and `atom_sidebarOpen` (Sidebar button, shown while it's hidden). Tab drag-and-drop comes from `useTabDragDrop` (`hooks/use-tab-drag-drop.ts`); menu state is local.
- Persistence: `localStorage["workspaceLayout"]`, `localStorage["openFiles"]`. File saves go to the local vault through `usePaneFileActions`/`useFileSystem`.

## Dependencies
- Core: `MarkdownEditor`, `PrivateNoteGate`, `PaneActions`, `PaneWindowActions`, `PaneToolbarButton`, `PaneTab`, `TabStripScroller`, `PaneEmptyState` (shown when no tabs are open), `TabContextMenu`, `Tooltip`, `Button`, `react-icons`.
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
