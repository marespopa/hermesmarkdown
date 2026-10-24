# VaultActionButtons

Description: The row of vault actions shown wherever no vault is open — **Open Vault** and **Create Vault**, wherever a vault can be kept (a folder on disk, or browser storage, OPFS). Create Vault opens `NewVaultDialog`, which asks disk or browser where both work; Open Vault lists the browser vaults where folders can't be opened. Renders nothing when neither is available. Used by `PaneEmptyState`.

## Local State & Storage
- State: writes `atom_newVaultFlowOpen` and `atom_browserVaultDialogOpen`.
- Persistence: None.

## Dependencies
- Core: `Button`, `useFileSystem` (`openVault`, `isVaultSupported`, `isBrowserVaultSupported`), `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<VaultActionButtons />
```

## Props Overview
None.
