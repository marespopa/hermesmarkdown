# VaultSidebar

The `VaultSidebar` is the primary file navigation component, responsible for managing the local File System Access API integration.

## Responsibility

- **File Tree Rendering**: Recursively displays the contents of the opened local directory ("Vault").
- **File System Operations**: Handles creating, renaming, moving, and deleting files and folders.
- **Search & Filtering**: Provides a real-time search interface to filter files by name.
- **Recent Files**: Displays a list of recently accessed files for quick navigation.
- **Drag & Drop**: Supports moving files/folders via native drag-and-drop interactions.

## Technical Notes

- **File System Access API**: Interacts directly with the user's local disk via `window.showDirectoryPicker`.
- **Handle Management**: Stores `FileSystemHandle` objects to maintain persistent access during the session.
- **Safety**: Includes built-in protection against modifying system files or critical project configuration.
