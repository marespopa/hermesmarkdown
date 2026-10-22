# Architect report — 017 multi-pane and drag tiling

## Run 1

**PRD:** `next-client/plans/017-multi-pane-and-drag-tiling/prd.md`

### Summary (4 phases)
- **Phase 1, layout model:** versioned layout with a normalizing migration (old layouts still load), pure tree helpers (`layout-tree.ts`), and new split options. It also fixes divider sizes: `WorkspaceSplitter` passed numbers that v4 reads as **pixels**, and never saved drags. Sizes become `"N%"` strings and are saved through `onLayoutChanged`.
- **Phase 2, drag to dock:** the drag sources are Files tree file rows, Open Notes rows and a hover-only pane grip. An ephemeral `atom_paneDrag` triggers a `PaneDropLayer` on each pane with top/bottom/left/right/center zones. `dock-actions.ts` handles notes and pane relocation, and `use-pane-drop.ts` opens dropped files from disk.
- **Phase 3, scroll lock:** a per-split `scrollLock` flag between two panes. The same note on both sides syncs by document line; different notes sync by ratio. A loop guard prevents echo. The toggle is in the palette and the note menu, and a lock glyph in the title shows it is on.
- **Phase 4, preview panes:** a `"preview"` leaf type that renders the same `MarkdownEditor` read-only (marks hidden because it is never focused). It comes with Open Preview to the Side (scroll lock on) and Show Pane as Preview/Editor. `MarkdownEditor.tsx` (401 lines) gets an extraction first.

### Already exists
- A persisted split tree (`atom_workspaceLayout`).
- Split Right/Down, Close Pane, Focus Next/Previous, and the note menu's "Open in pane".
- Resizable dividers (`react-resizable-panels` 4.11.2).
- HTML5 drag on Files tree rows and Open Notes rows.
- Live sync of the same note across panes (shared `atom_fileContent`, `use-codemirror-editor.ts:232`).
- Syntax hidden in unfocused editors.

### Decisions / open questions to look at before handoff
- **Preview comeback:** the app-wide Preview mode was removed on purpose. This brings back a *per-pane* read-only preview because the brief asks for preview leaves. The legacy migration that turns `"preview"` leaves into editors is now gated by `version: 2`. If preview isn't wanted, drop Phase 4.
- **Open Notes drag moves** the note (it copies when it's the pane's last note). File-row drags open (copy). A pane grip center drop merges and closes the dragged pane.
- **Splits stay binary.** Scroll lock is only offered when both sides of a split are single panes.
- **Different notes sync by ratio.** Heading-text anchors between different notes are deferred.
- The lock toggle is in the title, palette and menu, **not on the divider**: the v4 separator captures pointerdown.
- The storage key stays `"workspaceLayout"` (no `hermes_` rename) so existing layouts load.

### Handoff
`Implement next-client/plans/017-multi-pane-and-drag-tiling/prd.md, phase 1` (then phases 2, 3, 4 in order; each ships on its own).
