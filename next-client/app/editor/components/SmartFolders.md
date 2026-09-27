# SmartFolders

Description: Lists custom workspaces (saved metadata queries) and the files each one matches, with create, edit, and delete through `WorkspaceBuilder`.

## Local State & Storage
- State: `atom_customWorkspaces`, `atom_fileMetadata`, `atom_selectedWorkspaceId`, `atom_workspaceBuilderRequest`, `atom_activeFilePath`. Queries are evaluated in memory with `evaluateQuery`.
- Persistence: `localStorage["customWorkspaces"]`.

## Dependencies
- Core: `WorkspaceBuilder`, `Button`, `useDialog`, `app/utils/queryEngine`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import SmartFolders from "./SmartFolders";

<SmartFolders onFileSelect={open} renameFile={rename} deleteFile={remove} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onFileSelect | `(handle: FileSystemFileHandle, path?: string) => void` |  | Open handler |
| renameFile / deleteFile / duplicateFile? | handle callbacks |  | File actions |
| onMatchCountChange? | `(count: number, hasFolderSelected: boolean) => void` |  | Match reporting |
