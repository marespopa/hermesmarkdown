# Editable Table Preview Plan

## Problem and approach

HermesMarkdown currently renders valid inactive GFM tables as a read-only CodeMirror replacement widget. Clicking a rendered cell intentionally removes the preview and places the CodeMirror caret in the pipe-delimited source. The goal is to keep the rendered table visible and provide a live, spreadsheet-like editing experience inside that preview on desktop and mobile, while retaining source mode when the user deliberately moves the CodeMirror selection into the table.

Extend the table preview into a stateful React-backed grid. Keep inactive cells rendered with `react-markdown`, replace only the active cell with an inline Markdown text input, and dispatch every edit into the underlying CodeMirror document. Preserve the React root and active-cell focus across document transactions through `WidgetType.updateDOM`. Build structural operations around the existing parser, serializer, and CodeMirror transaction helpers so cell edits, alignment changes, row/column insertion or removal, and row/column reordering remain undoable and always produce valid GFM.

## Todos

### 1. Add index-aware table mutation primitives

- Extend the table utility layer with pure operations for:
  - updating a specific header or body cell;
  - adding and removing rows or columns at explicit preview-grid indices;
  - moving rows and columns in either direction while keeping column alignments attached to their columns;
  - cycling an explicitly selected column's alignment;
  - detecting whether a row or column contains content before destructive removal.
- Preserve escaped pipes and inline Markdown. Normalize pasted line breaks to spaces and escape unescaped `|` characters so live edits cannot invalidate the table structure.
- Serialize structural changes through the existing `TableData`/`serializeTable` path and apply them as one CodeMirror transaction with a table-specific user event, preserving undo/redo behavior.
- Add utility and command tests for boundary cases, alignment preservation, escaped pipes, populated-removal detection, and row/column moves.

### 2. Convert the preview widget into a persistent editable grid

- Extract the growing React UI from `app/editor/codemirror/table-display.tsx` into a focused editable-table-preview component/module so files remain below the repository's maintainability threshold.
- Keep the current syntax-tree validation and malformed/fenced-table exclusions.
- Add `TableDisplayWidget.updateDOM` support that transfers/reuses the existing React root and rerenders with the latest table match after live document edits. This must preserve the active cell, input selection, and focus instead of destroying the widget on every keystroke.
- Stop preview-cell clicks from moving the CodeMirror selection into the table. Track the active preview cell inside the grid while leaving CodeMirror's selection outside the replaced range; continue revealing raw pipe source when the user enters the table through normal source navigation.
- Render inactive cells as Markdown and the active cell as the shared `Input` component containing that cell's Markdown source. Dispatch cell replacements on every input event so the editor value, autosave path, and undo history update live.
- Implement spreadsheet navigation:
  - Tab/Shift+Tab move horizontally and wrap across rows;
  - Enter/Shift+Enter move vertically;
  - moving beyond the final cell appends a row and focuses the corresponding new cell;
  - Escape exits preview-cell editing while retaining the live changes.
- Ensure links and other rendered content do not navigate when the interaction is intended to activate the cell.

### 3. Add structural controls, reordering, and mobile behavior

- Add accessible row and column affordances around the rendered grid using existing `Button` primitives:
  - add/remove row and column controls;
  - per-column alignment cycling;
  - pointer/touch drag handles for row and column reordering;
  - keyboard-accessible move up/down/left/right controls as the non-drag alternative.
- Keep the header row fixed as the table header; reorder only body rows. Column moves must reorder headers, every body row, and the corresponding alignment together.
- Require inline confirmation before removing a populated row or column; remove empty rows/columns immediately. Keep at least one column and preserve a valid header/separator structure.
- Use Pointer Events and explicit drag state so the same reorder path works with mouse, pen, and touch. Retain horizontal scrolling for wide tables and provide touch-sized controls without blocking cell editing or editor scrolling.
- Update `editor.scss` for active-cell, focus, drag-target, control, confirmation, and responsive states while preserving the current quiet preview styling.
- Keep the existing source-mode `TableCallout` and keyboard commands functional as the fallback when raw Markdown is visible; remove or repurpose the currently inert mobile `Edit` callback if the inline preview makes it obsolete.

### 4. Verify behavior and update documentation

- Expand `table-display.test.tsx` with behavior-driven coverage for:
  - activating a cell without revealing pipe source;
  - live document updates and rerendered Markdown;
  - focus preservation across transactions;
  - Tab/Enter/Shift navigation, row creation at the boundary, and Escape;
  - add/remove/alignment actions and populated-removal confirmation;
  - mouse/touch reordering plus keyboard-accessible move controls;
  - escaped pipes, tables without outer pipes, multiple tables, and malformed/fenced blocks;
  - source-mode fallback when the CodeMirror selection enters a table.
- Update the editor/component README table-flow sections to describe editable previews, source-mode fallback, keyboard controls, drag/touch behavior, and the transaction/updateDOM architecture; remove stale references to the absent `TableDialog` edit flow.
- Run focused table utility, command, and display tests from `next-client` with Corepack, then run TypeScript and ESLint checks. Read relevant local Next.js documentation first if implementation touches framework APIs; this design is currently limited to client-side React and CodeMirror APIs.

## Notes and decisions

- Cell editing is inline Markdown, not rich-text WYSIWYG: inactive cells render formatting, while the active cell exposes its Markdown source.
- Updates are live on every input event.
- Both drag handles and explicit move controls are required for reordering.
- Enter is vertical navigation and Tab is horizontal navigation; navigation beyond the final cell creates a row.
- Escape exits the active cell and keeps changes.
- Removing populated rows or columns requires confirmation.
- Desktop and mobile/touch behavior are both in scope.
- The preview does not replace source editing entirely. Moving CodeMirror's own selection into a table must continue to reveal the raw Markdown as an escape hatch.
