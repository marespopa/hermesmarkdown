# SidebarHeader

Description: The sidebar's top bar, at the top: the open vault's **icon** (its emoji, else a faint vault glyph that turns into a smiley on hover or focus): a click opens the emoji picker under it (`PinIconPopover`, "Vault icon", `anchorRef` so a second click closes it; Remove Icon clears it), and the pick is saved on the vault's recents entry (`setRecentVaultIcon`, kept across reopening). The same emoji leads the vault in the Vault menu once it's pinned and in Recent Vaults…, where any recent vault's icon can be changed too; Create Vault sets one up front. Then the **vault switcher**, the open vault's name (`atom_vaultName`, "No vault" without one) in `text-ui-footnote` semibold with a small chevron and a soft fill on hover or while open. A click opens the vault menu (`TabContextMenu`, "Switch vault") with the items the pane title's crumb uses (`useVaultMenuItems`): the pinned vaults (each led by its emoji, else the pin glyph), then **Open Vault…** and **Create Vault…** where they're available (Create Vault asks disk or browser where both work), then **Recent Vaults…** ([RecentVaultsDialog](../RecentVaultsDialog.md): open, reorder, pin or remove any recent vault) in its own group, while there are any. Then **New note** and **Hide sidebar** icon buttons (`PaneToolbarButton`).

## Local State & Storage
- State: the vault menu's position and the emoji picker's anchor while open (local).
- Persistence: None.

## Dependencies
- Core: `PaneToolbarButton`, `TabContextMenu`, `PinIconPopover`, `useVaultMenuItems`, `useRecentVaults` (`openVaultEntry`, `setRecentVaultIcon`), `atom_vaultName`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<SidebarHeader onNewNote={navigation.newNote} onHide={() => setOpen(false)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onNewNote | `() => void` | | New note |
| onHide | `() => void` | | Hides the sidebar |
