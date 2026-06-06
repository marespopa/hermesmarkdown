# Editor Component Architecture

The editor is the primary workspace of HermesMarkdown, located in `app/editor`.

## Components

### `MarkdownEditor`
The core editor component (wrapper around `react-simple-code-editor` — textarea + `<pre>` overlay).
- Synchronizes content with the `atom_content` Jotai atom.
- Handles auto-saving when integrated with `useFileSystem`.
- Floating callouts (date picker, link pill, table callout) are positioned with `textarea-caret` and rendered as absolute overlays inside the editor container.

### `VaultSidebar`
The sidebar manages navigation within the opened "Vault" (local directory).
- **Navigation**: Uses `navigateTo` and `navigateBack` from `useFileSystem` to traverse folder structures.
- **Actions**: Provides UI for creating new files and folders, renaming, and deleting entries.
- **Smart Filters**: Automatically extracts and displays tags (hashtags) found within markdown files in the vault.

## Interactions

1. **Opening a File**: When a user clicks a file in the `VaultSidebar`, it calls `openFile` from `useFileSystem`. This reads the file content, sets the `atom_content`, and updates the `atom_activeFileHandle`.
2. **Editing**: As the user types in `MarkdownEditor`, the `atom_content` is updated.
3. **Saving**: Saving can be manual or automatic. It uses the `atom_activeFileHandle` to write the current `atom_content` back to the local disk.
4. **File Synchronization**: When the window regains focus, HermesMarkdown checks if the active file has been modified externally.
    - **Auto-Sync**: If no local changes exist, it automatically reloads the new content from disk.
    - **Conflict Resolution**: If local changes exist and the file was modified externally, a **Conflict Dialog** appears, allowing the user to either "Reload External Changes" or "Keep Local Edits".
5. **Folder Management**: Creating a folder in the sidebar uses `targetDir.getDirectoryHandle(name, { create: true })` and refreshes the directory listing.

## Table Flow

### Detection & Callout

When the cursor enters a pipe-table line the editor triggers a `TableCallout`:

1. **Detection** (`use-table-callout.ts` + `table-detection.ts`): On every `selectionchange` event, `findTableAtPos(value, selectionStart)` scans up/down from the cursor line to find contiguous pipe-table lines. Returns row/column indices plus character offset of the table start.
2. **Positioning**: `getCaretCoordinates(textarea, tableStartOffset)` converts that offset to pixel coordinates; the callout is placed 36 px above the table's first line, clamped to the textarea width.
3. **Quick mutations** (`table-manipulation.ts`): Callout buttons call pure functions (`addRow`, `addColumn`, `removeRow`, `removeColumn`, `cycleAlignment`, `tableToCSV`) that return a modified document line array. Changes are applied via `execCommand('insertText')` to preserve the browser undo stack.
4. **Keyboard shortcuts** (source mode): Tab/Shift+Tab jump between cells; `|` auto-escapes to `\|`; Enter at a row's end appends a new row.
5. **Dismissal**: Callout clears when cursor moves off the table or on editor blur (150 ms timeout).

### Table Dialog (Create / Edit)

A full visual editor for tables is available via:

- **`/table`** slash command — opens the dialog in **create mode** (blank 3×3 grid).
- **`{table}` shortcode** — inserts a raw 3×3 scaffold directly (no dialog).
- **Edit button** in the `TableCallout` — opens the dialog in **edit mode**, pre-filled from the parsed source.

Dialog features:
- Scrollable cell grid with Tab/Shift+Tab navigation between cells, styled with Apple-like `tabular-nums`
- Per-column alignment (L / C / R) toggled inline in the header row
- Smart data sorting by clicking any column header: asc ↑ → desc ↓ → none. Dynamically detects dates, currency, percentages, numbers, and strings.
- Add / remove columns and rows; removing non-empty ones requires inline confirmation
- Live markdown preview (collapsible)
- **Insert Table** (create mode) replaces the slash command text; **Update Table** (edit mode) replaces only the table block in the source and automatically pads output to match the L/C/R alignment settings.

### Utilities

| File | Purpose |
|------|---------|
| `utils/tableParser.ts` | `parseTable(source)` — strict GFM parse (requires separator row). `parseTableLenient(source)` — best-effort parse when separator is absent (used by the edit dialog). |
| `utils/tableSerializer.ts` | `serializeTable(data, pretty)` — produces GFM markdown. Pretty mode pads columns (max 40 chars); compact mode is minimal. |
| `utils/tableSorter.ts` | `sortRows(rows, colIdx, direction)` — numeric detection, empty cells always sort to bottom. |
| `utils/table-manipulation.ts` | Low-level line-array mutations used by the `TableCallout` quick-action buttons. |
| `utils/table-detection.ts` | `findTableAtPos(text, pos)` — locates the table block at cursor position and returns cursor row/col indices. |
