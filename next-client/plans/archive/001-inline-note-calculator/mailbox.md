- engineer run 1: phases 1 and 2 implemented (math-eval options, note-calc-scan + cache, note-calc plugin, tests, docs); tsc/vitest not run. See reports/engineer.md. → review
- reviewer review 1: Changes requested (see reports/review.md). Fix list:
  1. `app/editor/codemirror/note-calc.test.ts:47`: the expectation `["= 1400"]` is wrong arithmetic (the PRD bullet has the same slip). Change it to `["= 1480"]` (1300 + 180), then run `corepack yarn vitest run app/editor/codemirror/note-calc.test.ts` and confirm 4/4 pass.
  2. (Optional) `app/editor/utils/math-eval.ts:54`: skip `\t` between tokens when options are set. Leave `evaluateMath` unchanged.
- engineer run 2: review 1 fixes done (note-calc test → `= 1480`; tabs allowed between tokens in note-calc mode only; README nit). Focused vitest 44/44 pass. See reports/engineer.md#run-2. → review
