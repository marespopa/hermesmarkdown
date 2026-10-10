# VaultFileTree

Description: The vault's file tree (sidebar, Explorer, mobile overlay) or, without `treeView`, a virtualized flat result list. In tree mode it behaves like a Finder list: click / ⌘-or-Ctrl-click / Shift-click selection, keyboard control, right-click menus, renaming and creating in place, Delete to the Trash with Undo, and drag-and-drop moves of one item or the whole selection (mouse, or long-press on touch screens via `useTouchTreeDrag`, which shows a floating label under the finger).

## Interaction (tree mode)
- **Select:** click selects one row; ⌘/Ctrl-click adds or removes; Shift-click selects the range from the last plain click. Clicking empty space clears it. Selected rows are accent-tinted while the tree has focus, gray otherwise. A modified click never opens or toggles.
- **Keyboard** (the tree is focusable, `role="tree"`): ↑/↓ move (⇧ extends), → opens a folder / steps in, ← closes / steps out, Return renames on Mac (F2 everywhere; Enter opens on Windows/Linux), ⌘O or ⌘↓ opens, ⌘⌫ (Delete elsewhere) moves the selection to the Trash, ⌘Z / Ctrl+Z undoes the last rename / move / move to Trash, ⌘A selects all, Esc clears. See `vault-tree/tree-keyboard.ts`.
- **Opening a file** from anywhere (palette, link, tab) selects its row and moves the keyboard cursor there, as in a code editor's explorer, once its folders are open. It happens once per change of active file, so a selection made afterwards stands while that file stays open.
- **Menus:** right-click a row (or its ⋯ button) for its menu; right-clicking a row outside the selection selects it first, and with several rows selected the menu acts on all of them ("Move 3 Items to Trash"). Right-clicking empty space offers New Note / New Folder at the root. One `TreeContextMenu` serves them all (`vault-tree/tree-menu-items.tsx`).
- **In place:** Rename and New Note / New Folder show an `InlineNameField` in the row (new items as a pending row first in their folder, prefilled "Untitled" / "untitled folder"); Return or clicking away commits, Esc cancels. The flat list has no field, so its Rename uses the name prompt.
- **Reveal:** after a rename, create or move, the resulting rows are selected and scrolled into view once they appear (their folders are opened).

## Local State & Storage
- State: `atom_indexerState`. Folder expansion comes from `useFolderExpansion` (collapsed by default, ancestors of the active file open automatically, manual toggles override). Selection (`useTreeSelection`), inline editing, the open menu and pending reveals (`useTreeActions`), the dragged entry and drop highlights are local. Flat-list rows are virtualized with `useVirtualizer`. The active file is scrolled into view once each time it changes (or when it first appears while the vault is still scanning), never on a plain list refresh.
- Persistence: Manual folder expand/collapse overrides are kept per vault in `atom_fileTreeExpansion` (`localStorage["hermes_file_tree_expansion"]`). File operations run against local handles through the passed callbacks.

## Dependencies
- Core: `@tanstack/react-virtual`, and the rows, model and hooks in [`vault-tree/`](vault-tree/README.md).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import VaultFileTree from "./VaultFileTree";

const tree = useRef<VaultFileTreeController | null>(null);
<VaultFileTree processedFiles={files} activeFilePath={path} openFile={open}
  renameFile={rename} deleteFile={remove} trashItems={trash} undoFileOperation={undo}
  treeView folderPaths={folders} controllerRef={tree} />
// tree.current?.startCreate("folder") — name a new folder in place
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| processedFiles | `any[]` |  | File entries to render |
| activeFilePath | `string \| null` |  | Highlighted file |
| openFile / openFileInPane? | `(handle, path?) => void` |  | Open actions |
| renameFile | `(handle, newName?, path?) => unknown` |  | Renames (resolving to the new path); called with the typed name from the inline field |
| deleteFile / trashItems? | callbacks |  | Move to Trash: `trashItems` takes the whole selection as one action; without it, `deleteFile` per item |
| duplicateFile? | `(handle) => void` |  | Menu action |
| undoFileOperation? | `() => unknown` |  | ⌘Z / Ctrl+Z in the tree |
| controllerRef? | `MutableRefObject<VaultFileTreeController \| null>` |  | Lets the host start naming a new note / folder in place (`startCreate(kind, parentPath?)`; without a parent, in the selected folder) |
| treeView? | `boolean` | `false` | Tree layout instead of a flat list |
| columns? | `boolean` | `false` | Tree only: Finder-like list view with a sticky Name / Date Modified / Kind header (Explorer page) |
| folderPaths? | `string[]` | `[]` | Folders to include in the tree, so empty ones show (from `useVaultFileSearch`: the indexing walk's folders at every depth plus the latest listing) |
| isSearchActive? / highlightQuery? | `boolean` / `string` | `false` / `""` | Search mode |
| resolveFolderHandle? / createNewFile? / createFolder? | callbacks |  | Folder operations; `createNewFile(dir, name)` / `createFolder(dir, name)` with a name don't prompt |
| moveItem? / moveItems? | callbacks |  | Drop moves: one item through `moveItem`, a dragged selection through `moveItems` (one toast, one Undo) |
| onClose? | `() => void` |  | Closes the drawer after opening a file |
| singleClickOpen? | `boolean` | `false` | Open files on a plain single click (sidebar); otherwise double-click opens |
