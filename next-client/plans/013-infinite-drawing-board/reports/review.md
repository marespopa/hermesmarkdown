## Review 1

**Verdict:** Changes requested

**Checks:** Deferred to CI (factory mode). The orchestrator's post-engineer run is in `mailbox.md`: `tsc` passes, `lint` has 2 errors, and `vitest` has 5 failures. All of them are in new test files from this change. I read the code behind each failure; the diagnoses are below. I did not run anything myself.

### PRD coverage
- **Format module** (parse, serialize, strip, reading, migrate, is-board, flush): done. See `app/utils/board/*.ts`. It matches the Design section, including verbatim head/tail, blanked fence lines and `.board` ordering in `unique-file.ts:13-21`.
- **Indexing:** done. `parse-note.ts` strips the fence for tags, links, word count and preview. `content-index.ts:77` strips in `upsert`. `chat-tool-runners.ts:63` uses `boardTextForReading`.
- **Tasks:** done. `taskExtractor.ts` skips fenced code.
- **Creating a board:** done. `use-create-board.ts`, plus the palette entries in `document-vault-commands.ts`.
- **Pane dispatch and tab menu:** done. `PaneLeaf.tsx:65-69`, `:243-260` and `:284-290`.
- **Sync, flush and viewport:** done in `use-board-sync.ts` and `use-board-viewport.ts`. The save paths flush in `use-auto-save.ts`, `use-pane-file-actions.tsx` and `page.tsx`. One gap: the empty-`.board.md` frontmatter bug (finding 4).
- **Excalidraw UI lockdown:** done. `board-ui-options.tsx` and `BoardView.css`. The 0.18.1 API assumptions were verified by the orchestrator.
- **Lint guard:** done, in `eslint.config.mjs`.
- **Docs, `ARCHITECTURE.md` and user docs:** present.
- **Acceptance items not evidenced:**
  - the chunk size and the First Load JS are not recorded;
  - the 1 MB board and localStorage quota check is not done. The PRD asked the engineer to test it and note the result.
  Both belong in the engineer report. They are not blockers.

### Findings

**Major**
1. **Failing tests: `BoardView.test.tsx`, three "string mismatch" cases** (lines 82-125). The test builds its expected text with `md(elements)`, which uses `appState: {}`. The component correctly writes the allow-listed `appState` taken from `baseAppState`, which is `{"viewBackgroundColor":"#ffffff"}`. The expected and actual text differ in that header line. This is a test bug, and the product code is right.
   Fix: build the expected text with the same `appState`, e.g. `md(els, { viewBackgroundColor: "#ffffff" })`, and make `INITIAL` match.
2. **Failing tests: viewport restore (`BoardView.test.tsx:186`, `use-board-viewport.test.ts` "reads the saved viewport back")**. `atomWithStorage(..., { getOnInit: true })` reads storage once, when the atom is created at module load, not per store. Seeding `sessionStorage` inside a test therefore has no effect, and `initial` is `null`.
   - Product behavior is fine: a reload re-creates the atom, and in a session the store holds the value.
   - Fix: seed with `store.set(atom_boardViewports, {...})` before rendering. If the real storage round trip must be tested, use `vi.resetModules` and a dynamic import after seeding.
3. **Lint errors**:
   - `BoardView.test.tsx:16`: `react-hooks/globals`, because the mock assigns `lastProps` during render. Capture it in an effect or a ref-like holder, or use a targeted disable with a reason.
   - `use-board-viewport.test.ts:8`: `react/display-name` on the wrapper. Name the component.
4. **Empty `.board.md` loses its board identity on the first stroke** (`board-format.ts:62-68`, `is-board.ts:9`). An empty `Foo.board.md` (created by hand in the file tree, or by an external tool) is a board only because of its name. `parseBoard("")` gives `head: ""`, so the first stroke writes a fence with no `hermes: board` frontmatter.
   - Scenario: the next render calls `isBoard` on `Foo.board.md` with content and no key, and gets `false`. The pane swaps the canvas for the text editor showing raw JSON, mid-drawing.
   - Fix: when the markdown is blank, make `head` the `NEW_BOARD_MARKDOWN` frontmatter prefix (`---\nhermes: board\nboard-version: 1\n---\n\n`). Add a test. This deviates slightly from PRD step 2, which is why the PRD's own "never empty" invariant needs it.

**Minor**
- `BoardView.tsx:82`: `excalidrawAPI` is an inline arrow, so it gets re-created each render. It only assigns a ref, so it is harmless. Memoize it if Excalidraw re-invokes it.
- `use-board-sync.ts:96-100`: after an external `updateScene`, `changeKeyRef` stays `null` until Excalidraw's next `onChange`. If that onChange never fires (for example, identical elements with only the prose changed), the user's next real edit is swallowed as the baseline. Question: is `onChange` guaranteed after `updateScene`? Fix: also compute and set the key directly from the external scene.
- `isActivePane` is accepted but unused (already in the engineer report).
- The chunk-size and First Load JS numbers are not in the engineer report (see PRD coverage).

### Tests & docs gaps
- Tests exist for all listed areas. The broken ones are in findings 1-3. A test for finding 4 is missing.
- Sibling `.md` files and README indexes are present. File sizes are fine: the largest changed file is about 195 lines of test, and all source files are under 125 lines.

### Handoff
1. Fix the `appState` mismatch in the `BoardView.test.tsx` expectations (finding 1).
2. Seed the viewport through the store in both viewport tests (finding 2).
3. Fix the 2 lint errors (finding 3).
4. Make an empty `.board.md` keep `hermes: board` frontmatter after the first stroke, and add a test (finding 4).
5. Optional: set `changeKeyRef` from the external scene. Record the chunk size and First Load JS, and the result of the 1 MB board test, in the engineer report.

## Review 2

**Verdict:** Approve with nits

**Checks:** Deferred to CI (factory mode). The orchestrator's run after the review-1 fixes (in `mailbox.md`): `tsc` passes, `eslint` has 0 errors, and the full vitest suite passes (232 files, 1692 tests). I ran nothing myself.

### Review-1 findings
1. `appState` expectations in `BoardView.test.tsx`: fixed.
2. Viewport tests: fixed (seeded through the store).
3. Lint errors: fixed. Lint is clean.
4. Blank `.board.md` losing its identity: fixed. `board-format.ts:62-68` gives a blank file the `NEW_BOARD_MARKDOWN` frontmatter head, and `board-format.test.ts` has a test for it. I re-read the code to confirm.

### Nits (non-blocking)
- `use-board-sync.ts:96-100`: after an external `updateScene`, `changeKeyRef` stays `null` until the next `onChange`. If none fires, the next real edit is taken as the baseline and not written. This is the optional item from review 1.
- `isActivePane` is accepted by `BoardView` but unused.
- The engineer report still lacks the board chunk size, the `/editor` First Load JS and the 1 MB board / localStorage result. Record them before merge.

### PRD coverage
Unchanged from review 1: phases 1 and 2 are done. Only the recorded numbers above are open.

### Handoff
None required.
