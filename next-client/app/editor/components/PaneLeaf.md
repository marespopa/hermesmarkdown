# PaneLeaf

Description: One workspace pane. It renders the tab strip (`PaneTab` tabs inside `TabStripScroller`, which adds scroll arrows at the strip's end when tabs overflow), tab context menu (right-click a tab; on a narrow header, the active tab's menu also holds Copy Markdown; a narrow pane drops Copy Markdown, then Split Right — the top-right pane, which also holds the window actions, sooner), pane actions, and a `MarkdownEditor` for the active file. Header actions come in two kinds. **Pane actions** show in every pane, focused or not, so the header never reflows when focus moves: copy, save (`SaveStateIcon` — save glyph, with a badge while unsaved, a check when just saved, an exclamation mark on error), then Split Right and Close Pane. Copy, save and split are disabled in an empty pane. **Window actions** change the whole app, so they show once, at fixed window corners: Home (vault only) in the top-left pane (`getFirstLeaf`), and `PaneWindowActions` — Edit / Preview, the metadata toggle, command palette, AI chat, settings, documentation and help — in the top-right pane (`getTopTrailingLeaf`). With one pane, that pane hosts both. **Hide toolbar** (`atom_toolbarHidden`, persisted in `localStorage["toolbarHidden"]`) slides every pane's header up under the pane's top edge (negative top margin; the pane clips it) and makes it `inert`; the top-right pane then shows a small chevron-down **Show toolbar** handle in its corner. All header icons are Heroicons outline at `PANE_ICON_SIZE`. The tab strip shows even for a single note, so one tab and many tabs look the same; header styling comes from `pane-header-classes.ts`. The command palette button replaces the old floating button. The editor remounts on tab switches, except when the draft is saved as a file (`atom_materializedDraftPath`), so the caret and undo history survive that switch.

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_openFiles`, `atom_activePaneId`, `atom_activeFilePath`, `atom_fileContent`, `atom_saveStatus`, the action atoms `atom_splitPane`/`atom_closePane`, `atom_isVoicePreviewVisible`, `atom_materializedDraftPath`, `atom_vaultHandle`, `atom_homeFeedOpen` (Home button), and `atom_toolbarHidden` (hidden header). Tab drag-and-drop comes from `useTabDragDrop` (`hooks/use-tab-drag-drop.ts`); menu state is local.
- Persistence: `localStorage["workspaceLayout"]`, `localStorage["openFiles"]`. File saves go to the local vault through `usePaneFileActions`/`useFileSystem`.

## Dependencies
- Core: `MarkdownEditor`, `PaneWindowActions`, `PaneTab`, `TabStripScroller`, `PaneEmptyState` (shown when no tabs are open), `TabContextMenu`, `Tooltip`, `Button`, `react-icons`.
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
