# VaultPendingOverlay

Description: Prompt shown after reload when the stored vault handle needs the user to grant permission again. It offers a one-click restore.

## Local State & Storage
- State: None (controlled).
- Persistence: None itself. The handle being restored lives in IndexedDB (`lastVaultHandle`).

## Dependencies
- Core: `DialogModal`, `Button`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import VaultPendingOverlay from "./VaultPendingOverlay";

<VaultPendingOverlay restoreVault={restoreVault} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| restoreVault | `() => void` |  | Requests permission and reopens the vault |
