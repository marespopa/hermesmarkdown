# NewVaultDialog

Description: Create Vault. Where the browser can open folders it creates a vault folder on disk, using `CreateVaultSubSteps` to name it and pick a parent folder. Where it can't, it creates a vault in browser storage (just a name, `createBrowserVault`). Where both work, a **Folder on disk / In this browser** segmented control picks one (disk first); an emoji button beside the name (`PinIconPopover`, `overDialog`) gives the vault an icon, held in `atom_pendingVaultIcon` until the new vault opens (`useRecentVaultTracker` puts it on that vault's recents entry, matched by name); the browser choice drops the folder picker and offers **Manage browser vaults…** (`BrowserVaultDialog`: rename, delete, storage).

## Local State & Storage
- State: `atom_newVaultFlowOpen`, `useCreateVault()` (sub-step, name, parent folder, error).
- Persistence: Creates a real folder through the File System Access API. The new handle is stored in IndexedDB.

## Dependencies
- Core: `DialogModal`, `CreateVaultSubSteps`, `hooks/file-system/use-create-vault`, `useFileSystem` (`createBrowserVault`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import NewVaultDialog from "./NewVaultDialog";

<NewVaultDialog /> // open via atom_newVaultFlowOpen
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
