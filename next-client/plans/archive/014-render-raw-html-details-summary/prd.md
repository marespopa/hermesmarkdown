# Render raw HTML `<details><summary>` blocks as foldable sections — engineering PRD

## Context

Source: [brief.md](brief.md). Notes written in other tools (GitHub READMEs, issue templates, other editors) use the HTML form

```
<details>
<summary>Release notes</summary>

Body in **Markdown**.

</details>
```

The ask: in the editor, fold such a block like a callout fold (summary line stays visible, body folds, same chevron); in Export as PDF / Export as HTML render it as a real section. Hermes's own `> [!note]-` callout fold already covers Hermes-written notes, so this reuses that machinery and stays light.

What exists:

1. **Callout folding** — `app/editor/codemirror/callout-fold.ts`: `findCalloutFoldRanges(doc)` (line scan, `:28`), `toggleCalloutFold(view, from, to, collapse)` (`foldEffect`/`unfoldEffect`, `:98`), `setCalloutFoldSign` (writes `-`/`+` into the title line so the state is saved, `:110`), `isRangeFolded` (`:123`). CM6's `codeFolding()` is registered in `app/editor/codemirror/extensions.ts:89`; the fold placeholder is invisible and the body range starts at the title line's own trailing newline, so the folded body attaches to the title line (comment at `callout-fold.ts:84`).
2. **Chevrons** — `app/editor/hooks/use-codemirror-callout-fold.ts` (92 lines): `recompute` positions one chevron per callout via `coordsAtPos(titleOffset)`, skips off-viewport ones, keeps the same array when nothing changed (`sameChevrons`); `onViewCreated` folds callouts marked `-`; `toggle(view, blockId)` writes the sign then folds/unfolds. Rendered by `app/editor/components/markdown-editor/FoldChevrons.tsx` (46 lines; label hard-coded "Expand/Collapse callout", `:24`). Wired in `app/editor/components/MarkdownEditor.tsx:192-229, 332-341` — **that file is 401 lines; this plan must not add lines to it.**
3. **Syntax reveal** — `app/editor/codemirror/syntax-reveal.ts`: marks are hidden off the caret's lines and shown dimmed on them. `activeLines(state, hasFocus)` is exported (`:23`). `HTMLBlock`/`CommentBlock` are skipped entirely (`:63`), so today `<details>`/`<summary>` show as plain raw text with no fold.
4. **Export rendering** — `app/utils/print/note-html.ts#noteToHtml` (284 lines) parses with Lezer Markdown and **drops every `HTMLBlock`** (`block()`, `:254-258`). Today a `<details>` block exports as its loose Markdown body paragraphs with the summary lost (the `<summary>` line is an HTML block and vanishes). Callouts render as `<div class="callout">` (`blockquote()`, `:170`), and folded callouts print expanded. `renderInto(ctx, source, top)` (`:265`) is the recursive block renderer (also used for callout bodies). Callers: `app/editor/utils/render-note.ts#renderNote` (`:31`, used by `app/editor/hooks/use-export-pdf.ts:87` and `app/editor/hooks/use-export-html.ts:37`) and `app/editor/codemirror/note-embeds.ts:159` (read-only embed widget).
5. **Export CSS** — `PRINT_CSS` in `app/editor/utils/print-note.ts:11` (`.callout` rules at `:30-34`), dark-mode overrides in `HTML_EXPORT_CSS`, `app/editor/utils/html-export.ts:20`.

Missing: (A) a pure `<details>` block scanner; (B) editor fold + chevron for those blocks; (C) quiet display of the tags; (D) export rendering as `<details><summary>`.

## Behavior

Recognition (shared by editor and export):
- An **opening line** starts, after at most 3 spaces, with `<details` followed by whitespace or `>` (case-insensitive), the tag closed by `>` on that line: `/^ {0,3}<details(?=[\s>])([^>]*)>/i`. Lines starting with `>` (quotes, callouts) aren't checked. Lines inside top-level fenced code (```` ``` ```` / `~~~`) and inside the frontmatter are ignored.
- It **starts open** if the tag has an `open` attribute (`open`, `open=""`, `open="open"`; case-insensitive). Otherwise it starts collapsed, as HTML does.
- **Summary**: `<summary…>…</summary>` on the opening line right after the `<details>` tag (only whitespace between them), *or* on the next non-blank line (blank lines in between are fine) when that line starts, after at most 3 spaces, with `<summary`, and `</summary>` is on the same line. The summary text is the content between the tags with any inner tags stripped, the common entities decoded (`&amp; &lt; &gt; &quot; &#39; &nbsp;`), trimmed. A summary that runs over several lines counts as no summary.
- The **header line** is the summary's line. With no summary it is the opening line.
- **Closing**: the `</details>` (case-insensitive, anywhere on a line) that brings the nesting depth back to 0. Each later opening line adds one level; fenced-code lines are skipped. A block that is never closed isn't a section (left as raw text); closed blocks nested inside it still are.
- Nested sections are each their own section.

Editor:
- A section whose closing line comes after its header line gets the same chevron callouts get, at the right edge of the header line. Folding hides from the end of the header line through the end of the closing line (the `</details>` line folds away with the body). When the `<details>` tag sits on its own line above the summary line, that line stays visible above it.
- On opening a note, sections without `open` start collapsed, those with `open` expanded (as callouts with `-`/`+`). Sections typed later aren't auto-collapsed (same as callouts today).
- Clicking the chevron toggles and **writes the state into the note**: expanding adds ` open` to the `<details …>` tag (just before its `>`), collapsing removes the `open` attribute. This is the same idea as the callout `-`/`+` sign, so the note reopens the same way here and on GitHub. One undo step, `userEvent: "input.details.fold"`. Focus returns to the text (existing `MarkdownEditor.tsx:338`).
- Chevron label: "Expand section" / "Collapse section" (callouts keep "… callout").
- Tag display, in line with caret-line syntax reveal: the summary text is bold (like a callout title). On lines the caret or selection touches, `<summary…>`, `</summary>` and an inline `<details…>` tag on the summary line show as typed, dimmed (`FADED`); on other lines, and in an unfocused editor, those tags are hidden, so the line reads as just the bold title. A `<details…>` or `</details>` tag on a line of its own is always shown dimmed and never hidden (hiding it would leave a blank-looking row). No card or tint: these blocks aren't typed like callouts.
- Same on desktop, mobile and split panes: the extension and hook are per-view. Vault backend doesn't matter: it's text, saved through the normal edit path.

Export:
- Each section renders as `<details[ open]><summary>{summary text, or "Details"}</summary>{body rendered as Markdown}</details>`. The body is the text between the summary's `</summary>` (or the opening tag if there's no summary) and the closing `</details>`, rendered with the normal Markdown renderer, nested sections included. Text after `</details>` on its line renders as the following content.
- **Export as PDF** and **embeds** (`![[Note]]` widgets): every section is open (like folded callouts printing expanded; an embed is read-only and inside a CodeMirror widget).
- **Export as HTML**: keeps each section's state from the note (`open` or not), so the reader can expand it in the browser. Native `<details>`: no script.
- Other raw HTML is still left out, as now.

## Design

**Why line scanning over the Lezer tree:** Lezer splits `<details>` content at blank lines into separate `HTMLBlock`/`Paragraph` nodes, so the tree doesn't give the section boundaries. A line scanner like `findCalloutFoldRanges` does, and the same pure scanner serves the editor and the export.

### `app/utils/details-blocks.ts` (new, pure, ~130 lines)

```ts
export interface DetailsBlock {
  openLine: number;          // 0-based line index of the <details…> line
  openFrom: number;          // offset of "<details"
  openTagTo: number;         // offset just past the opening tag's ">"
  open: boolean;             // has an `open` attribute
  headerLine: number;        // the summary's line, or openLine without a summary
  headerLineEnd: number;     // offset of the header line's end (before its "\n")
  summary: { tagFrom: number; textFrom: number; textTo: number; tagTo: number; text: string } | null;
  bodyFrom: number;          // just past "</summary>" (or the opening tag without a summary)
  closeLine: number;
  closeFrom: number;         // offset of "</details>"
  closeTo: number;           // offset just past "</details>"
  closeLineEnd: number;      // offset of the closing line's end
}

/** Every closed <details> block in `doc`, outer before inner, in document order. */
export function findDetailsBlocks(doc: string): DetailsBlock[];

/** `blocks` without those nested inside another (for rendering one level at a time). */
export function outermostDetailsBlocks(blocks: DetailsBlock[]): DetailsBlock[];

/** Regex for the `open` attribute inside a tag's attribute string (exported for setDetailsOpen). */
export const REGEX_DETAILS_OPEN_ATTR: RegExp; // /\s+open(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?(?=[\s>/]|$)/i
```

Implementation: split into lines with offsets (same as `callout-fold.ts:29-35`); skip the frontmatter (`FM_REGEX` from `app/utils/frontmatter-utils.ts`, as `note-html.ts:15` imports it: start scanning after the match length); track a top-level fence (a line matching `/^ {0,3}(`{3,}|~{3,})/` opens/closes it, same char and at least the same length); keep a stack of open blocks; on a `</details>` occurrence (count each occurrence on a line, `/<\/details\s*>/gi`) pop and emit when closed. A line that both opens and closes (`<details><summary>A</summary>x</details>`) yields a block with `closeLine === headerLine`. Emit sorted by `openFrom`.

### `app/editor/codemirror/details-fold.ts` (new, ~150 lines)

```ts
export interface DetailsFoldRange {
  blockId: string;           // `details:${openLine}`
  titleOffset: number;       // start of the header line (chevron anchor)
  bodyFrom: number;          // = headerLineEnd
  bodyTo: number;            // = closeLineEnd
  initiallyCollapsed: boolean; // !open
  openFrom: number;
}

/** Blocks for a doc, cached per CodeMirror `Text` (WeakMap, as frontmatterFoldRangeOf in frontmatter-fold.ts:52). */
export function detailsBlocksOf(doc: Text): DetailsBlock[];
/** Foldable sections: closeLine > headerLine. */
export function detailsFoldRanges(doc: Text): DetailsFoldRange[];
/** Adds or removes the `open` attribute of the <details> tag at `openFrom`. False when already so or not a tag. */
export function setDetailsOpen(view: EditorView, openFrom: number, open: boolean): boolean;
/** Bold summary, dimmed/hidden tags (see Behavior). */
export function buildDetailsMarkDecorations(state: EditorState, active: Set<number>): DecorationSet;
export const detailsMarks: ViewPlugin<…>;
```

- `detailsBlocksOf`: bail out with `[]` without scanning when the doc has no `<details` (case-insensitive) — `doc.toString()` once per `Text`, cached, so caret moves don't rescan.
- `setDetailsOpen`: read the tag with `/^<details(?=[\s>])([^>]*)>/i` on `doc.sliceString(openFrom, line.to)`. Open: insert `" open"` at `openFrom + match[0].length - 1` (before `>`; skip a trailing `/`). Close: delete every `REGEX_DETAILS_OPEN_ATTR` match in the attribute string. Dispatch with `userEvent: "input.details.fold"`.
- `buildDetailsMarkDecorations`: for each block, `Decoration.mark({ class: "font-bold" })` over the summary text; summary tags (and the opening tag when `openLine === headerLine`): `hidden` (`Decoration.replace({})`) unless the header line is in `active`, then `Decoration.mark({ class: FADED })` (`FADED` from `app/editor/codemirror/highlight-inline.ts:13`); an opening tag on its own line and the `</details>` tag: always `FADED`. Use `Decoration.set(ranges, true)`. Limit to blocks touching `view.visibleRanges`.
- `detailsMarks` plugin: rebuild on `docChanged || selectionSet || viewportChanged || focusChanged`, with `activeLines(state, view.hasFocus)` from `syntax-reveal.ts:23` (same pattern as `syntaxReveal`, `syntax-reveal.ts:95-117`).

### Hook: `use-codemirror-callout-fold.ts` (extend, don't fork)

`Chevron` gains `kind: "callout" | "details"` (and `openFrom?: number`). `recompute` concatenates callout ranges (kind `callout`) and `detailsFoldRanges(view.state.doc)` (kind `details`); `sameChevrons` also compares `kind`. `onViewCreated` also folds details ranges with `initiallyCollapsed`. `toggle(view, blockId)`: callout branch unchanged; details branch: `setDetailsOpen(view, chevron.openFrom, !collapse)` (open when expanding), then look the range up again by `blockId` (the attribute edit shifts offsets but not line indices) in `detailsFoldRanges(view.state.doc)` and `toggleCalloutFold(view, r.bodyFrom, r.bodyTo, collapse)`; then `recompute`. `MarkdownEditor.tsx` needs no change: it already passes `chevron.blockId` and the hook's chevrons.

Alternative considered: a second hook + second `<FoldChevrons>` in `MarkdownEditor.tsx` — rejected, the file is at 401 lines and the two folds behave the same.

### Export: `note-html.ts`

`NoteHtmlOptions` gains `openDetails?: boolean` (true: every section renders open). `Context` carries it. `renderInto(ctx, source, top)` first runs `outermostDetailsBlocks(findDetailsBlocks(source))`; with none, it does what it does now. With some, it renders the source in pieces: the text before each block (through the existing parse path, with `top` kept so page breaks still work at the top level), then the block as
`<details${b.open || ctx.openDetails ? " open" : ""}><summary>${plain(b.summary?.text || "Details")}</summary>${renderInto(ctx, source.slice(b.bodyFrom, b.closeFrom))}</details>`, then continues from `b.closeTo`. Pieces joined with `"\n"`. Frontmatter is already stripped before `renderInto`, and in a callout body the `>`s are already stripped, so a `<details>` inside a callout renders too (export only; the editor doesn't fold those, see Out of scope). Move the piece-splitting into a helper `renderWithDetails` to keep `renderInto` readable; the file stays under ~330 lines.

`render-note.ts#renderNote` gains a 5th optional parameter `options: { openDetails?: boolean } = {}` passed into `noteToHtml`. `use-export-pdf.ts:87` passes `{ openDetails: true }`; `use-export-html.ts:37` passes nothing. `note-embeds.ts:159` calls `noteToHtml(section, { openDetails: true })`.

CSS, `print-note.ts#PRINT_CSS` (after the `.callout` rules, `:34`), matching the callout's border and radius:
```css
details { border: 1px solid #e3ded6; border-radius: 6px; padding: 0.6em 0.9em; margin: 0 0 0.8em; }
summary { font-weight: 600; cursor: pointer; }
details[open] > summary { margin-bottom: 0.3em; }
details > :last-child { margin-bottom: 0; }
```
`html-export.ts#HTML_EXPORT_CSS` dark block (`:20`): add `details` to the `border-color: #3d3833` selector list. Hard-coded hex values are the existing convention for export CSS (a standalone document can't read the app's CSS vars).

## Phase 1: Shared scanner and export

- `app/utils/details-blocks.ts` — new, as in Design.
- `app/utils/print/note-html.ts` — `openDetails` option, `Context.openDetails`, `renderWithDetails` used by `renderInto` (`:265`); update the header comment (`:7-11`: raw HTML is dropped *except* `<details>` sections, which render as `<details>`, open unless the note leaves them closed, all open with `openDetails`).
- `app/editor/utils/render-note.ts` — `options` parameter on `renderNote` (`:31`), passed to `noteToHtml` (`:50`).
- `app/editor/hooks/use-export-pdf.ts:87` — pass `{ openDetails: true }`.
- `app/editor/codemirror/note-embeds.ts:159` — `noteToHtml(section, { openDetails: true })`.
- `app/editor/utils/print-note.ts` — `details`/`summary` rules in `PRINT_CSS`.
- `app/editor/utils/html-export.ts` — `details` in the dark border-color list.

## Phase 2: Editor fold and display

- `app/editor/codemirror/details-fold.ts` — new, as in Design.
- `app/editor/codemirror/extensions.ts` — import `detailsMarks` and add it after `collapsedCalloutCorners` (`:92`).
- `app/editor/hooks/use-codemirror-callout-fold.ts` — `kind`/`openFrom` on `Chevron`, details ranges in `recompute`, `onViewCreated`, `toggle` (Design). Update the header comment to say it covers both.
- `app/editor/components/markdown-editor/FoldChevrons.tsx` — `FoldChevron` gains `kind?: "callout" | "details"`; label `` `${collapsed ? "Expand" : "Collapse"} ${kind === "details" ? "section" : "callout"}` `` (`:24`). Update the comment at `:18`.
- `app/editor/components/MarkdownEditor.tsx` — no change.

## Tests

Phase 1:
- `app/utils/details-blocks.test.ts` (new): separate-line form (`<details>` / `<summary>` / blank / body / `</details>`) gives the right `headerLine`, `bodyFrom`, `closeLineEnd`, `open: false`; inline form `<details><summary>T</summary>` has `headerLine === openLine`; `<details open>`, `<DETAILS OPEN="open">`, `<details class="x" open>` are open, `<details data-open="1">` isn't; blank lines between `<details>` and `<summary>` still find the summary; a multi-line summary gives `summary: null` and `headerLine === openLine`; summary text strips inner tags and decodes `&amp;`; nested blocks both found, outer first, `outermostDetailsBlocks` keeps only the outer; unclosed outer dropped while a closed inner is kept; `<details>` inside a ``` fence and inside frontmatter ignored; `> <details>` ignored; `<detailsx>` / `<details-foo>` not matched; one-line `<details><summary>A</summary>x</details>` has `closeLine === headerLine`.
- `app/utils/print/note-html.test.ts` (update): a section renders `<details><summary>T</summary>` with its body Markdown rendered (`<strong>`), no `open` by default; `open` kept from the note; `openDetails: true` opens all; missing summary → `Details`; summary HTML is escaped (`<summary><img src=x onerror=…></summary>` → no `<img` in the output; `<summary>a &lt; b</summary>` → `a &lt; b`); nested sections nest; text after `</details>` still renders; other raw HTML still dropped; a page-break marker before a section still becomes a page break.
- `app/editor/hooks/use-export-pdf.test.tsx` (update): `renderNote` (mocked) is called with `{ openDetails: true }`. `use-export-html.test.tsx`: called without it (or with no `openDetails`).

Phase 2:
- `app/editor/codemirror/details-fold.test.ts` (new; `EditorView` with `codeFolding()` as in `callout-fold.test.ts:7`): `detailsFoldRanges` ranges and `initiallyCollapsed`; a one-line block gives no range; `setDetailsOpen` adds ` open` (`<details>` → `<details open>`, `<details class="x">` → `<details class="x" open>`), removes `open`/`open=""`/`open="open"`, returns false when already in that state; `buildDetailsMarkDecorations` hides the summary tags when the header line isn't active and dims (not hides) them when it is, never hides a standalone `<details>`/`</details>` tag, and marks the summary text bold (assert via decoration ranges/specs, not CSS output).
- `app/editor/hooks/use-codemirror-callout-fold.test.ts` (update): with a doc holding a closed `<details>` section, `onViewCreated` folds it and a `<details open>` one stays open; the chevron list includes a `kind: "details"` entry; `toggle` on it writes ` open` and unfolds, toggling again removes `open` and folds; callout behaviour unchanged (existing cases still pass).
- `app/editor/components/markdown-editor/FoldChevrons` — if a test exists or is added: a `kind: "details"` chevron is labelled "Expand section" / "Collapse section".

All fully mocked; no network, no file system.

## Docs

- `app/editor/components/markdown-editor/FoldChevrons.md` — chevrons also on `<details>` sections; label per kind.
- `app/editor/components/MarkdownEditor.md` — "callout folding" → "callout and `<details>` folding"; mention `codemirror/details-fold.ts` and that toggling writes `open`.
- `app/editor/README.md` — next to the **Callouts** bullet (`:112`) add a **`<details>` sections** bullet (recognition rules in short, the fold, `open` written on toggle, the tag display); update the export note there and the `use-export-pdf.ts` row (`:65`) — sections print open.
- In-app docs: `app/documentation/content/editor-writing.tsx` KV (`:171`, after the callout fold row): `{ label: "<details><summary>Title</summary> … </details>", value: "Folds like a callout: the summary stays, the body folds. Starts collapsed unless the tag says open; the chevron writes open for you" }` (escape `<` as JSX text needs). `app/documentation/content/export-pdf.tsx`: "Printed" (`:20`) adds "`<details>` sections (open)"; "Left out" (`:21`) → "Frontmatter, comments and other raw HTML"; Export as HTML "Included" (`:66`) adds "`<details>` sections, open or closed as in the note".

## Acceptance criteria

- [ ] A note with `<details>` / `<summary>Title</summary>` / body / `</details>` opens with the body folded, a chevron on the summary line, and the summary reading as a bold "Title" when the caret is elsewhere.
- [ ] `<details open>` opens expanded.
- [ ] Clicking the chevron expands and the tag becomes `<details open>`; clicking again folds and `open` is removed; each is one undo step; focus returns to the text.
- [ ] With the caret on the summary line, `<summary>` / `</summary>` show dimmed; off it, they're hidden. Standalone `<details>` / `</details>` lines always show dimmed.
- [ ] Inline `<details><summary>T</summary>` on one line works the same.
- [ ] Nested sections each get their own chevron; an unclosed `<details>` gets none; `<details>` in a code fence or in frontmatter is ignored.
- [ ] Callout folding behaves exactly as before.
- [ ] Export as PDF shows each section with its summary and body, always open; Export as HTML keeps each section's open/closed state, collapsible in the browser; embeds show sections open.
- [ ] Summary text is escaped in export (no HTML injection).
- [ ] `MarkdownEditor.tsx` unchanged; every new or changed source file under 400 lines.
- [ ] Tests listed above added/updated; docs updated.

## Decisions

- **Toggle writes `open`** into the note, mirroring how the callout chevron writes `-`/`+` (`setCalloutFoldSign`). The fold state then survives reopening here and on GitHub. Side effect: folding a note imported from elsewhere edits it, as it already does for callouts.
- **Start collapsed unless `open`**: HTML's own default, and what the brief means by "fold neatly".
- **Tags hidden off the caret line, standalone lines kept dimmed**: follows caret-line syntax reveal for the summary line. Hiding a whole `<details>` / `</details>` line would leave an empty-looking row, and collapsing rows needs block decorations, so we don't.
- **No card/tint** in the editor or a type colour; just bold summary and a light border in export, which keeps it light as the brief asks.
- **Multi-line summaries aren't supported** (no summary is found; the `<details>` line is the header). They're rare, and supporting them complicates the header-line model.
- **Summary is plain text** in export (inner tags stripped, entities decoded, then escaped). No inline Markdown/HTML in summaries.
- **PDF and embeds force open**: a printed or read-only collapsed section would hide content; same as callouts printing expanded.
- **Recognised only at line start (≤3 spaces), not in quotes/callouts or list-indented** in the editor; matches where Markdown starts an HTML block.

## Out of scope / Deferred

- Folding `<details>` inside callouts, quotes or indented list items in the editor.
- Inline Markdown or HTML inside `<summary>`; multi-line summaries.
- Rendering any other raw HTML in the editor or export.
- A slash command or palette entry to insert a `<details>` block.
- Auto-collapsing sections typed or pasted after the note opened.
- AI syntax guide changes (`hermes-syntax-guide.ts`).

## Open questions

- Is it fine that folding/unfolding a section writes `open` into the file, as callout folding writes its sign? (Assumed yes, for consistency.) If not, the fold state would be session-only and the note's `open` would only set the initial state.
