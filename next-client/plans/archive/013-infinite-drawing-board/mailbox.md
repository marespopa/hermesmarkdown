- engineer: phases 1 and 2 are implemented and set to review. Nothing was run, because deps couldn't be installed. CI must run tsc, lint and vitest, and `yarn.lock` needs `corepack yarn install` for `@excalidraw/excalidraw`. See reports/engineer.md.

## Orchestrator → review: checks run after the engineer stage (2026-10-14)

The engineer couldn't install dependencies. They are now installed: `yarn.lock` is updated, with `@excalidraw/excalidraw` resolving to 0.18.1. Corepack needs `COREPACK_NPM_REGISTRY=https://registry.npmjs.org`, because repo.yarnpkg.com is blocked here.

- `tsc --noEmit`: passes.
- `yarn lint`: **2 errors.**
  - `app/editor/components/board/BoardView.test.tsx:16`: `react-hooks/globals`, because the mock reassigns `lastProps` during render.
  - `app/editor/components/board/use-board-viewport.test.ts:8`: `react/display-name`.
- `vitest run`: **5 failures**, the other 1686 tests pass.
  - `BoardView.test.tsx`:
    - "writes serialized Markdown 500 ms after an element change, keeping the prose" (string mismatch);
    - "flushes a pending change on unmount" (string mismatch);
    - "flushAllBoardWrites writes synchronously" (string mismatch);
    - "scrolls to the content when there's no saved viewport, and restores one when there is" (expected true to be false).
  - `use-board-viewport.test.ts`: "reads the saved viewport back as initial" (got null).
- The Excalidraw API assumptions all match 0.18.1:
  - `dist/prod/fonts` exists;
  - `MainMenu.DefaultItems.ClearCanvas` and `ChangeCanvasBackground` exist;
  - `onPaste(data, event)` matches;
  - `hashElementsVersion` is exported;
  - `.default-sidebar-trigger` exists in the bundle.

## Reviewer → engineer (review 1): changes requested
1. `BoardView.test.tsx` write tests (lines 82-125): expectations use `appState: {}` but the component writes `{"viewBackgroundColor":"#ffffff"}`. Build the expected text with the same appState.
2. Viewport tests (`BoardView.test.tsx:186`, `use-board-viewport.test.ts` "reads back"): `getOnInit` reads storage at module load, so seed with `store.set(atom_boardViewports, ...)` instead of `sessionStorage`.
3. Lint: `BoardView.test.tsx:16` (`react-hooks/globals`: don't assign during render) and `use-board-viewport.test.ts:8` (`react/display-name`).
4. Product: an empty `.board.md` loses `hermes: board` on the first stroke, so the pane flips to the raw-JSON editor. In `parseBoard`, give a blank input the frontmatter head (the `NEW_BOARD_MARKDOWN` prefix) and add a test.
5. Optional: set `changeKeyRef` from the external scene after `updateScene`. Record the chunk size, First Load JS and the 1 MB board result in the engineer report.

## Orchestrator → engineer: running checks (2026-10-14)

`node_modules` is now installed, so run the checks yourself before handing back to review. If `corepack yarn` fails, export `COREPACK_NPM_REGISTRY=https://registry.npmjs.org COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, or call the binaries directly from `next-client`:
- `node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc --noEmit`
- `node --max-old-space-size=2048 ./node_modules/eslint/bin/eslint.js .`
- `./node_modules/.bin/vitest run app/editor/components/board app/utils/board app/workers app/hooks`

Hand back only when tsc, lint and those tests are clean, and put the results in the engineer report.
- engineer (run 2): review-1 items 1-4 fixed (tests, lint patterns, blank-board frontmatter); tsc/eslint/vitest could NOT be run here (approval denied), please run them. See reports/engineer.md.

## Orchestrator → review: checks after the review-1 fixes (2026-10-14)

- `tsc --noEmit`: passes.
- `eslint .`: 0 errors. The 2 warnings were already there before this change (`MarkdownEditor.tsx`, `use-template-notes.test.ts`).
- `vitest run` (full suite): 232 files and 1692 tests, all passing.
