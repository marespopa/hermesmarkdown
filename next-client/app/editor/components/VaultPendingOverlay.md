# VaultPendingOverlay

Description: The fallback when the stored vault handle needs permission again and the browser's own prompt couldn't open on startup (it needs a fresh click, as after Resume on the landing page; a plain reload has none, or the prompt was declined). On desktop it points the user to the browser's "Allow on every visit" option so the prompt stops coming back; Chrome on Android has no such option, so there the copy leaves it out and says "or tap anywhere". The Restore Access button (or any tap or key press, via [VaultAccessGate](VaultAccessGate.md)) opens the browser prompt; the vault's added library folders are asked for in the same tap, and any still locked afterwards get an "Allow" toast each. It names the paused folder. After a refused ask (or a tap that brought no prompt) it says so, the button reads Try Again, and it points to the browser's site settings in case the site was blocked. The way out when the vault can't be allowed: "Or open another vault" lists up to three other recent vaults and Open Folder…; that section carries `data-vault-escape` (`VAULT_ESCAPE_ATTR`), so taps and keys inside it never count as "tap anywhere" and opening another vault never asks for the paused one first. Once access is granted, [VaultAccessGate](VaultAccessGate.md) closes the prompt and leaves [EditorSkeleton](EditorSkeleton.md) showing until the vault has loaded.

## Local State & Storage
- State: None; controlled.
- Persistence: None itself. The handle being restored lives in IndexedDB (`lastVaultHandle`).

## Dependencies
- Core: `DialogModal`, `Button`, `RecentVault` (type only).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import VaultPendingOverlay from "./VaultPendingOverlay";

<VaultPendingOverlay
  restoreVault={restore}
  vaultName="notes"
  denied={denied}
  otherVaults={recentVaults}
  onOpenRecent={(entry) => void openRecentVault(entry)}
  onOpenFolder={() => void openVault()}
/>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| restoreVault | `() => void` |  | Requests permission and reopens the vault |
| vaultName | `string` |  | The paused vault's folder name |
| denied | `boolean` | `false` | The last ask was refused or showed no prompt |
| otherVaults | `readonly RecentVault[]` | `[]` | Recent vaults other than the paused one (first three shown) |
| onOpenRecent | `(entry: RecentVault) => void` |  | Opens one of them; with `onOpenFolder`, shows the "Or open another vault" section |
| onOpenFolder | `() => void` |  | Picks a folder to open as the vault |
