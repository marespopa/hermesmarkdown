## Review 1

**Verdict:** Approve with nits

**Checks:** Deferred to CI. Only to confirm the change: `vitest run` on details-blocks, details-fold, note-html and `app/editor/hooks` passed (22 files, 129 tests).

**PRD coverage**
- Scanner (`app/utils/details-blocks.ts`): done. It follows the PRD's recognition rules (fence, frontmatter and quote skipping, `open` attribute, summary on the opening line or the next non-blank line, nesting, unclosed outer dropped). 146 lines.
- Editor fold (`details-fold.ts`, `use-codemirror-callout-fold.ts`): done. Ranges, `initiallyCollapsed`, `setDetailsOpen` with `userEvent: "input.details.fold"`, and toggle re-lookup by `blockId` are all as designed. `MarkdownEditor.tsx` is untouched.
- Tag display: done (`details-fold.ts:86-110`). The summary is bold. Summary tags are hidden off the caret's lines and dimmed on them. Standalone `<details>`/`</details>` tags are always dimmed.
- Chevron label per kind: done (`FoldChevrons.tsx`).
- Export (`note-html.ts:280-298`, `render-note.ts`, `use-export-pdf.ts`, `note-embeds.ts`): done. `openDetails` is forced for PDF and embeds. The summary goes through `plain()`, so it is escaped. Raw HTML other than `<details>` is still dropped.
- CSS in `print-note.ts` and `html-export.ts`: done.
- Tests and docs: present. This covers the new and updated test files, README, MarkdownEditor.md, FoldChevrons.md and the in-app docs.
- Source files are all under 400 lines (`note-html.ts` 312).

**Findings**
- Minor: `detailsFoldRanges` folds through `closeLineEnd`. Text after `</details>` on its closing line therefore folds away with the section. For example `</details> trailing` hides ` trailing` when collapsed. This matches the PRD's wording ("through the end of the closing line"), so it is not a defect. It is a rare edge case.
- Minor: `renderInto` recurses with a body slice. A body that starts with `---` right after `</summary>` could be read as frontmatter by the scanner's `FM_REGEX` skip. This needs the `---` to sit on the same line as `</summary>`, so it is very unlikely.

No blockers or majors.

**Tests & docs gaps:** none found.

**Handoff:** none.
