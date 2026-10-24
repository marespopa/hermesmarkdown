# CreateVaultSubSteps

Description: Presentational steps for vault creation: a name input with validation, a parent-folder picker, and an "installing" spinner. With `onIconChange` an emoji button sits left of the name (`icon`; opens `PinIconPopover` over the dialog). With `onLocationChange` it leads with a **Folder on disk / In this browser** choice; `location: "browser"` hides the folder picker, Create Vault calls `onCreateInBrowser`, and `onManageBrowserVaults` adds a **Manage browser vaults…** button.

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
| `location` | `"disk" \| "browser"` | `"disk"` | Where the vault goes |
| `onLocationChange` | `(location) => void` |  | Shows the location choice |
| `onCreateInBrowser` | `() => void` |  | Create Vault in browser storage |
| `onManageBrowserVaults` | `() => void` |  | Shows Manage browser vaults… |
| `icon` | `string \| null` | `null` | The picked emoji |
| `onIconChange` | `(icon) => void` |  | Shows the emoji button |
