# SidebarOpenNotes

Description: The sidebar's **Open Notes** section, for switching with one click: the focused pane's open notes (`openFilePaths`, in the order they were opened; the first pane when none has focus), each by name without `.md`. The note in front is highlighted on the editor (`aria-current="page"`; on other pages none is). A small dot marks a note that is unsaved, saving or failed to save (`statusDot`, `save-state.tsx`), and a × that shows on hover or keyboard focus (always on touch screens) closes it (`closeTabWithAutosave`, saving first). Renders nothing while the pane has no note open. It sits in a `SidebarSection`, so it folds and remembers being folded.

## Local State & Storage
- State: `atom_workspaceLayout`, `atom_activePaneId`, `atom_openFiles`, `atom_saveStatus`.
- Persistence: none of its own (the fold is `atom_sidebarCollapsed`).

## Dependencies
- Core: `SidebarSection`, `sidebar-classes.ts`, `usePaneFileActions`, `save-state.tsx`, `Button`.
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
