# ConflictDialog

Description: Resolves an on-disk change to the open file by reloading from disk, keeping the current text, or merging manually (conflict markers, with per-side resolution).

## Local State & Storage
- State: `atom_fileConflict`, `atom_content`, `atom_lastSavedContent`, `atom_fileLastModified`, `atom_activeFileHandle`, `atom_activeFilePath`, `atom_openFiles`. Merge dialog and merged text are local useState.
- Persistence: The resolution is written to the local file through `useFileSystem().saveFile`.

## Dependencies
- Core: `DialogModal`, `Button`, `Textarea`, `react-hot-toast`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import ConflictDialog from "./ConflictDialog";

<ConflictDialog /> // opens when atom_fileConflict is set
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
