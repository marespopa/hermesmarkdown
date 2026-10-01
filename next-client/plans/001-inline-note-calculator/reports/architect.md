# Inline note calculator — architect report

## Run 1

**PRD:** `next-client/plans/001-inline-note-calculator/prd.md`

### Summary (2 phases)
- **Phase 1:** extend `utils/math-eval.ts` with variables, multi-word case-insensitive names, `%` (relative to the left side for `+`/`-`), `X% of Y`, strict `1,200` separators and an `isLiteral` flag. The new `evaluateMathExpression(expr, options)` sits alongside an unchanged `evaluateMath`.
- **Phase 1:** a new pure `utils/note-calc-scan.ts`, a line-state scanner that skips frontmatter, backtick and tilde fences (closing per CommonMark) and `$$` blocks. A strict assignment regex keeps `==`, `>=`, `<=` and `!=` from being treated as assignments. Scope is a persistent linked chain. `NoteCalcCache` invalidates from the first edited line and only scans up to the last visible line.
- **Phase 2:** a new `codemirror/note-calc.ts` view plugin draws `= result` widgets at line end for `view.visibleRanges` only, with its own `baseTheme` (`--fg-faint`). It's registered in `extensions.ts` and never dispatches, so the file stays clean.
- **Phase 2:** docs in `app/editor/README.md`, the repo `README.md`, the in-app `editor-writing.tsx` and `ARCHITECTURE.md`.

### Already exists
- A safe arithmetic tokenizer and parser (`math-eval.ts`) and the `calc(…)=` shortcode, which stays untouched.
- The line-end widget plugin pattern (`annotation-display.ts`), the preview facet helpers, and the frontmatter and fence detection conventions (`frontmatter-fold.ts`, `rendered-block.ts`).

### Decisions / open questions to check before handoff
- There's **no settings toggle**. Labels show in **Preview** too.
- Bare literals (`1200`, `rent = 1200`, `tax = 15%`) get **no label**.
- Unspaced `-`/`/` number runs (dates, phone numbers, `10-12`) are **not evaluated**.
- An invalid reassignment makes the name **undefined**.
- Names are case-insensitive and can be multi-word. `of` is reserved.
- Percent semantics apply only to a direct `%` operand of `+`/`-`. Variables hold plain fractions.
- Output has at most 4 decimals and no thousands grouping (`= 1380`).
- Open: thousands grouping for large results, and European decimal commas. Neither blocks the work.

### Handoff
`Implement next-client/plans/001-inline-note-calculator/prd.md, phase 1 then phase 2`
