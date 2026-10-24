# Architect report — 014 render raw HTML `<details><summary>`

## Run 1

**PRD:** `next-client/plans/014-render-raw-html-details-summary/prd.md`

**Summary** (2 phases):
- A new pure scanner `app/utils/details-blocks.ts#findDetailsBlocks` finds closed, line-start `<details>` blocks (summary on the same or next non-blank line, `open` attribute, nesting, skipping fences, frontmatter and quotes). The editor and the export both use it.
- Phase 1, export: `noteToHtml` renders each section as `<details><summary>…</summary>body</details>`, with the body as Markdown. Export as PDF and embeds force every section open; Export as HTML keeps the note's state. It gets callout-matching CSS in `PRINT_CSS`, plus a dark-mode border.
- Phase 2, editor: `codemirror/details-fold.ts` gives the fold ranges, `setDetailsOpen`, and a `detailsMarks` plugin (bold summary; summary tags hidden off the caret line and dimmed on it; standalone `<details>`/`</details>` lines always dimmed).
- The existing `use-codemirror-callout-fold.ts` hook and `FoldChevrons` take on details chevrons (`kind`). Sections start collapsed unless they have `open`, and the chevron writes or removes `open`. `MarkdownEditor.tsx` (401 lines) is untouched.

**Already exists:** CM6 fold machinery and callout chevrons (`callout-fold.ts`, `use-codemirror-callout-fold.ts`, `FoldChevrons.tsx`), caret-line reveal (`activeLines` in `syntax-reveal.ts`), and the shared export renderer (`note-html.ts` → `render-note.ts` → PDF/HTML). Today raw HTML blocks are dropped in export (the summary is lost) and shown as plain raw text in the editor.

**Decisions / open questions to look at:**
- The chevron **writes `open` into the note** on toggle, the same way the callout chevron writes `-`/`+`. So folding a note imported from another tool edits that file. This is the open question in the PRD.
- Sections start collapsed unless they have `open`. In PDF and embeds they're always open. In HTML export they keep the note's state.
- Multi-line summaries, inline Markdown in summaries, and `<details>` inside callouts or lists are not folded in the editor (deferred).

**Handoff:** `Implement next-client/plans/014-render-raw-html-details-summary/prd.md, phases 1–2`
