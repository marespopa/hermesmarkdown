# BoardView

Description: The Excalidraw canvas for a board note. Default export, loaded only through `BoardViewLoader`. It is the **only** file allowed to value-import `@excalidraw/*` (ESLint `no-restricted-imports`; tests are exempt), so the editor route's first load doesn't include Excalidraw.

## Props
`path`, `content` (the tab's Markdown, `atom_fileContent(path)`), `isActivePane?`, `onEditAsMarkdown`.

## Behavior
- Parses `content` with `parseBoard`. On a conflict or invalid JSON it renders `BoardError` and no canvas; nothing is written.
- Theme follows `useResolvedTheme()`. The canvas starts below the pane header (`--pane-header-inset`).
- Writes: `useBoardSync` compares `hashElementsVersion(elements)` plus the allow-listed `appState` (background, grid). Excalidraw's first `onChange` after load or `updateScene` is a baseline and never writes, so opening a board never dirties it. A change writes Markdown into `atom_fileContent(path)` about 500 ms later; autosave or Save persists it. Selection, tool, scroll and zoom never write.
- Flushes: pending writes are forced on unmount, `pagehide`, hidden tab, and through the flush registry before every save read (Save, Cmd/Ctrl+S, close tab, autosave flush, tab switch).
- External change (disk wins): the pending write is dropped and `updateScene` shows the new text, without a remount.
- Viewport (scroll, zoom) lives in the tab's `sessionStorage` (`atom_boardViewports`), never in the file. With none stored, the scene is fitted to its content.
- Excalidraw's undo history is separate from the app's and resets when the board is reloaded from disk or reopened.
- Disabled: image tool, image paste, file drops, collaboration, load/save/export, theme toggle, socials, the library, the welcome screen. Kept: drawing tools, text, shapes, arrows, background color, clear canvas, grid, zoom, undo.

## Storage & Network
- Storage: `sessionStorage["hermes_board_viewport"]`. The scene is in the note's Markdown.
- Network: none. Fonts come from `/excalidraw-assets/` (copied from `node_modules` by `scripts/copy-excalidraw-assets.mjs` on `dev` and `build`; gitignored).
