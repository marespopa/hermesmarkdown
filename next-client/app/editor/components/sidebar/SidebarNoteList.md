# SidebarNoteList

Description: A list of notes by display title for the sidebar's **Pinned** and **Recent** sections. The current note gets `aria-current`; a short label (e.g. "Yesterday") can sit at the trailing edge; an optional right-click menu per row (Pin / Unpin) uses `TabContextMenu`. Sensitive notes get no title tooltip. Also exports the sidebar item classes (`SIDEBAR_ITEM_CLASS`, `…_CURRENT_CLASS`, `…_IDLE_CLASS`) shared with other sidebar rows. Items usually come from `useSidebarNotes` (editor hooks), which goes through `atom_noteDisplayItems` so Privacy Mode applies.

## Local State & Storage
- State: the open context menu (local).
- Persistence: None.

## Dependencies
- Core: `Button`, `TabContextMenu`, `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<SidebarNoteList items={recent} currentPath={currentNotePath} onOpen={openNote}
  menuItems={(path) => [{ label: "Pin", onClick: () => togglePinned(path) }]} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| items | `SidebarNoteItem[]` | | `{ path, title, meta?, isSensitive? }` |
| currentPath | `string \| null` | | Marks the current row |
| onOpen | `(path: string) => void` | | Row click |
| menuItems? | `(path) => TabContextMenuItem[]` | | Right-click menu |
| emptyText? | `string` | | Shown when there are no items |
| icon? | `ReactNode` | document icon | Leading icon |
