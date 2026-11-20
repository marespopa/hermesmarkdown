# VaultAccessGate

Description: Wraps every `/editor` route (editor, Tasks, Files, Settings) from `app/editor/layout.tsx`. Its `useVaultManager` restores the saved vault on load, so a refresh on any of these routes restores it. Until the vault is readable the route is out of reach: while the saved vault is looked up (`atom_isVaultRestoring`) only [EditorSkeleton](EditorSkeleton.md) renders; while access must be granted again (`atom_isVaultPending`) the route stays mounted but invisible and `inert` behind [VaultPendingOverlay](VaultPendingOverlay.md), shown over the skeleton. While pending, the first `click` or `keydown` anywhere (not `pointerdown`: a touch only counts as a user gesture once the finger lifts) calls `restoreVault`, so a single gesture opens the browser's permission prompt. Once access is granted, `restoreVault` sets `atom_isVaultUnlocking` and keeps `atom_isVaultPending` true while it binds the open notes (reading them again from disk) and lists the vault's top folder: the prompt closes, the skeleton stays, and the route stays out of reach until "Vault restored" shows. The whole vault is then indexed behind the editor, so tags, tasks and search fill in as it goes. While unlocking, gestures are ignored; after a denied prompt or failed load the next gesture retries. Choosing "Allow on every visit" there makes later reloads skip the overlay. When the user opens a vault (a recent one, a picked folder, a new or browser vault), `initVaultFromHandle` sets `atom_openingVaultName` until the open notes are bound and the top folder listed, and a full-screen [LoadingOverlay](../../components/LoadingOverlay/LoadingOverlay.md) reads "Opening <name>..." over the old vault, so the switch never looks hung. The startup restore doesn't set it (it has the skeleton). A first-time user (or one who works without a vault) isn't held: when the last load found no vault (`services/vault-hint.ts`, `localStorage["hermes:savedVault"]` = "none"), the editor shows straight away and the restore runs behind it; a saved vault, or no hint yet, keeps the skeleton up until the vault is readable, so no draft flashes first. Opening a vault records "saved".

The skeleton can't stay up for good: each browser-storage step of the startup restore has a timeout (`utils/with-timeout.ts`). The startup restore asks for access right away (`requestPermissionFirst`, no query ahead of it): when a click is still fresh, such as Resume on the landing page, the browser's own Allow prompt opens with no extra step, the skeleton stays up while it is open (`atom_isRequestingAccess`, which the watchdog ignores), and the prompt has no timeout since it waits for the user. When the browser refuses (a plain reload has no click), or the answer is no, the vault goes pending and the overlay above takes over; any other step that times out ends the restore with a "Reload" toast. Either way the saved-vault hint stays. As a last net, `useStartupWatchdog` (`app/editor/hooks/use-startup-watchdog.ts`) offers the same reload once the skeleton, or the wait for the open notes' text, has lasted 10 seconds, and logs the steps reached (`utils/startup-trace.ts`, also in `sessionStorage["hm-startup-trace"]`). It only adds a toast, never changes state.

## Local State & Storage
- State: Reads `atom_isVaultRestoring`, `atom_isVaultUnlocking`, `atom_openingVaultName` and `atom_isVaultPending` (via `useVaultManager`), and `atom_openNotesHydrated` (for the watchdog).
- Persistence: None itself; the saved handle lives in IndexedDB (`lastVaultHandle`).

## Dependencies
- Core: `useVaultManager`, `useStartupWatchdog`, `VaultPendingOverlay`, `LoadingOverlay`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<VaultAccessGate>{children}</VaultAccessGate>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| children | `ReactNode` |  | The route |
