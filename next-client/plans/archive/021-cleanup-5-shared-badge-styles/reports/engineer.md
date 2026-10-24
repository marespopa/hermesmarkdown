# Engineer report: 021 shared badge styles

**Built:** `app/components/TagPill/` (new); editor pill via `tagPillClass` (`tag-pills.ts`, trimmed `theme.ts`); `TaskRow`, `UnifiedSearchInput` (TagDot/TAG_COLORS removed), palette `splitTagDetail` + `PaletteRow` pills; `formatCount` in Files page and `TokenCostDialog`; timing changes in `tailwind.config.js`, `DialogModal`, `MobileNavigationLinks`, `PaneLeaf`, `SidebarSection`, `SidebarOutline`, `FolderRow`, `globals.scss` comment.

**Tests/docs:** TagPill.test, tag-pills.test, palette-model.test, CommandPalette.test, files/page.test, TokenCostDialog.test, new UnifiedSearchInput.test. Docs: TagPill.md, components README, CountBadge.md, UnifiedSearchInput.md, TaskRow.md, PaletteRow.md, PaneLeaf.md, DESIGN.md.

**Decisions:** TaskRow.test already asserted `#money`, left as is. DialogModal.md has no timing text; codemirror README absent; in-app docs not grepped for tag dots.

**To verify:** `corepack yarn tsc --noEmit`; `corepack yarn vitest run` on the files above.
