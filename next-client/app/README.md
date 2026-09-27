# HermesMarkdown Architecture

This directory contains the core logic and routing for the HermesMarkdown Markdown editor. See [../ARCHITECTURE.md](../ARCHITECTURE.md) for the runtime data flow.

## Tech Stack
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Editor**: CodeMirror 6
- **Styling**: Tailwind CSS backed by CSS-variable tokens (see [../DESIGN.md](../DESIGN.md)), plus SCSS for globals and the editor
- **State Management**: [Jotai](https://jotai.org/) (Atoms)
- **Persistence**: IndexedDB (via `app/services/idb.ts`) for File System handles and the GitHub vault descriptor/manifest; `localStorage` for settings.

## Development Guidelines

### Component Usage
- **Always use existing components**: When modifying or adding UI, always prioritize using established components from `app/components/` (e.g., `Button`, `Input`). Do not use raw HTML tags or custom styled divs for elements that already have a dedicated component.
- **Consistency**: Ensure consistent use of component variants (e.g., `primary` for main actions, `secondary` for cancellations or dismissals).

## Directory Structure
- `api/`: Server routes — `ai/` (AI provider proxy) and `github/` (OAuth and GitHub vault sync).
- `atoms/`: Global state definitions using Jotai.
- `components/`: Global UI components (Buttons, Modals, Command Palette, etc.).
- `editor/`: The main editor application: CodeMirror extensions, components, hooks, settings, Explorer (`files/`) and Tasks (`tasks/`) pages.
- `hooks/`: Custom React hooks, notably `useFileSystem` for local file access.
- `services/`: AI, GitHub vault, and IndexedDB services.
- `utils/`: Shared helpers (frontmatter parsing, task extraction, workspace queries, image paste, platform detection).
- `workers/`: Web worker that indexes vault metadata off the main thread.
- `types/`: Shared TypeScript types.
- `documentation/`, `markdown-editor/`, `what-is-hermes-md/`, `privacy-policy/`, `terms/`, `contact/`: Public site pages.

## Key Concepts

### Workspace Layout
- **Main Workspace**: A flush, multi-pane area with tabs; panes split and resize via `react-resizable-panels` (`editor/components/WorkspaceSplitter.tsx`).
- **Explorer and Tasks**: Dedicated full views at `/editor/files` and `/editor/tasks`, opened from the command palette or `Ctrl/Cmd+Shift+E`.
- **Command palette**: The primary navigation surface — quick switcher, commands, tags, tasks, and headings.
- **Mobile**: Below 768px, the tab bar is replaced by a fixed file indicator bar and full-screen overlays (`MobileFileOverlay`).

### Vault Backend

The app uses the browser **File System Access API** for local vaults, with hooks under `hooks/file-system/`, unified by `hooks/use-file-system.ts`. GitHub-backed vaults use the Origin Private File System with the same hooks.

### State Management
State is managed via **Jotai**. Atoms (re-exported from `app/atoms/atoms.ts`; see `app/atoms/README.md`) track:
- Currently opened vault and directory handles.
- Open files, active file content, and the metadata index.
- Workspace panes and tabs.
- UI preferences (theme, font, autosave, AI provider, etc.).
