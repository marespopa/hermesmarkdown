# SidebarFiles

Description: The vault's file tree in the sidebar (`VaultFileTree`, tree view, one click to open, drag to move, F2 — Return on macOS — to rename, right-click for actions), with the shared create actions in its **Files** ⋯ menu (New Note / New Folder at the vault's root, named in place through the tree's controller).

## Local State & Storage
- State: None.
- Persistence: None.

## Dependencies
- Core: `VaultFileTree`, `fileCreateActions`, `SidebarSection`, `useFileSystem`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<SidebarFiles treeController={treeController} activeFilePath={currentPath} openHandle={navigation.openHandle} allFiles={allFiles} folderPaths={folderPaths} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| treeController | `MutableRefObject<VaultFileTreeController \| null>` | | Focus and create in place |
| activeFilePath | `string \| null` | | Highlighted row |
| openHandle | `(handle, path?) => void` | | Opens a row |
| allFiles / folderPaths |  | | The tree |
