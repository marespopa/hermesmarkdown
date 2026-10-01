# Inline note calculator — review

## Review 1

**Verdict: Changes requested.** There is one blocker, and the fix is a one-line test change. The implementation is correct and meets every PRD rule I checked. But one new test asserts the wrong number, so the test suite fails.

### Checks
Run from `next-client` with Corepack.

| Check | Result | Caused by the change? |
|---|---|---|
| `corepack yarn tsc --noEmit` | **Pass**, clean | — |
| `corepack yarn lint` | **Fail**: 25,162 problems | **No.** The errors are in `next-client/next-client/.next/dev/static/chunks/*`. That is a git-ignored build-artifact folder dated Sep 28, and the lint config doesn't exclude it. The only source-tree hit is two warnings in `app/hooks/file-system/vault-index.ts:78,85`, a file this change doesn't touch. Running `corepack yarn eslint` on the 9 changed source and test files gives a clean result. |
| `corepack yarn vitest run` | **Fail**: 2 failed / 708 passed (105 files), plus 3 "Failed to start forks worker" errors | **One is caused by the change:** `app/editor/codemirror/note-calc.test.ts > updates the label when an earlier variable changes`: `expected [ '= 1480' ] to deeply equal [ '= 1400' ]`. The other is **not**: `MarkdownEditor.test.tsx > mounts a CodeMirror 6 editor` hit the 10 s timeout while the pool was failing to start workers (the device was under load). Run on its own, it passes, with `noteCalcExtension` now part of `buildExtensions`. |
| `corepack yarn build` | **Pass** | — |

New and changed test files that ran: `math-eval.test.ts` (passes), `note-calc-scan.test.ts` (passes), `note-calc.test.ts` (3 of 4 pass), `shortcode-expand.test.ts` (passes).

### PRD coverage
| Requirement / acceptance criterion | Status | Evidence |
|---|---|---|
| Brief example shows `= 1380` only on line 3 | Done | `note-calc-scan.ts:113`; tests `note-calc-scan.test.ts:45`, `note-calc.test.ts:34` |
| Display-only: no transactions, file byte-identical | Done | The plugin never dispatches (`note-calc.ts:38–64`); `note-calc.test.ts:40` |
| `450 + 15%` → 517.5, `15% of 200` → 30, `200 * 15%` → 30 | Done | `math-eval.ts:243–258`, `:192–204`; `math-eval.test.ts`, `note-calc-scan.test.ts:58` |
| `==`, `>=`, `<=`, `!=` are never assignments and get no label | Done | `note-calc-scan.ts:29`; `note-calc-scan.test.ts:27,63`; `math-eval.test.ts` "rejects comparisons" |
| Fences (backtick and tilde, any length, unterminated), frontmatter and `$$` are skipped and define nothing | Done | `note-calc-scan.ts:77–95`; `note-calc-scan.test.ts:83–99` |
| Prose, headings, tasks, dates, phone numbers and literals get no label; list items do | Done | `note-calc-scan.ts:98–113`; `note-calc-scan.test.ts:58–81` |
| Visible ranges only; scan up to the last visible line; rescan from the first edited line | Done | `note-calc-scan.ts:139–180`, `note-calc.ts:48–61`; `note-calc-scan.test.ts:102–130`. I confirmed that `viewportChanged` also fires when a fold or unfold changes `visibleRanges` (`@codemirror/view` `computeVisibleRanges` sets `UpdateFlag.Viewport`). |
| A variable defined above the viewport resolves | Done | `note-calc-scan.test.ts:112` (line 2 → lines 500–520) |
| `calc(100+50)=` still gives 150; `evaluateMath` unchanged | Done | `math-eval.ts:306`. With no options, tokenizing, parsing and evaluation match HEAD exactly. `shortcode-expand.test.ts:58` |
| Labels show in Edit and Preview, aren't selectable or clickable, and use `--fg-faint` | Done | `note-calc.ts:22,27,66–76`; `note-calc.test.ts:56` |
| `Decoration.set(ranges, true)`, imports resolve, tsc clean | Done | `note-calc.ts:35`; tsc passes |
| All files under 400 lines | Done | math-eval 308, note-calc-scan 180, note-calc 78, extensions 220, editor-writing 359 |
| Registered after `renderedBlockExtension`, with no compartment or setting | Done | `extensions.ts:120` |
| Docs | Done (see note) | `app/editor/README.md`, repo `README.md`, `ARCHITECTURE.md`, `editor-writing.tsx` |

Scope creep: none. The docs page adds a full `inline-calculator` subsection plus a cross-link from Shortcodes, where the PRD asked for an `h4` and a `KV` inside Writing. It is more discoverable, follows the existing subsection and anchor pattern, and stays under 400 lines. I accept the deviation.

### Findings

**Blocker**

1. **The test asserts wrong arithmetic, so the suite fails.** `app/editor/codemirror/note-calc.test.ts:47`
   - Problem: after changing `rent = 1200` to `rent = 1300`, the label should read `= 1480` (1300 + 180). The test expects `= 1400`.
   - The mistake comes from the PRD's Phase 2 test bullet ("updates the label to `= 1400`"), which is itself wrong. The plugin is correct: it showed `= 1480` in the run.
   - Failure scenario: `corepack yarn vitest run` fails on every run. The project rules say never to push changes that break the suite.
   - Fix: change the expectation to `["= 1480"]`.

**Minor / nits.** These are optional and don't block approval.

2. `app/editor/utils/math-eval.ts:54`: the tokenizer only skips `" "`, so a tab inside an expression (`rent +⇥utilities`) fails and gets no label. Leading and trailing tabs are fine, because of `trim()` and `\s` in `ASSIGNMENT`. This is the same as before for `calc()`, and the PRD doesn't mention tabs. If it's worth fixing, skip `\t` only when options are set, so `evaluateMath` keeps its exact behavior.
3. `note-calc-scan.ts:94`: a bare `$$` that is never closed hides every label below it. `rendered-block.ts#collectDollarBlocks` doesn't treat an unclosed `$$` as a block, so the two modules disagree. This is a reasonable choice: it matches the PRD's unterminated-fence rule, and an incremental scanner can't look ahead. The engineer report records it as a decision. No change needed. It could go in the README "Skipped lines" bullet.

I checked the following and found no problems:
- Invalidation when lines are joined or split: `fromA` at `line.to` maps to the earlier line.
- `iterLines` bounds: the end is exclusive, and the last line works.
- `of` handling inside names, including `offset`.
- `-0` and values of 1e21 and above in `formatNoteCalcResult`.
- Per-view cache isolation.
- No network calls, no atoms, no raw UI elements, no banned names, no debug logging.
- Theme tokens only.

### Tests & docs gaps
- Tests: every PRD-listed case is present. The only problem is the wrong expected value above.
- The PRD's Phase 2 test bullet should say `= 1480`, not `= 1400`. Only a human or the architect should change the PRD. This is noted for them.
- Docs: complete. No sibling `<Component>.md` applies (`codemirror/*.ts` and `utils/*.ts` are indexed by `app/editor/README.md`), and `app/editor/README.md` lists the new files.

### Handoff (to hermes-engineer)
1. `app/editor/codemirror/note-calc.test.ts:47`: change `["= 1400"]` to `["= 1480"]` (1300 + 180). Then run `corepack yarn vitest run app/editor/codemirror/note-calc.test.ts` and confirm all 4 tests pass.
2. Optional: allow tabs between tokens when `evaluateMathExpression` options are set (`math-eval.ts:54`). Leave `evaluateMath` unchanged.
