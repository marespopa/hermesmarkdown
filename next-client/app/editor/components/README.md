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
