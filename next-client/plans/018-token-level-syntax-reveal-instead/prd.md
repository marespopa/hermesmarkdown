# Token-level syntax reveal — engineering PRD

## Context

Source: [brief.md](brief.md). Today, when the caret is on a line, every Markdown mark on that line shows. Each time the caret moves onto or off a line, all of that line's inline marks appear or vanish at once, so the whole line reflows. The product ask is to reveal an **inline** mark only while the caret or selection touches the token it belongs to. Everything else on the line stays rendered. Heading `#`s and quote `>`s keep their current line-level reveal in the margin, and a heading line never drops to body size.

What exists (all paths under `next-client/app/editor/codemirror/`):

1. `syntax-reveal.ts` (117 lines) does the hiding. `activeLines(state, hasFocus)` (`:23`) returns the line numbers the selection touches, or none when the editor is unfocused. `buildSyntaxRevealDecorations(state, visibleRanges, active)` (`:38`) walks the Lezer tree. For each node it returns early when the node's line is active (`:67`, `if (isActive(ref.from)) return;`). Otherwise it hides (`Decoration.replace({})`, `:17`):
   - `EmphasisMark` / `StrikethroughMark` (`INLINE_MARKS`, `:20`)
   - an `InlineCode`'s `CodeMark` (`:70`)
   - an ATX heading's leading `HeaderMark` plus one space (`:72`)
   - a line's `QuoteMark` run plus a callout's `[!type]` (`:78`)

   It skips `FencedCode`/`CodeBlock`/`Table`/`HTMLBlock`/`CommentBlock` (`:59-65`) and frontmatter (`:51,58`). The `syntaxReveal` ViewPlugin (`:95`) rebuilds on doc, selection, viewport, focus or tree change. **Missing: reveal is per line, not per token.**
2. `live-markers.ts` puts the `#`s and `>`s in the margin (`cm-marginMarks`, `:104`, styled in `live-markers-theme.ts:49`). It adds a `MarginStrutWidget` (`:110`) so a row holding only marks keeps its height. It does this on every line, whatever the caret does, and it doesn't read the selection. **Already right; no change.**
3. Heading size comes from line classes. `highlight.ts:225` pushes `headingLineClass(level)` (`highlight-blocks.ts:30`, `cm-heading cm-heading-N`) from the regex `REGEX_HEADING = /^#{1,6}\s/` (`highlight-blocks.ts:8`). The sizes are set in `../editor-typography.scss:76-110`. `markdownHighlightPlugin` (`highlight.ts:276`) never reads the selection, so a heading keeps its size whether or not the caret is in it. **Already right; the PRD only locks it with a test.**
4. Inline marks are dimmed (`FADED_MARK`) on every line by `highlight-inline.ts:16,48-87`, so a revealed mark is still dimmed. **No change.**
5. Links already reveal per token. `link-display.ts:126` folds a link into a label widget unless `selectionTouchesLink` (`:48`, edges inclusive) is true. Wiki links work the same way. Tag/date chips and template-field pills also already reveal per token. **No change.**
6. `details-fold.ts:5,117,124` and `editor-performance.bench.ts:11,110` import `activeLines`. The bench also calls `buildSyntaxRevealDecorations` with the old 3-argument signature, so it has to be updated.
7. The docs describe line-level reveal: `../README.md:109,111`, `../components/MarkdownEditor.md` (the "live markers" parenthetical) and `app/documentation/content/editor-writing.tsx:150,155-158,167`. **They must be updated.**

## Behavior

Token = one of the Lezer inline nodes `Emphasis`, `StrongEmphasis`, `Strikethrough`, `InlineCode` (the `@codemirror/lang-markdown` GFM parser set up in `extensions.ts:94`). Its marks are its `EmphasisMark` / `StrikethroughMark` / `CodeMark` children.

1. **Focused editor, inline marks.** A token's marks show (as typed, dimmed) when any selection range touches the token. "Touches" means `range.from <= token.to && range.to >= token.from`, so the edges count: the caret just before the opening `**` or just after the closing `**` reveals them. Otherwise its marks are hidden. This is the same rule links already use (`selectionTouchesLink`).
2. **Rest of the line stays rendered.** With the caret in `**bold**` on `Some **bold**, _it_ and `code`.`, the `_` and backtick marks stay hidden. Moving from one bold word to another only opens and closes those two tokens.
3. **Nesting.** The caret inside `_it_` within `**bold _it_ more**` touches both tokens, so both reveal. The caret in `more` reveals only the `**`s. In `***both***` the caret reveals both nested tokens.
4. **Tokens across lines.** An emphasis that soft-wraps over two source lines of one paragraph reveals both of its marks when the caret is on either line, because touch is tested against the token's range, not its line.
5. **Selections.** Each range in a selection (including multi-cursor) reveals the tokens it touches. A selection over a whole paragraph reveals every token in it. That matches what it shows today.
6. **Typing next to a mark.** Hide and reveal ranges are exactly the parser's mark nodes, the same ones that are hidden today:
   - `**bold**|` + space: the caret leaves the token and its marks hide. Nothing else changes.
   - Typing the closing `**` of `**bold`: before the closing mark is complete, the parser has no token, so the `**` is plain visible text. Once the parser sees a token (`*bold*` after the first `*`, then `**bold**`), the caret is at its edge and touches it, so the marks stay shown. There is no hide/show flicker while you type.
   - `snake_case_name` and `2 * 3 * 4`, which the parser doesn't treat as emphasis, are never hidden.
7. **Block marks stay line-level, as today.** A heading's leading `#`s plus their space, a quote's or callout's `>` run and a callout's `[!type]` show whenever the caret or selection is on that line (via `activeLines`). The `#`s and `>`s hang in the margin (live-markers). The heading line keeps its `cm-heading-N` size with the caret on it, including an empty `## ` row. Inline tokens inside a heading, quote or callout follow rule 1: with the caret at the end of `## A **bold** title`, the `## ` shows and the `**`s stay hidden.
8. **Unfocused editor** (another split pane, a read-only preview): no marks show on any line, as today.
9. **Unchanged:** code blocks, tables, HTML blocks, frontmatter, list markers, task boxes, horizontal rules (`horizontalRuleCursorPlugin`), `<details>`/`<summary>` tags (`details-fold.ts`, line-level), links, chips. This is all editor-local display, so it works the same for every vault backend (local, OPFS, GitHub), for drafts and on mobile.

## Design

All the work is in `syntax-reveal.ts`. There are no atoms, hooks or components to add.

```ts
/** Where the selection reveals syntax: whole lines (block marks) and the
 *  ranges themselves (inline tokens). Both empty when the editor isn't focused. */
export interface RevealAt {
  lines: Set<number>;
  ranges: readonly { from: number; to: number }[];
}
export function revealAt(state: EditorState, hasFocus: boolean): RevealAt;
// lines = activeLines(state, hasFocus); ranges = hasFocus ? state.selection.ranges : []

export function buildSyntaxRevealDecorations(
  state: EditorState,
  visibleRanges: readonly { from: number; to: number }[],
  reveal: RevealAt,
): DecorationSet;
```

- Keep `activeLines` exported and unchanged, because `details-fold.ts` uses it.
- Add `const INLINE_TOKENS = new Set(["Emphasis", "StrongEmphasis", "Strikethrough", "InlineCode"]);` and a local `touches(ranges, from, to)` that uses the inclusive rule from Behavior 1.
- In `enter`, remove the blanket `if (isActive(ref.from)) return;` (`:67`). Instead:
  - Inline mark (`INLINE_MARKS`, or a `CodeMark` whose parent is `InlineCode`): `const token = ref.node.parent`. If `token` is in `INLINE_TOKENS` and `touches(reveal.ranges, token.from, token.to)`, leave it shown. Otherwise call `hide(ref.from, ref.to)`. A mark whose parent isn't one of these tokens keeps today's behavior: hide it. (This can't happen with the current grammar.)
  - `HeaderMark` and `QuoteMark` branches: first skip them when `reveal.lines.has(doc.lineAt(ref.from).number)`, then run the current logic unchanged.
  - When the editor is unfocused, `lines` and `ranges` are both empty, so everything hides. That is Behavior 8, with no special case.
- The plugin constructor and `update` (`:100,108-112`) pass `revealAt(state, view.hasFocus)`. The rebuild triggers stay the same.

Why do it this way rather than restyling the marks through `highlight.ts`? The hidden ranges already come from the Lezer tree, and the token groups come from the same tree. So what is hidden and what is revealed can never disagree (the brief's "match tokens exactly"). Moving the decision to the regex highlighter would break that.

Files stay small: `syntax-reveal.ts` grows to about 140 lines.

## Phase 1: Token-level inline reveal

- `app/editor/codemirror/syntax-reveal.ts`:
  - Add `RevealAt`, `revealAt`, `INLINE_TOKENS` and `touches`. Change the signature of `buildSyntaxRevealDecorations` (`:38`) and restructure `enter` (`:57-89`) as described in Design. Update the plugin (`:95-117`).
  - Rewrite the header comment (`:7-15`): inline marks show while the selection touches their token; heading/quote/callout marks show on the caret's lines; an unfocused editor shows none.
- `app/editor/codemirror/editor-performance.bench.ts:11,110`: build `revealAt(state, true)` and pass it wherever `active` is passed to `buildSyntaxRevealDecorations`. Keep `activeLines` if it is still used elsewhere in the file. Otherwise switch the import to `revealAt`.
- `app/editor/codemirror/live-markers.ts:9-16` (header comment): replace "on the caret's lines every Markdown character shows as typed" with the new split: inline marks while the caret touches their token, `#`/`>` on the caret's lines.
- `app/editor/codemirror/highlight-inline.ts:14-15` (`FADED_MARK` comment): "dimmed wherever they show" instead of "always shown as typed".
- Do not change `details-fold.ts`, `link-display.ts`, `highlight.ts` or `live-markers.ts` code.

## Tests

`app/editor/codemirror/syntax-reveal.test.ts`. Update the helper `hiddenText(doc, caret)` to pass `revealAt(state, caret !== null)`. Add a `hiddenTextSel(doc, ranges)` variant that builds a multi-range `EditorSelection`. Update or add tests that assert:

- On the existing sample (`## Title\n\nSome **bold**, _it_, ~~gone~~ and \`code\`.\n\n> Quoted`):
  - The caret in `bold` hides `## `, `_`,`_`, `~~`,`~~`, `` ` ``,`` ` `` and `> `, and does **not** hide the `**`s. This replaces the current "shows the caret line's marks" expectation `["## ", "> "]`.
  - The caret in `it` reveals only the `_`s. The caret in `code` reveals only the backticks.
- Edges count: with the caret right before the opening `**` or right after the closing `**`, the `**`s are not hidden. With the caret one character after (past `,`), they are hidden.
- Nesting: in `**bold _it_ more**`, the caret in `it` hides nothing, and the caret in `more` hides only the `_`s.
- A token across lines: in `**bold\nstill**`, the caret on line 2 hides neither `**`.
- Selection: a two-cursor selection (in `bold` and in `code`) reveals both tokens and hides `_` and `~~`.
- Headings keep line-level reveal: in `## A **bold** title`, the caret at the line's end hides the `**`s but not `## `. The caret on another line hides both.
- Quotes and callouts are unchanged: keep the existing callout test (`:39-43`) as it is.
- Intraword `_` and `2 * 3 * 4` are never hidden, wherever the caret is.
- Unfocused: everything hides (existing test `:35`).
- Frontmatter, code, list and quoted-table exclusions: keep the existing test (`:45`).

`app/editor/codemirror/highlight.test.ts`: add one test that `computeMarkdownDecorations` gives a `## Title` line the `cm-heading cm-heading-2` line class. Assert it for a state whose selection is on that line and for one whose selection is elsewhere, so the heading-size guarantee is locked.

No component tests are needed. These are pure functions over `EditorState`, with no mocks.

## Docs

- `app/editor/README.md:109` ("There's one mode…") and `:111` (Inline marks bullet): inline marks show, dimmed, while the caret or selection touches their token (bold word, italic, strike, inline code, edges included). A heading's `#`s and a quote's/callout's `>`/`[!type]` show on the caret's lines. Heading lines keep their size.
- `app/editor/components/MarkdownEditor.md`, the live-markers parenthetical ("on the caret's lines every Markdown character shows as typed…"): same wording.
- `app/documentation/content/editor-writing.tsx`, the `markdown-marks` section:
  - Lead `:150`: currently says every character stays on screen, which is already wrong. Change it to "Marks show where you're writing and step aside everywhere else."
  - Body `:155-158`: inline marks show only around the word or code span under the caret, so the rest of the line stays formatted. `#` and `>` still show on the caret's line, in the margin.
  - KV row `:167`: "Marks show while the caret is on or next to the word, dimmed; hidden elsewhere".
- Don't name other editors anywhere.

## Acceptance criteria

- [ ] With the caret inside one bold word, only that word's `**` show. Other emphasis, strike and inline-code marks on the same line stay hidden.
- [ ] The caret right before or right after a token reveals its marks. One character further away hides them.
- [ ] Nested tokens reveal from the inside out, as in Behavior 3. A token spanning two lines reveals both marks from either line.
- [ ] Each selection range or cursor reveals the tokens it touches.
- [ ] A heading's `#`s and a quote's/callout's `>` / `[!type]` still show whenever the caret is on their line, in the margin, and the heading keeps its size (tested in `highlight.test.ts`).
- [ ] Typing the closing mark, or a space or punctuation after it, never makes a mark flicker. Hidden ranges are exactly the parser's mark nodes.
- [ ] An unfocused editor hides every mark.
- [ ] `editor-performance.bench.ts` compiles against the new signature. The `activeLines` export is kept for `details-fold.ts`.
- [ ] `syntax-reveal.test.ts` and `highlight.test.ts` cover the cases in Tests. CI passes.
- [ ] README, MarkdownEditor.md and the in-app doc describe token-level reveal. No other editor is named in code or docs.
- [ ] `syntax-reveal.ts` stays under 400 lines.

## Decisions

- **Token edges count as touching** (inclusive), the same as `selectionTouchesLink`. Without this, the closing mark would hide the instant it is typed, and arrowing into a token would jump the caret past hidden marks.
- **Block marks stay line-level.** The brief says the `#` marks reveal "as today". Quotes and callouts follow the same rule, and their marks are in the margin anyway, so they never shift text.
- **Token = Lezer node,** not the regex highlighter's matches. Hide ranges already come from the tree, so the reveal grouping comes from it too.
- **`<details>`/`<summary>` tags stay line-level.** They are raw HTML handled by `details-fold.ts`, not Markdown marks.
- **No setting** to switch back to line-level reveal. The brief replaces the behavior and asks for no option.

## Out of scope / Deferred

- Changing links, wiki links, chips, template pills or horizontal rules. They are already token-level or have their own display.
- Making the regex inline styling in `highlight-inline.ts` (bold/italic classes) agree with the parser on edge cases.
- Atomic cursor motion over hidden marks.
- Token-level reveal for `<summary>` tags or escapes (`\*`).

## Open questions

- None blocking. The product owner may want to confirm that quote/callout `>` marks keep line-level reveal like headings. The brief only mentions headings.
