# board

A board is a Markdown note that holds an Excalidraw scene and opens in its pane as an infinite canvas (format: `app/utils/board/`). `PaneLeaf` renders `BoardViewLoader` instead of `MarkdownEditor` when `isBoard(path, content)` and the user hasn't chosen Edit as Markdown.

| File | Purpose |
|---|---|
| [BoardViewLoader](BoardViewLoader.md) | `next/dynamic` boundary (`ssr: false`) with a pulsing placeholder; the only file PaneLeaf imports |
| [BoardView](BoardView.md) | The canvas. The only file allowed to value-import `@excalidraw/*` |
| [BoardError](BoardError.md) | Conflict / unreadable states with an **Edit as Markdown** button |
| `use-board-sync.ts` | Debounced canvas → Markdown writes, external text → `updateScene`, flush registration. No Excalidraw imports (the hash function is injected) |
| `use-board-viewport.ts` | Scroll and zoom per path in the tab's `sessionStorage` (never in the file) |
| `board-ui-options.tsx` | `UIOptions`, paste and drop guards, the trimmed main menu |
| `board-types.ts` | `BoardViewProps` |
| `excalidraw-asset-path.ts` | Sets `EXCALIDRAW_ASSET_PATH` to `/excalidraw-assets/` (self-hosted fonts) before Excalidraw loads |
| `BoardView.css` | Hides the library trigger |
