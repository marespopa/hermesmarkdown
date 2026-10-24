# Engineer report — 014 render raw HTML details/summary

## Built
- Pure scanner `app/utils/details-blocks.ts` (`findDetailsBlocks`, `outermostDetailsBlocks`, `REGEX_DETAILS_OPEN_ATTR`): recognition, summary, nesting, fences/frontmatter/quotes ignored.
- Export: `app/utils/print/note-html.ts` (`openDetails` option, `renderInto` splits around sections, old body is `renderMarkdown`); `app/editor/utils/render-note.ts` `options` param; `use-export-pdf.ts` passes `{ openDetails: true }`; `note-embeds.ts` passes it too; CSS in `print-note.ts` and dark border in `html-export.ts`.
- Editor: `app/editor/codemirror/details-fold.ts` (`detailsFoldRanges`, `setDetailsOpen`, `buildDetailsMarkDecorations`, `detailsMarks`); `detailsMarks` added in `extensions.ts`; `use-codemirror-callout-fold.ts` handles `kind: "details"` chevrons (create, initial fold, toggle writes `open`); `FoldChevrons.tsx` labels "section". `MarkdownEditor.tsx` untouched.

## Tests/docs
- New: `details-blocks.test.ts`, `details-fold.test.ts`. Updated: `note-html.test.ts`, `use-codemirror-callout-fold.test.ts`, `use-export-pdf.test.tsx`, `use-export-html.test.tsx`.
- Docs: `FoldChevrons.md`, `MarkdownEditor.md`, `app/editor/README.md`, in-app `editor-writing.tsx` and `export-pdf.tsx`.

## Decisions
- `buildDetailsMarkDecorations` takes an optional third `visibleRanges` argument (the plugin passes it).
- A `<details>` with no summary keeps its tag visible (dimmed) even on the header line, to avoid a blank row.
- The PDF/HTML export tests go through the real `renderNote` (it isn't mocked there), so they assert on the output HTML rather than call arguments.
- `note-html.ts` is 312 lines (under 400).

## Not done / open
- No `FoldChevrons` component test (none existed).
- Nothing run (per rules).

## To verify
`corepack yarn tsc --noEmit` and `corepack yarn vitest run app/utils/details-blocks.test.ts app/editor/codemirror/details-fold.test.ts app/utils/print/note-html.test.ts app/editor/hooks`. Manually: a note with a `<details>` block opens folded, chevron toggles `open` in the text, summary bold, tags hidden off the caret line.
