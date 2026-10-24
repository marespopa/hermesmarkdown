# Lessons from plan 017 (multi-pane and drag tiling)

Timeline from `usage.tsv` and `mailbox.md`:
- The first engineer run exited 1 after 124 turns and was resumed.
- Review 1 asked for one test fix and listed two optional minors.
- The engineer's fix round did all three without running anything.
- The optional `splitPane` edit shadowed a variable (TDZ), which broke every split. Review 2 caught it.
- `MAX_REJECTIONS=2` then blocked the plan, and the orchestrator applied a one-line rename by hand.

## 1. Optional findings turned a one-test fix into a blocker (highest value)

**Target:** `.claude/agents/hermes-review.md`, Factory mode section. Replace the bullet "Request changes only for blocker or major findings. …" with:

> - Request changes only for blocker or major findings. Minor findings and nits go in the review under `Approve with nits`; they don't send the plan back to the engineer. In a `Changes requested` review, the Handoff lists only the blocker/major fixes. Keep minors in Findings and out of the Handoff and `mailbox.md`, because an "optional" item in a fix list still gets implemented.

**Target:** `.claude/agents/hermes-engineer.md`, Factory mode section. Add after the bullet about reviewer fix lists:

> - In a fix round, change only what the fix list requires. Skip items marked optional or minor unless the list says to do them. Before setting `state: review`, re-read each edited function in full for shadowed names, renamed variables and changed return shapes. Run the single test file for each function you edited (`corepack yarn vitest run <file>`).

**Evidence:**
- Review 1: "Handoff: fix finding 1 (required). Findings 2 and 3 are optional." Review 1 was `Changes requested` for one failing test only, yet the mailbox fix list still carried "Optional: atom_splitPane should strip a stale parent scrollLock; atom_setSplitSizes should ignore sizes containing 0."
- Engineer fix 1 did all three, "Not run".
- Review 2: "`const { scrollLock, ...rest } = node` shadows the splitPane `scrollLock` param … every atom_splitPane call fails (8 layout-actions tests fail)."
- A harmless test fix became a second rejection, and that second rejection exhausted the retry budget.

**Why it generalizes:** every fix round has this risk. Unrequested edits made without running anything are the most likely source of regressions.

## 2. Allow the engineer a focused test run in fix rounds

**Target:** `.claude/agents/hermes-engineer.md`, Verification section. Replace the first bullet with:

> - Do **not** run the build, typecheck or full test suite automatically. Exception: in factory mode, run `corepack yarn vitest run <file>` for the test file(s) of the code you edited in this run, and fix what fails. It is cheap, and CI is too late to find a ReferenceError in the function you just changed. Run the broader checks only if the PRD handoff or the user explicitly asks.

**Target:** `next-client/AGENT_RULES.md`, "Tests With Changes". The rule says "Don't run the build or test suite automatically after each edit". Add:

> Factory runs may run the single test file for the code just edited (not the suite, typecheck or build).

**Evidence:**
- Engineer handoff, run 1: "built (all phases + tests + docs), not run".
- Engineer fix 1: "Not run; watch layout-actions tests asserting scrollLock/sizes".
- The engineer named the exact tests that would break and then did not run them.
- `layout-actions.test.ts` had 8 failures that one focused run would have exposed.
- The reviewer is already allowed this single-file run.

**Why it generalizes:** the "never run anything" rule is meant to avoid slow suites. It also stops the author from doing the cheapest possible check. The reviewer ends up doing the run, which costs a full review round.

## 3. jsdom has no DragEvent/PointerEvent: record it with the other test rules

**Target:** `next-client/AGENT_RULES.md`, Testing Standards. Add a bullet after "Module-Load Storage":

> - **Event Coordinates**: jsdom has no `DragEvent` or `PointerEvent`, so `fireEvent.drop/dragOver/pointerDown(el, { clientX, clientY })` silently drops the coordinates. Build the event with `createEvent.*`, set `clientX`/`clientY` with `Object.defineProperty`, then `fireEvent(el, event)`. Also assert that the result differs from the default (for example, not the `center` zone).

**Evidence:** Review 1, finding 1 (Major): "jsdom has no `DragEvent`. `fireEvent.drop(layer, { clientX: 10 })` therefore doesn't set `clientX`, the zone resolves to `center`, and the test expects `left`." This caused the first rejection.

**Why it generalizes:** any feature with drag, pointer, resize or scroll math will hit this. AGENT_RULES already records the sibling jsdom gotchas (Module-Load Storage, Lint-Clean Tests).

## 4. Pre-mortem line is not enough: make the engineer update existing tests that mount changed components

**Target:** `.claude/agents/hermes-engineer.md`, "Tests and docs" section. Add:

> - When you add a hook, provider call or child component to a component that existing tests render (for example a layer using `useFileSystem` or `useDialog`), grep for those tests and update their mocks in the same change. Don't leave it to the CI-risk line in the mailbox.

**Evidence:**
- Engineer handoff: "likeliest CI failures: build-editor-commands.test order list/mock context, PaneLeaf.test (now mounts PaneDropLayer), VaultFileTree.test (mocked useAtomValue), use-scroll-lock jsdom stubs".
- The engineer predicted four breakages but did not fix them. Review 1 ran those files and found them passing.
- This worked out here, but the pattern is fragile. The prediction was a to-do deferred to CI instead of work done.

**Why it generalizes:** the engineer is told to name CI risks but is never told to resolve the ones it can see. This applies to any plan that touches shared components.

## 5. Retry budget: a one-line fix cost a human/orchestrator intervention

**Target:** `scripts/factory`, near `MAX_REJECTIONS=2` (line 22). Add a comment and a rule:

> `# A rejection whose latest review lists only blockers fixable by one named edit (a rename, a missing import) gets one extra engineer pass before blocking.`

If scripting that is too fiddly, put it in the `hermes-review.md` Handoff format instead:

> In the Handoff, mark each fix `[trivial]` when it is a rename or a one-line edit. The orchestrator may apply `[trivial]` fixes itself instead of counting a rejection.

**Evidence:**
- Mailbox: "orchestrator: applied review 2's fix by hand (layout-actions.ts splitPane: renamed shadowing destructure to parentLock); set approved, tests left to CI."
- The `blocked.md` note read "Review rejected the change 2 times."
- The second rejection was a single rename, and applying it by hand was the orchestrator's usual response.

**Why it generalizes:** the budget doesn't distinguish "design is wrong" from "one typo". Treat this as lowest priority. Proposal 1 prevents most of these cases.

## One-off corrections (not proposed)

- **Engineer run 1, exit 1 after 124 turns, then a RESUME note:** `.run.log` and `usage.tsv` don't show the cause (turn or context limit, or a tool failure). The resume worked, and the second run took only 18 turns. A rule would be a guess.
- **`PaneLeaf.panes.test.tsx` split from `PaneLeaf.test.tsx`:** a PRD-driven deviation, declared and accepted.
- **The `scrollLock` TDZ shadowing bug itself and the `splitPane`/`setSplitSizes` edge cases (stale parent lock, zero sizes):** specific to this feature's logic. Only the process around them (proposals 1 and 2) is general.
- **The `dragend` reset, `activeIndex` vs `activePaneId` and the other declared deviations:** reasonable calls the reviewer accepted.
