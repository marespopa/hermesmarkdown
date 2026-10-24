## Review 1

**Verdict:** Approve with nits

**Checks:** Deferred to CI.

**Brief coverage**
- First line (Properties row included) starts below `--pane-top-room`, single and split: done. `MarkdownEditor.tsx:286` is now `pt-[max(var(--sheet-pad-top),var(--pane-top-room,0px))]`. On mobile the var is unset (`PaneLeaf.tsx:144`), so the fallback `0px` leaves the old padding.
- SearchPill and title unmoved: done. Only the sheet's padding changed.
- Scrolled-state band: unaffected. The padding is inside the scroller and the band is in `PaneLeaf`.
- `.cm-frontmatter-spacer` (`theme.ts:79`) still reads `--sheet-pad-top`, which is unchanged, so spacing below the frontmatter is the same.
- Single pane on desktop: 3rem equals the 48px room, so nothing changes. Split panes go from 20–24px to 48px.
- Docs: `MarkdownEditor.md` updated.
- File size: `MarkdownEditor.tsx` is 380 lines, under the 400 limit.

**Findings**
- Minor: `MarkdownEditor.topRoom.test.tsx:28-29` asserts a Tailwind class string, which the repo rules discourage ("not CSS classes"). jsdom has no layout, and the test does fail on the old code, so it is acceptable here. It would break on a harmless class rewrite.
- Minor: the test uses a frontmatter note, but the padding rule is the same for every note. This is fine.

**Tests & docs gaps:** none that block approval.
