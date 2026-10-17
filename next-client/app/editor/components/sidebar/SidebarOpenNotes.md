# SidebarOpenNotes

Description: The sidebar's **Open Notes** section, for switching with one click: the focused pane's open notes (`openFilePaths`, in the order they were opened; the first pane when none has focus), each by name without `.md`. The note in front is highlighted on the editor (`aria-current="page"`; on other pages none is). A small dot marks a note that is unsaved, saving or failed to save (`statusDot`, `save-state.tsx`), and a × that shows on hover or keyboard focus (always on touch screens) closes it (`closeTabWithAutosave`, saving first). On the editor, each of the first nine notes also shows its `Ctrl/Cmd+1–9` shortcut as a small faint key hint at the row's end (`formatShortcut`; `aria-keyshortcuts` on the row), numbered as the shortcut counts them: across every pane's notes (`atom_workspaceTabs`), so a second pane's start after the first's. The hint gives way to the × on hover or focus and is left out on touch screens. A right-click on a row (or the menu key / Shift+F10, which opens it under the row) shows that note's menu, the same as the pane title's (`useNoteMenuItems`, rendered in `TabContextMenu`): Copy Markdown, Open in pane, Edit as Markdown / Open as Board for a board, Pin / Unpin Note, **Rename…** (the rename prompt) and **Move to Trash** for a vault note, then **Close**, **Close Others** and **Close All** of the pane. Renders nothing while the pane has no note open. It sits in a `SidebarSection`, so it folds and remembers being folded.

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_activePaneId`, `atom_openFiles`, `atom_saveStatus`, `atom_workspaceTabs` (the shortcut numbers).
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
| onOpen | `(paneId: string, path: string) => void` |  | Brings a note to the front of its pane (and back to the editor) |
