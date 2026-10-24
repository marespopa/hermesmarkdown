# Engineer report: 013 infinite drawing board (MVP, phases 1 and 2)

## Built
- Format (pure): `app/utils/board/board-format.ts`, `board-serialize.ts`, `migrate.ts`, `is-board.ts`, `board-flush.ts`, `README.md`.
- `createUniqueFile` keeps `.board` last (`app/hooks/file-system/unique-file.ts`).
- `extractTasks` skips all fenced code (`app/utils/taskExtractor.ts`).
- Worker parse extracted to `app/workers/parse-note.ts` (strips board JSON for tags, links, words, preview); `metadata.worker.ts` uses it; `ContentIndex.upsert` strips (`content-index.ts`); AI `readNoteOutput` uses `boardTextForReading`.
- Dependency + assets: `package.json` (`@excalidraw/excalidraw ^0.18.0`, `dev`/`build` run `scripts/copy-excalidraw-assets.mjs`), `.gitignore`, ESLint `no-restricted-imports` guard with exemptions (`eslint.config.mjs`).
- Board UI: `app/editor/components/board/` (`BoardViewLoader`, `BoardView`, `BoardError`, `use-board-sync`, `use-board-viewport`, `board-ui-options`, `board-types`, `excalidraw-asset-path`, `BoardView.css`); `app/atoms/board-atoms.ts`.
- Pane dispatch + tab menu: `PaneLeaf.tsx`.
- Flush before save reads: `use-pane-file-actions.tsx`, `app/editor/page.tsx`, `app/hooks/use-auto-save.ts`.
- Palette: `use-create-board.ts`, `use-editor-command-context.ts`, `document-vault-commands.ts` (New board; Edit Board as Markdown / Open as Board).

## Tests/docs
- New tests: board-format, migrate, is-board, board-flush, parse-note, chat-tool-runners, use-create-board, BoardView, use-board-viewport, PaneLeaf.board, use-auto-save, use-pane-file-actions.
- Extended: unique-file, taskExtractor, content-index, build-editor-commands (the order list now has `new-board`).
- Docs: board/ README + BoardView/BoardViewLoader/BoardError .md, utils/board README, components README, PaneLeaf.md, editor-commands README, atoms README, workers README, ARCHITECTURE.md (Boards), user docs `editor-writing.tsx` (Boards subsection).

## Decisions
- Dependencies could not be installed (proxy 403), so `yarn.lock` is NOT updated and Excalidraw's API was not checked against the installed package. `hashElementsVersion`, `MainMenu.DefaultItems.ClearCanvas/ChangeCanvasBackground`, `.default-sidebar-trigger`, the font path `dist/prod/fonts` and the `onPaste(data, event)` signature come from the PRD and memory and need confirming.
- Excalidraw is typed loosely (`any` props, a small local `SceneApi`) so tsc doesn't depend on its types.
- Board tests for `PaneLeaf` are in `PaneLeaf.board.test.tsx` (mocks `MarkdownEditor`) so the existing file's mocks stay untouched.
- `BoardView.css` (plain CSS) instead of scss.
- The viewport hook also commits a waiting viewport on unmount.

## Not done / open
- Nothing was run: no tsc, vitest, lint or build. Chunk size and First Load JS are not recorded. The 1 MB board / localStorage quota check is not done (open question in the PRD).
- `isActivePane` is accepted by `BoardView` but unused.

## Run 2 (review 1 fixes)
- `BoardView.test.tsx`: write tests now expect the written appState (`{"viewBackgroundColor":"#ffffff"}`); viewport test seeds `atom_boardViewports` on the store; the captured props moved into an effect (`PROPS.current`), so `react-hooks/globals` shouldn't fire.
- `use-board-viewport.test.ts`: reads-back and unchanged tests seed the atom; the wrapper is a named component (`react/display-name`).
- `parseBoard("")` (blank input) now gets the `NEW_BOARD_MARKDOWN` frontmatter head, so an empty `.board.md` stays a board; test added in `board-format.test.ts`.
- Not done: the optional `changeKeyRef` tweak, and chunk size / First Load JS / 1 MB board numbers.
- **Not run:** this session's shell denied tsc, eslint and vitest (approval required), so the fixes are unverified. Please run the three commands from the mailbox.

## To verify
- `cd next-client && corepack yarn install && corepack yarn tsc --noEmit && corepack yarn lint`
- `corepack yarn vitest run app/utils/board app/workers app/hooks app/editor`
- Manually: New board from the palette, draw, switch tabs, Cmd+S, reload; the Network tab shows no third-party requests.
