# Editor Component Architecture

The editor is the primary workspace of HermesMarkdown, located in `app/editor`.

## Components

### `VaultSidebar`
The sidebar manages navigation within the opened "Vault" (local directory).
- **Navigation**: Uses `navigateTo` and `navigateBack` from `useFileSystem` to traverse folder structures.
- **Actions**: Provides UI for creating new files and folders, renaming, and deleting entries.
- **Smart Filters**: Automatically extracts and displays tags (hashtags) found within markdown files in the vault.

### `MarkdownEditor`
The core editor component (typically a wrapper around a text area or a specialized editor library).
- Synchronizes content with the `atom_content` Jotai atom.
- Handles auto-saving when integrated with `useFileSystem`.

## Interactions

1. **Opening a File**: When a user clicks a file in the `VaultSidebar`, it calls `openFile` from `useFileSystem`. This reads the file content, sets the `atom_content`, and updates the `atom_activeFileHandle`.
2. **Editing**: As the user types in `MarkdownEditor`, the `atom_content` is updated.
3. **Saving**: Saving can be manual or automatic. It uses the `atom_activeFileHandle` to write the current `atom_content` back to the local disk.
4. **File Synchronization**: When the window regains focus, HermesMarkdown checks if the active file has been modified externally.
    - **Auto-Sync**: If no local changes exist, it automatically reloads the new content from disk.
    - **Conflict Resolution**: If local changes exist and the file was modified externally, a **Conflict Dialog** appears, allowing the user to either "Reload External Changes" or "Keep Local Edits".
5. **Folder Management**: Creating a folder in the sidebar uses `targetDir.getDirectoryHandle(name, { create: true })` and refreshes the directory listing.
