# Architect report — 021 cleanup: shared badge styles and layout timing

## Run 1

**PRD:** `next-client/plans/021-cleanup-5-shared-badge-styles/prd.md`

**Summary** (2 phases):
- A new `app/components/TagPill` (`TagPill`, `tagKind`, `tagPillClass`, `TAG_PILL_CLASS`) takes the editor's existing `.cm-tag-pill` look as Tailwind token classes. The CodeMirror pills (inline and frontmatter) use it, and so do Tasks rows, the Files/Tasks search chips and suggestions, and the palette's `#` results, which keep their match highlights through a new `splitTagDetail`. `theme.ts` loses the duplicated visual rules.
- `TagDot`'s hard-coded `bg-red-500` and the dead `TAG_COLORS` map are removed.
- The Files page summary and `TokenCostDialog` switch to `formatCount` (separators, singular/plural).
- Phase 2:
  - The overlay timings `overlay-backdrop` and `overlay-panel` now alias `--layout-duration`.
  - `DialogModal` and the mobile menu sheet drop their 300/500ms for the overlay tokens plus `ease-layout`.
  - `PaneLeaf` drops a no-op `transition-all`, and its title inset now slides with the library.
  - The library and tree chevrons move to `duration-layout ease-layout`.
  - Non-layout animations are listed explicitly as untouched.

**Already exists:**
- `CountBadge`/`formatCount` and their users (Tasks, the Tags page, `WordCountPill`).
- The layout tokens and their correct users (`WorkspaceSidebar`, `ShellPage`, `MarkdownEditor`, `.editor-canvas`, the editor page's `left`).
- The editor tag pill look, which the frontmatter chips already reuse.
- The file tree and the palette show **no** counts at all, so there was nothing there to convert.

**Decisions / open questions to look at:**
- D1: no new counts are added to the file tree or the palette. That would be new UI, not cleanup. (Open question.)
- D3/D4: search chips lose the coloured dot and the red `urgn` dot, and they show `#tag`. (Open question on `urgn`.)
- D5: dialogs and the mobile menu sheet count as "drawers" and move onto the layout and overlay timing (500ms → 150ms entrance).
- D6: there are no pane splits in the current code, so `PaneLeaf`'s `transition-all` is removed.
- `SectionHeader.tsx` looks unused. It is deferred, not deleted.

**Handoff:** Implement next-client/plans/021-cleanup-5-shared-badge-styles/prd.md, phases 1 and 2.
