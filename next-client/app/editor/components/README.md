# Editor Components

This directory contains the core logic and UI for the HermesMarkdown editor experience.

## Key Components

### [MarkdownEditor](./MarkdownEditor.tsx)
The primary text editing surface. Handles markdown highlighting, shortcodes, and interactive elements.
- See [MarkdownEditor documentation](./MarkdownEditor.md) for details.

### [VaultSidebar](./VaultSidebar.tsx)
Manages local file system access and file navigation.
- See [VaultSidebar documentation](./VaultSidebar.md) for details.

### [DatePickerCallout](./DatePickerCallout.tsx)
Interactive calendar for selecting and inserting dates.
- See [DatePickerCallout documentation](./DatePickerCallout.md) for details.

### [TableCallout](./TableCallout.tsx)
Floating toolbar that appears above any pipe-table when the cursor is inside it.
- **Actions**: +Row, +Col, ×Row, ×Col, cycle column alignment, copy as CSV, **Edit** (opens `TableDialog`).
- Follows the same pill-container pattern as `LinkPill` — positioned with `textarea-caret`, dismissed on blur.
- Alignment cycles through `left → center → right → none` by modifying the separator row in-place.

### [TableDialog](./TableDialog.tsx)
Full visual table editor, opened via the `/table` slash command (create mode) or the **Edit** button on the `TableCallout` (edit mode).
- **Grid**: scrollable cell grid; Tab/Shift+Tab navigate between cells; adding a new row on Tab past the last cell.
- **Column headers**: click to cycle sort (asc ↑ / desc ↓ / none); sort always operates on the original unsorted snapshot.
- **Alignment**: per-column L / C / R toggle buttons embedded in the header row.
- **Add / Remove**: inline confirmation required before removing a non-empty row or column.
- **Markdown preview**: collapsible read-only preview of the serialized output.
- **Create mode**: removes the `/table` slash command text and inserts the serialized table at cursor.
- **Edit mode**: replaces only the table block in the source; surrounding content is preserved.

### [PaneLeaf](./PaneLeaf.tsx)
A container for editor panes, supporting tabbed file views and workspace layouts.
- **Save button**: writes through the live `FileSystemFileHandle`; for files whose handle was lost (e.g. after reload, before vault rebind) it walks the vault to recover the handle before falling back to the draft "save as" prompt.
- **Close Pane**: hidden when the workspace contains only one pane (the root container is a single leaf).
- **Tab context menu**: right-click any tab for `Close` / `Close Others` / `Close All` (see [TabContextMenu](./TabContextMenu.tsx)).

### [TabContextMenu](./TabContextMenu.tsx)
A cursor-anchored floating menu used by the tab strip in `PaneLeaf`. Clicking outside or pressing `Escape` dismisses it; it clamps itself back inside the viewport if positioned near the right/bottom edge.

### [WorkspaceBuilder](./WorkspaceBuilder.tsx)
The orchestrator for complex layouts, managing split panes and dynamic resizing.

## State & Data
- **Jotai Atoms**: Most components interact with shared state defined in `app/atoms/atoms.ts`.
- **File System**: Uses the native File System Access API via `useFileSystem` hooks.
