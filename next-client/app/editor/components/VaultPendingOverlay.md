# VaultPendingOverlay

Description: Prompt shown after reload when the stored vault handle needs the user to grant permission again. On desktop it points the user to the browser's "Allow on every visit" option so the prompt stops coming back; Chrome on Android has no such option, so there the copy leaves it out and says "or tap anywhere". The Restore Access button (or any tap or key press, via [VaultAccessGate](VaultAccessGate.md)) opens the browser prompt. Once access is granted, [VaultAccessGate](VaultAccessGate.md) closes the prompt and leaves [EditorSkeleton](EditorSkeleton.md) showing until the vault has loaded.

## Local State & Storage
- State: None; controlled.
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
