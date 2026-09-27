# Editor Component Architecture

The editor is the primary workspace of HermesMarkdown, located in `app/editor`.

## Core Editor

### `MarkdownEditor`
The app's current editor is built on CodeMirror 6, with the source-mode implementation in `app/editor/codemirror` and the feature overlays in `app/editor/hooks`.
- Synchronizes content with the active file and frontmatter handling for document metadata.
- Supports slash commands, wiki links, date pickers, tables, and workflow/todo pills.
- Renders Mermaid fenced blocks via a small dialog trigger attached to the Mermaid code block so the full diagram can open in the dedicated Mermaid viewer.

### File navigation
Vault files are browsed through the command palette (`Ctrl/Cmd+K`), the Files page (`/editor/files`, "Open Explorer"), and the mobile `MobileFileOverlay`. The latter two use the `VaultSidebarFiles` tree and tag search.
- **Actions**: Create, rename, move, duplicate, and delete files and folders through `useFileSystem`.
- **Tags**: Tags extracted from notes are searchable with the `#` palette prefix.

### Tasks page
The Tasks page (`app/editor/tasks`) is a vault-wide view over the derived task index.
- **Navigation**: Selecting a task opens its source file and queues the editor to focus its source line.
- **Filtering and grouping**: Task text, custom tags, due-date buckets, status/file grouping, and configurable sorting are client-side derived state.
- **Write-back**: Toggling a checkbox patches the original Markdown source line and saves it through the normal file-save path, which refreshes the task index.

## Interactions

1. **Opening a File**: When a user opens a file from the command palette or the file overlay, it calls `openFile` from `useFileSystem`. This reads the file content, sets the document content, and updates the active file handle.
2. **Editing**: As the user types in the editor, the document state is updated in real time.
3. **Saving**: Saving can be manual or automatic. It uses the active file handle to write the current content back to the local disk.
4. **File Synchronization** (`use-file-watcher`): When the window regains focus, HermesMarkdown checks if the active file has been modified externally.
    - **Auto-Sync**: If no local changes exist, it automatically reloads the new content from disk.
    - **Conflict Resolution**: If local changes exist and the file was modified externally, a **Conflict Dialog** appears, allowing the user to either "Reload External Changes" or "Keep Local Edits".
5. **Folder Management**: Creating a folder uses `targetDir.getDirectoryHandle(name, { create: true })` and refreshes the directory listing.

## Mermaid flow

When the cursor is in a fenced Mermaid block, a small trigger button appears beside the active line. Clicking it opens the dedicated Mermaid dialog for the rendered diagram.

## Table Flow

Tables never show their pipe syntax. Every valid GFM table renders as an
inline, spreadsheet-style grid whose cells are edited in place, while the
Markdown source stays the single source of truth.

### Inline grid (`codemirror/table-display.tsx`)

1. **Detection**: a `StateField` walks the Lezer syntax tree for `Table` nodes (so pipes in code blocks are never tables) and replaces each with a block widget. Tables are atomic ranges; when the editor caret arrives at one (arrow keys, undo), focus hands off to the nearest cell (first cell from above, last from below).
2. **Editing**: each cell is its own `contenteditable`. Unfocused cells show rendered inline Markdown (`utils/inline-markdown.ts`); the focused cell shows its raw text (`**bold**`, links…). Every keystroke is written back as a minimal change to that cell's source range. Undo/redo, autosave and split panes always see the table as displayed. Typed pipes are stored escaped (`\|`).
3. **Keyboard**: Tab / Shift+Tab move between cells, and Tab in the last cell adds a row. Enter moves down, adding a row at the bottom. The arrow keys cross cell edges and leave the table at its borders. Escape leaves the table. Alt+↑/↓ move the row, Ctrl/Cmd+Alt+←/→ move the column, Ctrl/Cmd+Enter inserts a row below, Ctrl/Cmd+Shift+Backspace deletes the row, and Ctrl/Cmd+B / I / E wrap the selection in bold / italic / code.
4. **Paste**: plain text pastes into the cell. TSV (from a spreadsheet) or multi-line CSV fills cells starting at the focused cell, growing the table as needed.
5. **Source hygiene**: when the caret leaves a table, its column padding is realigned (`hooks/use-codemirror-table.ts`). This change is kept out of undo history because it's invisible in the grid. Tables written without outer pipes get them on first edit.

### Table menu (`codemirror/table-handles.ts`)

Nothing is drawn on top of the cells. Table actions live in one menu with **Row** (insert above/below, move, delete), **Column** (insert left/right, move, sort, align, delete) and **Table** (copy as CSV / JSON, delete with a confirming second click) sections. Open it either way:

- **Right-click / long-press** a cell. The menu opens at the pointer.
- **The column tab**: a thin bar in the strip reserved above the header row, centred over the active column. It fades out as soon as you type and returns on pointer movement.

All structural edits go through `codemirror/table-commands.ts` as one isolated undo step each.

### Utilities

| File | Purpose |
|------|---------|
| `utils/tableParser.ts` | `parseTable(source)` — strict GFM parse (requires separator row). `parseTableLenient(source)` — best-effort parse when separator is absent. |
| `utils/tableSerializer.ts` | `serializeTable(data, pretty)` — produces GFM markdown. Pretty mode pads columns (max 40 chars); compact mode is minimal. |
| `utils/tableSorter.ts` | `sortRows(rows, colIdx, direction)` — numeric detection, empty cells always sort to bottom. |
| `utils/table-manipulation.ts` | Line-array and `TableData` mutations (add/remove/move rows and columns, CSV/JSON export, delimited-text parsing) used by the table commands. |
| `utils/inline-markdown.ts` | Escaped inline-Markdown → HTML renderer for unfocused grid cells. |
| `utils/table-detection.ts` | `findTableAtPos(text, pos)` — locates the table block at cursor position and returns cursor row/col indices. |
