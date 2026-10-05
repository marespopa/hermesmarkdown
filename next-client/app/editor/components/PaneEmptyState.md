# PaneEmptyState

Description: What a pane shows with no tabs open — New File (with its shortcut; opens a blank draft in this pane, no dialogs), Open Note (command palette) or Open File (device), vault actions when no vault is open, and a "Browse all commands" hint. The vault actions are Open/Create Vault where disk folder access exists, plus Browser Vault where browser storage (OPFS) exists.

## Local State & Storage
- State: `atom_vaultHandle`, `atom_activeFilePath`, `atom_openDraft`, `atom_newVaultFlowOpen`, `atom_browserVaultDialogOpen`; a hidden file-input ref.
- Persistence: None itself; a picked file loads into the draft through `onLoadDraft`.

## Dependencies
- Core: `Button`, `VaultActionButtons` (the vault actions), `useFileSystem`, `useCommandPalette`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<PaneEmptyState onLoadDraft={setDraftContent} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onLoadDraft | `(text: string) => void` | | Receives the text of a file opened from the device |
