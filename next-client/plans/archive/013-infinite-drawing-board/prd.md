# Infinite drawing board (Excalidraw), MVP — engineering PRD

## Context

Users can write notes, tables, Mermaid and math, but they can't sketch. This plan adds a **board**: a Markdown note that holds an Excalidraw scene and opens in its pane as an infinite canvas instead of the text editor. Brief: `plans/013-infinite-drawing-board/brief.md`. The research behind it is in `plans/infinite-drawing-board.md` (§1–§12). This PRD covers **phase 1 (MVP) only**. It is self-contained: every file, pattern and constraint the engineer needs is cited here.

What exists and what is missing (checked against the current tree):

1. **Pane dispatch.** `app/editor/components/PaneLeaf.tsx:231-244` always renders `MarkdownEditor` inside `PrivateNoteGate` for `leaf.type === "editor"`. `PanelLeaf.type` is `"editor" | "metrics"` (`app/types/workspace.ts:5`). A board is a *file kind*, not a pane kind, so no new pane type is needed. Only `PaneLeaf` renders `MarkdownEditor`, on desktop and on mobile. **Missing:** a board branch.
2. **Content and save pipeline.** Tab text lives in `atom_openFiles` (`app/atoms/file-atoms.ts:26`, persisted to localStorage under the key `openFiles`). It is read and written per path through `atom_fileContent(path)` (`file-atoms.ts:48`). A tab is dirty when `content !== lastSavedContent`. Autosave (`app/hooks/use-auto-save.ts`, `AUTOSAVE_DELAY = 2000`, mode `atom_autosaveMode` "afterDelay" | "manual") saves the active file. `closeTabWithAutosave` (`app/editor/hooks/use-pane-file-actions.tsx:90`) saves a dirty tab when it closes. **Reused as-is:** a board writes Markdown into `atom_fileContent(path)` and nothing else. **Broken for a debounced writer:** every save path reads `content` from a React closure or refs, so a board scene still waiting in its debounce would be missed (see Design §Flush).
3. **External reload.** `app/hooks/use-file-watcher.ts:60-65` → `reconcileWithDisk` (`app/hooks/file-system/reconcile-disk.ts`). When both sides changed, disk wins, and the unsaved text goes into `snapshots`. Nothing sets `FileState.conflict` today (`grep "conflict:"`), so `ConflictDialog` never opens for these. **Reused:** BoardView reacts to the new `content` prop.
4. **File creation.** `useCreateItem().createFile(name, content, dirOverride)` (`app/hooks/file-system/use-create-item.ts:132`) strips only a trailing `.md` (line 144), writes, rescans, opens and shows the toast "Created: <file>". It is exposed through `useFileSystem()` (`app/hooks/use-file-system.ts` → `useFileCrud`). The New Notes folder is `atom_newNoteFolder` (`app/atoms/ui-atoms.ts:149`), resolved with `ensureVaultFolder(vaultHandle, normalizeFolderPath(...))` (`app/hooks/file-system/unique-file.ts:29,42`), as in `app/editor/hooks/use-materialize-draft.ts:57-60`. **Broken:** `createUniqueFile` (`unique-file.ts:8-25`) builds `${baseName} (n).md`, so `Untitled.board` would become `Untitled.board (1).md`.
5. **Palette.** Commands are built in `app/editor/components/editor-commands/document-vault-commands.ts` (`lifecycle` at line 35, `new-file` at line 43, `fileOperations` at line 93) from `useEditorCommandContext` (`use-editor-command-context.ts`, `useFileSystem()` destructure at lines 61-80). **Missing:** "New board" and "Edit board as Markdown" / "Open as board".
6. **Indexing.** `app/workers/metadata.worker.ts:53-91` computes tags (line 66, body only), links (`REGEX_LINK`, line 77, whole content), word count (line 81), tasks (line 85), the preview (line 88) and `contentIndex.upsert` (line 91), all over the full text. `ContentIndex.upsert` (`app/workers/content-index.ts:73`) is also fed by `content:index` messages (`app/workers/content-search.ts`, `handleContentMessage`) from the file watcher and the active-file indexer. `notePreview` (`app/utils/markdown-preview.ts:32`) already skips fenced code. **Missing:** board JSON is not excluded from tags, links, word count or the content index.
7. **AI chat.** `readNoteOutput` (`app/editor/components/ai-chat/chat-tool-runners.ts:56`) returns the raw text, capped at 20k characters. **Missing:** a board returns JSON.
8. **Tasks.** `extractTasks` (`app/utils/taskExtractor.ts:40`) matches checklist lines everywhere, including inside fenced code. **Broken** in general, not only for boards.
9. **Lint.** `eslint.config.mjs` has no import restrictions. `@excalidraw/excalidraw` is not a dependency (`package.json`).
10. **Offline.** `public/sw.js:28` `STATIC_ASSET` matches `.woff2`. Same-origin static paths are served cache-first, so self-hosted fonts under `public/` are cached offline with no change to `sw.js`. `next.config.js` sets no CSP.

## Behavior

**Creating**
- Palette **New board** (shown only while a vault is open) creates `Untitled.board.md` in the New Notes folder (the folder is created if missing; `""` means the vault root). It opens the board in the active pane and shows the toast "Created: Untitled.board.md".
- If that name is taken, the board is `Untitled (1).board.md`, then `(2)`, and so on. The general rule in `createUniqueFile`: a base name ending in `.board` gets its counter before `.board`. Other names keep today's ` (n).md`. The draft's first save (`use-materialize-draft.ts`) follows the same rule.
- A new board's text is exactly `NEW_BOARD_MARKDOWN` (Design §Format): frontmatter plus an empty scene fence. The file is never 0 bytes.

**What counts as a board** (`isBoard(path, content)`)
- The path is not `"draft"`, AND either:
  - the frontmatter has `hermes: board` (optionally quoted); or
  - the path ends with `.board.md` and the content is empty or whitespace only.
- Renaming a board keeps it a board, whatever its name. A `.board.md` file with real content but no `hermes: board` opens in the text editor.

**Opening**
- The active tab of a pane renders `BoardView` instead of `MarkdownEditor`, inside the same `PrivateNoteGate`. Tabs, splits, drag and drop, the tab limit, pinning, the save-state dot, Save and Copy Markdown all work unchanged.
- While the board chunk loads, the pane shows a pulsing placeholder: `h-full bg-surface-raised motion-safe:animate-pulse`. Use this, not `EditorSkeleton`, which is a full-page home skeleton.
- Excalidraw's theme follows the app (`useResolvedTheme()`, `app/hooks/use-resolved-theme.ts`). The canvas starts below the floating pane header (`pt-[var(--pane-header-inset,0px)]`, as the non-editor branch at `PaneLeaf.tsx:228` does).
- The viewport (scroll and zoom) is restored per path from the tab's `sessionStorage`. With none stored, the scene is fitted to the content (`scrollToContent`). The viewport never goes into the file.

**Editing and saving**
- Drawing, moving, deleting or reordering elements, or changing a persisted canvas setting (background color, grid), writes new Markdown into `atom_fileContent(path)` about 500 ms after the last change. Autosave or Save then writes the file, as for any note. In manual autosave mode the tab stays dirty until the user saves.
- Selection, tool, hover, scroll and zoom changes never write and never make the tab dirty.
- Opening a board never makes it dirty, even if Excalidraw normalizes the loaded elements.
- A pending change is never lost on: tab switch, tab close (button, menu, shortcut), Cmd/Ctrl+S, the pane's Save button, Cmd/Ctrl+Z autosave flush, navigating away (unsaved-changes guard), unmount, or the page being hidden or closed (`pagehide`, `visibilitychange` → hidden).
- Undo and redo inside a board are Excalidraw's own history. It resets when the board is reloaded from disk or reopened.

**External changes**
- When the file changes on disk (watcher, GitHub pull, another tab's save), the tab content updates as today (disk wins). BoardView then drops any pending debounced change, parses the new text, and calls `updateScene` without remounting. It never writes the old scene back.

**Error states** (the board is never shown empty and never written)
- If the fence contains git conflict markers, the pane shows "This board has unresolved merge conflicts" with "Open it as Markdown, keep one side of each conflict, then switch back to the board." and a **Edit as Markdown** button.
- If the JSON is invalid or the board format version is unsupported, the pane shows "This board couldn't be read" with "Its drawing data isn't valid. Open it as Markdown to repair it." and a **Edit as Markdown** button.
- If the external content becomes valid again, the board renders.

**Edit as Markdown**
- Board tabs get **Edit as Markdown** in the tab context menu (`PaneLeaf.tsx:253-283`). The palette offers **Edit Board as Markdown** while the active tab is a board shown as a board. Either one opens the raw file in `MarkdownEditor`.
- While a board is shown as Markdown, the tab menu and palette offer **Open as Board** instead. The choice lasts for the session, in memory, per path. It is not persisted.
- The editor treats the `hermes-board` fence as an ordinary code block.

**Excalidraw UI**
- Hidden or disabled:
  - image tool, image paste and file drops on the canvas (all files, including `.excalidraw` scenes);
  - the collaboration button;
  - the welcome screen;
  - Excalidraw's load, save, export and save-as-image actions;
  - its theme toggle;
  - the main-menu socials and links;
  - the library button, so there's no web library browsing.
- Kept: drawing tools, text, shapes, arrows, the background color picker, clear canvas, grid, zoom and undo.

**Zero-cloud**
- Fonts come from `/excalidraw-assets/` (same origin). Opening and drawing on a board makes no third-party request. Links inside Excalidraw's help dialog are plain user-clicked links, not automatic requests.

**Index, search, AI, tasks**
- A board's JSON never shows up in:
  - word count, tags, wikilinks or backlinks;
  - the home feed preview;
  - content search (`/` scope in the palette) or AI `search_notes` hits;
  - AI `read_note`. That returns the prose plus the line `(board with N elements)`, or `(board that couldn't be read)`.
- Prose outside the fence is indexed as usual, and search hit line numbers stay correct.
- No fenced code block yields tasks (any language, ``` or ~~~).

**Backends and platforms**
- Local File System Access, browser (OPFS) and GitHub vaults behave the same: a board is a `.md` file through the same handles and save path. A GitHub merge that leaves conflict markers in the fence gives the conflict state above.
- Mobile and touch use the same `PaneLeaf` branch. Excalidraw's own touch UI applies, and there is no extra app chrome.

## Design

### Format (`app/utils/board/`, pure, no `@excalidraw/*` imports of any kind)

A board file:

````markdown
---
hermes: board
board-version: 1
---

Optional prose, [[links]], #tags.

```hermes-board
{"type":"hermes-board","version":1,"source":"excalidraw",
"appState":{"gridModeEnabled":false,"viewBackgroundColor":"#ffffff"},
"files":{},
"elements":[
{"id":"a1","type":"freedraw","angle":0,...,"points":[[0,0],[1.25,3.5]],...},
{"id":"b2","type":"text",...}
]}
```
````

Serialization rules (deterministic, so the same scene always gives the same bytes):
- The fence body has a 4-line header (above), then **one element per line**, with a `,` on every element line except the last, then `]}`. With no elements, `"elements":[` is followed directly by `]}`.
- Element keys: `id`, `type` first, then the rest sorted alphabetically. Keys of nested plain objects (`roundness`, `boundElements[i]`, …) are sorted alphabetically too. Arrays keep their order.
- Elements with `isDeleted: true` are dropped.
- Rounding to 2 decimals: `x`, `y`, `width`, `height`, and every number inside `points`. `-0` becomes `0`. Other numbers (`seed`, `version`, `versionNonce`, `updated`, `angle`, …) are untouched.
- `appState` keeps only `BOARD_APP_STATE_KEYS = ["viewBackgroundColor", "gridModeEnabled", "gridSize", "gridStep"]`. Keys missing from the source are omitted, and the rest are sorted alphabetically. Check these names against the installed `AppState` type and adjust the list if 0.18 differs.
- `files` is written as given (always `{}` in v1, because images are disabled).

Types (own types, so the format never depends on Excalidraw):

```ts
// board-format.ts
export type BoardElement = { id: string; type: string; isDeleted?: boolean } & Record<string, unknown>;
export type BoardAppState = Partial<Record<(typeof BOARD_APP_STATE_KEYS)[number], unknown>>;
export interface BoardScene { appState: BoardAppState; elements: BoardElement[]; files: Record<string, unknown> }
export interface BoardDoc { head: string; tail: string } // text before / after the fence
export type BoardParse =
  | { ok: true; doc: BoardDoc; scene: BoardScene }
  | { ok: false; error: "conflict" | "invalid" };

export const BOARD_FENCE_LANG = "hermes-board";
export const NEW_BOARD_MARKDOWN: string; // "---\nhermes: board\nboard-version: 1\n---\n\n" + empty fence + "\n"
export function parseBoard(markdown: string): BoardParse;
export function serializeBoard(doc: BoardDoc, scene: BoardScene): string; // re-exported from board-serialize.ts
export function stripBoardFence(markdown: string): string;
export function hasConflictMarkers(text: string): boolean;
export function boardTextForReading(markdown: string): string;
```

- **Fence finding** (shared by parse and strip): the opening line matches `/^```hermes-board[ \t]*$/` at the start of a line. The closing line is the next line matching `/^```[ \t]*$/`. A fence with no closing line runs to the end of the file. JSON lines can't start with three backticks, because newlines inside JSON strings are escaped.
- **`parseBoard`:**
  1. Find the first fence. Then `head` = everything before the opening line, and `tail` = everything after the closing backticks (including the newline that follows).
  2. No fence: `ok` with an empty scene, `head` = the markdown with trailing whitespace trimmed plus `"\n\n"` (or `""` when the markdown is blank), and `tail = "\n"`.
  3. Fence body contains a line matching `/^(<{7}|={7}|>{7})(\s|$)/` → `conflict`.
  4. Otherwise `JSON.parse`, then `migrateBoard`. On failure: `conflict` if the file has a `<<<<<<< ` or `>>>>>>> ` line anywhere, else `invalid`. An unclosed fence without markers is `invalid`.
  5. Later fences stay in `tail` as text.
- **Round trip:** `serializeBoard(p.doc, p.scene) === input` for any input that `serializeBoard` produced. Prose and frontmatter edits made through Edit as Markdown survive byte for byte, because `head` and `tail` are copied verbatim.
- **`stripBoardFence`:**
  - Returns the input unchanged (same string) when it doesn't contain "```hermes-board". That check is cheap, because this runs on every note.
  - Otherwise, every line of **every** `hermes-board` fence (opening line through closing line) becomes an empty line. **The line count is unchanged**, so search hit line numbers and task line indexes stay valid.
- **`boardTextForReading`** (for AI):
  - Removes the fence lines entirely and collapses 3+ blank lines into 2.
  - Appends `\n(board with N elements)` (N = non-deleted elements from `parseBoard`), or `\n(board that couldn't be read)` on a parse error.
  - Returns the input unchanged if there's no fence.
- **`migrate.ts`:** `migrateBoard(raw: unknown): BoardScene | null`. It requires an object with `type === "hermes-board"`, `version === 1`, an array `elements`, an object or missing `appState`, and an object or missing `files`. Version 1 is the identity; anything else returns `null`, which `parseBoard` reports as `invalid`. Keep it as the single upgrade point.
- **`board-serialize.ts`:** `serializeBoard`, `serializeScene(scene) → fence body`, `normalizeElement(el)` (key order and rounding), `pickBoardAppState(appState)`. Split out so each file stays well under 400 lines.
- **`is-board.ts`:** `isBoard(path: string, content: string): boolean`, implementing the rules in Behavior. It reads the frontmatter block with `FM_REGEX` (`app/utils/frontmatter-utils.ts:1`) and `/^hermes:\s*["']?board["']?\s*$/m`. It doesn't use `atom_fileMetadata`: PaneLeaf already has the content, so there's no cold-index fallback to manage.
- **`board-flush.ts`:**

  ```ts
  export function registerBoardFlush(path: string, flush: () => void): () => void; // returns unregister
  export function flushBoardWrite(path: string): void;
  export function flushAllBoardWrites(): void;
  ```

  This is a module-level `Map<string, () => void>`. The flush functions are synchronous: they only `store.set` the atom.

### State

`app/atoms/board-atoms.ts` (new; import it directly, not through the `atoms.ts` barrel):

```ts
export interface BoardViewport { scrollX: number; scrollY: number; zoom: number }
// Per path, in this browser tab only (never in the file).
export const atom_boardViewports = atomWithStorage<Record<string, BoardViewport>>(
  "hermes_board_viewport", {}, createJSONStorage(tabSessionStorage), { getOnInit: true });
// Boards the user opened as Markdown this session.
export const atom_boardMarkdownPaths = atom<ReadonlySet<string>>(new Set<string>());
export const atom_toggleBoardMarkdown = atom(null, (get, set, path: string) => { /* add/remove, new Set */ });
```

These follow the pattern in `app/atoms/tool-atoms.ts:11-16` (`atomWithStorage` + `createJSONStorage(tabSessionStorage)` from `app/atoms/session-storage.ts`).

### Components and hooks (`app/editor/components/board/`)

- **`BoardViewLoader.tsx`**, the only thing `PaneLeaf` imports. It contains `const BoardView = dynamic(() => import("./BoardView"), { ssr: false, loading: () => <div className="h-full bg-surface-raised motion-safe:animate-pulse" aria-hidden="true" /> })` and passes its props through. Same pattern as `app/tools/mermaid/MermaidToolLoader.tsx`. Check `next/dynamic` usage in `node_modules/next/dist/docs/` (lazy loading guide) for Next 16.
- **`BoardView.tsx`** (default export, the **only** file allowed to value-import `@excalidraw/*`):
  - Its first import is `./excalidraw-asset-path`, which sets `window.EXCALIDRAW_ASSET_PATH = "/excalidraw-assets/"`. ES imports run in order, so the path is set before Excalidraw evaluates.
  - It also imports `@excalidraw/excalidraw/index.css`, plus `Excalidraw`, `MainMenu` and `hashElementsVersion` from `@excalidraw/excalidraw`. Confirm that `hashElementsVersion` is exported by the installed version; if it isn't, stop and write a `RESUME:`/question note in `mailbox.md`. Don't use the deprecated `getSceneVersion`.
  - It `parseBoard(content)`s for the initial scene. On `!ok` it renders `<BoardError kind onEditAsMarkdown />` and no Excalidraw.
  - Otherwise it renders `<Excalidraw>`, inside `<div className="hermes-board h-full w-full pt-[var(--pane-header-inset,0px)]">` around a `relative h-full w-full overflow-hidden` box, with:
    - `initialData={{ elements, appState: { ...scene.appState, ...savedViewport }, files, scrollToContent: !savedViewport }}`;
    - `theme={useResolvedTheme()}`;
    - `excalidrawAPI={setApi}`;
    - `onChange={sync.handleChange}`;
    - `onPaste` returns `false` when the clipboard has files or image items;
    - `UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: false, saveAsImage: false, toggleTheme: false }, tools: { image: false } }}`;
    - `<MainMenu>` with only `DefaultItems.ClearCanvas` and `DefaultItems.ChangeCanvasBackground`;
    - no `WelcomeScreen` child, no `onCollabButtonClick`, `isCollaborating={false}`.
  - A capture-phase `onDropCapture` / `onDragOverCapture` on the wrapper calls `preventDefault()` and `stopPropagation()` when `dataTransfer.types` includes `"Files"`.
  - Scoped CSS in `BoardView.scss` (or a `<style>` in the module) hides the library trigger: `.hermes-board .default-sidebar-trigger { display: none; }`. Verify the class names in the installed package.
  - Feeds the viewport hook from `onChange`.
- **`use-board-sync.ts`.** It has no Excalidraw imports; the hash function is injected, so the hook is testable.

  ```ts
  export const BOARD_WRITE_DELAY = 500;
  export function useBoardSync(opts: {
    path: string;
    content: string;                       // atom_fileContent(path)
    hashElements: (els: readonly any[]) => number | string;
    onExternalScene: (scene: BoardScene) => void; // BoardView → api.updateScene({ elements, appState })
  }): {
    parsed: BoardParse;                    // current parse (error state source)
    handleChange: (elements: readonly any[], appState: Record<string, unknown>, files?: Record<string, unknown>) => void;
    flush: () => void;
  };
  ```

  Refs: `lastWrittenRef` (the Markdown this hook last wrote, or loaded), `docRef` (head/tail), `changeKeyRef` (`null` = waiting for the baseline), `pendingRef`, `timerRef`.
  - **`handleChange`:**
    1. Compute `key = `${hashElements(elements)}|${JSON.stringify(pickBoardAppState(appState))}``.
    2. If `changeKeyRef` is null, set it to `key` and return. This is the baseline: Excalidraw's first `onChange` after load or `updateScene` never writes.
    3. If `key === changeKeyRef`, return.
    4. Otherwise store `pendingRef = { elements, appState, files }` and (re)start a 500 ms timer that calls `flush`.
  - **`flush`:**
    1. Clear the timer. If there's no pending change, return.
    2. Build the scene, then `md = serializeBoard(docRef, scene)`. Clear the pending change and set `changeKeyRef = key`.
    3. If `!(path in store.get(atom_openFiles))` (the tab is gone, or the file was renamed or deleted), return.
    4. If `md === store.get(atom_openFiles)[path].content`, return.
    5. Otherwise set `lastWrittenRef = md` and `store.set(atom_fileContent(path), md)`. Use `useStore()`.
  - **External change** (effect on `content`), when `content !== lastWrittenRef`:
    1. Clear the timer and the pending change.
    2. Re-parse and set `lastWrittenRef = content`.
    3. If ok: set `docRef`, set `changeKeyRef = null`, and call `onExternalScene(scene)`.
    4. If not ok, `parsed` becomes the error, and BoardView swaps to `BoardError`.
  - **Lifecycle:**
    - `registerBoardFlush(path, flush)` on mount; unregister and `flush()` in the **`useEffect` cleanup**. Passive cleanups run before the next commit's passive effects, so `useAutoSave`'s tab-switch effect sees the flushed text.
    - `pagehide` → `flush`; `visibilitychange` (hidden) → `flush`.
- **`use-board-viewport.ts`:** `useBoardViewport(path)` returns `{ initial: BoardViewport | null, report(appState) }`. `initial` is read once with `store.get(atom_boardViewports)[path]`, not subscribed. `report` writes `{ scrollX, scrollY, zoom: zoom.value }` 300 ms after the last change, only when it changed. It maps to and from Excalidraw's `appState.zoom = { value }`.
- **`BoardError.tsx`** (no Excalidraw). Props: `{ kind: "conflict" | "invalid"; onEditAsMarkdown: () => void }`. Center it like `PaneEmptyState.tsx:63-70`:
  - the title in `text-ui-title-3 text-fg`;
  - the body in `text-ui-footnote text-fg-muted`;
  - `<Button variant="secondary" onClick={onEditAsMarkdown}>Edit as Markdown</Button>` (`app/components/Button`).

  No raw `<button>`, no hard-coded colors.
- **`excalidraw-asset-path.ts`:** a two-line side-effect module (guarded by `typeof window !== "undefined"`).

### Flush before every save read

Save paths read `content` from React state, so they must flush pending board writes first, then read from the store:
- `use-pane-file-actions.tsx`:
  - `closeTabWithAutosave` (line 90): call `flushBoardWrite(path)` first. It already reads `contentStore.get(atom_openFiles)[path]` afterwards.
  - `handleSave` (line 44): call `flushBoardWrite(filePath)`, then use `contentStore.get(atom_openFiles)[filePath]?.content ?? content`.
- `app/editor/page.tsx` `handleSave` (line 152): call `flushAllBoardWrites()`, then `const current = contentStore.get(atom_content)`. Use `current` for the empty check and `saveFile(current)`.
- `app/hooks/use-auto-save.ts`:
  - `flush` (line 39): call `flushAllBoardWrites()`, then read the active path's `content` and `lastSavedContent` from the store (`useStore()`) instead of the closure.
  - The tab-switch branch (lines 52-57): read the **previous path's** `content` and `lastSavedContent` from the store (`store.get(atom_openFiles)[prevFilePathRef.current]`) instead of `prevContentRef` / `prevLastSavedContentRef`. Keep the refs for the handle.

  Markdown tabs behave the same: the store is at least as fresh as the refs.

**Why not write to the atom on every change?** Excalidraw fires `onChange` on every pointer move while a freehand stroke grows. Serializing a large board on each one would jank, so the 500 ms debounce plus explicit flushes is the cheapest correct option.

**Why a separate light loader and no `BoardPane`?** Error states render inside the lazy chunk. That costs a chunk download only for broken boards, and it keeps one owner of parse state.

## Phase 1: Format, indexing and file naming (no Excalidraw)

- `app/utils/board/board-format.ts` (new): types, `BOARD_FENCE_LANG`, `NEW_BOARD_MARKDOWN`, the fence finder, `parseBoard`, `stripBoardFence`, `hasConflictMarkers`, `boardTextForReading`, and a re-export of `serializeBoard`.
- `app/utils/board/board-serialize.ts` (new): `serializeBoard`, `serializeScene`, `normalizeElement`, `pickBoardAppState`, `BOARD_APP_STATE_KEYS`.
- `app/utils/board/migrate.ts` (new): `migrateBoard`.
- `app/utils/board/is-board.ts` (new): `isBoard`.
- `app/utils/board/board-flush.ts` (new): the registry.
- `app/utils/board/README.md` (new): directory index, like `app/utils/templates/README.md`. State the rule: "no `@excalidraw/*` imports here".
- `app/hooks/file-system/unique-file.ts#createUniqueFile`: split `baseName` into `stem` + `suffix`, where `suffix = ".board"` when `baseName` ends with `.board` (case-sensitive) and `""` otherwise. Candidates are `${stem}${suffix}.md`, then `${stem} (${n})${suffix}.md`. Update the comment.
- `app/utils/taskExtractor.ts#extractTasks` (line 40): track fences while walking the lines.
  - An opening line matches `/^\s*(`{3,}|~{3,})/`.
  - The closing line uses the same character, at least as many of them, and nothing else on the line but whitespace.
  - An unclosed fence runs to the end of the file.
  - Lines inside a fence, and the fence lines themselves, yield no tasks. Line indexes (`line`, `id`) are unchanged for the tasks outside.
  - Update the comment at `metadata.worker.ts:83-84`.
- `app/workers/metadata.worker.ts` (lines 55-91):
  - After destructuring, compute `const text = stripBoardFence(content)`.
  - Use `text` for `bodyContent`/tags (line 65), links (line 77), `wordCount` (line 81) and `notePreview` (line 88).
  - Keep `content` for the frontmatter (lines 60-61) and `extractTasks` (line 85). Line numbers are preserved anyway.
  - Pass `content` to `contentIndex.upsert`, which strips it itself (next item).
- `app/workers/content-index.ts#upsert` (line 73): call `stripBoardFence(content)` before the `maxNoteChars` slice. This covers both the worker parse and `content:index` messages. Board JSON then no longer uses up `MAX_NOTE_CHARS` or `MAX_TOTAL_CHARS`.
- `app/editor/components/ai-chat/chat-tool-runners.ts#readNoteOutput` (line 56): after the private checks, `text = boardTextForReading(text)` before the 20k cap.

## Phase 2: Board view, creation and guards

**Dependency and assets**
- `package.json`:
  - Add `@excalidraw/excalidraw` at the current 0.18.x (`corepack yarn add @excalidraw/excalidraw`). Confirm that its React peer range includes 19.0.0, that it builds under Next 16 + Turbopack, and record the version in the engineer report.
  - Change `"dev"` to `"node scripts/copy-excalidraw-assets.mjs && next dev --port 3000"` and `"build"` to `"node scripts/copy-excalidraw-assets.mjs && next build"`. Yarn 4 runs no `pre*` hooks.
- `scripts/copy-excalidraw-assets.mjs` (new, Node ESM, no dependencies): copy `node_modules/@excalidraw/excalidraw/dist/prod/fonts/` recursively to `public/excalidraw-assets/fonts/`. Use `fs.cpSync(..., { recursive: true })`; it is idempotent. Exit non-zero with a clear message if the source is missing. Check the font path and the expected `EXCALIDRAW_ASSET_PATH` layout against `node_modules/@excalidraw/excalidraw/README.md` ("self-hosting fonts") and adjust both.
- `.gitignore` (in `next-client/`): add `public/excalidraw-assets/`.

**Lint guard**
- `eslint.config.mjs`: add a block for `files: ["**/*.ts", "**/*.tsx"]` with `"@typescript-eslint/no-restricted-imports": ["error", { patterns: [{ group: ["@excalidraw/*"], allowTypeImports: true, message: "Only app/editor/components/board/BoardView.tsx may import Excalidraw (keeps it out of the editor's first load)." }] }]`. Follow it with an override block for `files: ["app/editor/components/board/BoardView.tsx", "**/*.test.ts", "**/*.test.tsx"]` that sets the rule to `"off"`. Tests mock the module.

**Board UI** (all new, under `app/editor/components/board/`)
- `BoardViewLoader.tsx`, `BoardView.tsx`, `BoardError.tsx`, `use-board-sync.ts`, `use-board-viewport.ts` and `excalidraw-asset-path.ts`, as in Design.
- Docs: `BoardView.md`, `BoardViewLoader.md`, `BoardError.md` and `README.md`. Keep each source file under 400 lines. If `BoardView.tsx` passes about 250 lines, move the props constants (`UI_OPTIONS`, the menu, the paste guard) to `board-ui-options.tsx`. That file must not value-import Excalidraw; pass `MainMenu` in.
- `app/atoms/board-atoms.ts` (new), as in Design.

**Pane dispatch**: `app/editor/components/PaneLeaf.tsx` (286 lines, about 315 after the change)
- Imports: `BoardViewLoader`, `isBoard`, `atom_boardMarkdownPaths`, `atom_toggleBoardMarkdown`.
- `const boardMarkdownPaths = useAtomValue(atom_boardMarkdownPaths); const toggleBoardMarkdown = useSetAtom(atom_toggleBoardMarkdown);`
- `const showBoard = React.useMemo(() => isBoard(filePath, content), [filePath, content]) && !boardMarkdownPaths.has(filePath);`
- Lines 234-244: keep `PrivateNoteGate` as the wrapper. Its child is `showBoard ? <BoardViewLoader path={filePath} content={content} isActivePane={isActive} onEditAsMarkdown={() => toggleBoardMarkdown(filePath)} /> : <MarkdownEditor … />`.
- Tab menu (lines 257-280): when `tabMenu.path !== "draft"` and `isBoard(tabMenu.path, openFiles[tabMenu.path]?.content ?? "")`, push `{ label: boardMarkdownPaths.has(tabMenu.path) ? "Open as Board" : "Edit as Markdown", onClick: () => toggleBoardMarkdown(tabMenu.path), icon: <HiOutlineCode size={15} /> }` after "Open in pane". If it is already imported, use another `react-icons/hi` icon for the board case.

**Save paths**
- `app/editor/hooks/use-pane-file-actions.tsx`, `app/editor/page.tsx` and `app/hooks/use-auto-save.ts`, as in Design §Flush.

**Palette**
- `app/editor/hooks/use-create-board.ts` (new): `useCreateBoard(createFile)` returns `createBoard(): Promise<void>`.
  1. Read `vaultHandle` and `atom_newNoteFolder` from `useStore()`.
  2. Call `ensureVaultFolder(vaultHandle, normalizeFolderPath(folder))`, then `await createFile("Untitled.board", NEW_BOARD_MARKDOWN, folderHandle)`.
  3. On a thrown error, show `toast.error("Couldn't create the board.")`. `createFile` already reports its own errors and the success toast.
- `editor-commands/use-editor-command-context.ts`: destructure `createFile` from `useFileSystem()` (lines 61-80). Add `const createBoard = useCreateBoard(createFile);`, plus `const boardMarkdownPaths = useAtomValue(atom_boardMarkdownPaths)` and `const toggleBoardMarkdown = useSetAtom(atom_toggleBoardMarkdown)`, and return all three.
- `editor-commands/document-vault-commands.ts`:
  - In `lifecycle`, right after `new-file` (line 48), when `vaultHandle`: `{ id: "new-board", label: "New board", category: "Vault", keywords: "board canvas drawing sketch whiteboard excalidraw draw diagram", action: () => { void createBoard(); } }`.
  - In `fileOperations`, when `activeFilePath && isBoard(activeFilePath, content)`: `{ id: "toggle-board-markdown", label: boardMarkdownPaths.has(activeFilePath) ? "Open as Board" : "Edit Board as Markdown", category: "Document", keywords: "board markdown raw source json repair edit", action: () => toggleBoardMarkdown(activeFilePath) }`.

  The file grows from 214 to about 240 lines.
- `editor-commands/README.md`: list both commands.

**Architecture doc**
- `ARCHITECTURE.md` → "Runtime Components": add a **Boards** entry covering:
  - the `.board.md` file with `hermes: board` and a `hermes-board` fence;
  - the format module `app/utils/board/`;
  - the lazy `BoardView` as the only Excalidraw importer, enforced by lint;
  - writes through `atom_fileContent` with the debounced flush registry;
  - `stripBoardFence` in the worker and `ContentIndex`;
  - self-hosted fonts.

## Tests

All Vitest, fully mocked. Wrap components in a Jotai `<Provider>`, mock `next/navigation` `useRouter`/`usePathname`, `@/app/hooks/use-file-system` and any network. Pure tests use `// @vitest-environment node`.

**Phase 1**
- `app/utils/board/board-format.test.ts`:
  - Round trip: `serializeBoard(parseBoard(x).doc, parseBoard(x).scene) === x` for a serialized board with prose before and after the fence, and for `NEW_BOARD_MARKDOWN`.
  - The same scene gives the same bytes twice. Element key order is `id`, `type`, then alphabetical; nested keys are sorted.
  - Deleted elements are dropped. `x/y/width/height/points` are rounded to 2 decimals, `-0` becomes `0`, and `seed`/`version`/`angle` are untouched.
  - `appState` keeps only the allow-list (viewport, selection and tool keys are dropped).
  - The output has one element per line.
  - Missing fence → `ok` with an empty scene. Serializing it appends a fence after the prose.
  - Invalid JSON → `invalid`; an unclosed fence → `invalid`.
  - Markers inside the fence → `conflict`. Invalid JSON plus a `<<<<<<< ` line before the fence → `conflict`. A setext `=======` in prose outside the fence with a valid fence → `ok`.
  - Version 2 → `invalid`.
  - `stripBoardFence`:
    - a note without a fence is returned as the same string (`toBe`);
    - the line count is preserved, and fence lines become empty;
    - two fences are both stripped;
    - prose, links and tags outside survive.
  - `boardTextForReading`: prose plus `(board with 2 elements)`, and the unreadable-board line.
- `app/utils/board/migrate.test.ts`: v1 is the identity; wrong `type`, missing `elements` and unknown versions → `null`.
- `app/utils/board/is-board.test.ts`:
  - frontmatter `hermes: board` with any name → true; quoted values work;
  - `.board.md` with empty content → true;
  - `.board.md` with text but no key → false;
  - `"draft"` → false;
  - a plain note → false.
- `app/utils/board/board-flush.test.ts`: register, flush one, flush all, unregister.
- `app/hooks/file-system/unique-file.test.ts` (extend):
  - `Untitled.board` taken → `Untitled (1).board.md`, then `(2)`;
  - `Notes` taken → `Notes (1).md` (unchanged);
  - `foo.boardgame` → `foo.boardgame (1).md`.
- `app/utils/taskExtractor.test.ts` (extend):
  - tasks inside ``` and ~~~ fences (any language, indented fence) are ignored;
  - the line numbers of tasks after a fence are unchanged;
  - an unclosed fence hides the rest;
  - a longer closing fence closes it;
  - a board file (frontmatter, prose task, fence) yields only the prose task.
- `app/workers/content-index.test.ts` (extend):
  - a board's JSON words (`freedraw`, `versionNonce`) aren't found;
  - prose words are found with the correct line number;
  - the total char count excludes the JSON.
- Worker parse: if there is no worker test harness, extract the per-file parse (lines 55-90) into an exported pure `parseNoteFile(fileInfo)` in a new `app/workers/parse-note.ts`, and test with it (`parse-note.test.ts`):
  - a board's `wordCount`, `links` and `tags` ignore the JSON (a text element containing `[[Secret]]` and ` #hidden`);
  - the preview has no JSON.
- `app/editor/components/ai-chat/` (extend the existing `use-chat-tools.test.tsx`, or add `chat-tool-runners.test.ts`): `readNoteOutput` for a board returns the prose plus `(board with N elements)` and no `"type":"freedraw"`. Private boards are still refused.

**Phase 2**
- `app/editor/components/board/BoardView.test.tsx`:
  - Mock `@excalidraw/excalidraw` with a stub `Excalidraw` that renders a marker, calls `excalidrawAPI({ updateScene: updateSpy })`, and captures `onChange`. `hashElementsVersion` returns `els.map(e => e.id + ":" + e.versionNonce).join()`. Also stub `MainMenu` with `DefaultItems`, and mock `@excalidraw/excalidraw/index.css` and the asset-path module.
  - Use fake timers.
  - Assertions:
    1. The first `onChange` with the initial elements doesn't write (the tab isn't dirty).
    2. An element change writes serialized Markdown into `atom_openFiles[path].content` after 500 ms. The prose is kept and the tab is dirty.
    3. A change to the selection, scroll or zoom only doesn't write.
    4. A `viewBackgroundColor` change does write.
    5. Unmounting with a pending change flushes it into the atom.
    6. `flushAllBoardWrites()` writes synchronously.
    7. A pending change followed by an external `content` change cancels the pending write: after 1 s the content equals the external text, and `updateScene` was called with the new elements.
    8. Conflict and invalid content render the matching messages and an **Edit as Markdown** button that calls `onEditAsMarkdown`. No Excalidraw stub renders and nothing is written.
    9. The theme prop follows the resolved theme.
    10. A file drop on the wrapper is prevented.
    11. `onPaste` returns `false` for an image clipboard.
- `app/editor/components/board/use-board-viewport.test.ts`: the viewport is saved per path in `sessionStorage` under `hermes_board_viewport` after 300 ms, and read back as `initial`.
- `app/editor/components/PaneLeaf.test.tsx` (extend; mock `./board/BoardViewLoader` with a stub that renders `data-testid="board-view"` and an Edit as Markdown button):
  - a board path with board frontmatter renders the stub, not `MarkdownEditor`;
  - a normal note renders `MarkdownEditor`;
  - the tab menu shows "Edit as Markdown" for a board and not for a note; clicking it renders `MarkdownEditor`, and the menu then shows "Open as Board";
  - a private board shows the private veil.
- `app/editor/components/editor-commands/build-editor-commands.test.ts` (extend):
  - "New board" appears only with a vault and calls `createBoard`;
  - the board toggle command appears only for a board.
- `app/editor/hooks/use-create-board.test.tsx` (new): calls `createFile("Untitled.board", NEW_BOARD_MARKDOWN, <New Notes folder handle>)`. With `atom_newNoteFolder = "inbox"`, the folder is created via the mocked `ensureVaultFolder`.
- `app/hooks/use-auto-save` (add `use-auto-save.test.tsx` if none exists): on a tab switch, the previous file is saved with the store's content, including text written to the store after the last render.
- `app/editor/hooks/use-pane-file-actions` (add a test if none exists): `closeTabWithAutosave` calls `flushBoardWrite(path)` before reading the file state.

## Docs

- New: `app/editor/components/board/README.md`, `BoardView.md`, `BoardViewLoader.md` and `BoardError.md`, in the token-lean style of the sibling docs (purpose, state, storage, network, props). `BoardView.md` must state:
  - the lazy boundary and the lint rule;
  - the write and flush rules;
  - the viewport in `sessionStorage`;
  - that Excalidraw's undo history is separate and resets on reload.
- New: `app/utils/board/README.md`.
- Update `app/editor/components/README.md` (add a `board/` row), `PaneLeaf.md` (board dispatch, Edit as Markdown menu item), `EditorCommands.md` / `editor-commands/README.md` (the new commands), `app/workers/README.md` (board fence stripping in the parse and in `ContentIndex`), and `app/atoms/README.md` (`board-atoms.ts`).
- `ARCHITECTURE.md`: the Boards runtime entry (Phase 2).
- User docs, `app/documentation/content/editor-writing.tsx`: a new `Subsection` `{ id: "boards", title: "Boards" }` after `code-diagrams` (line ~300), with keywords "board canvas drawing sketch whiteboard". Cover:
  - **New board** in the palette, and where the file goes;
  - that a board is a Markdown note (`.board.md`) you can caption and link;
  - **Edit as Markdown** / **Open as Board**;
  - that images aren't supported yet;
  - that undo history resets when the file changes on disk;
  - that a sync conflict shows a repair message;
  - that it works offline.

  Use the existing `Callout`/`KV` primitives from `../doc-primitives`. Never mention other products by name.

## Acceptance criteria

- [ ] The palette has **New board** only while a vault is open. It creates and opens `<New Notes folder>/Untitled.board.md`; on a clash it gives `Untitled (1).board.md`, never `Untitled.board (1).md`.
- [ ] Opening a board shows the Excalidraw canvas in the pane, themed like the app, below the pane header. The tabs, split, private veil, tab limit and save dot still work.
- [ ] Opening a board doesn't make its tab dirty.
- [ ] Drawing makes the tab dirty about 500 ms after the stroke ends, and autosave writes the file. The file has `hermes: board`, the prose and one element per line with rounded coordinates.
- [ ] Panning, zooming and selecting never dirty the tab. The viewport is restored when the board is reopened in the same browser tab.
- [ ] Switching tabs, closing the tab, Cmd/Ctrl+S or closing the page within 500 ms of a stroke doesn't lose the stroke.
- [ ] Changing the file on disk while a board is open updates the canvas without a remount, and a pending stroke is not written back over it.
- [ ] Conflict markers in the fence show "This board has unresolved merge conflicts". Bad JSON shows "This board couldn't be read". Both offer **Edit as Markdown** and never write.
- [ ] **Edit as Markdown** and **Open as Board** switch the view, from the tab menu and from the palette.
- [ ] The image tool, image paste, file drop, collaboration, export/load/save, the theme toggle, socials and the library are not available on the canvas.
- [ ] DevTools Network shows no third-party requests when opening and typing text on a board. Fonts load from `/excalidraw-assets/`.
- [ ] Board JSON is absent from word count, tags, backlinks, the home preview, content search and AI `read_note`. Prose on the board note is still searchable, with the correct line numbers.
- [ ] Tasks inside any fenced code block no longer appear on the Tasks page.
- [ ] `corepack yarn lint` fails if any file other than `BoardView.tsx` (and tests) value-imports `@excalidraw/*`.
- [ ] If the engineer runs `corepack yarn build`, the `/editor` route's First Load JS is unchanged from trunk, and the board chunk's gzipped size is recorded in the engineer report.
- [ ] Every new or changed source file is under 400 lines and has its sibling `.md`. The READMEs, `ARCHITECTURE.md` and the user docs are updated.
- [ ] All tests listed above exist and pass.

## Decisions

- **Board detection from the tab content, not the metadata index.** `PaneLeaf` already holds the text, so `isBoard(path, content)` is exact and has no cold-index window. The `.board.md` fallback applies only to empty files.
- **"Edit as Markdown" goes in the tab context menu and the palette**, plus the button in the error states. The brief's "pane menu" doesn't exist as such. The window-level More menu acts on the active pane and is kept minimal, so nothing is added there. The toggle is in-memory per session.
- **Change detection also covers allow-listed `appState`** (background, grid), not only `hashElementsVersion`. Otherwise changing the background color would never be saved.
- **Excalidraw's first `onChange` after a load or `updateScene` is the baseline and never writes.** This stops normalization on open from dirtying the file.
- **`stripBoardFence` blanks lines instead of removing them**, so search hit lines and task line indexes stay exact. `boardTextForReading` removes them, for the AI.
- **`ContentIndex.upsert` strips** (it's the single entry point for both feeds), and the worker strips for tags, links, word count and preview. Tags are covered too: JSON text elements can hold ` #tag`.
- **The parse keeps `head`/`tail` verbatim**, so prose and frontmatter edits round-trip byte for byte. Only the fence is regenerated.
- **An unsupported board version maps to the "couldn't be read" state.** A third message isn't worth it for the MVP.
- **Flush registry plus store reads in the save paths**, rather than writing to the atom on every pointer move (too costly on large boards).
- **A rename or delete while a stroke is pending drops that ≤500 ms stroke** (the guard in `flush`). That can only happen through a dialog that takes focus away from the canvas.
- **The library button is hidden entirely.** Without web browsing it adds little, and hiding it is the reliable way to avoid the excalidraw.com library link.
- **Font copy runs from the `dev`/`build` scripts**, and the output is gitignored. The fonts (including CJK) are several MB and shouldn't be committed. Yarn 4 has no `pre*` hooks.
- **The loading placeholder is a pulsing block**, not `EditorSkeleton`, which renders the home feed skeleton.
- **`ConflictDialog` is not wired in.** Nothing sets `FileState.conflict` today, so "Edit as Markdown" is the only repair path.

## Out of scope / Deferred

- `![[x.board]]` embeds, `/board` in the slash menu, PDF export of boards (phase 2 of the source PRD).
- Board text in content search, and wikilinks typed on a board as backlinks (phase 3).
- Images on boards and non-`.md` sync (phase 4).
- Special-casing boards as whole-file conflicts in the GitHub sync.
- Importing `.excalidraw` files, a read-only board mode, template-pack entries.
- File tree, home feed or palette board icons; prefetching the board chunk.
- Fixing localStorage quota limits for very large open tabs (see Open questions).
- Stripping board JSON from the AI chat's "current note" context or from @mentions (only `read_note` is in scope).

## Open questions

- **localStorage quota.** `atom_openFiles` persists `content` and `lastSavedContent` for every open tab in localStorage (about 5 MB per origin). A freehand-heavy board of a few MB can exceed it, and the atom write would then throw. This is pre-existing for large notes, but boards make it likely. Recommended: a follow-up plan that skips persisting text above a size threshold, since the disk wins on reload anyway. The engineer should test a board of about 1 MB and note the result.
- **AI chat context.** Opening AI Chat on an active board sends the raw note, JSON included, as the current document. Recommended: a follow-up that applies `boardTextForReading` to the chat's document context and mentions.
