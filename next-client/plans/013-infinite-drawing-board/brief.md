---
state: specced
size: normal
blocked_from:
rejections: 0
created: 2026-10-14T16:38:22Z
---

# Infinite drawing board (Excalidraw)

Source PRD: `next-client/plans/infinite-drawing-board.md`. It carries the research, the decisions and the file-level design. Treat it as the spec input, and verify its code references against the current tree. This plan covers **phase 1 (MVP) only**.

## Problem
Users can write notes, tables, Mermaid and math, but they have nowhere to sketch: no freehand drawing, shapes or arrows on an open canvas. Today they need another app and lose the link between the sketch and their notes.

## Desired behavior
- A palette command **New board** creates `Untitled.board.md` in the New Notes folder. A name clash gives `Untitled (1).board.md` and never `Untitled.board (1).md`, which means fixing `createUniqueFile`.
- A board is a Markdown note with `hermes: board` frontmatter, optional prose, and one ` ```hermes-board ` fenced JSON scene (one element per line, stable key order, coordinates rounded, deleted elements dropped, a small `appState` allow-list). The pure format module is `app/utils/board/board-format.ts`, with parse, serialize, `stripBoardFence` and conflict-marker detection, plus `migrate.ts` and `is-board.ts`. None of these imports `@excalidraw/*` at runtime.
- Opening a board in a pane renders `BoardView` (Excalidraw, loaded with `next/dynamic` and `ssr: false`) instead of `MarkdownEditor`. Tabs, splits, the private-note gate and the tab limit keep working.
- Edits go through the existing content atom and save pipeline. Write only when `hashElementsVersion(elements)` changed (not `getSceneVersion`, which is deprecated), with a debounce of about 500 ms. Flush pending writes on unmount or tab close. On an external reload, cancel the pending write, then call `updateScene`. The viewport goes in tab session storage, never in the file.
- The app theme maps to Excalidraw's theme. Image paste and insert are disabled. Collaboration, excalidraw.com links, the web library and Excalidraw's own load/save/export are hidden.
- Fonts are self-hosted under `public/excalidraw-assets/` (copied from `node_modules` by a script) through `EXCALIDRAW_ASSET_PATH`, so the board makes no third-party requests.
- Error states: a fence with git conflict markers shows "This board has unresolved merge conflicts", and invalid JSON shows "This board couldn't be read". Both offer **Edit as Markdown** (pane menu) and never write.
- The board JSON is kept out of word count, the note preview, `ContentIndex`, wikilink extraction in the metadata worker, and the AI chat `read_note` runner (`ai-chat/chat-tool-runners.ts`).
- `taskExtractor.ts` skips all fenced code (a general fix, with tests).
- A lint rule (`no-restricted-imports` for `@excalidraw/*`) exempts only `BoardView.tsx`, so the editor route's First Load JS stays unchanged.
- Tests as listed in the source PRD, section 11. Component `.md` docs, `ARCHITECTURE.md` entry, user docs.

## Out of scope
- Phase 2: `![[x.board]]` embeds, `/board`, PDF export of boards.
- Phase 3: board text in content search, and wikilinks on boards as backlinks.
- Phase 4: images on boards and non-`.md` sync.
- Special-casing boards as whole-file conflicts in the GitHub sync.
- Importing `.excalidraw` files.
- A read-only board mode, and template-pack entries.
