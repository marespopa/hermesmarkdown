# Lessons from plan 021 (cleanup-5-shared-badge-styles)

Run history: architect, engineer and review each ran once, with no fix round and no failed run (`usage.tsv`). Review 1 was "Approve with nits", checks "Deferred to CI". CI then failed twice after approval, and the orchestrator fixed both by hand (901c13d7, 33bd6ad3). Both failures were regressions that nothing in the factory loop looked for.

## 1. Engineer: grep the removed or replaced symbol, not only its importers

- **Target:** `.claude/agents/hermes-engineer.md`, "Implementing". It already says "before removing or renaming an export, grep for its importers". Replace that sentence with the version below.
- **Replace with:** "Add to an existing file; never rewrite it wholesale. Its other exports have importers you haven't read. Before removing, renaming or replacing any identifier (an export, import, constant or helper), grep the repo for it, including the rest of the file you are editing, and update every hit. After the last edit to a file, grep it once more for each identifier you removed."
- **Evidence:** the orchestrator note in the mailbox: "`tag-pills.ts(149,15): error TS2304: Cannot find name 'WORKFLOW_TAGS'`. The engineer removed the import and replaced one of two uses with `tagKind()`, leaving the second use."
- **Why it applies beyond this plan:** the current rule covers only cross-file importers. This failure was a second use in the same file. Factory runs never typecheck, so a half-done replacement survives until CI. Any cleanup or dedupe plan that swaps one helper for another can do the same.

## 2. Engineer: grep existing tests for old output when you change what renders

- **Target:** `.claude/agents/hermes-engineer.md`, "Tests and docs". It currently has a bullet for added hooks, provider calls and child components. Add a sibling bullet after it.
- **Add:** "- When you change rendered text or structure (for example plain text becoming a component, or a joined string becoming separate elements), grep the existing tests of every component that renders it, and of its parents, for the old text or query, such as `getByText`, `toHaveTextContent` and `textContent`. Update them in the same change."
- **Evidence:** the orchestrator note in the mailbox: "`CommandPalette.test.tsx:578` ... expected `#planning #work`; tags now render as separate TagPill elements, so text content is `#planning#work`. An existing test asserting the old joined-string rendering wasn't updated." The engineer's own handoff did predict "the new #-scope case in CommandPalette.test" as a CI risk, but it named the new test and not the old ones.
- **Why it applies beyond this plan:** the existing bullet covers new hooks and mocks only. UI cleanup and refactor plans regularly change markup, and tests that assert on text are the ones that break.

## 3. Reviewer: verify removals and the engineer's CI-risk line, since CI is deferred

- **Target:** `.claude/agents/hermes-review.md`, "Factory mode". Add one bullet after "Read lean: …".
- **Add:** "- Because checks are deferred to CI, spend the review time on what CI would catch. For every identifier the diff removes or replaces, grep the changed files and the repo for leftover uses. For every changed render output, grep the existing tests of the touching components for the old text. You may run those test files (`corepack yarn vitest run <file>`) when the diff changes rendered text. Treat a hit as a blocker, because it fails CI."
- **Evidence:** Review 1 recorded "Checks: Deferred to CI" and approved. Its only caution was that the `CommandPalette` `#` test asserts `textContent` contains `#planning`. It didn't see that the old test at line 578 now fails, or the dangling `WORKFLOW_TAGS` in `tag-pills.ts`, which it lists as changed ("`tag-pills.ts:27-34`"). The mailbox says: "checks are deferred to CI in factory mode, so review never ran them".
- **Why it applies beyond this plan:** with typecheck and tests deferred, the reviewer is the only stage that reads the diff before CI. "Read each changed file in full" didn't catch either failure. A named checklist (leftover references and stale assertions) is cheap and targets exactly the failures a deferred CI produces. The current text allows a test run only "to confirm or rule out a specific finding", which discourages this check.

## One-off corrections (no rule proposed)

- **`WORKFLOW_TAGS` and `TAG_COLORS` specifics:** the symbols are feature-specific. Only the general pattern (proposal 1) is worth a rule.
- **Review nit about `textContent` versus `getByText("#planning")`:** a test-quality preference on one case. AGENT_RULES already requires behavioral tests, and the reviewer judged it optional.
- **Missing `codemirror/README.md` and `DialogModal.md` timing note:** the PRD named docs that don't exist. The reviewer correctly marked them "don't apply", so the PRD author simply guessed wrong.
- **Fixes made by the orchestrator rather than a fix round:** this follows the factory's design after CI failure. Proposals 1–3 aim to cut the failures at the source, not to change that flow.
