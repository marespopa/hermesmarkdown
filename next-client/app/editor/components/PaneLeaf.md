# PaneLeaf

Description: One workspace pane. It renders the tab strip (`PaneTab` tabs inside `TabStripScroller`, which adds scroll arrows at the strip's end when tabs overflow), tab context menu (right-click a tab; on a narrow header, the active tab's menu also holds Copy Markdown), pane actions (home feed on the far left; on the right, in three groups split by dividers: app-wide — command palette, AI chat when a key is set, settings (opens `/editor/settings`); this file — the Edit / Preview switch (`PaneModeSwitch`, always icon-only, set apart by a divider on each side), copy, save (floppy-disk icon, colored by save state); this pane — split and close), and a `MarkdownEditor` for the active file. The tab strip shows even for a single note, so one tab and many tabs look the same; header styling comes from `pane-header-classes.ts`. The command palette button replaces the old floating button. The editor remounts on tab switches, except when the draft is saved as a file (`atom_materializedDraftPath`), so the caret and undo history survive that switch.

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_openFiles`, `atom_activePaneId`, `atom_activeFilePath`, `atom_fileContent`, `atom_saveStatus`, the action atoms `atom_splitPane`/`atom_closePane`, `atom_isVoicePreviewVisible`, `atom_materializedDraftPath`, `atom_vaultHandle`, and `atom_homeFeedOpen` (Home button). Tab drag-and-drop comes from `useTabDragDrop` (`hooks/use-tab-drag-drop.ts`); menu state is local.
- Persistence: `localStorage["workspaceLayout"]`, `localStorage["openFiles"]`. File saves go to the local vault through `usePaneFileActions`/`useFileSystem`.

## Dependencies
- Core: `MarkdownEditor`, `PaneModeSwitch`, `PaneTab`, `TabStripScroller`, `PaneEmptyState` (shown when no tabs are open), `TabContextMenu`, `Tooltip`, `Button`, `react-icons`.
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
