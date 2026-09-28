# BrowserVaultDialog

Description: Create, reopen, or delete browser vaults — vaults stored in the browser's Origin Private File System instead of a folder on disk. This is how Safari, Firefox, and mobile browsers (which lack disk folder access) get a vault. It also shows storage usage and whether the browser has agreed to keep the data, with a "Keep data" button to ask.

## Local State & Storage
- State: `atom_browserVaultDialogOpen`. Vault list, new-vault name, storage status, pending delete confirmation, and busy/error flags are local useState.
- Persistence: Vault files live in OPFS under `hermes-vaults/browser-<id>`. Descriptors go to IndexedDB (`HermesMDVaultDB`, keys `lastBrowserVault` and `browserVaults`) through `useFileSystem`.

## Dependencies
- Core: `DialogModal`, `Button`, `Input`, `useFileSystem`, `services/opfs`.
- Zero-Cloud: No network or telemetry side effects.

## Behavior
- Opening or creating a vault asks the browser for persistent storage and closes the dialog. The welcome wizard advances on its own once a vault is open.
- Delete asks for inline confirmation, closes the vault first if it is the open one, then removes its files and registry entry.
- Folders found in storage without a registry entry are listed as "Recovered vault …" so their notes can still be opened and exported.

## Quick Usage
```tsx
import BrowserVaultDialog from "./BrowserVaultDialog";

<BrowserVaultDialog /> // open via atom_browserVaultDialogOpen
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
