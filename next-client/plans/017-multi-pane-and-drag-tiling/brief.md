---
state: new
size: normal
kind: feature
blocked_from:
rejections: 0
created: 2026-10-22T11:20:26Z
---

# Multi-pane and drag tiling: (1) Upgrade the layout system to support fle

## Desired behavior
Multi-pane and drag tiling: (1) Upgrade the layout system to support flexible grid splitting (horizontal and vertical dock zones). (2) Pointer drag-and-drop to split notes into independent panes. (3) Synchronized scroll lock between two active text views, or between a note and a preview. Context: the editor is palette-centered and minimal with no tab strip (since 2026-10-17), so drag sources must fit that; split panes partly exist already (atom_workspaceLayout).

## Product notes (added 2026-10-22)

Reference point: focus-first writing apps offer only note + synced live preview side by side; this feature goes further, but should stay as quiet as the rest of the editor.

- **Layout tree.** Panes form a docking tree: split containers (horizontal or vertical) with draggable dividers, leaves are editor or preview panes. `atom_workspaceLayout` (`app/atoms/workspace-atoms.ts`, `layout-actions.ts`) already holds a container tree persisted to local storage. Extend it rather than replace it.
- **Drag to dock.** While a drag is in progress, overlay drop zones on the target pane: top, bottom, left, right (split) and center (open in that pane). Dropping on an edge splits the pane and makes the new leaf active. There is no tab strip (since 2026-10-17), so the drag source can't be a tab. Candidates: library/sidebar file rows, Open Notes entries, a pane's own drag handle. The architect picks.
- **Scroll lock.** A per-split toggle. While it is on, scrolling pane A sets pane B's scroll by ratio `scrollTop / (scrollHeight - clientHeight)`, or by matching heading/block anchors where both sides have them (note ↔ preview should use anchors). Guard against feedback loops between the two panes.
- **Persistence.** The tree, open file paths, split percentages (e.g. 50/50, 70/30) and scroll-lock toggles all persist, and the workspace restores on reload. Existing stored layouts must still load.

## Out of scope
Anything the request doesn't ask for.
