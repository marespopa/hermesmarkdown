# Inline note calculator — engineering PRD

## Context
Users jot budgets and estimates in notes and want a calculator built into the note. They type `rent = 1200`, `utilities = 180`, `rent + utilities`, and a gray `= 1380` label appears at the end of the last line. Labels are **display-only**: CodeMirror widgets, never document changes. The `.md` file stays exactly what the user typed. Source brief: [`brief.md`](./brief.md).

What exists today:
1. `app/editor/utils/math-eval.ts` has a safe tokenizer and recursive-descent parser (`tokenizeMath` :5, `parseExpression` :46, `parseTerm` :72, `parseFactor` :98, `evaluateNode` :124, exported `evaluateMath` :154). It handles numbers, `+ - * /`, unary `±` and parentheses. It has **no identifiers, no `%`, no thousands separators**, and exposes no "is this just a literal?" signal. Its only caller is the shortcode below.
2. `app/editor/codemirror/shortcode-expand.ts#tryExpand` (:23–54) replaces `calc(…)=` (`REGEX_CALC`, `components/regex.ts:21`) with the rounded result. It sanitizes the expression to `[-()\d/*+.]` before `evaluateMath`. This must keep working unchanged.
3. Line-end display widgets follow the pattern in `codemirror/annotation-display.ts` (a `ViewPlugin` that rebuilds on `docChanged`/`viewportChanged`, filters on `view.visibleRanges`, and uses `Decoration.set(ranges, true)`). `preview-facet.ts` exposes `isPreviewMode` / `previewModeChanged` for plugins that behave differently in Preview.
4. Frontmatter detection is `codemirror/frontmatter-fold.ts#findFrontmatterFoldRange` (:11): line 1 is `^---\s*$`, and the block closes at the next `^---\s*$`. Fence and `$$` handling lives in `rendered-block.ts` (Lezer tree plus `CLOSING_FENCE` :38, `collectDollarBlocks` :65). The Lezer tree is parsed lazily and can't be trusted for far-off-screen lines, so the scanner won't use it.
5. Extensions are registered in `codemirror/extensions.ts#buildExtensions` (display plugins :114–119).

Missing:
- **M1.** Evaluator support for variables, percent and `X% of Y`, plus a literal flag.
- **M2.** A line scanner with an incremental per-line cache: block state (fence, frontmatter, `$$`) and scope, invalidated from the first edited line down and extended only up to the last visible line.
- **M3.** A CodeMirror view plugin that draws `= result` labels on visible lines only.
- **M4.** Docs.

## Behavior
Scanning goes top to bottom. Each line is classified by the state carried over from the line above.

**Skipped lines.** These never get a label, never define a variable, and never change scope:
- Frontmatter: line 1 is `---` (`/^---\s*$/`), up to and including the next `---` line. If the frontmatter is unclosed, everything after line 1 is frontmatter, the same as an unterminated fence.
- Fenced code: an opening fence line `^\s{0,3}(?:>\s?)*(`{3,}|~{3,})`. Every line up to and including a closing fence (same character, length ≥ the opener, nothing else on the line apart from whitespace and the same quote prefix) is skipped, both fence lines included. An unterminated fence runs to the end of the note.
- Display math: a line that is just `$$` opens and closes a block, and all lines in between plus both markers are skipped. A single line `$$ … $$` is skipped.
- Blank lines and headings (`^\s{0,3}#{1,6}(\s|$)`).

**Line content.** Before evaluating, strip one leading list marker: `^\s*(?:[-*+]|\d+[.)])\s+`. That way `- rent = 1200` and `1. 450 + 15%` work. Don't strip task markers: `- [ ] 2+2` keeps `[ ]`, the tokenizer rejects it, and the line gets no label. Blockquotes (`>`) and table rows (`|`) aren't stripped, so they fail tokenizing and get no label.

**Assignment.** Content matching `ASSIGNMENT = /^\s*([A-Za-z_][\w ]*?)\s*=(?!=)(.*)$/` is an assignment.
- The name is trimmed, internal whitespace collapsed to one space, and lowercased.
- If any word of the name is `of`, the line isn't an assignment: it's evaluated as a plain expression, which fails, so no label.
- `a == b`, `a >= b`, `a <= b` and `a != b` never match: `=(?!=)` blocks `==`, and `[\w ]` can't contain `<>!`. Comparisons aren't supported, so those lines get no label and define nothing.
- If the right-hand side evaluates, the name is bound to its value. If the RHS is empty or invalid, the name becomes **undefined** from this line on. Later lines then show no label instead of silently using a stale value.
- Reassignment shadows the earlier value. `rent = rent + 100` reads the previous `rent`.

**Expression lines.** Any other non-skipped line is evaluated as an expression against the current scope. A failure means no label. That covers prose, undefined names, implicit multiplication like `2 apples`, and markdown syntax.

**When a label shows.**
- Only when evaluation succeeds, the result is finite, **and** the expression isn't a bare literal. A literal is one number, optionally signed, optionally with `%`.
  - `rent = 1200`, `1200` and `tax = 15%` → no label.
  - `total = rent + utilities` and `rent + utilities` → `= 1380`.
- Date- and range-like lines are skipped: if the content (after the list marker) matches `^\s*[\d.,]+(?:[-/][\d.,]+)+\s*$`, it is not evaluated. This covers `2026-10-01`, `10/12/2024`, `555-1234` and `10-12`. `10 - 12` (with spaces) still evaluates.

**Numbers and operators.**
- Numbers: `1200`, `.5`, `12.75`. Comma thousands separators in strict 3-digit groups (`1,200`, `12,345.6`) are accepted. Any other comma (`1,5`) fails the line.
- Operators: `+ - * /`, unary `±`, parentheses, with the usual precedence. Division by zero fails the line.
- Names: words `[A-Za-z_]\w*`. Consecutive words separated by spaces form one multi-word name (`monthly rent * 12`). The word `of` always ends a name. Lookups are case-insensitive.

**Percent.**
- `N%` (postfix on a number, name or parenthesised group) is `N/100`.
- As the **direct** right operand of `+` or `-`, it's relative to the left side: `450 + 15%` → `517.5`, `450 - 15%` → `382.5`.
- `p% of x` → `p/100 * x`: `15% of 200` → `30`, `15% of rent + 10` → `(15% of rent) + 10`.
- Anywhere else it's the plain fraction: `200 * 15%` → `30`, and `tax = 15%` stores `0.15`.
- Percent semantics don't travel through variables: `price + tax` adds `0.15`.

**Formatting.**
- The label text is `= ` plus the result, rounded to at most 4 fraction digits, trailing zeros trimmed, `.` as the decimal point, no thousands grouping (`= 1380`, `= 517.5`, `= 0.3333`).
- `-0` is shown as `0`. Non-finite results show no label.

**Display.**
- The label is a widget at `line.to` with `side: 1`: after the caret at end of line, styled small and in `--fg-faint`.
- It isn't selectable, doesn't take clicks, and isn't part of copied text.
- Labels show on every line, the caret line included, in Edit **and** Preview. Preview already collapses fences, which are skipped anyway, so the plugin needs no `previewModeFacet` check.
- Labels inside ranges replaced by table or rendered-block widgets never appear, because those lines are rejected or skipped anyway.
- Folded ranges are excluded because they aren't in `visibleRanges`.

**Scope.** Each note, and each `EditorView`, has its own scope. Split panes on the same note compute independently. There are no cross-note variables.

**Vault backends and mobile.** This is purely editor-side. Local File System Access, OPFS/browser and GitHub vaults all behave the same, with no file I/O. Mobile uses the same `EditorView`, and the label wraps with the line under `lineWrapping`.

**File contents.** The file never changes. Autosave, dirty state and undo history see no transactions from this feature.

## Design

### Evaluator (`utils/math-eval.ts`, M1)
Extend the existing tokenizer and parser. Don't write a second evaluator.

```ts
export type MathResolver = (name: string) => number | undefined; // name is normalized (lowercase, single spaces)
export interface MathEvalOptions {
  resolve?: MathResolver;        // enables identifier tokens; absent → identifiers fail (as today)
  percent?: boolean;             // enables `%` and `of`
  thousandsSeparators?: boolean; // enables strict `1,234` groups
}
export interface MathEvaluation { value: number; isLiteral: boolean }
export function evaluateMathExpression(expression: string, options?: MathEvalOptions): MathEvaluation | null;
export function evaluateMath(expression: string): number | null; // = evaluateMathExpression(expression)?.value ?? null — behavior unchanged
export function normalizeMathName(raw: string): string;           // trim, collapse whitespace, lowercase
```

- **Tokens.** Add `{ type: "name"; name: string }`, `"%"` and `"of"`.
  - Names are read as word runs joined by spaces. Stop before a word equal to `of`, which is emitted as the `of` token when `percent` is enabled.
  - Without `resolve`, a letter fails the tokenizer, as today. Without `percent`, `%` fails.
- **Nodes.** Add `{ type: "name"; name }`, `{ type: "percent"; value: MathNode }` and `{ type: "of"; percent: MathNode; value: MathNode }`.
- **Grammar.**
  - `factor := ('+'|'-') factor | postfix`
  - `postfix := primary ('%' ('of' factor)?)?`
  - `primary := number | name | '(' expr ')'`
- **Evaluation.**
  - In `evaluateNode`'s `+`/`-` case, if `right` is a `percent` node, the result is `left * (1 ± p)`.
  - A `name` node calls `resolve`; `undefined` throws, which makes the expression fail.
  - `isLiteral` is computed from the token list: one number, an optional leading unary sign, an optional trailing `%`.
- **Size.** This keeps the file well under 400 lines (about 280). If it goes over, move the tokenizer into `utils/math-tokenize.ts`.

### Scanner and cache (`utils/note-calc-scan.ts`, new, M2)
This module is pure and has no DOM. Everything is keyed by 1-based line number.

```ts
type BlockState = null | "frontmatter" | "math" | { fence: "`" | "~"; length: number; quote: string };
interface ScopeNode { name: string; value: number | undefined; parent: ScopeNode | null } // persistent chain
export interface LineCalc { block: BlockState; scope: ScopeNode | null; label: string | null } // state *after* the line
export function parseAssignment(content: string): { name: string; expression: string } | null;
export function scanLine(text: string, lineNumber: number, prev: LineCalc | null): LineCalc;
export function formatNoteCalcResult(value: number): string | null;
export class NoteCalcCache {
  get size(): number;                                   // lines 1..size are valid
  get scanCount(): number;                              // total scanLine calls (test hook for incremental behavior)
  invalidateFrom(lineNumber: number): void;             // drop entries ≥ lineNumber
  ensure(doc: Text, upToLine: number): void;            // extend from size+1 to upToLine only
  label(lineNumber: number): string | null;             // requires ensure() first
}
export function collectNoteCalcLabels(
  doc: Text, cache: NoteCalcCache, ranges: readonly { from: number; to: number }[],
): { pos: number; label: string }[];                    // ensure(last range line), then labels of lines intersecting ranges
```

- **Scope.** The scope is an immutable linked chain. An assignment line pushes one node, and a deleted name pushes `value: undefined`. Lookup walks the chain to the first match. Lines without an assignment share the previous line's pointer, so memory is O(lines + assignments) with no map copies.
- **Invalidation.** An edit can only change state from its first touched line down. Entries above are reused as-is.
- **Viewport bound.** `ensure` never scans past the bottom of the viewport. Edits below the viewport cost nothing, and scrolling scans only the newly revealed lines.
- **Alternative rejected.** A `StateField` that recomputes the whole note per transaction is simple but is the brief's problem 3. A Lezer-tree walk can't classify off-screen lines reliably, because parsing is lazy.

### View plugin (`codemirror/note-calc.ts`, new, M3)
- `class NoteCalcResultWidget extends WidgetType`:
  - `eq` compares label text.
  - `toDOM` returns `<span class="cm-note-calc-result" aria-hidden="true">= 1380</span>`.
  - `ignoreEvent() { return true; }`.
- The `ViewPlugin` owns one `NoteCalcCache`.
  - **Constructor:** build.
  - **`update`:** if `docChanged`, find the minimum `fromA` via `update.changes.iterChangedRanges` and call `cache.invalidateFrom(update.startState.doc.lineAt(min).number)`. If `docChanged || viewportChanged`, rebuild from `collectNoteCalcLabels(view.state.doc, cache, view.visibleRanges)` as `Decoration.widget({ widget, side: 1 }).range(pos)`.
- `noteCalcTheme = EditorView.baseTheme({ ".cm-note-calc-result": { … } })`, with these values:
  - `color: var(--fg-faint)`, `fontSize: 0.9em`, `marginLeft: 0.75em`
  - `fontVariantNumeric: tabular-nums`, `whiteSpace: nowrap`
  - `userSelect: none`, `pointerEvents: none`

  The theme lives here, not in `theme.ts`, which is already at 379 lines.
- `export const noteCalcExtension = [noteCalcPlugin, noteCalcTheme];`

## Phase 1: Evaluator and scanner (M1, M2)
- `app/editor/utils/math-eval.ts`:
  - Add the option types, `evaluateMathExpression` and `normalizeMathName`.
  - Extend `MathToken`/`MathNode` (:1–3), `tokenizeMath` (:5, which takes the options), `parseFactor` (:98, adds the postfix/primary split) and `evaluateNode` (:124, which gains the `resolve` param plus the percent and `of` cases).
  - `evaluateMath` (:154) becomes a thin wrapper with no options, so the `calc(…)=` behavior is byte-identical.
- `app/editor/utils/note-calc-scan.ts` (new, about 200 lines):
  - The constants `ASSIGNMENT`, `LIST_MARKER`, `HEADING`, `DATE_LIKE`, `FENCE_OPEN`, `DOLLAR_LINE`, `DOLLAR_SINGLE` and `FRONTMATTER = /^---\s*$/`.
  - The functions in the Design section.
  - `scanLine`:
    1. Resolve the block state from `prev.block`: close a fence, `$$` or frontmatter if this line closes it, and in that case return `label: null`.
    2. Open a block (frontmatter only on line 1).
    3. Skip blank lines and headings.
    4. Strip the list marker, apply the `DATE_LIKE` skip, then handle the assignment or expression via `evaluateMathExpression(expr, { resolve, percent: true, thousandsSeparators: true })`.
    5. Set `label = !isLiteral ? formatNoteCalcResult(value) : null`.

## Phase 2: Editor extension, wiring, docs (M3, M4)
- `app/editor/codemirror/note-calc.ts` (new, about 90 lines): the widget, plugin and theme from the Design section.
- `app/editor/codemirror/extensions.ts`: import `noteCalcExtension` and add it after `renderedBlockExtension` (:118). Nothing else changes: no compartment, no option, no setting.
- `shortcode-expand.ts`: no change.
- Docs: see the Docs section.

## Tests
**Phase 1**
- `app/editor/utils/math-eval.test.ts` (update). The existing cases stay. Add:
  - Variables through `resolve`, including multi-word and case-insensitive names. An undefined name → `null`.
  - Percent: `450 + 15%` → 517.5, `450 - 15%` → 382.5, `200 * 15%` → 30, `15% of 200` → 30, `15% of rent + 10` with a resolver.
  - `evaluateMath("10%")` and `evaluateMath("1 + foo")` → `null` (no options means today's behavior).
  - Thousands separators: `1,200 + 1` → 1201 with the option. `1,5` → `null`.
  - `isLiteral` for `1200`, `-5`, `15%` (true) and `1+1`, `rent` (false).
  - Comparisons `a == b`, `a >= b`, `a <= b`, `a != b` → `null`. Division by zero → `null`.
- `app/editor/utils/note-calc-scan.test.ts` (new). Build docs with `Text.of(lines)`.
  - The brief example: labels only on line 3, `= 1380`.
  - Reassignment and self-reference. An invalid reassignment makes the name undefined.
  - `parseAssignment`: matches `rent = 1200` and `monthly rent = 1200`. Returns `null` for `a == b`, `a >= b`, `a <= b`, `a != b` and names containing the word `of`.
  - Fences:
    - Lines inside ```` ``` ```` and `~~~` (including a longer ```` ```` ```` opener with an inner ```` ``` ```` line, and an unterminated fence) get no label and no definitions. A `x = 5` inside a fence isn't visible after it.
  - Frontmatter `rate = 5` isn't defined afterwards. `$$` blocks are skipped too.
  - No label on prose, headings, task lines, `2026-10-01`, `555-1234` or bare literals. `- rent + utilities` gets a label.
  - Cache behavior:
    - `ensure(doc, 10)` on a 1000-line doc leaves `size === 10`.
    - `collectNoteCalcLabels` with a range covering lines 500–520 returns labels only for those lines and leaves `size === 520`, while a variable defined on line 2 still resolves.
    - `invalidateFrom(n)` keeps `size === n - 1`.
    - After `invalidateFrom(500)` and a re-ensure to line 520, the `scanCount` delta is 21. This shows only lines 500 and up are rescanned.
- No mocks are needed: these are pure modules with no hooks, router or network.

**Phase 2**
- `app/editor/codemirror/note-calc.test.ts` (new). Create a jsdom `EditorView` with `[noteCalcExtension]`, like `shortcode-expand.test.ts`, and assert:
  - `.cm-note-calc-result` shows the text `= 1380` for the brief example.
  - `view.state.doc.toString()` still equals the input exactly, so nothing is written.
  - Changing `rent = 1200` to `rent = 1300` updates the label to `= 1480` (1300 + 180).
  - Wrapping the lines in a fence removes the labels.
  - With `preview-mode`'s `previewExtension(true)` added, labels still render.
- `app/editor/codemirror/shortcode-expand.test.ts` (update): one case where the view also has `noteCalcExtension`, and `calc(100+50)=` still expands to `150`.

## Docs
- `app/editor/README.md`: add a "Core Editor" bullet ("Inline calculator: math lines show their result at the end of the line") and a new `## Inline calculator` section after "Flow mode". The section covers the files, line rules (skipped blocks, assignment, percent, literal and date skip), the incremental cache, and the display-only guarantee.
- Repo `README.md`:
  - In "Markdown writing" (:46), add a bullet with the `rent = 1200` / `rent + utilities` example.
  - In the shortcode table, change the `calc(100+50)=` row (:97) to keep its meaning and add a note under the table: "For results that stay beside your working, write the math on its own line — see Inline calculator."
- `app/documentation/content/editor-writing.tsx`: after the Shortcodes `KV` (:29–38), add a short `<h4>Inline calculator</h4>`, one paragraph and a `KV` with the examples (`rent = 1200`, `rent + utilities`, `450 + 15%`, `15% of 200`). The file is at 308 lines, so this stays under 400.
- `ARCHITECTURE.md`: under "CodeMirror 6 editor", add one clause: "inline calculator labels (`note-calc.ts`, `utils/note-calc-scan.ts`)".
- There are no sibling `<Component>.md` files for `codemirror/*.ts` or `utils/*.ts` modules. `app/editor/README.md` is their index.

## Acceptance criteria
- [ ] `rent = 1200` / `utilities = 180` / `rent + utilities` shows `= 1380` only at the end of line 3.
- [ ] The saved `.md` content is byte-identical to what was typed. No transactions are dispatched, and undo history and dirty state are unaffected.
- [ ] `450 + 15%` → `= 517.5`; `15% of 200` → `= 30`; `200 * 15%` → `= 30`.
- [ ] `a == b`, `a >= b`, `a <= b` and `a != b` are never assignments and show no label.
- [ ] Lines inside fenced code (backtick and tilde, any length, unterminated), frontmatter and `$$` blocks get no labels and define no variables.
- [ ] Prose, headings, task lines, dates and phone numbers, and bare literals show no label. List-item math does.
- [ ] Decorations are built only for `view.visibleRanges`. The cache only scans up to the last visible line and only re-scans from the first edited line, which the tests confirm.
- [ ] A variable defined above the viewport resolves for a visible line.
- [ ] `calc(100+50)=` still expands to `150`, and `evaluateMath` behavior is unchanged.
- [ ] Labels render in Edit and Preview. They aren't selectable or clickable and use the `--fg-faint` token.
- [ ] `RangeSetBuilder` is not needed (use `Decoration.set(ranges, true)`), and every import resolves. `corepack yarn tsc --noEmit` is clean.
- [ ] All new and changed source files are under 400 lines.
- [ ] Docs are updated as listed.

## Decisions
- **No settings toggle.** False positives are limited by the literal and date-like skips and strict tokenizing, so prose never evaluates. The brief prefers none.
- **Labels in Preview too.** The brief allows it, and it reads like a calculator printout.
- **Bare literals and literal assignments get no label.** `= 1200` next to `rent = 1200` is noise.
- **Invalid reassignment undefines the name.** It doesn't keep the old value, because a silent stale value is worse than a missing label.
- **Case-insensitive, multi-word names; `of` is reserved.** This follows the brief's name regex `[\w ]`. Lowercasing avoids "Rent" vs "rent" surprises.
- **Percent applies only to a direct `%` operand of `+`/`-`.** Variables hold plain fractions. This is simple, predictable and testable.
- **Unspaced `-`/`/` number runs are skipped.** This avoids `= 2015` on an ISO date. Users who want the math can add spaces.
- **Accept `1,200` (strict groups) in the calculator only.** `evaluateMath` and `calc()` are untouched.
- **Output format:** at most 4 decimals, no grouping. This matches the brief's `= 1380`.
- **Scanner by line state machine, not the Lezer tree.** The tree is lazily parsed off-screen, while scope must cover lines above the viewport.
- **Theme in the extension's `baseTheme`,** not `theme.ts`, which is near the 400-line limit.

## Out of scope / Deferred
- Units, currency, dates and time math, functions (`sqrt`, `round`, …), `^`, comparisons and booleans.
- Cross-note or global variables, and sharing scope between panes.
- Writing results into the file, and copy or insert-result actions.
- A settings toggle.
- Indented (4-space) code blocks, HTML comment blocks, and math inside blockquotes or tables.
- Trailing-`=` syntax (`2 + 2 =`) and implicit multiplication (`2x`).

## Open questions
- Should results use thousands grouping (`= 1,380`) once numbers get large? The PRD follows the brief's `= 1380`.
- Should `1,5`-style decimal commas be accepted for European locales? Today they're rejected, which avoids clashing with the 3-digit thousands groups.
