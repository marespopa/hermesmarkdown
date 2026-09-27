# CreateVaultSubSteps

Description: Presentational steps for vault creation: a name input with validation, a parent-folder picker, and an "installing" spinner.

## Local State & Storage
- State: None. Everything comes from `useCreateVault()` props.
- Persistence: None - transient UI state.

## Dependencies
- Core: `Button`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import CreateVaultSubSteps from "./CreateVaultSubSteps";

<CreateVaultSubSteps {...useCreateVault()} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (spread) | `ReturnType<typeof useCreateVault>` |  | `subStep`, `vaultName`, `setVaultName`, `parentFolderName`, `error`, `setError`, `validateName`, `pickParentFolder`, `createVault` |
