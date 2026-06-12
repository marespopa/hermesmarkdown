# HermesMarkdown Architecture

This directory contains the core logic and routing for the HermesMarkdown Markdown editor.

## Tech Stack
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: Tailwind CSS & SCSS
- **State Management**: [Jotai](https://jotai.org/) (Atoms)
- **Persistence**: IndexedDB (via `app/services/idb.ts`) for File System handles.

## Development Guidelines

### Component Usage
- **Always use existing components**: When modifying or adding UI, always prioritize using established components from `app/components/` (e.g., `Button`, `Input`). Do not use raw HTML tags or custom styled divs for elements that already have a dedicated component.
- **Consistency**: Ensure consistent use of component variants (e.g., `primary` for main actions, `secondary` for cancellations or dismissals).

## Directory Structure
- `atoms/`: Global state definitions using Jotai.
- `components/`: Global UI components (Buttons, Modals, etc.).
- `editor/`: The main editor application logic and components.
- `hooks/`: Custom React hooks, notably `useFileSystem` for local file access.
- `services/`: Utility services for file conversion, storage, and specialized logic.

## Key Concepts

### Workspace Layout (Obsidian UX)
HermesMarkdown follows an Obsidian-inspired layout:
- **Left Ribbon**: A thin vertical action bar on the far left for global actions (Home, Settings, Vault Toggle, New File).
- **Sidebar**: A collapsible file explorer and tag browser.
- **Main Workspace**: A flush, multi-pane area powered by `react-resizable-panels`.
- **Responsive Design**: The Ribbon and Sidebar are hidden on mobile, accessible via an off-canvas overlay.

### Local vs Drive Vault Parity

The app supports two vault backends: the browser **File System Access API** (local) and **Google Drive**. Each backend has its own set of hooks under `hooks/file-system/` and `hooks/drive/` respectively, unified by `hooks/use-file-system.ts`.

**Rule: any feature added to one backend must be mirrored in the other.** Common areas where parity must be maintained:

- Vault open/restore lifecycle (`use-vault-manager.ts` ↔ `use-drive-vault-manager.ts`)
- File CRUD operations (`use-file-crud.ts` ↔ `use-drive-file-crud.ts`)
- File save logic (`use-save-file.ts` ↔ `use-drive-save-file.ts`)

If a backend doesn't support a feature natively (e.g. `DriveDirectoryHandle` lacks `getDirectoryHandle`), provide a Drive-specific implementation in `services/drive/` rather than skipping the feature.

### File System Access
HermesMarkdown uses the modern **Browser File System Access API**.

### State Management
State is managed via **Jotai**. Global atoms (defined in `app/atoms/atoms.ts`) track:
- Currently opened vault and directory handles.
- Active file content and metadata.
- UI preferences (theme, font size, etc.).
