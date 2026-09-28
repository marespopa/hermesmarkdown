# VaultEmptyState

Description: Empty state of the file views (Explorer page and mobile file overlay) shown when no vault is open. It offers open, create, browser vault, import/export, and connect GitHub. The "Local vaults require Desktop" warning only shows when neither disk folder access nor browser vaults are available.

## Local State & Storage
- State: None (controlled).
- Persistence: None - transient UI state.

## Dependencies
- Core: `SectionHeader`, `Button`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import VaultEmptyState from "./VaultEmptyState";

<VaultEmptyState isVaultSupported openVault={openVault} setActiveFilePath={setPath} activeFilePath={null} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isVaultSupported | `boolean` |  | File System Access API is available |
| openVault | `() => void` |  | Picks a local folder |
| onOpenBrowserVault? | `() => void` |  | Opens the browser vault dialog; omit where browser storage is unavailable |
| onCreateVault? / onImport? / onExport? / onConnectGitHub? / onClose? | `() => void` |  | Optional actions |
| setActiveFilePath | `(path: string) => void` |  | Opens a file |
| activeFilePath | `string \| null` |  | Current file |
