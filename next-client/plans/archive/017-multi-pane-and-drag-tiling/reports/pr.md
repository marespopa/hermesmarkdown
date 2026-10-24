## Multi-pane drag tiling, preview panes and scroll lock
- Drag a Files row, an Open Notes row or a pane's grip onto a pane's edge (split) or center (open there); a faint zone preview shows only while dragging.
- **Open Preview to the Side**, **Show Pane as Preview/Editor**, and **Lock Scroll With Other Pane** (palette and note menu); a lock icon in both titles unlocks.
- Divider sizes now persist as percentages and restore on reload (fixes pixel-vs-percent `defaultSize` in react-resizable-panels v4).
- `workspaceLayout` is versioned (`version: 2`); `layout-normalize.ts` migrates older layouts once, so preview leaves survive reloads.
- Drag state lives in the ephemeral `atom_paneDrag`; `MarkdownEditor` gained `readOnly` and its active-view registration moved to `use-active-editor-view.ts`.
