# RecentVaultsDialog

Description: The vault switcher's recent vaults, and the way to open an unpinned one (the Vault menu, from `useVaultMenuItems`, lists only the pinned ones: the sidebar's switcher, the pane title's **No vault** crumb, and FolderPopover's **Vault ▸** submenu). Opened by the menu's **Recent Vaults…** item. Each row leads with an icon button: the vault's emoji if it has one, else the pin for a pinned vault, else where it lives. A click opens the emoji picker right there (`PinIconPopover`, `overDialog`; Remove Icon clears it), so any recent vault's icon changes without opening it. Then the vault's name and where it lives ("Folder on disk" / "In this browser", "· Open" for the open vault). A click on the name opens the vault (a no-op for the open vault); a right-click opens its menu (`TabContextMenu`, `overDialog`: above the dialog, Escape closes only the menu), the same way a file's menu works: **Open Vault** (disabled for the open vault; opening closes the dialog), **Pin** / **Unpin**, **Set Icon…** / **Change Icon…**, and **Remove from Recents**. A row has no separate pin or remove buttons. The open vault is listed too, so it can be pinned.

## Local State & Storage
- State: `atom_recentVaultsDialogOpen` (ui-atoms). The list is `atom_recentVaults`, through `useRecentVaults` (`allRecentVaults`, `pinRecentVault`, `moveRecentVault`, `forgetRecentVault`, `setRecentVaultIcon`). The dragged row and its drop point, and the open menu's vault and position, are local useState.
- Persistence: every change is saved at once to IndexedDB (`recentVaults`, `services/recent-vaults.ts`), on this device.

## Behavior
- **Pin**: a pinned vault moves to the end of the pinned group, at the top of the list, and is listed in the Vault menu. Pinned vaults keep their place when reopened and never age out; only unpinned ones are capped (`MAX_RECENT_VAULTS`) and move to the top of their group when opened. **Unpin** puts it first among the rest.
- **Reorder**: drag a row, or press Alt+↑/↓ on its name or icon. A row moves only within its own group (pinned or not).
- **Remove**: drops the entry only; the vault's files are untouched. The open vault comes back the next time it's opened.

## Dependencies
- Core: `DialogModal`, `Button`, `TabContextMenu`, `PinIconPopover`, `useRecentVaults`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import RecentVaultsDialog from "./RecentVaultsDialog";

<RecentVaultsDialog /> // open via atom_recentVaultsDialogOpen
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
