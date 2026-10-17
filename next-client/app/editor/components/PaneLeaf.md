# PaneLeaf

Description: One workspace pane. On desktop it has no toolbar: one quiet button floats at the top centre of the pane, as on mobile (`PaneTitle`: the note's name with a chevron, plus a small dot while it's unsaved, saving or failed to save). It is the way into the command palette, the center of the app: a click opens it (`useCommandPalette().open`) to switch notes or run anything (Save, Copy Markdown, Export, Pin Note, Close Pane, Settings, AI Chat, every command); a right-click opens the note's menu (Copy Markdown for the active note, Open in pane, **Pin Note** / **Unpin Note** for a note in the open vault via `atom_toggleNotePin`, Edit as Markdown for a board, Close / Close Others / Close All). It floats over the sheet's top margin, so the text starts clear of it; the pane sets `--pane-top-room` (48px) so CodeMirror keeps the caret below it and a board's own toolbar starts under it. Show sidebar is a corner button (`EditorShell`). The pane still keeps up to 20 notes open behind the one in front (`openFilePaths`), listed in the sidebar's Open Notes and reached through the palette and Ctrl/Cmd+1–9. Nothing hides on its own while you type. The editor remounts on note switches, except when the draft is saved as a file (`atom_materializedDraftPath`), so the caret and undo history survive that switch. The editor sits inside `PrivateNoteGate`, which carries the editor's key: a private note shows `PrivateNoteVeil` until it's revealed (per note or for the session), and the gate's "already shown" latch follows the editor instance. Clicking a `[[link]]` in the editor goes through `openOrCreateLink` (`useFileSystem`): a resolved link opens its note, and a missing one starts the create-from-template flow (`createNoteFromMissingLink`: the note is created at the link's own path after a confirm or the template picker; the link text is never changed).

**Boards:** when `isBoard(filePath, content)` (see `app/utils/board/`) and the path isn't in `atom_boardMarkdownPaths`, the gate's child is `BoardViewLoader` (lazy Excalidraw canvas) instead of `MarkdownEditor`; splits, the private veil and saving are unchanged. The title's menu adds **Edit as Markdown** for a board (**Open as Board** while it is shown as text) via `atom_toggleBoardMarkdown`, which lasts for the session and is not persisted.

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_openFiles`, `atom_activePaneId`, `atom_activeFilePath`, `atom_fileContent`, `atom_saveStatus`, the action atoms `atom_splitPane`/`atom_closePane`, `atom_materializedDraftPath` and `atom_saveStatus` drives the save dot. Menu state is local.
- Persistence: `localStorage["workspaceLayout"]`, `localStorage["openFiles"]`. File saves go to the local vault through `usePaneFileActions`/`useFileSystem`.

## Dependencies
- Core: `MarkdownEditor`, `board/BoardViewLoader`, `PrivateNoteGate`, `PaneTitle`, `PaneEmptyState` (shown when no note is open), `TabContextMenu`, `CommandPaletteContext`, `Button`, `react-icons`.
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
