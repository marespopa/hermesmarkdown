# Lessons: plan 018 (token-level syntax reveal)

Run: architect, engineer, review (changes-requested), engineer fix, review (approve with nits). All exits were 0, with one fix round. The round cost about $0.24 on top of the $1.75 for the first pass. The evidence is thin, so there are two proposals.

## 1. Test positions derived from a doc string must fail loudly (AGENT_RULES.md, Testing Standards)

**Target:** `next-client/AGENT_RULES.md`, under "Testing Standards (Vitest)".

**Add:**
> - **Computed Offsets**: When a test places a caret or selection with `doc.indexOf(...)`, anchor on text copied from the doc and assert the result is `>= 0` (or use a helper that throws on `-1`). A missed search returns `-1`, which becomes position 0 and fails far from the cause.

**Evidence:**
- mailbox, Review 1 fix list: "syntax-reveal.test.ts:36: doc.indexOf("it,") is -1 (the doc has `_it_,`), so the caret lands at 0 and the test fails."
- The engineer report says "Nothing run", because the engineer prompt forbids running tests. Authoring mistakes like this therefore reach the reviewer, and a whole review and fix round (two extra agent runs) goes on a typo.

**Why beyond this plan:** any editor, selection or CodeMirror test builds offsets from strings, and the engineer cannot run tests to catch a bad one. A loud failure also makes the CI log point at the real cause.

## 2. Review report numbering must append (hermes-review stage prompt in scripts/factory)

**Target:** the review stage prompt in `scripts/factory` (the `review` case beside the engineer case at line ~174), or the "Factory mode" section of `.claude/agents/hermes-review.md`.

**Add:**
> Before writing, count the existing `## Review <n>` headings in `<folder>/reports/review.md`. Append `## Review <n+1>` below them and never replace the file. After a fix round, the new section starts with one line saying whether each fix-list item is resolved.

**Evidence:**
- usage.tsv shows two review runs, and the mailbox holds a "Review 1 fix list".
- The final `reports/review.md` contains only one section, "## Review 1", with the approval. The `changes-requested` review, with its failing-test finding, is gone from the report. The second review reused number 1 and overwrote the first.
- The persisted trail of why the round happened now exists only in `mailbox.md`.

**Why beyond this plan:** every plan with a fix round loses the history the lessons stage and humans need. The agent definition already says to append, so the factory prompt should make that explicit.

## One-off corrections (no rule proposed)

- **Missing `***both***` nesting test and the callout wording nit:** these are minors on feature-specific coverage. The PRD's Tests list did not require them, and the reviewer correctly did not send the plan back.
- **`value.spec` read through `any` in highlight.test.ts:** a single brittle assertion on CodeMirror internals. The existing rule "test behavior, not internals" already covers it, and it was a nit.
- **Engineer's flagged risk about Lezer parsing of `**bold\nstill**`:** it did not fail. The "name likeliest CI risks" rule in the engineer prompt worked as intended.
