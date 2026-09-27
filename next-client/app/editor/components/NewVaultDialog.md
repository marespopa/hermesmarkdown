# NewVaultDialog

Description: Dialog that creates a new local vault folder, using `CreateVaultSubSteps` to name it and pick a parent folder.

## Local State & Storage
- State: `atom_newVaultFlowOpen`, `useCreateVault()` (sub-step, name, parent folder, error).
- Persistence: Creates a real folder through the File System Access API. The new handle is stored in IndexedDB.

## Dependencies
- Core: `DialogModal`, `CreateVaultSubSteps`, `hooks/file-system/use-create-vault`.
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
