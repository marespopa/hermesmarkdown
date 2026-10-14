# Infinite drawing board — research and plan

Status: proposal (no code yet). Written 2026-10-14.

## Goal

Let a user open an infinite, pannable and zoomable canvas inside HermesMarkdown, sketch on it (freehand, shapes, arrows, text, sticky notes), and keep it in the vault next to their notes, without breaking the project's rules:

- Markdown files stay the source of truth (`ARCHITECTURE.md`, principle 1).
- No network unless the user opts in (Zero-Cloud).
- Minimal by default: the board is an **Advanced** feature in the sense of `plans/minimalism-audit.md`. It is reachable from the palette and the slash menu, with no new toolbar buttons.

## 1. Options for the canvas engine

| Option | Licence | Fit | Verdict |
|---|---|---|---|
| **Excalidraw** (`@excalidraw/excalidraw`) | MIT | A React component with an infinite canvas, freehand, shapes, arrows, text, images, light and dark themes, touch and pen input, `viewModeEnabled`, and `serializeAsJSON` / `exportToSvg` / `exportToBlob` utilities. Release 0.18 targets React 19. Obsidian's Excalidraw plugin already proves the "drawing stored in a `.md` file" model. | **Recommended** |
| tldraw SDK | Since 4.0 (Sep 2025), production needs a licence key. Without a commercial key it shows a watermark, and hobby keys are granted case by case. | A better SDK for custom shapes, but the licence clashes with a free, open, offline app. | Rejected |
| Custom canvas (`<canvas>` + `perfect-freehand` + our own pan/zoom/selection/undo) | Ours | Full control and a small bundle, but selection, hit-testing, text editing, undo, export and touch support add up to many weeks of work and a long tail of bugs. | Fallback only, if Excalidraw's bundle or API proves unworkable |
| JSON Canvas (Obsidian's `.canvas`) | MIT spec | A spec for a board of cards (notes, links, groups), not for drawing. | Out of scope. It could come later as a separate "card board" feature. |

**Decision: wrap Excalidraw behind our own `BoardView` component.** The engine stays replaceable because the rest of the app only ever sees our serialized board format (section 2), never Excalidraw types.

## 2. Storage format: a board is a Markdown file

Almost everything in the app filters on `.md`, including the vault scan (`hooks/file-system/vault-scan.ts`), the GitHub vault sync filter (`services/github-vault-workspace.ts:74`), the home feed, file search, rename and duplicate. A new extension would need changes in every one of those places. So **a board is a Markdown note with a reserved fenced block**:

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
- **One element per line** in the JSON, with a stable key order. This gives readable GitHub diffs, line-based merges when two devices edit different strokes, and it avoids one huge line that would hurt CodeMirror if someone opens the source.
- **Only persist what matters:** elements (with `isDeleted` elements dropped), `files`, and a small `appState` allow-list (background colour, grid). Leave out the viewport (scroll and zoom), the selection and the tool. The viewport goes into the session storage for that pane's tab, so panning around doesn't make the file dirty.
- **Images:** v1 does not support image paste or insert on boards (Excalidraw's `UIOptions` / `onPaste` can turn this off). Excalidraw would otherwise inline images as base64 `dataURL`s and bloat the note, and GitHub vaults only sync `.md` files today. A later phase can store images as vault files referenced by path and resolve them with `utils/resolve-vault-file`, the same way `ImageDialog` and the PDF export do.
- **Versioning:** `board-version` plus `version` inside the JSON. Add a pure migrator (`utils/board/migrate.ts`) from the start, even if it does nothing at first.
- **Parsing:** a pure module, `app/utils/board/board-format.ts`, with `parseBoard(markdown) → { frontmatter, prose, scene } | error` and `serializeBoard(prose, scene) → markdown`. It has no React and no Excalidraw imports. This is the main unit-test target, including a round-trip test.

## 3. Opening a board in the workspace

Panes already dispatch on a pane `type` (`"editor" | "metrics"`, `types/workspace.ts`). A board is a *file kind*, not a pane kind, so:

1. Add `app/utils/board/is-board.ts`. It checks frontmatter `hermes: board` (from the metadata index, `atom_fileMetadata`) and falls back to the `.board.md` suffix while the index is cold.
2. In `PaneLeaf`, where the active tab's `MarkdownEditor` is rendered inside `PrivateNoteGate`, render `BoardView` instead when the active file is a board. Tabs, split panes, the tab limit, drag and drop, pinning and the private-note gate all keep working unchanged.
3. Load `BoardView` with `next/dynamic` and `ssr: false`, so the Excalidraw bundle (around 1 MB+) only loads the first time a board opens. It must never be part of the editor's first load. Show `EditorSkeleton` while it loads.
4. Data flow reuses the existing note pipeline. Nothing gets a second save path:
   - On open, the file text comes from the same open-file atoms and goes through `parseBoard`. The scene becomes Excalidraw's `initialData`.
   - On change, Excalidraw's `onChange` is debounced (about 500 ms, skipping changes that only touch `appState`). `serializeBoard` produces the new Markdown, which is written into the same content atom the editor uses. The existing save, save status, autosave, retries and `FileSystemWritableFileStream` handling (closed in `finally`) apply as-is.
   - External changes: the file watcher already reloads open files and raises `ConflictDialog` when there are unsaved edits. `BoardView` must accept a new scene after a reload through `excalidrawAPI.updateScene`, without remounting.
5. **Preview mode** (`atom_viewMode`) maps to Excalidraw's `viewModeEnabled`. The app theme maps to Excalidraw's `theme` prop.
6. **"Edit as Markdown"** goes in the pane menu (Advanced). It opens the raw file in `MarkdownEditor` for the caption and frontmatter, and for repairs if the JSON is broken. If `parseBoard` fails, `BoardView` shows an error state with that action instead of an empty canvas, so nothing ever overwrites a board it couldn't read.

## 4. Creating boards (palette-first)

- Palette command **New board** creates `Untitled.board.md` in the New Notes folder through the existing create-item hook (`use-create-item.ts`). Small change needed there: keep the `.board` infix when it appends `.md`.
- Slash command `/board` in a note asks for a name, creates the board, and inserts an embed link (section 5) at the cursor.
- Optional: a built-in template pack entry (`utils/templates/template-packs.ts`) for an empty board, so boards also work with the templates folder.
- No sidebar or toolbar button, in line with the minimalism audit.

## 5. Embedding a board in a note (phase 2)

- Syntax: `![[Sprint planning.board]]`, the vault's existing wikilink and embed style. It resolves through `resolve-file-by-name.ts`, so the `.board` name must survive the `.md` handling there.
- Rendering: add a new kind to `rendered-block.ts` / `utils/rendered-block-cache.ts`, next to Mermaid and math. The widget reads the board file, renders it to SVG with Excalidraw's `exportToSvg`, and caches the result by file path plus modified time plus theme. The Excalidraw *utils* are loaded lazily, as Mermaid is today. Double-clicking opens the board in a tab, instead of the source dialog Mermaid uses.
- **PDF export:** `use-export-pdf.ts` already turns rendered blocks into HTML. Board embeds plug into the same `renderBlock` path as SVG. A board opened on its own exports as one page with the SVG fitted to the page.

## 6. Index, search, links and tasks

- **Metadata worker:** frontmatter, tags and links in the prose part already work. Add board awareness to the parse:
  - Leave the `hermes-board` fence out of word count and the note preview, so the home feed doesn't show JSON.
  - Pull the text out of the board's `text` elements and append it to the `ContentIndex` text, so `/` content search finds words written on a board. Make the same text available to wikilink extraction, so `[[Note]]` typed on the board appears in backlinks.
- **Tasks:** `utils/taskExtractor.ts` does not skip fenced code today. Board JSON lines start with `{` or `"`, so they never look like `- [ ]`. Even so, add a test that a board file yields no tasks, and skip the board fence explicitly in the extractor for robustness.
- **Rename and move:** boards are `.md` files, so `atom_remapVaultPaths`, the content-index remap and rename-updates-links all apply unchanged. Add a test with a `.board.md` path.

## 7. Zero-Cloud and offline

- By default, Excalidraw loads its fonts (Excalifont, Virgil and others) from a CDN. Set `window.EXCALIDRAW_ASSET_PATH` to a self-hosted copy under `public/excalidraw-assets/`, which a small `scripts/` step copies from `node_modules` at build time. Check in tests or review that the board makes no third-party requests.
- `public/sw.js` already caches `/_next/static`. Add the font path to the service worker's cache-first rule so boards work offline.
- Turn off Excalidraw features that talk to a network or duplicate ours: live collaboration, `excalidraw.com` links, library browsing from the web, and its own main-menu load/save/export (we own file I/O). Configure these through `UIOptions.canvasActions` and a custom `MainMenu`.

## 8. Files and components (each with a sibling `.md` doc, under 400 lines)

- `app/utils/board/board-format.ts` (+ test): parse, serialize, deterministic formatting.
- `app/utils/board/migrate.ts` (+ test).
- `app/utils/board/is-board.ts` (+ test).
- `app/utils/board/board-text.ts` (+ test): text-element extraction for the worker.
- `app/editor/components/board/BoardView.tsx`: Excalidraw wrapper (dynamic import, theme and view mode, debounced change → content atom, `updateScene` on reload, error state).
- `app/editor/components/board/use-board-viewport.ts`: per-tab viewport in session storage.
- `app/editor/components/board/README.md`: directory index.
- Touch points: `PaneLeaf.tsx` (dispatch), `EditorCommands` / palette (New board), `slash-menu.ts` (`/board`), `use-create-item.ts` (`.board` infix), `metadata.worker.ts` (fence-aware parse), `rendered-block*.ts` (embed, phase 2), `use-export-pdf.ts` (phase 2), `public/sw.js`, `ARCHITECTURE.md` (a "Boards" runtime component entry), user docs under `app/documentation/content`.

## 9. Testing (Vitest, all mocked)

- Pure modules: round-trip `serializeBoard(parseBoard(x)) === x`, stable output for the same scene, migration, broken-JSON handling, text extraction, and that the task extractor ignores boards.
- `BoardView`: mock `@excalidraw/excalidraw` with a stub that exposes `onChange` and `updateScene`. Test that a change marks the tab dirty and writes serialized Markdown, that preview mode passes `viewModeEnabled`, that a parse error shows the error state and never writes, and that an external reload calls `updateScene`.
- `PaneLeaf`: a board path renders `BoardView`, and a normal note renders `MarkdownEditor`. Wrap in a Jotai `<Provider>`, mock `useRouter` and `useFileSystem`.
- Manual check in the real app (the `run` skill): a large freehand board (about 5k elements) for pan and zoom speed and save latency, touch and pen on an iPad with a browser vault, and offline fonts.

## 10. Phases

1. **MVP:** dependency, format module, `BoardView`, pane dispatch, New board command, save and reload, theme and preview mode, self-hosted fonts, docs and tests.
2. **Embeds:** `![[x.board]]` SVG previews in notes, `/board`, PDF export.
3. **Index:** board text in content search, wikilinks on boards as backlinks.
4. **Images:** vault-file-backed images on boards, plus GitHub sync for non-`.md` attachments. This needs its own plan, because it changes the `.md`-only sync filter.

## Risks and open questions

- **Bundle size and React 19 / Next 16 compatibility:** check `@excalidraw/excalidraw`'s current version and its peer dependencies before starting (0.18 pins React 19). Measure the lazy chunk, and confirm it never enters the editor route's first load.
- **Large boards:** freehand strokes store point arrays, so a busy board can reach several MB. That matters for the worker's 1M-character-per-note cap, for GitHub commits and for save latency. Options: round point coordinates to 1–2 decimals when serializing, and have the metadata worker store only the extracted text of a board in the `ContentIndex`, not the JSON.
- **Undo:** Excalidraw keeps its own history, separate from CodeMirror's. That's acceptable because a board never shares a view with text, but "Edit as Markdown" plus an external reload resets Excalidraw's history. This needs a note in the user docs.
- **Merge conflicts in GitHub vaults:** one element per line makes most conflicts line-local. True conflicts still go through the existing conflict dialog, where whole-file "keep mine / keep theirs" is the v1 answer.
- **Open question:** should boards also accept a plain `.excalidraw` file opened read-only, for import from excalidraw.com? Recommended: import only. Convert it to `.board.md` on open, through the existing import flow.

## Sources

- [tldraw licence key docs](https://tldraw.dev/sdk-features/license-key) and [tldraw SDK 4.0 licensing change](https://appdevelopermagazine.com/tldraw-sdk-4.0-release-new-starter-kits-and-licensing-model/)
- [`@excalidraw/excalidraw` on npm](https://npmjs.com/@excalidraw/excalidraw)
- [Obsidian Excalidraw plugin release notes (drawings stored in Markdown)](https://newreleases.io/project/github/zsviczian/obsidian-excalidraw-plugin/release/2.9.0-beta-1)
