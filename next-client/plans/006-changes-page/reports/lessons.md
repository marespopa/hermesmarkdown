# Lessons — 006 changes page

Run history (`usage.tsv`): architect → engineer (126 turns, no test run) → review 1 (changes requested, 4 failing new tests) → engineer fix round → review 2 (2 more failing new tests) → engineer fix round → review 3 (approve). Two fix rounds, and every blocker was a new test that failed when the reviewer ran it. No finding was a missed PRD requirement.

## 1. Let the engineer run the test files it wrote (highest value)

**Target:** `.claude/agents/hermes-engineer.md`, section `## Verification`. Add after the first bullet:

> - Factory mode exception: before setting `state: review`, run once the test files you added or changed (`corepack yarn vitest run <those files>`, never the full suite, typecheck or build) and fix what fails. Report the result. A worker-start timeout is environmental: rerun that file alone.

Also change the factory bullet "Because nothing is run, name in the handoff…" to "Name in the handoff any test you could not run and the one or two places most likely to fail in CI."

**Evidence:**
- Engineer report: "no tests were run", with the handoff "Likeliest CI failures: page.test.tsx (mock of atoms/vault-atoms), git-changes-scan.test.ts (index/mtime fixtures)…"
- Review 1 then found exactly those: "`setup()` is called without `{ index }`… `Cannot set properties of undefined`" and "`vitest.setup.ts:43` defines `scrollIntoView` on `HTMLElement.prototype`".
- Review 2 found two more failing new tests: "git-hash.test.ts:10 … expected value wrong" and "Chunk.build merges the two inserts into a single chunk".
- Run 3 of the engineer again ended with "Not run: corepack yarn vitest run …". The 2nd fix round was a repeat of the first problem.

**Why it applies beyond this plan:** the rule "run nothing" is meant to save cost and keep CI as the gate. But the engineer already predicted the failing files, and the reviewer pays for a full round (review ≈ $0.16–0.30 plus an engineer round) to run those same files. Failures in tests the engineer just wrote are fixture and mock mistakes that only execution shows. Running only its own new files costs seconds. It keeps the "no full suite, no build, no typecheck" intent.

## 2. Architect must not write computed constants from memory

**Target:** `.claude/agents/hermes-architect.md`, section `## Rules`. Add:

> - Don't put hashes, checksums, magic numbers, byte offsets or other computed values in the PRD from memory. Name the value ("git's empty blob id") and tell the engineer to derive it with a tool (`git hash-object`, `node -e`) and use that in the test. A wrong literal in the PRD becomes a failing test and a review round.

**Evidence:** PRD line 277 has `e69de29bb2d1d6484b8b6248b29a6b8b0c0d9a5e` for the empty blob. Review 2: "The PRD's value is a typo, so the implementation is right… `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`." The engineer copied the PRD literal into the test, so the correct implementation failed its own test.

**Why it applies beyond this plan:** any plan with a format, protocol or hashing component (zip, index files, base64 fixtures, color values) lets the architect state a literal that the engineer trusts. Neither role verifies it, so the error only appears in a run.

## 3. Check `vitest.setup.ts` before patching a global in a test

**Target:** `next-client/AGENT_RULES.md`, section `## 🧪 Testing Standards`. Add a bullet after "Event Coordinates":

> - **Global Stubs**: `vitest.setup.ts` already stubs some DOM APIs (for example `scrollIntoView` on `HTMLElement.prototype`). Grep it before mocking a browser API, and patch the same prototype it uses; patching `Element.prototype` is shadowed and the mock is never called.

**Evidence:** Review 1 blocker 2: "`vitest.setup.ts:43` defines `scrollIntoView` on `HTMLElement.prototype`, which shadows the `Element.prototype` mock. The page code is fine." The mailbox repeats the fix: "Mock HTMLElement.prototype instead."

**Why it applies beyond this plan:** the file already collects several stubs (`ResizeObserver`, scrolling, etc.), and every new component test that asserts on one of them can hit this. The existing "Testing Standards" bullets are exactly this kind of jsdom trap, so it fits that list.

## 4. Enumerate tests that list a registry when adding entries to it

**Target:** `.claude/agents/hermes-engineer.md`, section `## Tests and docs (same change)`. Extend the bullet "When you add a hook, provider call or child component…" with:

> Likewise when you add a palette command, route, setting or other registry entry, grep the tests for a literal list of the existing entries (for example `build-editor-commands.test.ts` lists command IDs) and add the new ones.

**Evidence:** Orchestrator note in the mailbox: "(4) build-editor-commands.test.ts lists the next-git-change / previous-git-change command IDs (CI failed without them)." Plan 006 also added a palette command and needed `AppCommands.test.tsx` and `RouteSkeletons.test.tsx` updates, which the engineer found only because the PRD named them.

**Why it applies beyond this plan:** command, route and skeleton lists are checked by snapshot-style tests in this repo. The existing grep rule covers hooks and mocks, but not "tests that enumerate the thing I extended". It is a CI failure the reviewer's identifier grep misses, because nothing is removed.

## 5. State edge cases of "empty" inputs in tests for library-backed diffing (weakest; skip if only one fits)

**Target:** `.claude/agents/hermes-engineer.md`, section `## Tests and docs (same change)`. Add:

> - For code that wraps a library (CodeMirror `Text`, `@codemirror/merge`, a parser), test the empty, one-sided and single-line inputs through the real library, not only the happy path. Library "normal forms" (an empty document is one empty line) leak into counts and rows.

**Evidence:** Review 1 blocker 3: "`buildFileDiff("a", "")` returns `newCount: 1`… the empty side is replaced with `Text.of([""])`, so CodeMirror sees a one-empty-line document." The PRD said "an empty file has zero lines", and the engineer's tests did not cover it. Review 1 also asked for "an emptied-file layout assertion" after the fact.

**Why it applies beyond this plan:** off-by-one at empty boundaries from a wrapped library recurs in every parser and diff feature. This is the one proposal that is partly feature-specific, so rank it last.

## One-off corrections (no rule proposed)

- **`SKIPPED_DIRS =new Set` and `page("open-trash","Open Trash"` formatting typos:** the orchestrator fixed them by hand. A formatter or lint rule catches these in CI. It is not a rule gap.
- **`git-changes-scan.test.ts` `setup()` helper without an index:** a mistake in this feature's own fixture helper. Proposal 1 would have caught it, so no separate rule is needed.
- **Mixed follow-ups to plan 001 (tint layer, `use-vault-has-git`, `gitReplacedBlocks`) reviewed together with 006:** the user asked for them in the same working tree and the orchestrator told the reviewer to treat them as in scope. The reviewer handled it correctly. That was a human request, not a process failure.
- **`initialCollapsed` after a collapsed large file, over-20,000-line counts, symlink edge case:** review minors that were judged acceptable. They are product trade-offs.
- **Worker-start timeouts in wider vitest runs:** environmental (Termux/proot), noted by the reviewer in two reviews. Proposal 1 includes a one-line handling.
- **Review 1's heading says "Review 1" while the file holds three reviews:** cosmetic. The reviewer added a pointer line and appended later reviews as the prompt says.
