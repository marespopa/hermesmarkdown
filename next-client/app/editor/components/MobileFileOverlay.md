# MobileFileOverlay

Description: Full-screen mobile file browser combining tag and text search, smart folders, and the vault file list, with an empty state when no vault is open.

## Local State & Storage
- State: `atom_activeFilePath`, `atom_selectedFileTags`, `atom_showHiddenFiles`, `atom_newVaultFlowOpen`, `atom_userName`, `useFileSystem`, `useSidebarSearch`, `useDialog`.
- Persistence: `localStorage` keys `hermes_show_hidden_files` and `userName`.

## Dependencies
- Core: `OverlayPanel`, `UnifiedSearchInput`, `SmartFolders`, `VaultSidebarFiles`, `VaultSidebarEmpty`, `Button`.
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
