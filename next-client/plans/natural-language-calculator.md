---
title: "Natural-language inline calculator"
tags: [editor, calculator]
status: "implemented"
---
# Natural-language inline calculator (release 6.56.0)

## Goal
Lines like `Total server cost: 3 nodes multiplied by 45 plus 19% VAT =` show `160.65`, the way Numi or Soulver read them. Lines that already worked as plain math must keep their result.

## Approach: two stages, no new dependency
The existing evaluator (`app/editor/utils/math-eval.ts`) is already a safe recursive-descent parser. It handles `%`, `X% of Y`, relative `100 + 20%`, names and `1,234`, so it stays. A pure pre-pass is added in front of it:

```
line → scanner strips "=" and list marker → plain evaluate
                                        └─ failed → normalizeMathExpression → evaluate → label (+ unit / %)
```

- `utils/note-calc-normalize.ts`: `normalizeMathExpression(raw, isKnownName)` → `{ expr, unit?, isPercentResult? }`. In order:
  1. keep the last sentence part (after `: `, `? `, …);
  2. take out the first currency (`$ € £` show in front of the label, `RON lei USD EUR GBP` after it);
  3. ordered `[RegExp, replacer]` rules: typos (`multipl(?:i|ie|ite|e)?d by`, `d[ie]v[ie]?ded by`), `percent`, scale suffixes, `square root of`, `squared`/`cubed`, and `5 x 4` (never hex);
  4. a word pass: operator words count only with an operand on each side, filler words and unit nouns are dropped, and a right-to-left scan stops at the first prose word.

  Variables in scope win over every rewrite. `A is what % of B` / `A as a % of B` → `(A) / (B) * 100`, shown as a percent.
- `math-eval.ts` gets a `functions` option: `^` (right-associative) and `sqrt/round/min/max` (`utils/math-functions.ts`). Commas inside a call separate arguments. The option is off for `calc(…)=`.
- `note-calc-scan.ts` `scanLine` runs the normalizer only after plain evaluation fails, then decorates the label (`decorateNoteCalcLabel`).

## Tests
`note-calc-normalize.test.ts`: every rule, typos, hex, unflanked `and`, units, shares. `math-eval.test.ts`: powers and functions. `note-calc-scan.test.ts`: the spec's precedence cases (`100 + 10% + 20%`, `20% of 50 + 10`, `5k divided by 2`), units, and variables named `x`.

## Docs
`app/editor/README.md` (Inline calculator), `app/documentation/content/editor-writing.tsx` (`inline-calculator`), `NOTE_CALC_GUIDE` in `utils/formula-ai-guide.ts`.
