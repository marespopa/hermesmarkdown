# SidebarFiles

Description: The vault's file tree in the sidebar (`VaultFileTree`, tree view, one click to open, drag to move, F2 — Return on macOS — to rename, right-click for actions), with the shared create actions in its **Files** ⋯ menu (New File / New Folder at the vault's root, named in place through the tree's controller). A note's or folder's right-click menu has **Pin** / **Unpin** (`usePins`), which adds it to or removes it from the vault's pins, listed in the sidebar's Pinned section (`SidebarPinned`); pinned notes are no longer listed here. On startup, until the vault's walk has listed every file, the tree shows the vault as last seen (`useVaultFileSearch` with `rememberedTree`, `atom_vaultTreeSnapshot`): rows found so far take their place, nothing reorders, and rows gone from the vault drop out quietly when the walk is done. Such a row has no handle yet, so a click opens it by path (`useOpenSnapshotRow`); a file that's gone shows a toast and its row goes away. Above the tree, a **Search** field

Images (.png, .svg) are not filtered out, so sidebar files list all image types (`BareInput` in the app's field style at the sidebar size, `FIELD_SIDEBAR_CLASS`: 28px like the sidebar's rows, with a search icon; placeholder "Search", label "Search files") narrows it to the files whose vault path matches a regular expression, ignoring case (`files-filter.ts`: `compileFilesFilter`, `filterVault`); the folders around the matches stay listed and all open (`expandAll`), without touching the remembered expansion. Text that isn't a valid pattern is matched as typed and the box is marked `aria-invalid`. **Escape** clears it (a second Escape reaches the sidebar and hides it); **↓** or **Enter** moves into the tree. With no match the tree says "No file found". The tree follows the Search field through `useDeferredValue`, so each keystroke shows at once and the filtered tree renders behind it; a long tree renders only the rows in view (`vault-tree/use-virtual-tree.ts`).

## Local State & Storage
- State: the search text.
- Persistence: None.

## Dependencies
- Core: `VaultFileTree`, `fileCreateActions`, `SidebarSection`, `BareInput`, `files-filter.ts`, `useFileSystem`, `usePins`.
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

The tree always gets `newFromFolderTemplate` (from `useFileSystem`; the built-in folder templates need nothing in the vault), which adds "New from Folder Template…" to the folder and empty-space menus (long-press on mobile).
