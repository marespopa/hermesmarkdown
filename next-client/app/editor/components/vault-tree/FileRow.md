# FileRow

Description: A single file row in the vault tree — file name with search highlighting, optional parent-folder line, tree gutter lines, a row action menu (open in pane, rename, duplicate, delete), and drag-to-move support. Also exports `TreeGutter`, the connector lines drawn left of nested rows.

## Local State & Storage
- State: Inline-rename draft and menu positioning are local; the open action menu is owned by the parent (`actionMenuOpen`).
- Persistence: None - transient UI state.

## Dependencies
- Core: `Button`, `react-icons`, `tree-model.ts` (`getEntryPath`).
- Zero-Cloud: No network or telemetry side effects. File operations run through the passed callbacks.

## Quick Usage
```tsx
import { FileRow } from "./vault-tree/FileRow";

<FileRow entry={entry} entryId={id} isActive={false} highlightQuery="" actionMenuOpen={null}
  setActionMenuOpen={setMenu} openFile={openFile} renameFile={rename} deleteFile={remove} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| entry / entryPath? / entryId | `any` / `string` / `string` | | File entry and its identity |
| isActive | `boolean` | | Highlights the open file |
| highlightQuery | `string` | | Search text to highlight |
| actionMenuOpen / setActionMenuOpen | menu state | | Shared row action menu |
| openFile / openFileInPane? | `(handle, path?) => void` | | Open actions |
| renameFile / deleteFile / duplicateFile? | handlers | | File actions |
| onClose? | `() => void` | | Called after opening (closes overlays) |
| hideFolderPath? | `boolean` | | Hides the parent-folder line (tree mode) |
| treeGutter? | `TreeGutterInfo` | | Gutter lines for nested rows |
| draggable? / onDragStartEntry? / onDragEndEntry? | | | Drag-to-move |
