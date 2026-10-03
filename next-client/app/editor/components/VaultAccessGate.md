# VaultAccessGate

Description: Wraps every `/editor` route (editor, Tasks, Explorer, Settings) from `app/editor/layout.tsx`. Its `useVaultManager` restores the saved vault on load, so a refresh on any of these routes restores it. Until the vault is readable the route is out of reach: while the saved vault is looked up (`atom_isVaultRestoring`) only [EditorSkeleton](EditorSkeleton.md) renders; while access must be granted again (`atom_isVaultPending`) the route stays mounted but invisible and `inert` behind [VaultPendingOverlay](VaultPendingOverlay.md), shown over the skeleton. While pending, the first `click` or `keydown` anywhere (not `pointerdown`: a touch only counts as a user gesture once the finger lifts) calls `restoreVault`, so a single gesture opens the browser's permission prompt. Once access is granted, `restoreVault` sets `atom_isVaultUnlocking` and keeps `atom_isVaultPending` true while it scans, indexes and rebinds the vault: the prompt closes, the skeleton stays, and the route stays out of reach until "Vault restored" shows. While unlocking, gestures are ignored; after a denied prompt or failed load the next gesture retries. Choosing "Allow on every visit" there makes later reloads skip the overlay.

## Local State & Storage
- State: Reads `atom_isVaultRestoring`, `atom_isVaultUnlocking` and `atom_isVaultPending` (via `useVaultManager`).
- Persistence: None itself; the saved handle lives in IndexedDB (`lastVaultHandle`).

## Dependencies
- Core: `useVaultManager`, `VaultPendingOverlay`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<VaultAccessGate>{children}</VaultAccessGate>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| children | `ReactNode` |  | The route |
