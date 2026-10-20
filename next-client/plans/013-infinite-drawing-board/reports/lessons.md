# Lessons from plan 013 (infinite drawing board)

Timeline (`usage.tsv`): architect, engineer, review 1 (changes requested), engineer fix, review 2 (approved). That is one fix round, and it cost about $0.5 plus two orchestrator interventions. All but one of review 1's four findings were things the engineer would have caught by running the checks it was told not to run. The engineer's report says "Nothing was run" twice.

## 1. Factory-mode engineer must run the cheap checks (`.claude/agents/hermes-engineer.md`)

**Target:** the `## Verification` section. Add a factory-mode override in `## Factory mode`.

**Add to `## Factory mode`:**
```
- The "do not run checks" rule in Verification does not apply in factory mode: nothing else runs them before review. Before setting `state: review`, run from `next-client`: `corepack yarn tsc --noEmit`, `corepack yarn lint`, and `corepack yarn vitest run <each test file you added or changed>`. Fix what fails. Skip the full suite and the build (CI runs those). If a command is denied or can't run, say which in the report and put `UNVERIFIED:` first in your mailbox handoff.
```

**Evidence:**
- Engineer report: "Nothing was run, because deps couldn't be installed."
- Mailbox, orchestrator: `lint: 2 errors … vitest: 5 failures`.
- The review-1 fix list items 1-3 (appState mismatch, viewport seeding, the two lint errors) were all in test files the engineer wrote but never ran.
- Run 2 repeated it: "tsc/eslint/vitest could NOT be run here (approval denied), please run them." Review 2 then approved on the orchestrator's run, not on any engineer verification.

**Why it generalizes:** `AGENT_RULES.md` and the engineer's Verification section say "don't run tests automatically". That was written for interactive use. In the factory, the reviewer also defers to CI, so no stage ever runs the checks unless the orchestrator does it by hand. Every plan with new tests risks the same fix round.

## 2. Let the factory session actually run the checks (`scripts/factory`)

**Target:** `claude_session()` (the `--allowedTools` line and the env), plus a pre-engineer install.

**Replace the allowedTools list's `"Bash(corepack yarn *)"` with:**
```
"Bash(corepack yarn *)" "Bash(./node_modules/.bin/*)" "Bash(node ./node_modules/*)"
```
and export, before calling `$CLAUDE_BIN`:
```
COREPACK_NPM_REGISTRY=${COREPACK_NPM_REGISTRY:-https://registry.npmjs.org} COREPACK_ENABLE_DOWNLOAD_PROMPT=0
```
Also run `corepack yarn install` in `next-client` once before an engineer stage when `node_modules` is missing, or when `package.json` changed since the last stage.

**Evidence:**
- Engineer report: "Dependencies could not be installed (proxy 403), so `yarn.lock` is NOT updated."
- Mailbox: "Corepack needs `COREPACK_NPM_REGISTRY=https://registry.npmjs.org`, because repo.yarnpkg.com is blocked here."
- Mailbox, orchestrator: "run the checks yourself … or call the binaries directly … `node … ./node_modules/typescript/bin/tsc`". The allow-list only permits `corepack yarn *`, so that hint failed, and run 2 reported "approval denied".

**Why it generalizes:** lesson 1 is useless if the sandbox denies the commands. The orchestrator gave the engineer a workaround that the factory's own permissions blocked. Any plan that adds a dependency hits the same registry and install problem.

## 3. Verify a new dependency's API before coding against it (`.claude/agents/hermes-engineer.md`, `## Implementing`)

**Add the bullet:**
```
- New dependency: install it first (`corepack yarn install`) and read its types or docs in `node_modules` before writing code against it. Don't type it as `any` or code from memory to get around a failed install. If it can't be installed, set `state: blocked` and say why.
```

**Evidence:**
- Engineer report: "Excalidraw is typed loosely (`any` props …) so tsc doesn't depend on its types … `hashElementsVersion`, `MainMenu.DefaultItems.ClearCanvas/ChangeCanvasBackground`, `.default-sidebar-trigger` … come from the PRD and memory and need confirming."
- The orchestrator had to verify each assumption afterwards (mailbox: "The Excalidraw API assumptions all match 0.18.1").
- They happened to match. The loose typing remains in the code, so tsc can't catch later API drift.

**Why it generalizes:** the architect often names a library API. An unverified API is a silent risk, and `any` removes the typecheck that would catch it.

## 4. Test-writing pitfalls that the lint and test runs caught (`next-client/AGENT_RULES.md`, Testing Standards)

**Add after the "Router Mocking" bullet:**
```
- **Lint-clean tests**: Don't assign to outer variables during a mock component's render (`react-hooks/globals`); capture in an effect or a ref. Give wrapper components a name (`react/display-name`). Build expected strings from the same inputs the code uses, not from a parallel default.
- **Module-load storage**: `atomWithStorage(..., { getOnInit: true })` reads storage when the module loads, so seeding `sessionStorage` in a test does nothing. Seed the atom through the store (`store.set(atom, …)`).
```

**Evidence:**
- Review 1, finding 3: `BoardView.test.tsx:16 react-hooks/globals`, `use-board-viewport.test.ts:8 react/display-name`.
- Finding 2: "`getOnInit` reads storage at module load".
- Finding 1: the expected text used `appState: {}` while the code wrote the real app state.

**Why it generalizes:** persisted UI state uses `atomWithStorage` with `hermes_*` keys (architect definition), and mocks that capture props are common. Two of the three patterns will recur. Keep this at two bullets, because the third finding is already covered by lesson 1.

## 5. Measured acceptance items need an owner (`.claude/agents/hermes-architect.md`, PRD guidance)

**Add to the PRD guidance:**
```
- Don't put measurements in acceptance criteria (bundle size, First Load JS, quota or large-file results) unless a stage can produce them. The engineer can't run the build in factory mode. Say instead: "CI build must stay under X" or "engineer notes the result if able", and list it under Out of scope for the review verdict.
```

**Evidence:**
- Review 1 and review 2 both say: "The chunk size, the `/editor` First Load JS and the 1 MB board / localStorage result" are missing from the engineer report and must be "recorded before merge".
- Neither review could request changes, because the factory rules only allow that for blocker or major findings.
- The item survived to approval unmet, with no stage able to meet it.

**Why it generalizes:** it applies to any PRD with perf or size criteria. As written, those items can never be satisfied inside the factory. They reappear as a nit in every review and then get lost.

## One-off corrections (not proposed)

- **Empty `.board.md` loses `hermes: board` on the first stroke** (review 1, finding 4). This is a feature-specific edge case in the board format. Only the PRD's own "never empty" invariant was involved.
- **`BoardView.tsx:82` inline `excalidrawAPI` arrow, `use-board-sync.ts` `changeKeyRef` after `updateScene`, unused `isActivePane`.** These are feature-internal minor findings, flagged as questions or nits and never made blocking.
- **First engineer stage marking `yarn.lock` as not updated.** It followed from the install failure in lesson 2, not from a separate rule gap.
- **Orchestrator-run check results pasted into the mailbox.** This is the symptom lessons 1 and 2 remove, not a rule to add.
