# PaneDropLayer

A transparent layer (`absolute inset-0 z-30`) over a pane, mounted by `PaneLeaf` on desktop. It renders only while `atom_paneDrag` holds a payload, and not over the pane being dragged by its own grip.

- The pointer picks a zone with `dockZoneAt` (edge bands: outer 25%, at most 96px, nearest wins; the rest is center). A translucent box (`dockPreviewRect`) shows where the note will land; nothing is drawn until the pointer is over the pane, and leaving clears it.
- `drop` calls `usePaneDrop()(paneId, zone)`, which runs the dock (edge = split, center = open here) and clears the payload. Esc or a drop elsewhere ends the drag; `usePaneDragReset` clears the payload on any `dragend`.
- The layer sits above CodeMirror, so the editor never sees the drop.
- Props: `paneId`. Colors are tokens only (`border-fg-faint`, black/white at low alpha).
