# PaneEmptyState

Description: What a pane shows with no tabs open — New File (with its shortcut; opens a blank draft in this pane, no dialogs), Open Note (command palette) or Open File (device), vault actions when no vault is open, a row of page chips with their keys (Tasks, Changes, Templates and Settings, with a vault open; Changes only for a disk vault with a `.git` folder at its root, `useVaultHasGit`, as the git menu; `PAGE_SHORTCUTS`, each running the page's registered palette command), and a "Browse all commands" hint. The vault actions are Open/Create Vault (`VaultActionButtons`), wherever a vault can be kept, on disk or in browser storage (OPFS).

## Local State & Storage
- State: `atom_vaultHandle`, `atom_vaultDescriptor`, `atom_isVaultPending` (with `useVaultHasGit`, for the Changes chip), `atom_activeFilePath`, `atom_openDraft`, `atom_newVaultFlowOpen`, `atom_browserVaultDialogOpen`; a hidden file-input ref.
- Persistence: None itself; a picked file loads into the draft through `onLoadDraft`.

## Dependencies
- Core: `Button`, `VaultActionButtons` (the vault actions), `useFileSystem`, `useCommandPalette`, `page-shortcuts` (the page chips), `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<PaneEmptyState onLoadDraft={setDraftContent} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onLoadDraft | `(text: string) => void` | | Receives the text of a file opened from the device |
