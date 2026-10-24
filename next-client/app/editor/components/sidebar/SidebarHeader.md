# SidebarHeader

Description: The sidebar's top bar, at the top: the **vault switcher**, the open vault's name (`atom_vaultName`, "No vault" without one) in `text-ui-footnote` semibold with a small chevron and a soft fill on hover or while open. A click opens the vault menu (`TabContextMenu`, "Switch vault") with the items the pane title's crumb uses (`useVaultMenuItems`): recent vaults, the open one checked, then **Open Vault…**, **Create Vault…** and **Browser Vault…** where they're available. Then **New note** and **Hide sidebar** icon buttons (`PaneToolbarButton`).

## Local State & Storage
- State: the vault menu's position while it's open (local).
- Persistence: None.

## Dependencies
- Core: `PaneToolbarButton`, `TabContextMenu`, `useVaultMenuItems`, `atom_vaultName`.
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
