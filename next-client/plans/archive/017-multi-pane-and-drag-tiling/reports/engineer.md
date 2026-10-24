# Engineer report: 017 multi-pane and drag tiling (all 4 phases)

## Built
- Model/migration: `app/types/workspace.ts` (PaneType, DockZone, version, scrollLock), `app/atoms/layout-normalize.ts`, `workspace-atoms.ts` (migration calls the normalizer, default `version: 2`), `layout-tree.ts`.
- Divider sizes: `WorkspaceSplitter.tsx` `SplitGroup` (string `"N%"` sizes, `minSize="10%"`, `onLayoutChanged` -> `atom_setSplitSizes`).
- Actions: `layout-actions.ts` (splitPane options, setSplitSizes, setPaneType, toggleScrollLock), `dock-actions.ts`, `pane-drag-atoms.ts`, re-exports in `atoms.ts`.
- Drag to dock: `utils/dock-zone.ts`, `hooks/use-pane-drop.ts`, `hooks/use-pane-drag-reset.ts` (called in `page.tsx`), `PaneDropLayer.tsx`, grip in `PaneTitle.tsx`/`PaneLeaf.tsx`, sources in `vault-tree/use-tree-actions.ts` and `sidebar/SidebarOpenNotes.tsx`.
- Scroll lock: `utils/scroll-sync.ts`, `hooks/use-scroll-lock.ts`, lock button in `PaneTitle`, `components/pane-header-classes.ts` (PANE_TOP_ROOM).
- Preview: `MarkdownEditor.tsx` `readOnly` + `hooks/use-active-editor-view.ts` (file 401 -> 378 lines), `extensions.ts` `EditorState.readOnly`, PaneLeaf preview branch/badge/mobile fallback.
- Commands/menu: `editor-commands/pane-layout-commands.ts` (+ context, build order), `use-note-menu-items.tsx`.

## Tests/docs
- New: layout-normalize, layout-tree, dock-actions, dock-zone, scroll-sync, use-scroll-lock, use-pane-drop, PaneDropLayer, WorkspaceSplitter, SidebarOpenNotes, PaneLeaf.panes tests.
- Extended: layout-actions, PaneTitle, VaultFileTree, build-editor-commands (incl. command order list), MarkdownEditor, extensions.
- Docs: component .md files (WorkspaceSplitter, PaneLeaf, PaneTitle, PaneDropLayer new, MarkdownEditor, SidebarOpenNotes, TreeNodes, FileRow), READMEs (components, editor, editor-commands, atoms), ARCHITECTURE.md, in-app docs `editor-workspace.tsx`.

## Decisions
- Deviation (Tests): PaneLeaf cases are in new `PaneLeaf.panes.test.tsx` because `PaneLeaf.test.tsx` renders the real MarkdownEditor and the PRD wants a mocked one.
- Deviation (Components): `useScrollLock` takes `activeIndex: 0|1` instead of `activePaneId`.
- Deviation (Drag sources): `TreeNodes.tsx` does not clear the payload itself; the window `dragend` reset does.
- `atom_setSplitSizes` ignores unchanged/invalid sizes (the group reports on mount).
- `insertLeafAt` drops the parent's `scrollLock` (its side is a split now).
- Normalizer keeps sizes as-is when they already sum to 100 (avoids float churn).

## Not done / open
- Nothing deferred. Open PRD questions (read-only preview wanted, ratio-only sync for different notes, move vs copy for Open Notes) were built as specified.

## To verify
- `corepack yarn tsc --noEmit` and `corepack yarn vitest run app/atoms app/editor` (not run here).
- Likeliest CI failures: `build-editor-commands.test.ts` command-order list and mock context; `PaneLeaf.test.tsx` (now mounts `PaneDropLayer` -> `useFileSystem`/`useDialog`); `VaultFileTree.test.tsx` (mocks `useAtomValue`); `use-scroll-lock.test.tsx` jsdom scroll stubs.
- Manually: drag file/Open Notes row/grip to edges and centers; divider 70/30 survives reload; Open Preview to the Side scrolls with the editor; lock icon unlocks.

## Run 2
- Fixed PaneDropLayer.test drop coordinates (createEvent + defineProperty); atom_splitPane drops a stale parent scrollLock; atom_setSplitSizes ignores sizes containing <=0. Not run.
