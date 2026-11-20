# SidebarHeader

Description: The sidebar's top bar, at the top: the open vault's **icon** (its emoji, else a faint vault glyph that turns into a smiley on hover or focus): a click opens the emoji picker under it (`PinIconPopover`, "Vault icon", `anchorRef` so a second click closes it; Remove Icon clears it), and the pick is saved on the vault's recents entry (`setRecentVaultIcon`, kept across reopening). The same emoji leads the vault in the Vault menu once it's pinned and in Recent Vaults…, where any recent vault's icon can be changed too; Create Vault sets one up front. Then the open vault's name (`atom_vaultName`, "No vault" without one) in `text-ui-footnote` semibold: a label only, since switching vaults is the [VaultStrip](VaultStrip.md) beside the sidebar. Then the **Hide sidebar** icon button. Settings is not here: it is in the window's top-right corner ([SettingsButton](../SettingsButton.md)).

## Local State & Storage
- State: the emoji picker's anchor while open (local).
- Persistence: None.

## Dependencies
- Core: `PaneToolbarButton`, `PinIconPopover`, `useRecentVaults` (`openVaultEntry`, `setRecentVaultIcon`), `atom_vaultName`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<SidebarHeader onHide={() => setOpen(false)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onHide | `() => void` | | Hides the sidebar |
