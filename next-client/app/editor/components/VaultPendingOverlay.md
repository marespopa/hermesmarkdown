# VaultPendingOverlay

Description: The fallback when the stored vault handle needs permission again and the browser's own prompt couldn't open on startup (it needs a fresh click, as after Resume on the landing page; a plain reload has none, or the prompt was declined). On desktop it points the user to the browser's "Allow on every visit" option so the prompt stops coming back; Chrome on Android has no such option, so there the copy leaves it out and says "or tap anywhere". The Restore Access button (or any tap or key press, via [VaultAccessGate](VaultAccessGate.md)) opens the browser prompt. **Choose Folder…** (a secondary button) is for a saved folder that can't be reached, moved or deleted: it opens the browser's folder picker and opens the chosen folder as the vault, which ends the pending state. It stops its click and key events from reaching the gate's window listeners, so it never also starts a restore. Once access is granted, [VaultAccessGate](VaultAccessGate.md) closes the prompt and leaves [EditorSkeleton](EditorSkeleton.md) showing until the vault has loaded.

## Local State & Storage
- State: None; controlled.
- Persistence: None itself. The handle being restored lives in IndexedDB (`lastVaultHandle`).

## Dependencies
- Core: `DialogModal`, `Button`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import VaultPendingOverlay from "./VaultPendingOverlay";

<VaultPendingOverlay restoreVault={restoreVault} chooseFolder={openVault} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| restoreVault | `() => void` |  | Requests permission and reopens the vault |
| chooseFolder | `() => void \| Promise<unknown>` |  | Picks a folder and opens it as the vault (`openVault`) |
