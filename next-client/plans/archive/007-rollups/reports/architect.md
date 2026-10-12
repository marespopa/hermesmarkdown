# Architect report — 007 Weekly and monthly rollups

## Run 1

**PRD:** `next-client/plans/007-rollups/prd.md`

**Summary** (3 phases)
- **Phase 1, engine and `#blocked`.** Pure functions in `app/utils/rollup/`:
  - ISO week and month periods (`2026-W41`, `2026-10`).
  - Collecting tasks across the period's daily sheets, with dedup to the latest day.
  - Rendering the sheet.
  - Splicing in the region between `<!-- rollup:start -->` and `<!-- rollup:end -->`.
  - `#blocked` becomes a status tag (it maps to On Hold), and the metadata cache version goes to 2.
- **Phase 2, commands, create and refresh.**
  - Palette commands **This week's / Last week's / This month's / Last month's sheet**: open the sheet if it exists, otherwise generate it in the Daily Sheets folder (Thursday / 1st rule) and open it.
  - **Refresh rollup**, shown only on a weekly or monthly sheet, rewrites only the marked region through the open buffer (disk wins, no conflict prompt).
- Quick jot's inline reconcile-and-save moves into a shared `use-note-buffer.ts#writeThrough`, so rollups use the same disk-wins path.
- Monthly sheets count from exact daily dates, fold Done per tag (`> [!success]- #bug · 7`), and collect each week's Notes under `### Week N · [[YYYY-Www]]`.
- **Phase 3, marker display.** A small CodeMirror plugin shows the marker comments as a hairline with a caption unless the caret is on them.

**Already exists**
- Finding daily sheets by name anywhere, and the folder pattern expansion (`today-note.ts`).
- The first-time folder prompt and `writeNewNote` (`use-template-create.ts`).
- The disk-wins write through an open tab, and minimal-range editor updates (Quick jot, `reconcile-disk.ts`, `text-diff.ts#changedRange`).
- The task parser.
- Conditional palette commands (`useRegisterCommand(null)`).
- Wikilinks resolving by base name.
- Folded callouts.
- The feed preview already strips HTML comments.

**Decisions / open questions to look at before handoff**
- D1: weeks are filed by their Thursday, as the brief proposed. This is confirmed: it keeps the ISO year in the name and the folder in agreement.
- D3: rollup items are plain list items (`- text · [[2026-10-06]]`), not `- [ ]` tasks. Copies would otherwise duplicate the Tasks page and be checkable without writing back to the day.
- D4: the summary's "open" count excludes blocked.
- D5: `#blocked` uses the existing On Hold group on the Tasks page. In rollups, a blocked/hold tag wins over in progress.
- D6: a rollup built from sensitive sheets is created with `sensitive: true`. Refresh never edits frontmatter. Open question: should refresh add it too?
- D7: no keyboard shortcuts.
- D11: no timestamp in the generated region, so a refresh with no changes writes nothing.
- Open questions: should monthly Done groups start folded (proposed) or expanded? Should Refresh rollup have an entry point besides the palette?

**Handoff:** `Implement next-client/plans/007-rollups/prd.md, phase 1` (then phases 2 and 3 in order).
