# VaultAccessGate

Description: Wraps every `/editor` route (editor, Tasks, Files, Settings) from `app/editor/layout.tsx`. Its `useVaultManager` restores the saved vault on load, so a refresh on any of these routes restores it. Until the vault is readable the route is out of reach: while the saved vault is looked up (`atom_isVaultRestoring`) only [EditorSkeleton](EditorSkeleton.md) renders; while access must be granted again (`atom_isVaultPending`) the route stays mounted but invisible and `inert` behind [VaultPendingOverlay](VaultPendingOverlay.md), shown over the skeleton. While pending, the first `click` or `keydown` anywhere (not `pointerdown`: a touch only counts as a user gesture once the finger lifts) calls `restoreVault`, so a single gesture opens the browser's permission prompt. Once access is granted, `restoreVault` sets `atom_isVaultUnlocking` and keeps `atom_isVaultPending` true while it binds the open notes (reading them again from disk) and lists the vault's top folder: the prompt closes, the skeleton stays, and the route stays out of reach until "Vault restored" shows. The whole vault is then indexed behind the editor, so tags, tasks and search fill in as it goes. While unlocking, gestures are ignored; after a denied prompt or failed load the next gesture retries. Choosing "Allow on every visit" there makes later reloads skip the overlay. When the user opens a vault (a recent one, a picked folder, a new, browser or GitHub vault), `initVaultFromHandle` sets `atom_openingVaultName` until the open notes are bound and the top folder listed, and a full-screen [LoadingOverlay](../../components/LoadingOverlay/LoadingOverlay.md) reads "Opening <name>..." over the old vault, so the switch never looks hung. The startup restore doesn't set it (it has the skeleton).

## Local State & Storage
- State: Reads `atom_isVaultRestoring`, `atom_isVaultUnlocking`, `atom_openingVaultName` and `atom_isVaultPending` (via `useVaultManager`).
- Persistence: None itself; the saved handle lives in IndexedDB (`lastVaultHandle`).

## Dependencies
- Core: `useVaultManager`, `VaultPendingOverlay`, `LoadingOverlay`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<VaultAccessGate>{children}</VaultAccessGate>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| children | `ReactNode` |  | The route |
