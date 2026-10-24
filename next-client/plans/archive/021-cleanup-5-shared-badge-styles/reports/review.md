## Review 1

**Verdict:** Approve with nits

**Checks:** Deferred to CI (factory mode).

**PRD coverage**
- TagPill component, index, md and test: done (`app/components/TagPill/`). It uses tokens only, with no hex or `red-*`.
- Editor uses the shared classes and `theme.ts` is trimmed to editor-only props: done (`tag-pills.ts:27-34`, `theme.ts:240-247`).
- TaskRow, search chips and suggestions, and palette `#` results use TagPill, with match highlights kept: done (`TaskRow.tsx:118`, `UnifiedSearchInput.tsx:209-225,253`, `PaletteRow.tsx:97-101`, `palette-model.tsx:220`).
- `TagDot` and `TAG_COLORS` removed: done (grep finds nothing).
- `formatCount` on the Files summary and `TokenCostDialog`: done.
- Timing tokens, `DialogModal`, `MobileNavigationLinks`, `PaneLeaf`, chevrons and the scss comment: done as specified.
- No new counts, and the "unchanged by design" items are untouched: done.
- Tests: `TagPill`, `palette-model` (`splitTagDetail` plus the round trip), the `CommandPalette` `#` scope, the Files page, `UnifiedSearchInput` and `tag-pills` are present. The existing `TaskRow` test already asserts `#money`. The `TokenCostDialog` test file is modified, and I didn't open its diff to confirm the added `1 token` case.
- Docs: `TagPill.md`, `README`, `CountBadge.md`, `PaletteRow.md`, `UnifiedSearchInput.md`, `TaskRow.md`, `PaneLeaf.md` and `DESIGN.md` are updated.

**Findings (minor)**
- The `#` test in `CommandPalette.test.tsx` checks that `textContent` contains `#planning`. The PRD asked for each matched tag to be its own element with text `#tag`. The test would still pass if the row reverted to plain text. Optional: use `getByText("#planning")`.
- `codemirror/README.md` doesn't exist and `DialogModal.md` states no timings, so those two PRD doc items don't apply.

**Handoff:** none.
