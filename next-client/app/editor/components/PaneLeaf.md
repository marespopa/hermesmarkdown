# PaneLeaf

Description: One workspace pane. On desktop its header is a quiet title bar, not a tab strip: the **Sidebar** button at the left while the sidebar is hidden (top-left pane only, `getFirstLeaf`), the note's title in the middle (`PaneTitle`: its name, plus a small dot while it's unsaved, saving or failed to save), and at the right **Close Pane** while the window is split and, in the top-right pane only (`getTopTrailingLeaf`), the window's own controls (`PaneWindowActions`: AI Chat, More, Hide toolbar). The title is the way into the command palette, the center of the app: a click opens it (`useCommandPalette().open`) to switch notes or run anything; a right-click opens the note's menu (Copy Markdown for the active note, Open in pane, **Pin Note** / **Unpin Note** for a note in the open vault via `atom_toggleNotePin`, Edit as Markdown for a board, Close / Close Others / Close All). The pane still keeps up to 20 notes open behind the one in front (`openFilePaths`), reached through the palette and Ctrl/Cmd+1–9; nothing about them is drawn. Save is Ctrl/Cmd+S and the palette's command; the title's dot shows the state. The header floats over the pane: the pane sets `--pane-header-inset` (`PANE_HEADER_INSET`, the header's 44px), which the editor's scroller uses as top padding and scroll padding so the sheet starts below it (other content takes the inset as padding here). The toolbar shows unless you hide it (`atom_toolbarVisible`, remembered: **Hide toolbar**, Ctrl/Cmd+Shift+\\ or **Toggle Toolbar**); hidden, the pane drops the header and its inset so the text takes the room, and the top-right pane shows **Show toolbar** in that corner. Nothing hides on its own while you type. Header styling comes from `pane-header-classes.ts`. The editor remounts on note switches, except when the draft is saved as a file (`atom_materializedDraftPath`), so the caret and undo history survive that switch. The editor sits inside `PrivateNoteGate`, which carries the editor's key: a private note shows `PrivateNoteVeil` until it's revealed (per note or for the session), and the gate's "already shown" latch follows the editor instance. Clicking a `[[link]]` in the editor goes through `openOrCreateLink` (`useFileSystem`): a resolved link opens its note, and a missing one starts the create-from-template flow (`createNoteFromMissingLink`: the note is created at the link's own path after a confirm or the template picker; the link text is never changed).

**Boards:** when `isBoard(filePath, content)` (see `app/utils/board/`) and the path isn't in `atom_boardMarkdownPaths`, the gate's child is `BoardViewLoader` (lazy Excalidraw canvas) instead of `MarkdownEditor`; splits, the private veil and saving are unchanged. The title's menu adds **Edit as Markdown** for a board (**Open as Board** while it is shown as text) via `atom_toggleBoardMarkdown`, which lasts for the session and is not persisted.

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_openFiles`, `atom_activePaneId`, `atom_activeFilePath`, `atom_fileContent`, `atom_saveStatus`, the action atoms `atom_splitPane`/`atom_closePane`, `atom_materializedDraftPath` and `atom_sidebarOpen` (Sidebar button, shown while it's hidden), `atom_toolbarVisible`. Menu state is local.
- Persistence: `localStorage["workspaceLayout"]`, `localStorage["openFiles"]`. File saves go to the local vault through `usePaneFileActions`/`useFileSystem`.

## Dependencies
- Core: `MarkdownEditor`, `board/BoardViewLoader`, `PrivateNoteGate`, `PaneTitle`, `PaneWindowActions`, `PaneToolbarButton`, `PaneEmptyState` (shown when no note is open), `TabContextMenu`, `CommandPaletteContext`, `Button`, `react-icons`.
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
