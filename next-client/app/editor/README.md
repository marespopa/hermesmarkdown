# Editor Component Architecture

The editor is the primary workspace of HermesMarkdown, located in `app/editor`.

## Core Editor

### `MarkdownEditor`
The app's current editor is built on CodeMirror 6, with the source-mode implementation in `app/editor/codemirror` and the feature overlays in `app/editor/hooks`.
- Synchronizes content with the active file and frontmatter handling for document metadata.
- Supports slash commands, wiki links, date pickers, tables, and workflow/todo pills.
- Renders Mermaid fences and display math (`$$ … $$`, ```` ```math ````) in place of their source; double-click one to edit it.
- Inline calculator: math lines show their result at the end of the line (see [Inline calculator](#inline-calculator)).

### File navigation
Vault files are browsed through the command palette (`Ctrl/Cmd+K`), the Files page (`/editor/files`, "Open Explorer"), and the mobile `MobileFileOverlay`. The latter two use the `VaultFileTree` tree and tag search.
- **Actions**: Create, rename, move, duplicate, and delete files and folders through `useFileSystem`.
- **Tags**: Tags extracted from notes are searchable with the `#` palette prefix.

### Tasks page
The Tasks page (`app/editor/tasks`) is a vault-wide view over the derived task index.
- **Navigation**: Selecting a task opens its source file and queues the editor to focus its source line.
- **Filtering and grouping**: Task text, custom tags, due-date buckets, status/file grouping, and configurable sorting are client-side derived state.
- **Write-back**: Toggling a checkbox patches the original Markdown source line and saves it through the normal file-save path, which refreshes the task index.

## Editor page hooks (`app/editor/hooks`)

The editor route (`page.tsx`) composes these:

| Hook | Purpose |
|------|---------|
| `use-editor-shortcuts.ts` | Window-level shortcuts: Explorer, search (`Ctrl/Cmd+Shift+F` opens the palette in the `/` note-text scope), new file, close/select tab, AI chat, voice, save, undo flush. |
| `use-navigate-with-guard.ts` | Leaves the editor with a Save / Discard prompt when the note is dirty. |
| `use-github-vault-actions.ts` | `GitHub: Commit / Pull` command handlers. |
| `use-generate-ai-note.ts` | "Generate new note with AI". |
| `use-draft-import.ts` | Import a file into the draft (with `DraftImportDialog` for overwrite confirmation). |
| `use-sync-current-directory.ts` | Points the vault's current directory at the active file's folder. |
| `use-editor-paste-handlers.ts`, `use-scroll-to-pending-target.ts` | `MarkdownEditor` helpers: CSV-to-table confirm and image saving on paste; jump-to-line requests (`atom_pendingScrollTarget`; the caret goes to the optional `column`). |
| `use-tab-drag-drop.ts` | Tab drag-and-drop between panes (`PaneLeaf`). |
| `useAIEditorActions.ts` + `ai-action-prompts.ts` | AI Chat state and the one-click AI actions (prompt table keyed by action id). |

## Interactions

1. **Opening a File**: When a user opens a file from the command palette or the file overlay, it calls `openFile` from `useFileSystem`. This reads the file content, sets the document content, and updates the active file handle.
2. **Editing**: As the user types in the editor, the document state is updated in real time.
3. **Saving**: Saving can be manual or automatic. It uses the active file handle to write the current content back to the local disk.
4. **File Synchronization** (`app/hooks/use-file-watcher.ts`): HermesMarkdown picks up external modifications to open files almost immediately in browsers with `FileSystemObserver` (Chromium), and otherwise polls for them (with backoff up to 5 minutes, and immediately when the window regains focus).
    - **Auto-Sync**: If no local changes exist, it automatically reloads the new content from disk.
    - **Conflict Resolution**: If local changes exist and the file was modified externally, a **Conflict Dialog** appears with **Accept Incoming** (reload from disk), **Keep Current** (overwrite on next save), or **Resolve in Merge Editor** (current, incoming and merged result side by side).
5. **Folder Management**: Creating a folder uses `targetDir.getDirectoryHandle(name, { create: true })` and refreshes the directory listing.

## Flow mode

`codemirror/flow-mode.ts` is an opt-in writing mode (Settings → Editor, or **Enable flow mode** in the command palette), stored in `atom_flowMode` and toggled through a CodeMirror compartment.

1. **Paragraph focus**: a view plugin marks the lines of the caret's paragraph (the run of non-blank lines around it) with `cm-flowActive`. While the editor has focus, every other line and block widget fades to 25% opacity. On blur the whole note returns to full strength.
2. **Typewriter scrolling**: a transaction extender adds a centered `scrollIntoView` effect to typing, deletion, undo/redo and keyboard caret movement. Pointer selections and external reloads never scroll. The content gets extra bottom padding so the last line can still reach the center.

Neither part touches the document. The Markdown on disk is unchanged.

## Inline calculator

Math typed on its own line gets a faint `= result` label at the end of the line: `rent = 1200`, `utilities = 180`, then `rent + utilities` shows `= 1380`. Labels are display-only widgets. The plugin never dispatches, so the file, undo history and dirty state are untouched. They show in Edit and Preview.

- **Files**: `utils/math-eval.ts` (shared safe evaluator: `evaluateMathExpression` with names, `%`, `of` and `1,234` options; `evaluateMath` for `calc(…)=` is unchanged), `utils/note-calc-scan.ts` (line scanner and cache, pure), `codemirror/note-calc.ts` (widget, view plugin and `baseTheme`, registered in `extensions.ts`).
- **Skipped lines**: frontmatter (line 1 `---` to the next `---`), fenced code (backtick or tilde; closed by the same character with at least the opener's length; unterminated fences run to the end), `$$` blocks and single-line `$$ … $$`, blank lines and headings. Skipped lines never get a label or define a variable. An unclosed bare `$$` hides labels for the rest of the note. The scanner can't look ahead, so this differs from `rendered-block.ts`, which doesn't render an unclosed `$$`.
- **Assignment**: `name = expression`, where `name` is one or more words (case-insensitive, `of` reserved). Only a standalone `=` counts, so `==`, `>=`, `<=` and `!=` are never assignments. An invalid right-hand side makes the name undefined from that line on. Reassignment can read the old value (`rent = rent + 100`).
- **Expressions**: `+ - * /`, parentheses, names, `450 + 15%` (relative to the left side), `15% of 200`, and other `%` as a plain fraction. Tabs count as spaces between tokens (`calc(…)=` still accepts spaces only). One leading list marker is stripped. A line that fails to evaluate gets no label.
- **No label** for bare literals (`1200`, `rent = 1200`, `tax = 15%`) or date/phone-like runs (`2026-10-01`, `555-1234`). Results are rounded to 4 decimals with no grouping.
- **AI**: `NOTE_CALC_GUIDE` (`utils/formula-ai-guide.ts`) teaches the chat, Continue writing and new-note generation to write calculator lines instead of computed numbers; `FORMULA_PRESERVATION_RULE` tells every rewrite action to keep them as written. Update the guide when the line rules change.
- **Incremental cache**: `NoteCalcCache` keeps the state after each line (open block, scope as an immutable linked chain). An edit drops entries from its first changed line down. Scanning only goes as far as the last line of `view.visibleRanges`, and labels are built only for visible lines, so variables defined above the viewport still resolve. Each `EditorView` has its own cache.

## Preview mode

The editor is either in **Edit** or **Preview**. Preview is a read-only reading view. The mode is app-wide: one `atom_viewMode` (`localStorage["viewMode"]`) applies to every pane and tab and survives a reload. You switch it with `PaneModeSwitch` in the top-right pane's header or the mobile bar, Ctrl/Cmd+Alt+P (`hooks/use-editor-shortcuts.ts`), or **Open in preview / Back to editing** in the command palette. Double-clicking the text in Preview also switches back to Edit, with the caret where you clicked (`use-codemirror-editor.ts` listens in the capture phase, so tables and rendered blocks count too; checkboxes and links don't).

Preview isn't a second renderer. It's the same `EditorView`, reconfigured through a compartment (`codemirror/preview-mode.ts`, toggled in `hooks/use-codemirror-editor.ts`):

1. **Read-only**: `EditorState.readOnly`, `editable: false`, and a transaction filter that only lets external reloads (`input.external`) and checkbox toggles (`input.format.checkbox`) change the document. That also stops commands that dispatch changes directly, like table shortcuts.
2. **Hidden syntax**: a `StateField` hides heading, emphasis, inline-code, strikethrough and quote markers, collapses code fences (code lines get a card style), draws bullets for unordered list markers, and replaces task markers with checkboxes that still toggle. Tables, Mermaid/math, links and tags already render inline. Frontmatter is left as is.
3. **Other layers**: they read `previewModeFacet` (`codemirror/preview-facet.ts`). Link and annotation widgets never reveal their source under the selection, and a plain click follows a link. Horizontal rules stay drawn. Tables render without editable cells or menus. Rendered blocks don't open the source dialog. Edit pills, the AI and mobile selection toolbars are hidden. Vim and flow mode are turned off while previewing.
4. **Switching**: the line at the top of the viewport stays in place, the scroller dips in opacity for 180 ms (skipped under reduced motion), and leaving preview puts the caret on that line.

## Rendered blocks (Mermaid and math)

`codemirror/rendered-block.ts` works like the table grid. A `StateField` finds closed top-level ```` ```mermaid ```` fences, ```` ```math ```` / `latex` / `tex` fences, and `$$` blocks outside code (either `$$` on its own lines or `$$ … $$` on one line). It replaces each one with a block widget showing the rendered diagram or formula. The ranges are atomic, so the caret moves past a preview in one step.

1. **Rendering**: `utils/rendered-block-cache.ts` loads `mermaid` (`utils/render-mermaid.ts`, `securityLevel: "strict"`) or KaTeX (`utils/render-math.ts`) on first use and caches results and measured heights by kind + theme + source. Widgets only re-render when their source or the app theme changes, so edits elsewhere in the note leave them alone. Invalid source shows the error and the raw source instead.
2. **Editing**: double-clicking a preview, its **Edit** button (always visible on touch screens), or Ctrl/Cmd+Shift+Enter with the caret beside it opens `RenderedBlockSourceDialog`. The dialog has a live preview. **Save** (or Ctrl/Cmd+Enter) writes the new body with `applyRenderedBlockEdit` as a single undoable change. Inserting an empty block from the slash menu opens the dialog straight away, since the caret would otherwise land inside a hidden range.
3. **Viewer**: for Mermaid, **Open viewer** in the dialog opens `MermaidDialog` (zoom, pan, SVG download).

## Table Flow

Tables never show their pipe syntax. Every valid GFM table renders as an
inline, spreadsheet-style grid whose cells are edited in place, while the
Markdown source stays the single source of truth.

### Inline grid (`codemirror/table-display.tsx`)

1. **Detection**: a `StateField` walks the Lezer syntax tree for `Table` nodes (so pipes in code blocks are never tables) and replaces each with a block widget. Tables are atomic ranges; when the editor caret arrives at one (arrow keys, undo), focus hands off to the nearest cell (first cell from above, last from below).
2. **Editing**: each cell is its own `contenteditable`. Unfocused cells show rendered inline Markdown (`utils/inline-markdown.ts`); the focused cell shows its raw text (`**bold**`, links…). Every keystroke is written back as a minimal change to that cell's source range. Undo/redo, autosave and split panes always see the table as displayed. Typed pipes are stored escaped (`\|`).
3. **Keyboard**: Tab / Shift+Tab move between cells, and Tab in the last cell adds a row. Enter moves down, adding a row at the bottom. The arrow keys cross cell edges and leave the table at its borders. Escape leaves the table. Alt+↑/↓ move the row, Ctrl/Cmd+Alt+←/→ move the column, Ctrl/Cmd+Enter inserts a row below, Ctrl/Cmd+Shift+Backspace deletes the row, and Ctrl/Cmd+B / I / E wrap the selection in bold / italic / code.
4. **Paste**: plain text pastes into the cell. TSV (from a spreadsheet) or multi-line CSV fills cells starting at the focused cell, growing the table as needed.
5. **Source hygiene**: when the caret leaves a table, its column padding is realigned (`hooks/use-codemirror-table.ts`). Tables written without outer pipes get them on first edit. Both are kept out of undo history because nothing visible changes. They're applied as minimal padding-only changes (`paddingChanges`), never as one whole-table replacement: earlier undo events are mapped through such changes, and a whole-table rewrite would silently invalidate every earlier cell edit.

### Table menu (`codemirror/table-handles.ts`)

Nothing is drawn on top of the cells. Table actions live in one menu with **Row** (insert above/below, move, delete), **Column** (insert left/right, move, sort, align, delete) and **Table** (copy as CSV / JSON, delete with a confirming second click) sections. Open it either way:

- **Right-click / long-press** a cell. The menu opens at the pointer.
- **Row numbers and column letters**: while a table is being edited, spreadsheet-style rulers appear in gutters reserved above and left of it (A, B, C… / 1, 2, 3…, matching formula addressing). Clicking one opens the menu for that column or row.

All structural edits go through `codemirror/table-commands.ts` as one isolated undo step each. That module holds the keyboard commands and re-exports the shared primitives in `table-edit.ts` and the menu actions in `table-menu-actions.ts`. The widget itself is split into `table-display.tsx` (state field, widget, caret entry), `table-cell-dom.ts` (rendering, caret offsets) and `table-cell-handlers.ts` (cell events, menus, rulers).

### Formulas (`utils/formula-engine.ts`, `codemirror/table-formulas.ts`)

A cell starting with `=` is a formula (`=SUM(B2:B5)`, `=AVERAGE(B2:D2)`, `=IF(...)`, …; A1 refs with the header as row 1). While the table display field builds the grid, it evaluates every table in one pass. Tables are named by the heading above them, so cross-table refs (`=SUM(Income!B)`) resolve. Unfocused formula cells show the computed value (raw formula as tooltip); the focused cell shows the formula. Cross-note refs (`=[[Budget]]!B5`) come from `hooks/use-cross-file-tables.ts`, which reads the referenced notes asynchronously and pushes a snapshot into the editor via the `setFormulaFileTables` effect. **Sum column** in the table menu writes `=SUM(...)` into a totals row: the last row, if it holds an aggregate (SUM/AVERAGE/COUNT/MIN/MAX), else a new one. Rows added at the end go above the totals row and extend its ranges. A range that covers the formula's own cell skips that cell rather than reporting `#CIRCULAR!`.

### Utilities

| File | Purpose |
|------|---------|
| `utils/tableParser.ts` | `parseTable(source)` — strict GFM parse (requires separator row). `parseTableLenient(source)` — best-effort parse when separator is absent. |
| `utils/tableSerializer.ts` | `serializeTable(data, pretty)` — produces GFM markdown. Pretty mode pads columns (max 40 chars); compact mode is minimal. |
| `utils/tableSorter.ts` | `sortRows(rows, colIdx, direction)` — detects number (currency stripped), date, or string columns; empty cells always sort to bottom; formula/summary rows stay in place. |
| `utils/table-manipulation.ts` | Line-array and `TableData` mutations (add/remove/move rows and columns, CSV/JSON export, delimited-text parsing) used by the table commands. |
| `utils/inline-markdown.ts` | Escaped inline-Markdown → HTML renderer for unfocused grid cells. |
| `utils/table-detection.ts` | `findTableAtPos(text, pos)` — locates the table block at cursor position and returns cursor row/col indices; `findAllTables(text)` and `isTableLine(line)`. |
| `utils/table-cell-offsets.ts` | Maps each cell to its absolute character range in the document (trimmed content and full pipe-to-pipe segment). |
| `utils/formula-engine.ts` | Table evaluation entry point (`evaluateTable`, cross-table and cross-note refs); re-exports the stages in `utils/formula/`: `values` (errors, coercion), `addressing` (A1 refs), `currency`, `parser` (tokenizer + AST), `functions` (SUM, IF, …), `results` (formatting). |
| `utils/formula-ai-guide.ts` | `TABLE_FORMULA_GUIDE` and `FORMULA_PRESERVATION_RULE` prompt text for AI features, generated from the engine's function list, plus `NOTE_CALC_GUIDE` (inline calculator; its worked example `NOTE_CALC_EXAMPLE` is checked against the scanner in tests). |
| `codemirror/table-focus.ts` | Shared cell-focus helpers used by both the table widget and the table commands (avoids a circular import). |
