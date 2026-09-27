# VaultSidebarEmpty

Description: Sidebar empty state shown when no vault is open. It offers open, create, import/export, and connect GitHub, and warns when the File System Access API is unsupported.

## Local State & Storage
- State: None (controlled).
- Persistence: None - transient UI state.

## Dependencies
- Core: `SidebarHeader`, `Button`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import VaultSidebarEmpty from "./VaultSidebarEmpty";

<VaultSidebarEmpty isVaultSupported openVault={openVault} setActiveFilePath={setPath} activeFilePath={null} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isVaultSupported | `boolean` |  | File System Access API is available |
| openVault | `() => void` |  | Picks a local folder |
| onCreateVault? / onImport? / onExport? / onConnectGitHub? / onClose? | `() => void` |  | Optional actions |
| setActiveFilePath | `(path: string) => void` |  | Opens a file |
| activeFilePath | `string \| null` |  | Current file |
