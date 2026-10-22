# Architect report — 018 token-level syntax reveal

## Run 1

**PRD:** `next-client/plans/018-token-level-syntax-reveal-instead/prd.md`

**Summary** (1 phase):
- Inline marks (`**`, `*`/`_`, `~~`, inline-code backticks) show only while the caret or a selection range touches their token. Token edges count as touching. The rest of the line stays rendered.
- Tokens and hide ranges both come from the Lezer tree (`Emphasis`, `StrongEmphasis`, `Strikethrough`, `InlineCode` and their mark children), so typing next to a mark can't make it flicker. Nesting, tokens across lines and multi-cursor selections are covered.
- Heading `#`s and quote/callout `>`/`[!type]` keep their line-level reveal in the margin.
- All the work is in `syntax-reveal.ts`: a new `revealAt(state, hasFocus)` and a new third argument to `buildSyntaxRevealDecorations`. The bench call site is updated, comments and docs are rewritten, and `syntax-reveal.test.ts` and `highlight.test.ts` get tests.

**Already exists:**
- Heading lines keep their size with the caret on them. The line classes in `highlight.ts:225` don't depend on the selection. The PRD adds a test to lock this.
- `#`/`>` already hang in the margin, with a strut for rows that hold only marks (`live-markers.ts`).
- Links, wiki links, chips and template pills already reveal per token (`link-display.ts#selectionTouchesLink`).
- Revealed marks are already dimmed (`highlight-inline.ts`).

**Decisions / open questions:**
- Edges are inclusive (caret right before or after `**bold**` reveals them).
- Quote/callout marks stay line-level like headings. This is non-blocking, but the product owner may want to confirm it.
- `<details>`/`<summary>` tags stay line-level. There is no setting to switch back.

**Handoff:** Implement next-client/plans/018-token-level-syntax-reveal-instead/prd.md, phase 1.
