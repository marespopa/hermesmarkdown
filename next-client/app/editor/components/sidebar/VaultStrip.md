# VaultStrip

Description: The narrow rail of vault "spaces" at the window's left edge (mounted by EditorShell, `VAULT_STRIP_WIDTH` wide; it stays when the sidebar panel is hidden, and the page starts past it). The sidebar panel sits right of it. One icon per pinned vault plus the open one (its emoji, else its first letter), the current one highlighted. A **click** switches to that vault (`openRecentVault`): the clicked icon is current at once (optimistic, with a delayed busy state) and falls back to the open vault if the open fails (the hook toasts why). The vault left is saved and the one opened restored as it was left: its tabs, their text and the folded sidebar sections (`services/vault-workspace.ts`, used by `initVaultFromHandle`); the folder's files are re-read from disk, so disk wins. A **right-click** opens the vault's menu: Pin / Unpin, Set / Change Icon… (`PinIconPopover`), Remove from Recents. The **+** at the foot opens a menu: Open Vault…, Create Vault…, Recent Vaults….

## Local State & Storage
- State: the icon being opened (`pendingKey`), the open menus and the icon picker's anchor (local).
- Persistence: none here; recents and snapshots are saved by `useRecentVaults` and `vault-workspace`.

## Dependencies
- Core: `useRecentVaults`, `useFileSystem` (`openVault`), `TabContextMenu`, `PinIconPopover`, `atom_vaultKey`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<VaultStrip />
```

## Motion
The current-vault bar grows and fades in, icons press in on click (`active:scale-90`), and an icon still opening pulses softly after 150ms (`.vault-opening`). The page and the sidebar's lists fade in on a switch (`useVaultSwitchFade`, `.vault-switch-in`, opacity only). All of it is off under `prefers-reduced-motion`.
