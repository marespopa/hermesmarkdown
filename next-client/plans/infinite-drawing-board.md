---
title: Excalidraw - PRD
tags: [solution, hermesmarkdown, proposal]
---

# Excalidraw - PRD

## Goal

Let a user open an infinite, pannable and zoomable canvas inside HermesMarkdown, sketch on it (freehand, shapes, arrows, text, sticky notes), and keep it in the vault next to their notes, without breaking the project's rules:

- Markdown files stay the source of truth (`ARCHITECTURE.md`, principle 1).
- No network unless the user opts in (Zero-Cloud).
- Minimal by default: the board is an **Advanced** feature in the sense of `plans/minimalism-audit.md`. It is reachable from the palette (and later the slash menu), with no new toolbar buttons.
- No cost to anyone who never opens a board: zero bytes added to the editor's first load (section 8).

## 1. Options for the canvas engine

| Option | Licence | Fit | Verdict |
| :-- | :-- | :-- | :-- |
| **Excalidraw** (`@excalidraw/excalidraw`) | MIT | A React component with an infinite canvas, freehand, shapes, arrows, text, images, light and dark themes, touch and pen input, `viewModeEnabled`, and `serializeAsJSON` / `exportToSvg` / `exportToBlob` utilities. 0.18's React peer range covers 17–19 (the app is on React 19.0.0, Next ^16.3.8). It is ESM-only and needs `@excalidraw/excalidraw/index.css` imported. Obsidian's Excalidraw plugin already proves the "drawing stored in a `.md` file" model. | **Recommended** |
| tldraw SDK | Since 4.0 (Sep 2025), production needs a licence key. Without a commercial key it shows a watermark, and hobby keys are granted case by case. | A better SDK for custom shapes, but the licence clashes with a free, open, offline app. | Rejected |
| Custom canvas (`<canvas>` + `perfect-freehand` + our own pan/zoom/selection/undo) | Ours | Full control and a small bundle, but selection, hit-testing, text editing, undo, export and touch support add up to many weeks of work and a long tail of bugs. | Fallback only, if Excalidraw's bundle or API proves unworkable |
| JSON Canvas (Obsidian's `.canvas`) | MIT spec | A spec for a board of cards (notes, links, groups), not for drawing. | Out of scope. It could come later as a separate "card board" feature. |

**Decision: wrap Excalidraw behind our own `BoardView` component.** The engine stays replaceable because the rest of the app only ever sees our serialized board format (section 2), never Excalidraw types. Before starting, confirm the current Excalidraw version, its peer dependencies, and that it builds under Next 16 with Turbopack.

## 2. Storage format: a board is a Markdown file

Almost everything in the app filters on `.md`, including the vault scan (`hooks/file-system/vault-scan.ts`), the GitHub vault sync filter (`isGitHubVaultPathAllowed` in `services/github-vault-workspace.ts`), the home feed, file search, rename and duplicate. A new extension would need changes in every one of those places. So **a board is a Markdown note with a reserved fenced block**:

````markdown
---
hermes: board
board-version: 1
---

# Sprint planning board

Free Markdown here is optional: a caption, links such as [[Roadmap]], tags.

```hermes-board
{"type":"hermes-board","version":1,"source":"excalidraw",
 "appState":{"viewBackgroundColor":"#ffffff","gridSize":null},
 "elements":[
  {"id":"a1","type":"freedraw", ...},
  {"id":"b2","type":"text","text":"Ship v7", ...}
 ],
 "files":{}}
```
````

Rules:

- **File naming:** `Name.board.md`. The `.md` suffix keeps every existing pipeline working. The `.board` infix lets the sidebar and the palette show a board icon without parsing the file. The `hermes: board` frontmatter key is what actually defines a board, so a renamed file still opens as a board.
- **One element per line** in the JSON, with a stable key order. This keeps diffs local to one element and lets line-based merges succeed when two devices edit different elements. It does **not** keep lines short: a `freedraw` element carries its whole point array, so one stroke can be tens of KB on one line. To keep that in check:
  - Round point and position coordinates to 1–2 decimals when serializing.
  - Accept that every edit to an element also changes its `version`, `versionNonce` and `updated` fields, so even a move shows as a whole-line change. That is fine; document it.
- **Only persist what matters:** elements (with `isDeleted` elements dropped), `files`, and a small `appState` allow-list (background colour, grid). Leave out the viewport (scroll and zoom), the selection and the tool. The viewport goes into the tab's session storage (`tabSessionStorage()` in `atoms/session-storage.ts`), so panning around doesn't make the file dirty.
- **Images:** v1 does not support image paste or insert on boards (Excalidraw's `UIOptions` / `onPaste` can turn this off). Excalidraw would otherwise inline images as base64 `dataURL`s and bloat the note, and GitHub vaults only sync `.md` files today. A later phase can store images as vault files referenced by path and resolve them with `utils/resolve-vault-file`, the same way `ImageDialog` and the PDF export do.
- **Versioning:** `board-version` plus `version` inside the JSON. Add a pure migrator (`utils/board/migrate.ts`) from the start, even if it does nothing at first.
- **Parsing:** a pure module, `app/utils/board/board-format.ts`, with `parseBoard(markdown) → { frontmatter, prose, scene } | error` and `serializeBoard(prose, scene) → markdown`. It has no React and no Excalidraw imports, only `import type` at most. This is the main unit-test target, including a round-trip test. `parseBoard` reports git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) inside the fence as a distinct `conflict` error, separate from plain invalid JSON (see section 3, step 6).
- **Fence helper:** the same module exports `stripBoardFence(markdown)`, which returns the note without the `hermes-board` fence. The worker, the preview and the AI chat tools use it (section 6). It stays cheap and has no dependencies, because it runs on every note.

## 3. Opening a board in the workspace

Panes already dispatch on a pane `type` (`"editor" | "metrics"`, `types/workspace.ts`). A board is a *file kind*, not a pane kind, so:

1. Add `app/utils/board/is-board.ts`. It checks frontmatter `hermes: board` (from the metadata index, `atom_fileMetadata`) and falls back to the `.board.md` suffix while the index is cold. It must not import anything from `@excalidraw/*`: `PaneLeaf` imports it, so anything it imports lands in the editor's first load.
2. In `PaneLeaf`, where the active tab's `MarkdownEditor` is rendered inside `PrivateNoteGate`, render `BoardView` instead when the active file is a board. Tabs, split panes, the tab limit, drag and drop, pinning and the private-note gate all keep working unchanged.
3. Load `BoardView` with `next/dynamic` and `ssr: false`, so the Excalidraw bundle only loads the first time a board opens (section 8). Show `EditorSkeleton` while it loads.
4. Data flow reuses the existing note pipeline. Nothing gets a second save path:
   - **On open:** the file text comes from the same open-file atoms (`atom_fileContent(path)`) and goes through `parseBoard`. The scene becomes Excalidraw's `initialData`.
   - **On change:** Excalidraw's `onChange` fires on every pointer move and on every selection or viewport change. Write only when the elements actually changed: compare `getSceneVersion(elements)` (or a hash of the persisted fields) with the last serialized value, then debounce about 500 ms. `serializeBoard` produces the new Markdown, which is written into the same content atom the editor uses. The dirty state (`content` vs `lastSavedContent`, as the tab limit already uses), the existing save, save status, autosave, retries and `FileSystemWritableFileStream` handling (closed in `finally`) apply as-is. Without the scene-version check, the tab would look dirty and save constantly with nothing changed.
   - **Flush on unmount:** when the tab is closed, evicted by the tab limit, switched away from or the pane unmounts, flush a pending debounced write immediately so no stroke is lost.
   - **External changes:** the file watcher already reloads open files, and `ConflictDialog` handles the case where unsaved edits exist. On a reload, **cancel any pending debounced write first**, then pass the new scene to `excalidrawAPI.updateScene` without remounting. Otherwise the debounce can fire after the reload and write the old scene back over the new file.
5. **Theme:** the app theme maps to Excalidraw's `theme` prop. There is no preview mode to map: the editor has had a single mode since the Edit / Preview `viewMode` was removed (`atoms/ui-atoms.ts`). Boards are always editable, and `viewModeEnabled` stays off. (If a read-only board turns out to be needed, it is a separate, board-only toggle.)
6. **Error states and "Edit as Markdown":** "Edit as Markdown" goes in the pane menu (Advanced). It opens the raw file in `MarkdownEditor` for the caption and frontmatter, and for repairs. When `parseBoard` fails, `BoardView` never shows an empty canvas and never writes. It shows one of:
   - **Conflict:** "This board has unresolved merge conflicts". Shown when the sync left conflict markers in the fence (section 7). It offers "Edit as Markdown" and, where `atom_fileConflict` is set, the existing `ConflictDialog` merge.
   - **Invalid:** "This board couldn't be read". It offers "Edit as Markdown".
7. **Large raw files in the editor:** "Edit as Markdown" on a multi-MB board puts a huge fenced block into CodeMirror and Lezer. Measure it with the large-board fixture (section 10). If it is too slow, fold the fence by default in that view.

## 4. Creating boards (palette-first)

- Palette command **New board** creates `Untitled.board.md` in the New Notes folder through the existing create-item hook (`use-create-item.ts`). That hook already strips only a trailing `.md`, so `Untitled.board` becomes `Untitled.board.md` without changes. **Fix `createUniqueFile`** (`hooks/file-system/unique-file.ts`): on a name clash it appends ` (1)` before `.md`, so today it would give `Untitled.board (1).md` and the file would lose its board suffix. It must give `Untitled (1).board.md`.
- Slash command `/board` (phase 2, together with embeds) asks for a name, creates the board, and inserts an embed link at the cursor.
- No sidebar or toolbar button and no template-pack entry, in line with the minimalism audit.

## 5. Embedding a board in a note (phase 2: build transclusion)

The app has **no `![[…]]` embed support today**. Nothing in `app/` renders transclusions, and the existing rendered blocks (Mermaid and math in `editor/codemirror/rendered-block.ts`) only render fence source from **the same document**: their cache key is `renderKey(kind, theme, source)`. Board embeds are therefore a new mechanism, not a new rendered-block kind, and phase 2 should be sized as such:

- **Syntax:** `![[Sprint planning.board]]`. It resolves through `resolve-file-by-name.ts`, which appends `.md`, so `Sprint planning.board` resolves to `Sprint planning.board.md` with no change there.
- **Embed widget:** a new CodeMirror widget that renders the embed using `rendered-block.ts` as a pattern but not as its host. It:
  - finds the line, resolves the file and reads it asynchronously;
  - renders the board to SVG with Excalidraw's `exportToSvg`, loaded lazily the way `render-mermaid.ts` loads Mermaid (`await import(...)`);
  - shows a placeholder of the last known height while loading, and a "Board not found" state for a missing file;
  - caches by file path plus modified time plus theme;
  - is invalidated when the target file changes on disk, is saved from another tab, or is renamed or deleted.
- **Interaction:** double-clicking opens the board in a tab, instead of the source dialog Mermaid uses.
- **Scope decision:** embeds are board-only. General `![[note]]` transclusion is out of scope, though the widget should not block it later.
- **PDF export:** `use-export-pdf.ts` already turns rendered blocks into HTML. Board embeds need their own async step in that path, which reads the file and inlines the SVG. A board opened on its own exports as one page, with the SVG fitted to the page.

## 6. Index, search, links, tasks and AI

Split into what has to ship with the MVP (otherwise the JSON leaks into the UI) and what can wait.

**Phase 1 (required with the MVP):** run `stripBoardFence` before:

- **Word count** in `metadata.worker.ts`, which currently counts the whole content.
- **The note preview** (`notePreview(content)`), so the home feed never shows JSON.
- **`ContentIndex`**, so searching for words like `type`, `freedraw` or `version` doesn't match every board. Board JSON would also use up the per-note `MAX_NOTE_CHARS` (1M) budget.
- **Wikilink extraction** (`REGEX_LINK` in the worker). Today it would match `[[…]]` inside JSON strings by accident, with escaped quotes mangled.
- **The AI chat `read_note` tool** (the runner in `editor/components/ai-chat/chat-tool-runners.ts`), so it doesn't put megabytes of point arrays into the model's context. Return the prose, plus a line such as "(board with N elements)".

**Tasks:** `utils/taskExtractor.ts` doesn't skip any fenced code today, which is a general bug and not specific to boards. Fix it for all fences (with tests), which also covers boards. Board JSON lines start with `{` or `"` anyway, but a test should still check that a board file yields no tasks.

**Phase 3:**

- Pull the text out of the board's `text` elements (`board-text.ts`) and append it to the `ContentIndex` text, so content search finds words written on a board.
- Feed the same text to wikilink extraction, so a `[[Note]]` typed on the board shows up in backlinks on purpose.

**Rename and move:** boards are `.md` files, so `atom_remapVaultPaths`, the content-index remap and rename-updates-links all apply unchanged. Add a test with a `.board.md` path.

## 7. GitHub vault sync and conflicts

`services/github-vault-sync.ts` merges remote and local text and **writes git conflict markers into the file** when both sides changed the same lines (`countMergeConflicts`). For a board, that means:

- Two devices editing **different** elements: the merge succeeds line by line, which is the payoff of one element per line.
- Two devices editing the **same** element, or reformatting the header lines: the fence gets `<<<<<<<` / `=======` / `>>>>>>>`. `parseBoard` reports `conflict`, and `BoardView` shows the conflict state (section 3, step 6). The user resolves it with "Edit as Markdown" or the `ConflictDialog` merge, picking one side per hunk. A whole-element hunk is still valid JSON once one side is kept.
- **Follow-up (optional):** have the sync treat board files as whole-file conflicts (keep local, store remote as a sibling copy) instead of writing markers. That avoids the broken-board state entirely, at the cost of a sync special case. Decide after the MVP, based on how often it happens.

## 8. Performance and load time

**App load time: no effect, if the lazy boundary holds.**

- `BoardView` is loaded with `next/dynamic` and `ssr: false`. Excalidraw's JavaScript and its `index.css` live only in that chunk.
- **Rule:** only `components/board/BoardView.tsx` (and phase 2's embed renderer, through `await import`) may import `@excalidraw/*` at runtime. `is-board.ts`, `board-format.ts`, `board-text.ts`, the worker and `PaneLeaf` use `import type` only, or nothing. A single stray value import in the wrong file pulls the whole engine into the editor's first load.
- **Guard it:** add a lint rule (`no-restricted-imports` for `@excalidraw/*`, with `BoardView.tsx` and the embed renderer exempt) and check the production build's route output. The editor route's First Load JS must not change from trunk.
- Fonts load only when a board renders text, from the self-hosted path (section 9).

**First board open: one-off cost.**

- The Excalidraw chunk is about 1 MB+ minified, roughly 300–400 KB gzipped (measure it with the real build). On a fast desktop it downloads and parses in a few hundred ms. On a mid-range phone it can take 1–2 s, with `EditorSkeleton` showing meanwhile.
- After that, the service worker serves it from cache (`/_next/static` is already cache-first), so later opens and new sessions only pay the parse time.
- **Optional prefetch:** when the vault scan finds at least one `.board.md`, prefetch the chunk in `requestIdleCallback`. Vaults without boards never download it.

**Editing and saving: depends on board size.**

- **Rendering:** Excalidraw draws on canvas and caches element shapes. Pan and zoom stay smooth into the low thousands of elements. Dense freehand (many points per stroke) is the slow case, especially on phones and iPads.
- **Serialize and save:** each debounced save runs `JSON.stringify` over the scene and writes the whole file. Around 1 MB this is roughly 10–30 ms on desktop, which is fine with a 500 ms debounce and the scene-version check (section 3), because nothing serializes unless an element changed. Rounding coordinates (section 2) shrinks the file 30–50% for freehand-heavy boards.
- **Knock-on costs per save:** the metadata worker re-parses the file, and in a GitHub vault the sync commits the whole file. With `stripBoardFence` applied before indexing, the worker cost stays small. The commit size scales with the board size.
- **Vault scan:** the worker reads every board in full during a scan. A handful of boards is negligible; hundreds of multi-MB boards would slow the scan noticeably. Measure with the large-board fixture. If needed, have `stripBoardFence` scan for the fence lines instead of parsing the JSON.

**Budgets (checked manually and in review):**

| Metric | Budget |
| :-- | :-- |
| Editor route First Load JS | Unchanged from trunk |
| Board chunk (gzipped) | Measured and recorded in the PR; flag anything above 500 KB |
| First board open, mid-range phone, cold cache | Under 2 s to an interactive canvas |
| Save of a 5k-element board | Under 50 ms on the main thread (serialize plus atom write) |
| Pan and zoom, 5k-element board | No visible jank on desktop; usable on an iPad |

## 9. Zero-Cloud and offline

- By default, Excalidraw loads its fonts (Excalifont, Virgil and others) from a CDN. Set `window.EXCALIDRAW_ASSET_PATH` to a self-hosted copy under `public/excalidraw-assets/`, which a small `scripts/` step copies from `node_modules` at build time. Check in tests or review that the board makes no third-party requests.
- `public/sw.js` already caches `/_next/static` and anything matching `STATIC_ASSET` with a cache-first rule. `STATIC_ASSET` already matches `.woff2`, so the self-hosted fonts are cached with no change to `sw.js`.
- Turn off Excalidraw features that talk to a network or duplicate ours: live collaboration, `excalidraw.com` links, library browsing from the web, and its own main-menu load/save/export (we own file I/O). Configure these through `UIOptions.canvasActions` and a custom `MainMenu`.

## 10. Files and components (each with a sibling `.md` doc, under 400 lines)

- `app/utils/board/board-format.ts` (+ test): parse, serialize, deterministic formatting, coordinate rounding, `stripBoardFence`, conflict-marker detection.
- `app/utils/board/migrate.ts` (+ test).
- `app/utils/board/is-board.ts` (+ test).
- `app/utils/board/board-text.ts` (+ test, phase 3): text-element extraction for the worker.
- `app/editor/components/board/BoardView.tsx`: the Excalidraw wrapper. It handles the dynamic import, theme, the scene-version check plus debounced change → content atom, flushing on unmount, cancelling the debounce and calling `updateScene` on reload, and the conflict and invalid error states.
- `app/editor/components/board/use-board-viewport.ts`: per-tab viewport in session storage.
- `app/editor/components/board/README.md`: directory index.
- **Phase 1 touch points:**
  - `PaneLeaf.tsx` (dispatch)
  - `EditorCommands` / palette (New board)
  - `use-create-item.ts` / `createUniqueFile` (suffix on name clash)
  - `metadata.worker.ts` (`stripBoardFence` before word count, preview, `ContentIndex` and links)
  - `chat-tool-runners.ts` (`read_note`)
  - `taskExtractor.ts` (skip all fences)
  - lint config (restricted `@excalidraw/*` imports)
  - `ARCHITECTURE.md` (a "Boards" runtime component entry)
  - user docs under `app/documentation/content`
- **Phase 2 touch points:** the new embed widget next to `rendered-block.ts`, `slash-menu.ts` (`/board`), `use-export-pdf.ts`.

## 11. Testing (Vitest, all mocked)

- **Pure modules:**
  - the round-trip `serializeBoard(parseBoard(x)) === x`, and stable output for the same scene;
  - coordinate rounding, migration and broken-JSON handling;
  - a `conflict` error for a fence with git markers;
  - `stripBoardFence` and text extraction;
  - the task extractor ignoring all fences, including boards;
  - word count, preview and the content index excluding board JSON.
- **`BoardView`:** mock `@excalidraw/excalidraw` with a stub that exposes `onChange` and `updateScene`, and test that:
  - an element change marks the tab dirty and writes serialized Markdown;
  - a change that only touches `appState` or the selection does **not** write;
  - unmounting with a pending change flushes it;
  - a reload with a pending change cancels it and calls `updateScene`;
  - a parse error shows the matching error state and never writes.
- **`PaneLeaf`:** a board path renders `BoardView`, and a normal note renders `MarkdownEditor`. Wrap in a Jotai `<Provider>`, mock `useRouter` and `useFileSystem`.
- **Bundle:** a test or CI check that only the allowed files import `@excalidraw/*` at runtime (the lint rule covers this).
- **Manual check in the real app (the `run` skill):**
  - a large freehand board (about 5k elements) against the budgets in section 8: pan and zoom, save latency, "Edit as Markdown" speed and vault scan time;
  - touch and pen on an iPad with a browser vault;
  - offline fonts;
  - a forced GitHub conflict on the same element, showing the conflict state.

## 12. Phases

1. **MVP:**
   - the dependency and self-hosted fonts;
   - the format module (rounding, `stripBoardFence`, conflict detection);
   - `BoardView` (scene-version change check, flush and cancel, error states) and pane dispatch;
   - the New board command, theme, and save and reload;
   - board JSON kept out of word count, preview, search, links and AI `read_note`;
   - fence-aware task extraction;
   - the lint guard on the lazy boundary and the performance budgets;
   - docs and tests.
2. **Embeds (transclusion, built from scratch):** the `![[x.board]]` widget with async file reads, invalidation and SVG previews; `/board`; PDF export.
3. **Index:** board text in content search, and wikilinks on boards as intended backlinks.
4. **Images:** vault-file-backed images on boards, plus GitHub sync for non-`.md` attachments. This needs its own plan, because it changes the `.md`-only sync filter.

## Risks and open questions

- **Bundle size and compatibility:** confirm the current `@excalidraw/excalidraw` version, the ESM and CSS import under Next 16 with Turbopack, and the gzipped chunk size before starting. The lazy boundary is a hard requirement (section 8).
- **Large boards:** freehand strokes store point arrays, so a busy board can reach several MB. Coordinate rounding and `stripBoardFence` keep the worker and the search index small. GitHub commit size and "Edit as Markdown" speed still grow with the board.
- **Undo:** Excalidraw keeps its own history, separate from CodeMirror's. That's acceptable because a board never shares a view with text, but "Edit as Markdown" plus an external reload resets Excalidraw's history. This needs a note in the user docs.
- **Merge conflicts in GitHub vaults:** the sync writes conflict markers, which `BoardView` detects and routes to a repair flow (section 7). Whether to special-case boards as whole-file conflicts in the sync is open; decide after the MVP.
- **Open question:** should boards also accept a plain `.excalidraw` file, for import from excalidraw.com? Recommended: import only. Convert it to `.board.md` on open, through the existing import flow.
