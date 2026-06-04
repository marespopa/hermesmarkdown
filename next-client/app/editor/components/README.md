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

### [WorkspaceBuilder](./WorkspaceBuilder.tsx)
The orchestrator for complex layouts, managing split panes and dynamic resizing.

## State & Data
- **Jotai Atoms**: Most components interact with shared state defined in `app/atoms/atoms.ts`.
- **File System**: Uses the native File System Access API via `useFileSystem` hooks.
