# PaneLeaf

Description: The workspace's one pane. On desktop it has no toolbar: a quiet header floats at the pane's top left (`PaneTitle`: the note's folder as a breadcrumb led by the vault's root (`atom_vaultName`; alone when no note is open, so the vault can be browsed from an empty pane; with no vault, a "No vault" crumb whose menu is the vault switcher, `useVaultMenuItems`; the root's popover lists the same switcher, then Close Vault, confirmed as the palette's is), the middle of a deep one folded, each folder opening a `FolderPopover` of its contents with a vault open (a note picked there opens here; its New Note and New Folder create in that folder through `createNewFile` / `createFolder` with the folder's handle, `resolveDirectory` in `hooks/file-system/vault-scan.ts`, so there's no picker or prompt; its Show in Files is `atom_showFolderInFiles`), its name, then a dot while it's unsaved, saving or failed to save (hover shows the save glyph); with autosave on (`atom_autosaveMode` "afterDelay") the unsaved and saving dot stays hidden through autosave's wait, `AUTOSAVE_DELAY` plus a 1s grace restarted by every edit, so it shows only for a late save, while a failed save always shows; a click on it sets `atom_saveRequested`, which the editor page answers with its Save, as Ctrl/Cmd+S), clear of the Show sidebar corner button while the sidebar is hidden and of Copy Markdown and the `SearchPill` on the right (`EDITOR_CORNER_WIDTH` + 3rem). Once the note is scrolled down (caught with `onScrollCapture` from its vertical scroller), a solid `--surface` band as tall as the top room (48px) then a 16px fade to transparent sits behind it, so scrolled text never shows through the title; at the top of the note there is none, so the frontmatter panel at the start isn't covered. A click on the name (the menu then opens under it, and a second press closes it), or a right-click on the header, opens the note's menu, the same one the sidebar's Open Notes opens (`useNoteMenuItems`, `hooks/use-note-menu-items.tsx`), led here by **Save** (Ctrl/Cmd+S; requests the save, as the dot does; disabled while saving), which only the title's menu has since it always belongs to the note in front: Copy Markdown, Edit as Markdown / Open as Board for a board, **Pin Note** / **Unpin Note**, **Rename** and **Move to Trash** for a note in the open vault (here Rename turns the title into a field in place, `renameRequest`, sent to `renameFile` from `useFileSystem` with the note's live handle, `atom_liveHandles`; elsewhere it's **Rename…**, a prompt), then Close / Close Others / Close All. The command palette is opened from the window's top-right `SearchPill` (`EditorShell`) or Ctrl/Cmd+K. The header floats over the sheet's top margin, so the text starts clear of it; the pane sets `--pane-top-room` (48px) so CodeMirror keeps the caret below it and a board's own toolbar starts under it. The pane still keeps up to 20 notes open behind the one in front (`openFilePaths`), listed in the sidebar's Open Notes and reached through the palette and Ctrl/Cmd+1–9. Nothing hides on its own while you type. The editor remounts on note switches, except when the draft is saved as a file (`atom_materializedDraftPath`), so the caret and undo history survive that switch. The editor sits inside `PrivateNoteGate`, which carries the editor's key: a private note shows `PrivateNoteVeil` until it's revealed (per note or for the session), and the gate's "already shown" latch follows the editor instance. Clicking a `[[link]]` in the editor goes through `openOrCreateLink` (`useFileSystem`): a resolved link opens its note, and a missing one starts the create-from-template flow (`createNoteFromMissingLink`: the note is created at the link's own path after a confirm or the template picker; the link text is never changed). A Markdown link to a path, `[Editor](./app/editor/README.md)`, goes through `openFileLink` with the note's path: the file it names, read from the note's folder, opens; a path not in the vault shows a toast and creates nothing.

**Boards:** when `isBoard(filePath, content)` (see `app/utils/board/`) and the path isn't in `atom_boardMarkdownPaths`, the gate's child is `BoardViewLoader` (lazy Excalidraw canvas) instead of `MarkdownEditor`; the private veil and saving are unchanged. The title's menu adds **Edit as Markdown** for a board (**Open as Board** while it is shown as text) via `atom_toggleBoardMarkdown`, which lasts for the session and is not persisted.

The title's left inset animates with the library on the layout timing (`duration-layout ease-layout`, off under reduced motion).

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_openFiles`, `atom_activeFilePath`, `atom_fileContent`, `atom_saveStatus`, `atom_materializedDraftPath` and `atom_saveStatus` drives the title's save state; `atom_saveRequested` (set). Menu state is local.
- Persistence: `localStorage["workspaceLayout"]`, `localStorage["openFiles"]`. File saves go to the local vault through `usePaneFileActions`/`useFileSystem`.

## Dependencies
- Core: `MarkdownEditor`, `board/BoardViewLoader`, `PrivateNoteGate`, `PaneTitle`, `FolderPopover`, `PaneEmptyState` (shown when no note is open), `TabContextMenu`, `useFileSystem` (`renameFile`, `openFile`), `Button`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import PaneLeaf from "./PaneLeaf";

<PaneLeaf leaf={leafNode} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| leaf | `PanelLeaf` (`app/types/workspace`) |  | Pane id, open tabs, active file |

`PANE_TOP_ROOM` lives in `pane-header-classes.ts`.
