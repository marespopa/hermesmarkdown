# PaneLeaf

Description: One workspace pane. On desktop it has no toolbar: a quiet header floats at the pane's top left (`PaneTitle`: the note's folder as a breadcrumb, its name, plus a small dot while it's unsaved, saving or failed to save), clear of the Show sidebar corner button while the sidebar is hidden and of the palette button on the right. Once the note is scrolled down (caught with `onScrollCapture` from its vertical scroller), a solid `--surface` band as tall as the top room (48px) then a 16px fade to transparent sits behind it, so scrolled text never shows through the title; at the top of the note there is none, so the Properties panel at the start isn't covered. A click on the name renames the note in place (`renameFile` from `useFileSystem` with the note's live handle, `atom_liveHandles`; only for a vault note, not the draft); a right-click opens the note's menu (Copy Markdown for the active note, Open in pane, **Pin Note** / **Unpin Note** for a note in the open vault via `atom_toggleNotePin`, Edit as Markdown for a board, Close / Close Others / Close All). The command palette is opened from the window's top-right button (`EditorShell`) or Ctrl/Cmd+K. The header floats over the sheet's top margin, so the text starts clear of it; the pane sets `--pane-top-room` (48px) so CodeMirror keeps the caret below it and a board's own toolbar starts under it. The pane still keeps up to 20 notes open behind the one in front (`openFilePaths`), listed in the sidebar's Open Notes and reached through the palette and Ctrl/Cmd+1–9. Nothing hides on its own while you type. The editor remounts on note switches, except when the draft is saved as a file (`atom_materializedDraftPath`), so the caret and undo history survive that switch. The editor sits inside `PrivateNoteGate`, which carries the editor's key: a private note shows `PrivateNoteVeil` until it's revealed (per note or for the session), and the gate's "already shown" latch follows the editor instance. Clicking a `[[link]]` in the editor goes through `openOrCreateLink` (`useFileSystem`): a resolved link opens its note, and a missing one starts the create-from-template flow (`createNoteFromMissingLink`: the note is created at the link's own path after a confirm or the template picker; the link text is never changed).

**Boards:** when `isBoard(filePath, content)` (see `app/utils/board/`) and the path isn't in `atom_boardMarkdownPaths`, the gate's child is `BoardViewLoader` (lazy Excalidraw canvas) instead of `MarkdownEditor`; splits, the private veil and saving are unchanged. The title's menu adds **Edit as Markdown** for a board (**Open as Board** while it is shown as text) via `atom_toggleBoardMarkdown`, which lasts for the session and is not persisted.

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_openFiles`, `atom_activePaneId`, `atom_activeFilePath`, `atom_fileContent`, `atom_saveStatus`, the action atoms `atom_splitPane`/`atom_closePane`, `atom_materializedDraftPath` and `atom_saveStatus` drives the save dot. Menu state is local.
- Persistence: `localStorage["workspaceLayout"]`, `localStorage["openFiles"]`. File saves go to the local vault through `usePaneFileActions`/`useFileSystem`.

## Dependencies
- Core: `MarkdownEditor`, `board/BoardViewLoader`, `PrivateNoteGate`, `PaneTitle`, `PaneEmptyState` (shown when no note is open), `TabContextMenu`, `useFileSystem` (`renameFile`), `Button`, `react-icons`.
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
