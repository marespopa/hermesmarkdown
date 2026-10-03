---
state: merged
blocked_from: 
rejections: 1
created: 2026-10-01T16:58:06Z
---

# Inline note calculator

## Problem
People jot down quick budgets, estimates and back-of-the-envelope numbers while writing notes. Today the only math in the editor is the `calc(...)=` shortcode (`app/editor/codemirror/shortcode-expand.ts` + `app/editor/utils/math-eval.ts`). It replaces the expression with its result, so the working is lost. It also can't name values or reuse them on later lines. There's no "calculator built into your notes".

## Desired behavior
Users can type math directly into a note and see the answer next to the line, like Soulver or Numi built into the editor.

- `rent = 1200`, then `utilities = 180`, then `rent + utilities` → a small gray `= 1380` label appears at the end of the last line.
- Named values can be reused on later lines of the same note (top to bottom).
- Percentages work: `450 + 15%` → `517.5` (percent of the left-hand side), and a plain `15%` of something is reasonable.
- Ordinary text lines are left alone. No label on prose, headings, list text that isn't math, etc.
- **Results are display-only, never saved.** The `.md` file holds only what the user typed; it stays clean Markdown. Use CodeMirror decorations/widgets, never document changes.

Known problems in the sample code we were given (the sample isn't in the repo; the design must avoid these):
1. `RangeSetBuilder` wasn't imported. Make sure the implementation typechecks.
2. It only skipped the opening ```` ``` ```` fence line, not the lines *inside* a fenced code block. Every line inside fences (and frontmatter) must be ignored, both for labels and for variable definitions.
3. It re-evaluated every line in the note on each keystroke, although the spec says only visible lines are scanned. Variables still have to resolve from earlier lines that are off screen, so the design needs an efficient approach (e.g. a cached per-line scope/state that only recomputes from the edited line down, or similar). Decorations are only built for `view.visibleRanges`.
4. Splitting a line on `=` broke expressions containing `==` or `>=` (and `<=`, `!=`). Assignment detection must match only a single standalone `=` after an identifier on the left, e.g. `^\s*([A-Za-z_][\w ]*?)\s*=(?!=)`.

Extend or reuse `utils/math-eval.ts` (safe tokenizer/parser, no `eval`) rather than writing a second evaluator. Keep the existing `calc(...)=` shortcode working. Respect Preview mode (labels are fine to show there too, but check `preview-facet.ts` conventions). Add Vitest coverage for the evaluator (variables, percent, comparisons not treated as assignment) and the line scanner (code fences, frontmatter, visible-range only).

Documentation: update `app/editor/README.md` (editor feature list + a section for the new extension), the user-facing feature list in the repo `README.md` (next to the `calc(100+50)=` row), and any sibling `.md` docs for touched components, per AGENT_RULES.

## Out of scope
- Units/currency conversion, dates/time math and functions beyond basic arithmetic + percent.
- Cross-note variables or a global scope.
- Writing results into the file, or a "copy result" or "insert result" action.
- A settings toggle (unless the architect sees a strong reason; then raise it in blocked.md).
