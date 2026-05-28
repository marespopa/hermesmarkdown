# Hermes Architecture

This directory contains the core logic and routing for the Hermes Markdown editor.

## Tech Stack
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: Tailwind CSS & SCSS
- **State Management**: [Jotai](https://jotai.org/) (Atoms)
- **Persistence**: IndexedDB (via `app/services/idb.ts`) for File System handles.

## Directory Structure
- `atoms/`: Global state definitions using Jotai.
- `components/`: Global UI components (Buttons, Modals, etc.).
- `editor/`: The main editor application logic and components.
- `hooks/`: Custom React hooks, notably `useFileSystem` for local file access.
- `services/`: Utility services for file conversion, storage, and specialized logic.

## Key Concepts

### File System Access
Hermes uses the modern **Browser File System Access API**. This allows the web app to interact directly with the user's local file system after receiving explicit permission.
- `useFileSystem` hook: Centralizes all logic for opening vaults, reading/writing files, and managing directory handles.
- `IndexedDB`: Used to persist the `FileSystemDirectoryHandle` so the user doesn't have to re-select the folder on every refresh (though browser security still requires a re-authorization gesture).

### State Management
State is managed via **Jotai**. Global atoms (defined in `app/atoms/atoms.ts`) track:
- Currently opened vault and directory handles.
- Active file content and metadata.
- UI preferences (theme, font size, etc.).
