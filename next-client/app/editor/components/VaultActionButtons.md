# VaultActionButtons

Description: The row of vault actions shown wherever no vault is open — **Open Vault** and **Create Vault** where disk folder access exists, **Browser Vault** where browser storage (OPFS) exists. Renders nothing when neither is available. Used by `PaneEmptyState` and the home feed's no-vault start (`home-feed/FeedStart`).

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
