## Review 1

**Verdict:** Changes requested. One new test fails; the code itself reads correct against the PRD.

**Checks:** Deferred to CI. I ran one batch of new and touched test files to confirm the engineer's flagged risks. These were the tests under `app/atoms`, plus the PaneLeaf, PaneDropLayer, WorkspaceSplitter, VaultFileTree, `build-editor-commands`, `use-pane-drop` and `use-scroll-lock` tests. 186 of 187 tests pass. The one failure is `PaneDropLayer.test.tsx > drops with the zone under the pointer`.

**PRD coverage**
- **Data model, normalizer, tree helpers, migration (B21): done.**
  - `layout-normalize.ts`, `layout-tree.ts` and `workspace-atoms.ts` match the spec.
  - The legacy preview rewrite is gated on a missing `version`.
- **Divider sizes (B2): done.**
  - `WorkspaceSplitter.tsx` uses `"N%"` strings and `minSize="10%"`.
  - `onLayoutChanged` calls `atom_setSplitSizes`.
- **Drag to dock (B4–B10): done.**
  - `PaneDropLayer.tsx`, `dock-zone.ts`, `dock-actions.ts`, `use-pane-drop.ts` and `use-pane-drag-reset.ts` are all present.
  - The draft confirm is in `use-pane-drop.ts`.
  - The layer is skipped on mobile in `PaneLeaf.tsx`.
  - All three drag sources set the payload.
- **Preview panes (B11–B14): done.**
  - `readOnly` goes through `MarkdownEditor`, and `extensions.ts` sets `EditorState.readOnly`.
  - `use-active-editor-view.ts` never claims the view for a preview.
  - The badge, the commands and the note-menu items are present.
- **Scroll lock (B15–B20): done.**
  - `use-scroll-lock.ts` has capture-phase listeners, a per-frame coalesce, the `expected` echo guard and an initial sync.
  - `scroll-sync.ts` has the anchor and ratio helpers.
  - `PaneTitle.tsx` has the lock button.
- **File sizes:** every non-test source file is under 400 lines (`MarkdownEditor.tsx` is 378).
- **Docs and tests:** the `.md` files and READMEs are updated, and the tests the PRD lists exist.

**Findings**
1. **Major** — `app/editor/components/PaneDropLayer.test.tsx:44-48` fails.
   - jsdom has no `DragEvent`. `fireEvent.drop(layer, { clientX: 10 })` therefore doesn't set `clientX`, the zone resolves to `center`, and the test expects `left`.
   - The defect is in the test: `PaneDropLayer.tsx` is correct.
   - It breaks CI and leaves the pointer-to-zone path unverified.
   - Fix: build the events with `createEvent.dragOver` / `createEvent.drop`, then `Object.defineProperty(event, "clientX", { value })` and the same for `clientY`. Fire them with `fireEvent(layer, event)`. Apply this to every `dragOver` and `drop` call that relies on coordinates.
2. **Minor** — `atom_splitPane` in `layout-actions.ts` leaves a stale `scrollLock` on the parent when it splits a leaf of a locked pair. `insertLeafAt` strips it; `splitPane` doesn't. If the new split is closed later, the old lock silently comes back. Strip `scrollLock` from the parent when splitting.
3. **Minor** — `atom_setSplitSizes`: `layout[child.id] ?? 0` can persist a 0 size if the group reports a partial layout. The sum stays above 0, so the guard accepts it. Skip the write when any size is ≤ 0.

**Tests & docs gaps:** none beyond finding 1.

**Handoff:** fix finding 1 (required). Findings 2 and 3 are optional.

## Review 2

**Verdict:** Changes requested. The fix for review 1 finding 2 introduced a regression that breaks every split.

**Checks:** Deferred to CI. I ran `PaneDropLayer.test.tsx` and `layout-actions.test.ts`. `PaneDropLayer.test.tsx` passes, so review 1 finding 1 is fixed. `layout-actions.test.ts` has 8 failures, all `ReferenceError: Cannot access 'scrollLock' before initialization` at `layout-actions.ts:89`.

**Findings**
1. **Blocker** — `app/atoms/layout-actions.ts:95`.
   - `const { scrollLock, ...rest } = node;` declares `scrollLock` inside `splitNode`'s function scope. It shadows the payload `scrollLock` that line 89 reads, so line 89 hits the temporal dead zone.
   - Failure scenario: any `atom_splitPane` call throws. That covers Split Pane Right/Down, Open in pane and Open Preview to the Side, and the docking paths that call it.
   - Fix: rename the destructured value, e.g. `const { scrollLock: parentLock, ...rest } = node;`, and use `parentLock` on line 98. Then re-run `layout-actions.test.ts`.
2. **Minor, resolved:** `atom_setSplitSizes` now ignores sizes ≤ 0 (`layout-actions.ts:126`).

**Handoff:** fix finding 1 and run `app/atoms/layout-actions.test.ts` before handing back.
