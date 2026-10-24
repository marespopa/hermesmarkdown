# TreeListStatus

Description: The status line under the Files list ([VaultFileTree](../VaultFileTree.md)). With nothing listed: a spinner and "Scanning vault…" while the vault is indexed, else "No files yet" ("No file found" while searching). With rows listed and indexing still running: a small spinner and "Still scanning vault…" below them; nothing otherwise.

## Local State & Storage
- State: None; props only.
- Persistence: None.

## Dependencies
- Core: None.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<TreeListStatus isEmpty={rows.length === 0} isIndexing={isIndexing} isSearchActive={isSearchActive} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isEmpty | `boolean` |  | Nothing listed (no rows, nothing being created) |
| isIndexing | `boolean` |  | The vault is being indexed |
| isSearchActive | `boolean` |  | A search narrows the list (empty text "No file found") |
