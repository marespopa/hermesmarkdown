# Inline note calculator — engineer report

## Run 1

**PRD:** `next-client/plans/001-inline-note-calculator/prd.md` (phases 1 and 2). The mailbox was empty: no RESUME notes and no reviewer fix list.

### Built
- **M1 evaluator** (`app/editor/utils/math-eval.ts`):
  - Option types are at :7–19, `normalizeMathName` at :36 and `evaluateMathExpression` at :287.
  - `evaluateMath` (:306) is a thin wrapper with no options. With no options the tokenizer reads numbers exactly as before, letters, `%` and `,` fail, and only spaces are skipped, so `calc(…)=` behaves the same.
  - The tokenizer (:46) adds multi-word names (`of` always ends a name), `%`, `of`, and strict `1,234` groups.
  - The grammar splits into `factor` → `postfix` → `primary` (:176, :192, :207).
  - `evaluateNode` (:228) resolves names (an undefined name throws), handles `percent` and `of`, and treats a direct `%` operand of `+`/`-` as relative to the left side.
  - `isLiteral` is computed from the tokens (:279).
- **M2 scanner and cache** (`app/editor/utils/note-calc-scan.ts`):
  - Constants are at :29–36. `parseAssignment` is at :52 and blocks `of` names. `formatNoteCalcResult` is at :60: 4 decimals, trailing zeros trimmed, `-0` shown as `0`, non-finite gives `null`.
  - `scanLine` (:71) handles frontmatter, backtick and tilde fences (same character, length ≥ opener, same quote prefix; unterminated fences run to the end), `$$` blocks and single-line `$$…$$`, blank lines and headings, list-marker stripping, the date-like skip, and assignment vs. expression.
  - Scope is an immutable linked chain. A failed reassignment pushes `undefined`.
  - `NoteCalcCache` (:117) provides `size`, `scanCount`, `invalidateFrom` and `ensure` (uses `doc.iterLines` and only extends forward). `collectNoteCalcLabels` (:159) covers visible ranges only.
- **M3 view plugin** (`app/editor/codemirror/note-calc.ts`):
  - The widget sets `aria-hidden` and `ignoreEvent() → true`. The decoration is `Decoration.widget({ side: 1 })` at `line.to`, built with `Decoration.set(ranges, true)`, so no `RangeSetBuilder` is needed.
  - On `docChanged` the plugin invalidates from the minimum `fromA` line, then rebuilds on `docChanged || viewportChanged`. It never dispatches.
  - The `baseTheme` uses `var(--fg-faint)`, `0.9em`, tabular-nums, `user-select: none` and `pointer-events: none`.
  - It's registered in `codemirror/extensions.ts:120`, after `renderedBlockExtension`. There's no compartment and no setting.
- **M4 docs:** see the next section.

### Tests/docs
- Tests:
  - Updated `app/editor/utils/math-eval.test.ts`: options off, variables, multi-word and case-insensitive names, percent, `of`, thousands groups, `isLiteral`, comparisons, division by zero.
  - New `app/editor/utils/note-calc-scan.test.ts`: brief example, reassignment, invalid reassignment, list items, comparisons, prose/heading/task/date/phone/literal skips, backtick and tilde fences, longer opener, unterminated fence, frontmatter, `$$`, and the cache cases (`size` 10, range 500–520 with a variable from line 2, `invalidateFrom` → 499, `scanCount` delta 21).
  - New `app/editor/codemirror/note-calc.test.ts`: label DOM, the document stays unchanged, the label updates on edit, wrapping in a fence removes labels, labels render in Preview.
  - Updated `app/editor/codemirror/shortcode-expand.test.ts`: `calc(100+50)=` → `150` with `noteCalcExtension` also loaded.
- Docs:
  - `app/editor/README.md`: Core Editor bullet and a new `## Inline calculator` section.
  - Repo `README.md`: Markdown writing bullet, plus the `calc` table row and a note under the table.
  - `app/documentation/content/editor-writing.tsx`: an "Inline calculator" `h4`, a paragraph and a `KV`, plus search keywords.
  - `ARCHITECTURE.md`: CodeMirror clause.

### Decisions
- **`$$` lines:** any line starting with `$$` that isn't a bare `$$` is skipped as a single line. An unclosed bare `$$` runs to the end, the same as an unterminated fence.
- **Backtick fences:** a backtick opener whose info string contains a backtick isn't treated as a fence, per CommonMark.
- **Assignment to infinity:** an assignment whose RHS is non-finite (overflow) undefines the name, the same as an invalid RHS.
- **Single-word lines:** a line that is just a defined name (`rent`) gets a label, because it's a non-literal expression. This is consistent with the PRD rules.
- **Name tokens:** words starting with a digit can't be part of a name token. So `rent 2 = 5` defines a name that can never be read. This is harmless.

### Not done / open
- I didn't run anything, per the agent rules (no automatic build or test), so `tsc` and Vitest are unverified.
- The PRD's open questions (thousands grouping in results, European decimal commas) are unchanged: no grouping, and `1,5` is rejected.

### To verify
```bash
cd next-client
corepack yarn tsc --noEmit
corepack yarn vitest run app/editor/utils/math-eval.test.ts app/editor/utils/note-calc-scan.test.ts app/editor/codemirror/note-calc.test.ts app/editor/codemirror/shortcode-expand.test.ts
```
Manual checks in the app:
- Type `rent = 1200` / `utilities = 180` / `rent + utilities` and check that a faint `= 1380` appears only on line 3. The note must not turn dirty from the label alone, and the saved file must contain no `=` result.
- Try `450 + 15%` and `15% of 200`.
- Wrap the lines in ```` ``` ```` and check the labels disappear.
- Switch to Preview and check the labels remain.
- In a long note, define a variable at the top, scroll far down and use it.
- Try to select or click the label: it should do neither.

## Run 2

Addresses the review 1 fix list in `mailbox.md` / `reports/review.md`.

### Built
- **Fix 1 (blocker):** `app/editor/codemirror/note-calc.test.ts:47` now expects `["= 1480"]`, because 1300 + 180 = 1480. The plugin was already correct.
- **Fix 2 (optional, done):** in `app/editor/utils/math-eval.ts:49–57` the tokenizer skips `\t` between tokens when any `MathEvalOptions` field is set. This is the `lenient` / `isGap` check. It also skips tabs between the words of a multi-word name (`:108`). Plain mode (`evaluateMath`, used by `calc(…)=`) still skips spaces only, so its behavior is unchanged.
- **Nit 3 (doc only):** I added a sentence on the unclosed-`$$` behavior to the "Skipped lines" bullet in `app/editor/README.md`.

### Tests/docs
- `app/editor/utils/math-eval.test.ts` has a new case, "accepts tabs between tokens and inside multi-word names". The plain-mode test now also asserts that `evaluateMath("1 +\t2")` is `null`.
- `app/editor/README.md`: the Inline calculator "Expressions" bullet mentions tabs, and the "Skipped lines" bullet covers unclosed `$$`.

### Decisions
- An assignment name containing a tab (`monthly⇥rent = 5`) still isn't recognized: `ASSIGNMENT` allows only spaces inside names. I left it alone because it's an edge case the PRD doesn't cover.

### Not done / open
- The PRD's Phase 2 test bullet still says `= 1400`. It should say `= 1480`, and the architect or a human should fix it, since the engineer doesn't edit the PRD.

### Verified (handoff asked for the focused run)
- `corepack yarn vitest run app/editor/codemirror/note-calc.test.ts app/editor/utils/math-eval.test.ts`: 2 files, 20/20 tests pass (note-calc 4/4).
- `corepack yarn vitest run app/editor/codemirror/shortcode-expand.test.ts app/editor/utils/note-calc-scan.test.ts`: 2 files, 24/24 tests pass.
- I didn't run `tsc`, the full suite or the build. `math-eval.ts` is 312 lines.

### To verify
```bash
cd next-client
corepack yarn tsc --noEmit
corepack yarn vitest run app/editor/utils/math-eval.test.ts app/editor/utils/note-calc-scan.test.ts app/editor/codemirror/note-calc.test.ts app/editor/codemirror/shortcode-expand.test.ts
```
Manual check in the app: `rent +⇥utilities` (with a real tab) shows `= 1380`, and `calc(1 +⇥2)=` doesn't expand, which matches the old behavior.
