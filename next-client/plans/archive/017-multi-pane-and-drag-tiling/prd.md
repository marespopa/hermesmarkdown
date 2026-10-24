# Multi-pane and drag tiling — engineering PRD

## Context
Source: [brief.md](brief.md). Panes form a docking tree of horizontal and vertical splits with draggable dividers. Notes are dragged onto a pane's edge to split it, or onto its center to open there. A per-split **scroll lock** keeps two panes scrolled together, including a note and a read-only **preview** of it. The tree, open notes, divider sizes and lock toggles survive a reload, and older stored layouts still load. It must stay as quiet as the rest of the editor: there is no tab strip, and there is no new chrome until a drag or a lock is in progress.

What already exists:
1. **Layout tree.** `app/types/workspace.ts` defines `PanelLeaf` (`type: "editor" | "metrics"`, `openFilePaths`, `activeFilePath`, `recentFilePaths?`, `isPinned`) and `WorkspaceContainer` (`direction`, `sizes`, `children`). `app/atoms/workspace-atoms.ts:36` persists it as `atom_workspaceLayout` (localStorage key `"workspaceLayout"`, no `getOnInit`). Pure helpers live in `app/atoms/utils.ts` (`findLeaf`, `updateLeaf`, `getFirstLeaf`, `removePathsFromLayout`, `remapPathsInLayout`, `generateId`). Leaf vs container is told apart with `"type" in node` everywhere.
2. **Split actions.** `app/atoms/layout-actions.ts`: `atom_splitPane` (:31) always replaces the leaf with a 2-child container (new leaf **after** the source, `sizes: [50, 50]`, copies the leaf's `type`, **moves** `filePath` out of the source). `atom_closePane` (:94) collapses 1-child containers, so trees built in-app are binary. `atom_moveTab` (:182) and `atom_reorderOpenNote` (:164) also live here. The palette has **Split Pane Right** / **Split Pane Down**, **Close Pane** and **Focus Next/Previous Pane** (`app/editor/components/editor-commands/workspace-task-view-commands.ts:57,148,178`). The note menu has **Open in pane** (`app/editor/hooks/use-note-menu-items.tsx:47`).
3. **Rendering.** `app/editor/components/WorkspaceSplitter.tsx` renders the tree with `react-resizable-panels` **4.11.2** (`Group`, `Panel`, `Separator`). `app/editor/page.tsx:288-292` renders the splitter on desktop and only the active leaf on mobile ("No split panes on mobile", :59).
4. **Broken: divider sizes.** `WorkspaceSplitter.tsx:23` passes `defaultSize={node.sizes[index]}` as a **number**, and in v4 numbers mean **pixels** (`node_modules/react-resizable-panels/README.md:170`: "Numeric values are assumed to be pixels. Strings without explicit units are assumed to be percentages"). Nothing writes dragged sizes back to the tree either (no `onLayoutChanged`), so split percentages neither apply correctly nor persist.
5. **Legacy migration blocks a preview leaf.** `migrateLegacyWorkspaceLayout` (`workspace-atoms.ts:16`) rewrites every stored leaf with `type: "preview"` to `"editor"` on **every** module load. Any new preview leaf would be wiped on reload. Preview mode was removed earlier ("The editor has one mode now", `app/atoms/ui-atoms.ts:17`). An editor without focus already hides all Markdown marks (`app/editor/codemirror/syntax-reveal.ts:12`, "An editor without focus shows none"), so a non-editable editor reads as a preview.
6. **Drag sources.** Library Files tree rows already drag with HTML5 DnD to move files into folders: `vault-tree/FileRow.tsx:119-131`, then `TreeNodes.tsx:116` `onDragStartEntry`, then `vault-tree/use-tree-actions.ts:207` `startDrag(entry: DraggedEntry)`, where `DraggedEntry` carries `{ kind, path, name, handle, group? }` (`tree-model.ts:57`). Library **Open Notes** rows drag to reorder (`sidebar/SidebarOpenNotes.tsx:86-105`, local `dragging` state, `effectAllowed = "move"`). Panes accept no drops.
7. **Missing.** There are no drop zones, no top or left insertion, no pane relocation, no preview leaf, no scroll lock, and no persisted sizes.

## Behavior

**Layout**
- B1. Panes form a binary tree of splits. "Horizontal" means side by side and "vertical" means stacked (the `react-resizable-panels` orientation, as today).
- B2. Dragging a divider resizes its two sides. The percentages persist when the pointer is released and are restored on reload. A pane can't be dragged below 10% of its split.
- B3. Mobile (`useIsMobileChrome()`) is unchanged: one pane, no drop zones, no scroll lock. A stored desktop tree is kept as is. A preview leaf shown on mobile renders as a normal editor.

**Drag to dock (desktop only)**
- B4. There are three drag sources. None is a tab, since there is no tab strip.
  - (a) A **Files tree file row** in the library, single item only. A multi-selection drag stays a folder move and shows no zones.
  - (b) An **Open Notes row** in the library.
  - (c) A **pane grip**: a faint grip icon before the pane title. It shows on hover or focus of the title row, only while more than one pane exists.
- B5. While a drag from these sources is in progress, every pane except the dragged pane itself shows a transparent drop layer. Over a pane, the pointer picks a **zone**. Each edge band is the outer 25% of that axis, capped at 96px, and the nearest edge wins. The rest is **center**. A translucent preview shows where the note will land: the matching half for an edge, the whole pane for center. Nothing is drawn until the pointer is over a pane. Leaving the pane or pressing Esc cancels.
- B6. **Edge drop** splits the target pane on that side (top or bottom makes a vertical split, left or right a horizontal one). The split starts at 50/50, and the new pane is the active pane.
  - File row: the new pane opens the file, read from disk (disk wins, as with a click).
  - Open Notes row: the note moves from the focused pane into the new pane. If it was that pane's only note, it stays there too, so the same note shows in both and no pane is left empty.
  - Pane grip: the dragged pane is detached from its place (its split collapses) and re-inserted on that side of the target, with its notes, type and active note.
- B7. **Center drop** opens the note in the target pane and focuses it.
  - File row: as a click on the row would, but into the target pane. If the target's note in front is the draft with unsaved text, the existing "You have unsaved changes in your draft…" confirm is shown first.
  - Open Notes row: same move-or-copy rule as B6, with the note appended and put in front.
  - Pane grip: the dragged pane's notes join the target (appended, no duplicates), the target shows the dragged pane's front note, and the dragged pane closes.
- B8. No-ops:
  - a pane dropped on itself (it has no layer);
  - an Open Notes row dropped on the center of the pane it came from;
  - a pane grip drag when only one pane exists (no grip is shown).
- B9. If the file can't be read after an edge drop (deleted meanwhile), the existing open-error handling runs and the new pane stays empty (`PaneEmptyState`).
- B10. Keyboard parity stays on the existing commands (Split Pane Right/Down, Open in pane). Drag adds no new keyboard path.

**Preview panes**
- B11. A pane is either an **editor** or a **preview**. A preview shows its note read-only, with Markdown marks hidden on every line (no caret, no reveal). It has its own notes like any pane, and the same note can be open in an editor and a preview at once; edits show in the preview live. Boards render as boards in both. A private note stays behind `PrivateNoteGate` in both.
- B12. **Open Preview to the Side** (palette, and the note menu item "Open preview to the side") splits the active pane right. The new pane is a **preview** of the active note, with **scroll lock on** for that split, and focus **stays** on the editor.
- B13. **Show Pane as Preview / Show Pane as Editor** (palette, and the note menu) switches the active pane's type in place.
- B14. A preview pane's title shows a faint "Preview" label after the name. Clicking a preview pane makes it active, as today, but the palette's editor commands and AI actions don't target it: it never claims `atom_activeEditorView`.

**Scroll lock**
- B15. Scroll lock belongs to a split whose two children are both panes. **Lock Scroll With Other Pane** / **Unlock Scroll** (palette, and the note menu) toggles the active pane's parent split. It isn't offered when the parent's other child is itself a split, or when there is only one pane.
- B16. While the lock is on, both panes show a faint lock button after their title menu (⋯). Clicking it unlocks. There is no other chrome.
- B17. Scrolling either pane moves the other in the same frame:
  - **Same note on both sides** (editor ↔ preview, or two editors): the other pane aligns the same document line, and the same fraction into it, to the top of its view. This is the "block anchor".
  - **Different notes**: the other pane gets the same scroll ratio, `scrollTop / (scrollHeight − clientHeight)`. A note that can't scroll counts as ratio 0.
- B18. Turning the lock on aligns the other pane to the active one once. The lock is skipped while either side is a board, the private veil, or an empty pane, and resumes when both sides are text again.
- B19. Programmatic scrolls never echo back (see Design → scroll lock loop guard).
- B20. Closing or relocating one of the two panes drops its split, and with it the lock.

**Persistence**
- B21. These persist under `localStorage["workspaceLayout"]`: the tree, each pane's type, open notes and front note, split percentages, and scroll-lock flags. Layouts stored by older versions (no `version`, number sizes, legacy `"preview"` leaves, n-ary containers, bad sizes) still load. Legacy `"preview"` leaves still become editors, exactly once.

## Design

### Data model (`app/types/workspace.ts`)
```ts
export type PaneType = "editor" | "preview" | "metrics";
export interface PanelLeaf { …; type: PaneType; }
export interface WorkspaceContainer { …; scrollLock?: boolean; }   // only meaningful with exactly two leaf children
export const WORKSPACE_LAYOUT_VERSION = 2;
export interface WorkspaceState { version?: number; rootContainer: WorkspaceContainer | PanelLeaf; }
export type DockZone = "top" | "bottom" | "left" | "right" | "center";
```
- `sizes` stay percentages that sum to 100. There are no new storage keys: the key stays `"workspaceLayout"`, a legacy name kept so existing layouts load.

### Migration (`workspace-atoms.ts`)
- Replace `migrateLegacyWorkspaceLayout` with one that calls a pure `normalizeWorkspaceLayout(raw: unknown): WorkspaceState | null` (new `app/atoms/layout-normalize.ts`).
- It writes the result back only when it differs (same `JSON.stringify` compare as today). It runs once at module load, as today.
- `normalizeWorkspaceLayout` steps:
  1. If `version` is missing, map leaf `type: "preview"` to `"editor"` (the existing `normalizeLegacyPaneTypes`, moved here).
  2. Any other unknown leaf type becomes `"editor"`.
  3. A leaf with missing or non-array `openFilePaths` gets `[]`. `isPinned` defaults to `false`.
  4. A container drops null or invalid children. With 0 children it is removed; with 1 it collapses into that child.
  5. `sizes` with the wrong length, non-finite values or a sum ≤ 0 become equal shares. Otherwise they are rescaled to sum to 100.
  6. A non-boolean `scrollLock` is removed.
  7. Set `version: 2`. If the result has no leaf, return `null`, and the caller then removes the key so the atom default applies.
- The atom default gains `version: 2`.

### Pure tree helpers (new `app/atoms/layout-tree.ts`)
```ts
findParent(root, childId): WorkspaceContainer | null
detachLeaf(root, leafId): { root: WorkspaceContainer | PanelLeaf | null; leaf: PanelLeaf | null } // collapses the parent like atom_closePane
insertLeafAt(root, targetLeafId, zone: Exclude<DockZone,"center">, leaf: PanelLeaf): WorkspaceContainer | PanelLeaf
  // replaces target with { id: generateId(), direction: left|right→"horizontal", top|bottom→"vertical",
  //   sizes: [50,50], children: left|top ? [leaf, target] : [target, leaf] }
setContainer(root, containerId, updates: Partial<WorkspaceContainer>): WorkspaceContainer | PanelLeaf
lockablePair(root, leafId): WorkspaceContainer | null   // parent container iff it has exactly 2 children, both leaves
```
`atom_closePane`'s inline `removeNode` stays. It may be rewritten on top of `detachLeaf` only if its tests keep passing unchanged.

### Atoms
- `layout-actions.ts`:
  - `atom_splitPane` payload gains `type?: PaneType` (default `"editor"`, no longer copied from the source), `copy?: boolean` (keep `filePath` in the source too), `focusNew?: boolean` (default `true`) and `scrollLock?: boolean`.
  - New `atom_setSplitSizes(null, { containerId, sizes })`.
  - New `atom_setPaneType(null, { paneId, type })`.
  - New `atom_toggleScrollLock(null, paneId)`, which flips `lockablePair(...).scrollLock`.
- New `app/atoms/dock-actions.ts`, which keeps `layout-actions.ts` under 400:
  - `atom_dockNote(null, { path, targetPaneId, zone, sourcePaneId? }) → string | null`. It returns the pane the note is now in, and handles both the Open Notes move/copy (B6/B7) and the empty new leaf for a file (when `sourcePaneId` is absent: the new leaf has `openFilePaths: []` and is set active, and the caller then opens the file). A move that empties nothing calls `forgetClosedFiles` only for paths no pane shows any more (a move never drops one, so no call is needed). Sets `atom_activePaneId`.
  - `atom_dockPane(null, { paneId, targetPaneId, zone })`, covering B6/B7 for the grip. No-op when `paneId === targetPaneId` or the root is a single leaf.
- New `app/atoms/pane-drag-atoms.ts` (ephemeral, not persisted):
  ```ts
  export type PaneDragPayload =
    | { kind: "file"; path: string; handle: FileSystemFileHandle }
    | { kind: "open-note"; path: string; sourcePaneId: string }
    | { kind: "pane"; paneId: string };
  export const atom_paneDrag = atom<PaneDragPayload | null>(null);
  ```
- Re-export `dock-actions`, `pane-drag-atoms` and `layout-tree` from `app/atoms/atoms.ts`, like `layout-actions`.

Why a payload atom rather than reading a `dataTransfer` MIME type: the Files tree drag sets no data today and keeps the handle in React state, and `dataTransfer` data can't be read during `dragover`. One atom lets every pane render its layer at drag start and keeps CodeMirror from ever seeing the drop, because the layer sits on top.

### Drop zone geometry (new `app/editor/utils/dock-zone.ts`, pure)
```ts
export function dockZoneAt(rect: { left: number; top: number; width: number; height: number }, x: number, y: number): DockZone
// band = min(0.25 * dimension, 96); nearest edge whose distance < its band wins; else "center"
export function dockPreviewRect(zone: DockZone): { top: string; left: string; width: string; height: string } // CSS % box
```

### Components and hooks
- `app/editor/components/PaneDropLayer.tsx` (new, about 80 lines). Props: `{ paneId: string }`.
  - Reads `atom_paneDrag`. It returns null when there is no drag, or when `payload.kind === "pane" && payload.paneId === paneId`.
  - Renders `<div className="absolute inset-0 z-30" onDragOver onDragLeave onDrop>`. `onDragOver` calls `preventDefault`, sets `dataTransfer.dropEffect = "move"` (every source sets `effectAllowed = "move"`) and sets the local zone. `onDragLeave` clears the zone only when `relatedTarget` is outside the layer. `onDrop` calls `preventDefault`, then `void dropOnPane(paneId, zone)`.
  - The preview box uses `pointer-events-none absolute rounded-lg border-2 border-fg-faint bg-black/[0.04] dark:bg-white/[0.06] transition-all duration-100`. Use tokens only: no accent and no hard-coded colors. Per the design memory, accent is only for caret, focus and selection, and `/N` opacity works only on `accent` or literal black/white.
- `app/editor/hooks/use-pane-drop.ts` (new). `usePaneDrop(): (targetPaneId: string, zone: DockZone) => Promise<void>`:
  - It reads the payload with `store.get(atom_paneDrag)` and clears it first.
  - `"open-note"` goes to `atom_dockNote` and `"pane"` goes to `atom_dockPane`.
  - `"file"` + edge: `atom_dockNote({ path, targetPaneId, zone })` and then `await openFile(handle, path, true)`. `force` is right here: the draft isn't being replaced.
  - `"file"` + center: set `atom_activePaneId = targetPaneId`. If the target's `activeFilePath === "draft"` and `hasUnsavedChanges(openFiles.draft)` (`atoms/tab-limit.ts:12`) with non-blank text, `await dialog.confirm(…)` with the **same strings** as `use-open-file.ts:86-91`, and return if declined. Then `await openFile(handle, path, true)`.
    - Do the draft check here, not in `openFile`: `openFile`'s own check reads `activeFilePath`/`content` from its render closure (`use-open-file.ts:26-27,85`), which still points at the previously active pane at drop time.
  - `openFile` comes from `useFileSystem()`, and `dialog` from `useDialog()` (`app/hooks/use-dialog`).
- `app/editor/hooks/use-pane-drag-reset.ts` (new, about 15 lines). It clears `atom_paneDrag` on a `window` `dragend` (capture). Call it once from `app/editor/page.tsx`, next to `useFileWatcher()` (:96).
  - It is needed because a relocated pane's grip unmounts before its own `dragend`.
  - Do **not** clear on `drop` from a window capture listener: it runs before React's `onDrop`, which still needs the payload.
- `app/editor/components/PaneLeaf.tsx` (249 lines):
  - Render `<PaneDropLayer paneId={leaf.id} />` inside the root div when `!isMobileChrome`.
  - Compute `const isPreview = leaf.type === "preview" && !isMobileChrome`. Change the branch at :201 to `leaf.type === "editor" || leaf.type === "preview"`, and pass `readOnly={isPreview}` to `MarkdownEditor`.
  - Include the type in the editor key so a type switch remounts the editor: `editorKeyRef.current.key + (isPreview ? ":preview" : "")` for both `PrivateNoteGate` and the editor.
  - Pass `PaneTitle` the new props: `badge={isPreview ? "Preview" : undefined}`; `scrollLocked` / `onToggleScrollLock` from `lockablePair(layout.rootContainer, leaf.id)?.scrollLock`; and `onGripDragStart` when `!isOnlyPane`. The grip handler sets `atom_paneDrag({ kind: "pane", paneId: leaf.id })`, sets `dataTransfer.effectAllowed = "move"` and calls `setData("application/x-hermes-pane", leaf.id)` (Firefox needs some data to start a drag).
  - If PaneLeaf would pass 400 lines, extract the save-state computation (:71-96) into `app/editor/hooks/use-pane-save-state.ts`.
- `app/editor/components/PaneTitle.tsx` (174 lines). New optional props:
  - `badge?: string`: a `text-ui-caption text-fg-faint` span after the name.
  - `scrollLocked?: boolean` and `onToggleScrollLock?: () => void`. When `scrollLocked`, render `Button variant="unstyled"` with `TbLock` from `react-icons/tb`, `aria-label="Unlock scroll"`, `aria-pressed`, `title="Scroll locked with the other pane — click to unlock"`, and the same classes as the ⋯ button (:76).
  - `onGripDragStart?: (e: React.DragEvent) => void`. When present, render a leading `Button variant="unstyled" draggable` with `TbGripVertical`, `aria-label="Drag to move pane"`, `opacity-0 group-hover/title:opacity-100 focus-visible:opacity-100`.
  - Use `Button`, not a raw `<button>`. `Button` spreads `...rest` onto the element (`app/components/Button/Button.component.tsx:34`).
- `app/editor/components/WorkspaceSplitter.tsx`:
  - The container branch becomes a `SplitGroup` component in the same file, because hooks can't run in the recursive function's early-return path.
  - It renders `<Group id={node.id} orientation={node.direction} onLayoutChanged={(layout) => setSplitSizes({ containerId: node.id, sizes: node.children.map(c => layout[c.id] ?? 0) })}>`.
  - Each child is `<Panel id={child.id} defaultSize={`${node.sizes[index]}%`} minSize="10%">`. Note the **string** percentage, which fixes item 4.
  - Keep a ref per child wrapper div. Call `useScrollLock(refA, refB, { enabled: !!node.scrollLock && bothLeaves, paths: [leafA.activeFilePath, leafB.activeFilePath], activePaneId })`.
  - Keep the `Separator` as is. Don't put interactive children in it: v4 hit-tests separator `pointerdown` in the capture phase on the group (`dist/react-resizable-panels.js:1490`), which is why the lock toggle lives in the title instead.
- `app/editor/hooks/use-scroll-lock.ts` (new):
  - It attaches `scroll` listeners in the **capture** phase to both wrapper elements (scroll doesn't bubble; `PaneLeaf.tsx:141` uses the same trick).
  - The vertical scroller of a text pane is `MarkdownEditor`'s root `.editor-canvas` (`MarkdownEditor.tsx:296`). Ignore any event whose target isn't one, so wide-table horizontal scrollers are ignored.
  - The other side is found with `wrapper.querySelector(".editor-canvas")`, and each side's view with `EditorView.findFromDOM(canvas.querySelector(".cm-editor"))`. If either is missing (board, veil, empty), do nothing (B18).
  - Coalesce to one sync per animation frame per source. Pick `anchorScrollTop` when `paths[0] === paths[1]`, else `ratioScrollTop`.
  - **Loop guard:** `const expected = new WeakMap<HTMLElement, number>()`. Before setting `target.scrollTop = v`, store the clamped value read back after the write. In the handler, if `expected.has(el)` and `|el.scrollTop − expected.get(el)| ≤ 1`, delete the entry and return.
  - When `enabled` turns true, run one sync from the active pane's side.
- `app/editor/utils/scroll-sync.ts` (new, pure, DOM-agnostic arguments so it is testable):
  ```ts
  export function ratioScrollTop(src: ScrollBox, dst: ScrollBox): number // ScrollBox = { scrollTop; scrollHeight; clientHeight }
  export function anchorScrollTop(args: {
    srcView: Pick<EditorView,"lineBlockAtHeight"|"documentTop">; srcTop: number;   // srcTop = scroller rect top + top room
    dstView: Pick<EditorView,"lineBlockAt"|"documentTop">; dstTop: number; dstScrollTop: number;
  }): number
  // block = srcView.lineBlockAtHeight(srcTop - srcView.documentTop); frac = (srcTop - documentTop - block.top) / block.height
  // y = dstView.lineBlockAt(block.from).top + frac * height;  return dstScrollTop + (dstView.documentTop + y) - dstTop
  ```
  The top room is the `--pane-top-room` value, `48px` (`PaneLeaf.tsx:36`). Export that constant from PaneLeaf, or move it to `app/editor/components/pane-header-classes.ts`, and import it in both places.
- `MarkdownEditor.tsx`. It is **401 lines, already over the limit**. Extract first, then add:
  - **Extract** the active-view registration (the register part of `handleViewCreated`, :207-216, and the effect at :267-286) into `app/editor/hooks/use-active-editor-view.ts`: `useActiveEditorView(viewRef, { isActivePane, enabled })`, returning the `onCreated(view)` callback.
  - **Add** `readOnly?: boolean` to `MarkdownEditorProps` (:49) and pass it to `useCodeMirrorEditor` (:242, which hard-codes `false` today).
  - When `readOnly` is set: no auto-focus, no active-view claim (`enabled: !props.readOnly`), and `TemplateStrip` / `EmptyNoteTemplates` are not rendered.
- `app/editor/codemirror/extensions.ts:139`: add `EditorState.readOnly.of(opts.readOnly)` next to `EditorView.editable.of(!opts.readOnly)`, so commands and paste can't edit a preview either.
- Commands: new `app/editor/components/editor-commands/pane-layout-commands.ts`, `buildPaneLayoutCommands(context): Command[]`, registered in `build-editor-commands.ts` after `workspaceTasksViews.splitPaneRight`. It holds:
  - `open-preview-side`, "Open Preview to the Side": `splitPane({ id, direction: "horizontal", filePath, type: "preview", copy: true, focusNew: false, scrollLock: true })`.
  - `toggle-pane-preview`, "Show Pane as Preview" / "Show Pane as Editor".
  - `toggle-scroll-lock`, "Lock Scroll With Other Pane" / "Unlock Scroll", with `disabledReason: "No side-by-side pane"` when `lockablePair` is null.
  - All use `category: "Workspace"`. Add `setPaneType` and `toggleScrollLock` to `use-editor-command-context.ts` (189 lines).
- `use-note-menu-items.tsx` (92 lines): after "Open in pane", add "Open preview to the side", "Show pane as preview" / "Show pane as editor", and, when `lockablePair(leaf)` exists, "Lock scroll with other pane" / "Unlock scroll". Icons come from `react-icons/hi` or `tb` (`TbLock`, `TbLockOpen`).
- Drag sources:
  - `vault-tree/use-tree-actions.ts#startDrag` (:207): when the drag is a single file (`entry.kind === "file"`, no group, `entry.handle`), also `setPaneDrag({ kind: "file", path: entry.path, handle: entry.handle })`. It does nothing else and doesn't touch folder logic. `TreeNodes.tsx:117` `onDragEndEntry` also clears it (the window reset covers the rest).
  - `sidebar/SidebarOpenNotes.tsx#onDragStart` (:88): also `setPaneDrag({ kind: "open-note", path, sourcePaneId: leaf.id })`, and clear it in `endDrag`. Update the comment at :28 ("the editor ignores it"): panes now take it as a dock drop.

## Phase 1: Layout model, migration and divider sizes
Fixes items 4 and 5, and lays the model for the rest. No visible change except that sizes now persist correctly.
- `app/types/workspace.ts`: `PaneType`, `scrollLock?`, `version?`, `WORKSPACE_LAYOUT_VERSION`, `DockZone`.
- `app/atoms/layout-normalize.ts` (new): `normalizeWorkspaceLayout`, with `normalizeLegacyPaneTypes` moved from `workspace-atoms.ts:5`.
- `app/atoms/workspace-atoms.ts`: the migration calls the normalizer (keep the exported name `migrateLegacyWorkspaceLayout`, since tests may import it), and the default gets `version: 2`.
- `app/atoms/layout-tree.ts` (new): `findParent`, `detachLeaf`, `insertLeafAt`, `setContainer`, `lockablePair`.
- `app/atoms/layout-actions.ts`: the new `atom_splitPane` options, plus `atom_setSplitSizes`, `atom_setPaneType` and `atom_toggleScrollLock`.
- `app/atoms/atoms.ts`: re-exports.
- `app/editor/components/WorkspaceSplitter.tsx`: `SplitGroup`, ids, `"N%"` default sizes, `minSize="10%"`, `onLayoutChanged` → `atom_setSplitSizes`. No scroll lock yet.

## Phase 2: Drag to dock
B4–B10.
- `app/atoms/pane-drag-atoms.ts`, `app/atoms/dock-actions.ts` (new), and their re-exports.
- `app/editor/utils/dock-zone.ts`, `app/editor/hooks/use-pane-drop.ts`, `app/editor/hooks/use-pane-drag-reset.ts` and `app/editor/components/PaneDropLayer.tsx` (new).
- `PaneLeaf.tsx`: the layer and the grip wiring. `PaneTitle.tsx`: `onGripDragStart`.
- `page.tsx`: `usePaneDragReset()`.
- `vault-tree/use-tree-actions.ts`, `vault-tree/TreeNodes.tsx` and `sidebar/SidebarOpenNotes.tsx`: set and clear the payload.

## Phase 3: Scroll lock
B15–B20, between any two text panes (works before previews exist).
- `app/editor/utils/scroll-sync.ts` and `app/editor/hooks/use-scroll-lock.ts` (new). Wire them in `WorkspaceSplitter.tsx#SplitGroup`.
- `PaneTitle.tsx`: `scrollLocked` and `onToggleScrollLock`. `PaneLeaf.tsx`: pass them.
- Move the `PANE_TOP_ROOM` constant to a shared place.
- `pane-layout-commands.ts` (new): `toggle-scroll-lock` only for now. `build-editor-commands.ts`; `use-editor-command-context.ts`.
- `use-note-menu-items.tsx`: the lock item.

## Phase 4: Preview panes
B11–B14.
- `MarkdownEditor.tsx`: extract `use-active-editor-view.ts` first, then `readOnly`.
- `extensions.ts:139`: `EditorState.readOnly`.
- `PaneLeaf.tsx`: preview branch, key suffix, badge, and the mobile fallback.
- `PaneTitle.tsx`: `badge`.
- `pane-layout-commands.ts`: `open-preview-side`, `toggle-pane-preview`. `use-note-menu-items.tsx`: the two items.

## Tests
All tests are fully mocked: `useFileSystem` (`openFile` as `vi.fn()`), `next/navigation` `useRouter`, and `useDialog` where needed. Wrap components in a Jotai `<Provider>` or `createStore()`, and seed `atom_workspaceLayout` through `store.set` (see AGENT_RULES, "Module-Load Storage").
- **Phase 1**
  - `app/atoms/layout-normalize.test.ts` (new):
    - a legacy layout (no version) with a `"preview"` leaf becomes an editor once;
    - a v2 `"preview"` leaf survives;
    - bad sizes (`[NaN, 1]`, wrong length, sum 0) become equal, and `[30, 30]` is rescaled to `[50, 50]`;
    - a 1-child container collapses, and an empty one is dropped;
    - a missing `openFilePaths` becomes `[]`;
    - an unknown type becomes editor;
    - a non-boolean `scrollLock` is removed;
    - garbage input returns `null`.
  - `app/atoms/layout-tree.test.ts` (new):
    - `insertLeafAt` for each of the four zones (direction and child order);
    - `detachLeaf` collapses the parent and returns the leaf;
    - `detachLeaf` on the root leaf returns a null root;
    - `lockablePair` returns null when the sibling is a container.
  - `app/atoms/layout-actions.test.ts` (extend):
    - `atom_splitPane` with `copy`, `type: "preview"`, `focusNew: false` and `scrollLock`;
    - the default type is `"editor"` even when splitting a `"metrics"` leaf;
    - `atom_setSplitSizes` writes sizes;
    - `atom_toggleScrollLock` flips only a lockable pair;
    - `atom_setPaneType`.
  - `app/editor/components/WorkspaceSplitter.test.tsx` (new): mock `react-resizable-panels` with lightweight `Group`/`Panel`/`Separator` that record props. Assert:
    - `defaultSize` is the `"70%"` string for `sizes: [70, 30]`;
    - calling the recorded `onLayoutChanged({ a: 60, b: 40 })` updates the stored container's sizes.
- **Phase 2**
  - `app/editor/utils/dock-zone.test.ts` (new): each edge, center, the 96px cap on a large pane, and corner tie-breaking (nearest edge).
  - `app/atoms/dock-actions.test.ts` (new):
    - an Open Notes edge drop moves the note;
    - when it was the source's only note, both panes have it;
    - a center drop appends and fronts it;
    - a center drop on its own source pane is a no-op;
    - a file edge drop creates an empty active leaf;
    - `atom_dockPane` edge relocation keeps the leaf's notes and type and collapses its old parent;
    - a center merge dedupes and closes the source;
    - dropping on itself or a single pane is a no-op;
    - the active pane is updated each time.
  - `app/editor/hooks/use-pane-drop.test.tsx` (new):
    - a file edge drop calls `openFile(handle, path, true)` after the new leaf is active;
    - a file center drop on a dirty draft target asks for confirmation and, if declined, doesn't open;
    - the payload is cleared.
  - `app/editor/components/PaneDropLayer.test.tsx` (new):
    - renders nothing without a payload;
    - renders nothing for its own pane during a pane drag;
    - `dragOver` + `drop` with mocked `getBoundingClientRect` call the drop handler with the right zone.
  - `PaneLeaf.test.tsx` (extend): the grip shows only with two or more panes, and its drag start sets the pane payload.
  - `app/editor/components/sidebar/SidebarOpenNotes.test.tsx` (new; none exists): drag start sets the `open-note` payload, drag end clears it, and drop-to-reorder still calls `atom_reorderOpenNote`.
  - `VaultFileTree.test.tsx` (extend): a single-file drag start sets the `file` payload, and a multi-select drag doesn't.
- **Phase 3**
  - `app/editor/utils/scroll-sync.test.ts` (new):
    - ratio mapping, including a non-scrollable source or target (0) and clamping;
    - `anchorScrollTop` with stub views whose `lineBlockAtHeight`/`lineBlockAt`/`documentTop` return fixed blocks, covering different block heights on each side.
  - `app/editor/hooks/use-scroll-lock.test.tsx` (new), using two wrapper divs containing `.editor-canvas` elements with stubbed scroll metrics. Mock `EditorView.findFromDOM`, and run `requestAnimationFrame` synchronously with `vi.spyOn`. Assert:
    - a scroll on A sets B's scroll position;
    - the echo scroll on B doesn't write A;
    - nothing happens when disabled or when one side has no `.editor-canvas`;
    - enabling aligns once.
  - `build-editor-commands.test.ts` (extend): `toggle-scroll-lock` is disabled without a lockable pair, and its label follows the state.
  - `PaneTitle.test.tsx` (extend): the lock button shows only when locked, and a click calls `onToggleScrollLock`.
- **Phase 4**
  - `PaneLeaf.test.tsx`: a preview leaf passes `readOnly` to the (mocked) `MarkdownEditor`, shows the "Preview" badge, and renders as an editor under mobile chrome.
  - `MarkdownEditor.test.tsx`: with `readOnly`, the view doesn't claim `atom_activeEditorView` and the empty-note template choices don't render.
  - `build-editor-commands.test.ts`: `open-preview-side` calls `splitPane` with `{ type: "preview", copy: true, focusNew: false, scrollLock: true }`, and `toggle-pane-preview` calls `setPaneType`.
  - `extensions.test.ts` (extend): with `readOnly: true`, `state.readOnly` is true.

## Docs
- `app/editor/components/WorkspaceSplitter.md`: `SplitGroup`, percentage sizes, `onLayoutChanged` persistence, scroll lock wiring, and why the separator has no children.
- `PaneLeaf.md`: the drop layer, preview type, grip and lock props. `PaneTitle.md`: `badge`, the lock button and the grip.
- New `PaneDropLayer.md`.
- `MarkdownEditor.md`: `readOnly`, and the extracted active-view hook.
- `app/editor/components/README.md`: add `PaneDropLayer`, and fix the `PaneLeaf` row (:33 still says "tabs and toolbar").
- `app/editor/components/sidebar/SidebarOpenNotes.md` and `vault-tree/FileRow.md` / `TreeNodes.md`: rows also dock into panes.
- `app/editor/components/editor-commands/README.md`: add `pane-layout-commands.ts`.
- `app/editor/README.md`: list the new hooks (`use-pane-drop`, `use-pane-drag-reset`, `use-scroll-lock`, `use-active-editor-view`) and utils (`dock-zone`, `scroll-sync`) where it indexes `hooks/` and `utils/`. `hooks/` and `utils/` have no README of their own.
- `app/atoms/README.md`:
  - the `workspace-atoms.ts` row (version, migration);
  - the `layout-actions.ts` row (new actions);
  - new rows for `dock-actions.ts`, `pane-drag-atoms.ts`, `layout-tree.ts` and `layout-normalize.ts`;
  - the dependency list.
- In-app docs, `app/documentation/content/editor-workspace.tsx`:
  - extend the "Panes" row (:254) to "Open in pane, split down, open preview to the side, lock scroll, next/previous, close";
  - add a short paragraph on dragging notes or the pane grip onto a pane's edge or center;
  - add "pane drag dock preview scroll lock" to the section keywords.
- `ARCHITECTURE.md`: in the CodeMirror bullet, replace the stale "Preview mode (`preview-mode.ts`) …" sentence with the per-pane read-only preview.

## Acceptance criteria
- [ ] A layout saved before this change (including one with a legacy `"preview"` leaf and number sizes) loads without errors. Legacy preview leaves open as editors.
- [ ] Dragging a divider to 70/30 and reloading restores 70/30. A new split starts at 50/50, not at a pixel width.
- [ ] Dragging a Files tree file onto a pane's left, right, top or bottom edge opens it in a new pane on that side. The new pane is active and reads the file from disk.
- [ ] Dropping a Files tree file in a pane's center opens it in that pane. A dirty draft in front asks first.
- [ ] Dragging an Open Notes row onto an edge moves the note to a new pane. If it was the pane's only note, both panes show it.
- [ ] A pane grip shows on title hover only with two or more panes. Dragging it onto another pane's edge relocates the pane; dropping it in the center merges its notes and closes it.
- [ ] During a drag, panes show the zone preview only under the pointer. Nothing is drawn otherwise. Esc cancels and leaves no layer behind.
- [ ] Multi-selection and folder drags in the Files tree still move files and show no pane zones. Open Notes reordering still works.
- [ ] Open Preview to the Side shows the note read-only, with no Markdown marks, in a new right pane, with scroll lock on and focus left in the editor. Typing in the editor updates the preview live.
- [ ] Show Pane as Preview / Editor switches the active pane in place. Palette editor commands and AI actions never act on a preview.
- [ ] With scroll lock on, scrolling either pane keeps the other on the same line (same note) or the same ratio (different notes), with no jitter or ping-pong. Both titles show the lock, and clicking it unlocks.
- [ ] The lock command is unavailable when the active pane's sibling is a split.
- [ ] Scroll lock and type persist across a reload.
- [ ] Mobile shows one pane: no drop zones, no grip, and a preview leaf renders as an editor.
- [ ] No raw `<button>`/`<input>`, no hard-coded colors, no new network calls. Every touched source file stays under 400 lines (`MarkdownEditor.tsx` drops below 400 through the extraction).
- [ ] The new and extended tests listed above exist. CI passes.

## Decisions
- **Drag sources:** Files tree file rows, Open Notes rows, and a hover-only pane grip in the title. All are HTML5 DnD, matching the existing tree and Open Notes drags. Touch and mobile are excluded because mobile has no splits.
- **Drag state** goes in an ephemeral atom, not `dataTransfer`. The tree's drag sets no data, and `dragover` can't read data anyway.
- **Binary splits:** a drop always wraps the target in a new 2-child split, even when the parent has the same direction. This keeps every scroll lock between exactly two panes and matches `atom_splitPane`/`atom_closePane` today.
- **Open Notes drags move** a note, except a pane's last note, which is copied so no pane goes empty. **File-row drags open** the note (copy semantics, as a click does).
- **Pane center drop merges** notes into the target and closes the dragged pane.
- **Preview** is a pane type that renders the same `MarkdownEditor` read-only (`EditorView.editable` false plus `EditorState.readOnly`). An unfocused view already hides all marks (`syntax-reveal.ts`), so this needs no second renderer and no revival of the removed app-wide mode. It is per pane, so it doesn't conflict with "one mode" for the editor.
- **Scroll-lock UI** lives in the title (lock glyph when on) and in the palette and note menu. It isn't on the divider, because v4's separator hit-testing would eat clicks there.
- **Anchors:** for the same note on both sides, the anchor is the top visible document line (finer than headings, and handles different rendering heights). Different notes use the ratio; matching their headings by text was not judged worth the complexity.
- **Migration:** the storage key `"workspaceLayout"` is kept (no `hermes_` rename) so existing layouts load. `version: 2` gates the legacy preview→editor rewrite.
- **`atom_splitPane`** no longer inherits the source leaf's type: splits make editors unless asked otherwise. Only the unused `"metrics"` placeholder is affected.
- **Minimum pane size** is 10% of its split.

## Out of scope / Deferred
- Tab strips, or any tab-like drag source in the pane header beyond the grip.
- Drag to dock on touch and mobile, and keyboard docking beyond the existing split commands.
- Scroll lock across more than two panes, or across a split whose side is itself a split.
- Heading-text matching between two different notes.
- A preview pane that follows another pane's note automatically (a linked preview).
- Dragging notes in from outside the app (OS file drops) or from the palette's results.
- N-ary splits (three panes side by side in one group), and an equalize-sizes command.
- Fixing `atom_closePane` not calling `forgetClosedFiles` (pre-existing).

## Open questions
- Is it confirmed that bringing back a per-pane **read-only preview** is wanted, given that the app-wide Edit/Preview mode was removed on purpose ("The editor has one mode now")? The design reuses the editor, so dropping Phase 4 later leaves Phases 1–3 intact.
- For two **different** notes, is the ratio sync enough, or should headings with identical text act as anchors?
- Should Open Notes drags **copy** rather than move? Copy would leave the note in the focused pane as well, so it is less surprising for the focused pane but makes duplicates.
