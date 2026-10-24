# SidebarOpenNotes

Description: The sidebar's **Open Notes** section, for switching with one click: the pane's open notes (`openFilePaths`, in the order they were opened unless reordered), each by name without `.md`, set in to line up with the section title (the rows have no leading glyph to sit under the header's chevron, as the other sections' rows do). The note in front is highlighted on the editor (`aria-current="page"`; on other pages none is). A small dot marks a note that is unsaved, saving or failed to save (`statusDot`, `save-state.tsx`), and a × that shows on hover or keyboard focus (always on touch screens) closes it (`closeTabWithAutosave`, saving first). On the editor, each of the first nine notes also shows its `Ctrl/Cmd+1–9` shortcut as a small faint key hint at the row's end (`formatShortcut`; `aria-keyshortcuts` on the row), numbered by the row's place in the list. The hint gives way to the × on hover or focus and is left out on touch screens. Dragging a row up or down the list reorders the pane's notes (`atom_reorderOpenNote`), and with them the shortcut numbers, so a note can be put on the number wanted: a faint line shows where it will land, above or below the row under the pointer, and the dragged row dims. The drag carries its own type (`application/x-hermes-open-note`), so only this list takes it and the editor ignores it. From the keyboard, `Alt+↑/↓` on a row moves it one place. Reordering leaves the note in front as it was. A right-click on a row (or the menu key / Shift+F10, which opens it under the row) shows that note's menu, the same as the pane title's (`useNoteMenuItems`, rendered in `TabContextMenu`): Copy Markdown, Edit as Markdown / Open as Board for a board, Pin / Unpin Note, **Rename…** (the rename prompt) and **Move to Trash** for a vault note, then **Close**, **Close Others** and **Close All** of the pane. Renders nothing while the pane has no note open. It sits in a `SidebarSection`, so it folds and remembers being folded.

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_openFiles`, `atom_saveStatus`, `atom_reorderOpenNote` (drag / Alt+↑/↓). Local: the dragged row and its insertion point.
- Persistence: none of its own (the fold is `atom_sidebarCollapsed`).

## Dependencies
- Core: `SidebarSection`, `sidebar-classes.ts`, `usePaneFileActions`, `useNoteMenuItems`, `TabContextMenu`, `save-state.tsx`, `Button`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<SidebarOpenNotes onEditor={onWorkspace} onOpen={navigation.openOpenNote} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onEditor | `boolean` |  | On the editor route, so the note in front is highlighted |
| onOpen | `(paneId: string, path: string) => void` |  | Brings a note to the front (and back to the editor) |
