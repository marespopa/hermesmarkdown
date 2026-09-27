# PaneEmptyState

Description: What a pane shows with no tabs open — New File (with its shortcut), Open Note (command palette) or Open File (device), Open/Create Vault when no vault is open, and a "Browse all commands" hint.

## Local State & Storage
- State: `atom_vaultHandle`, `atom_activeFilePath`, `atom_newVaultFlowOpen`; a hidden file-input ref.
- Persistence: None itself; a picked file loads into the draft through `onLoadDraft`.

## Dependencies
- Core: `Button`, `useFileSystem`, `useCommandPalette`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<PaneEmptyState onLoadDraft={setDraftContent} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onLoadDraft | `(text: string) => void` | | Receives the text of a file opened from the device |
