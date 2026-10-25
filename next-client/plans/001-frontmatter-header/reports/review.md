# Review — 001 frontmatter header

## Review 1

**Verdict:** Changes requested

**Checks:** Deferred to CI. I ran the eight touched/new test files only: 86 of 87 tests pass, 1 fails (below).

**PRD coverage:** All behaviors and acceptance criteria are implemented and match the PRD.
- Chip parser and raw-fallback rules: `app/editor/utils/frontmatter-header-chips.ts`.
- State-field replace, reveal, focus effect, chip handlers, toolbar keys, `setFrontmatterValue`, `requestFrontmatterChipAtCaret`: `app/editor/codemirror/frontmatter-header.ts`.
- `bodyStart` and `withBodyCaret`: `frontmatter-block.ts`. Initial caret: `use-codemirror-editor.ts:160`.
- Fold parking: `heading-fold.ts`. Tag pills removed from the frontmatter.
- `theme.ts` shrank (461 lines, was 478). `MarkdownEditor.tsx` is 381 lines.
- Docs are updated.

## Findings

### Blocker
1. `app/editor/components/markdown-editor/FrontmatterHeaderMenus.test.tsx:87` fails in CI: `expected 23 to be 22`.
   - Scenario: the doc is `---\nstatus: draft\n---\nBody`. Choosing `review` replaces `draft` (5 chars) with a 6-char value, so `Body` moves from offset 22 to 23.
   - The code is correct: the caret does land at the body start. The test computes the expected offset from the old `doc` string.
   - Fix: assert `view.state.selection.main.head` equals `view.state.doc.toString().indexOf("Body")`.

### Minor
- None that affect behavior.

**Tests & docs gaps:** None beyond the failing assertion.

## Handoff
- Fix the expected offset at `FrontmatterHeaderMenus.test.tsx:87` to use the updated document, as above.

## Review 2

**Verdict:** Approve

**Checks:** Deferred to CI. I ran `FrontmatterHeaderMenus.test.tsx` alone: 4 of 4 pass.

**Review 1 blocker:** Fixed. `FrontmatterHeaderMenus.test.tsx:87` now compares the caret with `view.state.doc.toString().indexOf("Body")`. The code didn't change, and the PRD coverage from Review 1 still holds.

**Findings:** None.
