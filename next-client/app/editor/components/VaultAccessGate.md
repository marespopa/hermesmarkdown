# VaultAccessGate

Description: Wraps every `/editor` route (editor, Tasks, Explorer, Settings) from `app/editor/layout.tsx`. Its `useVaultManager` restores the saved vault on load, so a refresh on any of these routes restores it. Until the vault is readable the route is out of reach: while the saved vault is looked up (`atom_isVaultRestoring`) only a blank surface renders; while access must be granted again (`atom_isVaultPending`) the route stays mounted but invisible and `inert` behind [VaultPendingOverlay](VaultPendingOverlay.md).

## Local State & Storage
- State: Reads `atom_isVaultRestoring` and `atom_isVaultPending` (via `useVaultManager`).
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
