# Architect report: 013 infinite drawing board

## Run 1

**PRD:** `next-client/plans/013-infinite-drawing-board/prd.md`

**Summary** (2 phases, MVP only)
- **Phase 1** (no Excalidraw yet):
  - a pure board format module in `app/utils/board/`: parse and serialize with one element per line, stable key order, rounded coordinates, an `appState` allow-list and conflict-marker detection, plus `stripBoardFence`, `migrate`, `isBoard` and a flush registry;
  - fence-aware task extraction (all fences);
  - board JSON stripped from tags, links, word count, preview, `ContentIndex` and AI `read_note`;
  - `createUniqueFile` gives `Untitled (1).board.md`.
- **Phase 2:**
  - the `@excalidraw/excalidraw` dependency with self-hosted fonts (a copy script run from `dev`/`build`, output gitignored);
  - a lint rule so that only `BoardView.tsx` may import Excalidraw;
  - a lazy `BoardView` behind `BoardViewLoader`, dispatched from `PaneLeaf` inside `PrivateNoteGate`;
  - `use-board-sync` (500 ms debounce, baseline on first `onChange`, cancel and `updateScene` on external change, flush on unmount, `pagehide` and save paths);
  - a per-tab viewport in `sessionStorage`;
  - conflict and invalid error states;
  - **Edit as Markdown** / **Open as Board**;
  - the **New board** palette command;
  - docs.

**Already exists**
- The whole save, autosave, dirty-state and disk-wins reload pipeline (`atom_fileContent`, `use-auto-save.ts`, `use-file-watcher.ts` → `reconcileWithDisk`). The board only writes Markdown into the content atom.
- `createFile` in `use-create-item.ts` already handles `Untitled.board` → `Untitled.board.md`, writes, rescans and opens. The New Notes folder helpers already exist (`ensureVaultFolder`, `normalizeFolderPath`).
- `notePreview` already skips fenced code. The service worker already caches same-origin `.woff2` cache-first. There is no CSP to update.
- `PaneLeaf` is the single place `MarkdownEditor` renders (desktop and mobile), so there is one dispatch point.

**Corrections to the source PRD found in the code**
- `ConflictDialog` / `atom_fileConflict` is never set today (the disk wins silently), so the "ConflictDialog merge" repair path doesn't apply. Repair is Edit as Markdown only.
- There is no "pane menu". Edit as Markdown goes in the tab context menu and the palette, plus the button in the error states.
- `EditorSkeleton` is the home-feed skeleton, so the PRD uses a simple pulsing placeholder instead.
- A debounced board writer needed a flush before every save read (Cmd+S, pane Save, tab close, tab switch in `use-auto-save`). The PRD adds a small flush registry and has those paths read from the store.

**Decisions to look at**
- Change detection = `hashElementsVersion` **plus** the allow-listed `appState`, so a background color change saves.
- `stripBoardFence` blanks the fence lines (the line count is preserved) for the index and tasks. AI `read_note` gets the prose plus "(board with N elements)".
- Board detection comes from the tab content (`hermes: board`), with `.board.md` counting only for empty files. It doesn't use the metadata index.
- The Excalidraw library button is hidden entirely. The fonts are copied at `dev`/`build` time and not committed.

**Open questions (non-blocking)**
- localStorage quota: `atom_openFiles` persists the full text of open tabs, and a board of a few MB could exceed the quota. I recommend a follow-up plan.
- The AI Chat "current document" context and @mentions still send the board JSON. Only `read_note` is in scope. I recommend a follow-up.

**Handoff:** `Implement next-client/plans/013-infinite-drawing-board/prd.md, phases 1 and 2`
