# Lessons — 001 frontmatter header

Run summary (`usage.tsv`): architect, engineer, review, one fix round, review. No failed runs, no RESUME notes, no blocked state. The only correction was one blocker in Review 1. The fix round cost $0.11 plus a $0.15 re-review.

## 1. Hand-trace the offsets and counts in new tests (engineer.md)

**Target:** `.claude/agents/hermes-engineer.md`, section "Tests and docs (same change)". Add this bullet after the "PRD's Tests section" bullet:

> - Nothing runs in factory mode, so check every expected value in a new test by hand. When a test edits the document and then asserts an offset, caret position, line number or length, compute the expectation from the post-edit state (`view.state.doc.toString().indexOf(...)`, `doc.length`), never from the pre-edit string or a literal. Before setting `state: review`, step through each such assertion once with the edit applied.

**Evidence:**
- Review 1 blocker: "`FrontmatterHeaderMenus.test.tsx:87` fails in CI: `expected 23 to be 22`... Choosing `review` replaces `draft` (5 chars) with a 6-char value, so `Body` moves from offset 22 to 23. The code is correct... The test computes the expected offset from the old `doc` string."
- The mailbox fix list asked for exactly this change, and the engineer's fix round made it with "no code change".
- The engineer's own CI-risk line named three other files ("MarkdownEditor.test.tsx frontmatter case, frontmatter-header.test.ts (jsdom focus/Escape), FrontmatterHeaderMenus.test.tsx (date picker text)") and none of them was the failing assertion. It was an arithmetic slip in a hand-written expectation.

**Why it applies beyond this plan:** The engineer can't run tests in factory mode, so every new test is unverified until the reviewer or CI runs it. Any plan that asserts positions after an edit (caret, selection, ranges, list indexes, counts after insertion) can make the same mistake. No existing rule covers it. The "Verification" section only forbids running tests, and the "Tests and docs" bullets cover only mocks and coverage.

## 2. Make the CI-risk line point at computed expectations, not only mocks (engineer.md)

**Target:** `.claude/agents/hermes-engineer.md`, "Factory mode" section. Replace the bullet starting "Write the report to `<folder>/reports/engineer.md`..." with:

> - Write the report to `<folder>/reports/engineer.md` and add a one-line handoff to `mailbox.md`. Because nothing is run, name in the handoff the one or two places most likely to fail in CI (patched test doubles, new mocks of shared hooks, existing tests that now render a changed hook, new assertions on computed values such as offsets or lengths). Before naming them, re-read each new test file's assertions against the code path once; the failures that reach the reviewer are usually in tests you just wrote, not in old ones.

**Evidence:** The handoff guessed jsdom focus and text cases. The one real failure was in a new test the engineer had just written. The reviewer found it only by running the eight touched test files, which costs a review run ($0.31) and a fix round.

**Why it applies beyond this plan:** The CI-risk line is only useful if it points at the real weak spot. Steering the engineer to re-check its own new tests catches errors before the review round. This is the cheap place to catch them, because later rounds cost a full agent run each.

## One-off corrections (no rule proposed)

- **The wrong caret offset itself (22 vs 23).** The specific arithmetic is feature-specific. Proposals 1 and 2 cover the general habit, not this value.
- **Frontmatter parser, fold parking, theme size.** All behaved as the PRD said. Review 1 found no PRD gaps, so the architect stage needs no change.
- **Reviewer's choice to run the touched tests despite the "don't run" rule.** The reviewer prompt already allows running a single test file to confirm a finding or check a new test. It worked as designed and needs no new rule.
