# Engineer report: 020

- **Built:** sheet top padding is now `max(--sheet-pad-top, --pane-top-room)` (`app/editor/components/MarkdownEditor.tsx`, `pt-[max(...)]`). Split panes were 20/24px, under the 48px title room, so the Properties row sat under the breadcrumb. SearchPill, title and scrolled band are untouched; `--sheet-pad-top` is unchanged, so the frontmatter spacer is too. Mobile leaves `--pane-top-room` unset, so it falls back to 0.
- **Tests/docs:** new `MarkdownEditor.topRoom.test.tsx` (fails on the old class, single and split); `MarkdownEditor.md` updated.
- **Decisions:** jsdom has no layout, so the test asserts the padding rule on the sheet's class. New test file because `MarkdownEditor.test.tsx` is over 400 lines.
- **Not done:** nothing run (per rules).
- **To verify:** `corepack yarn vitest run app/editor/components/MarkdownEditor.topRoom.test.tsx`; in a split, open a note with frontmatter and check the Properties row clears the breadcrumb.
