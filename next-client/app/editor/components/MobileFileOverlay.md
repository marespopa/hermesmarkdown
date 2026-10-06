# MobileFileOverlay

Description: Full-screen mobile file browser combining tag and text search, smart folders, and the vault file list, with an empty state when no vault is open. With a vault, the header has 40px **New file** and **New folder** buttons: on the Files tab the new item is named in place at the root of the tree (`VaultFileTree`'s `controllerRef`); elsewhere each asks where, then for a name, beside Show hidden files and Close Vault.

## Local State & Storage
- State: `atom_activeFilePath`, `atom_selectedFileTags`, `atom_showHiddenFiles`, `atom_newVaultFlowOpen`, `atom_browserVaultDialogOpen`, `atom_githubVaultDialogOpen`, `atom_userName`, `useFileSystem`, `useVaultFileSearch`, `useDialog`.
- Persistence: `localStorage` keys `hermes_show_hidden_files` and `userName`.

## Dependencies
- Core: `OverlayPanel`, `UnifiedSearchInput`, `SmartFolders`, `VaultFileTree`, `VaultEmptyState`, `Button`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import MobileFileOverlay from "./components/MobileFileOverlay";

<MobileFileOverlay isOpen={open} onClose={close} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isOpen | `boolean` |  | Visibility |
| onClose | `() => void` |  | Dismiss handler |
| onImport? / onExport? | `() => void` |  | File transfer actions |
