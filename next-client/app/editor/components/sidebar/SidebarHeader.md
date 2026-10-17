# SidebarHeader

Description: The sidebar's top bar, level with the pane toolbar: the open vault's name (`atom_vaultName`, "Workspace" without one) as a switcher button whose menu (`TabContextMenu`) lists the recent vaults (`useRecentVaults`) and then **Open Vault…**, **Create Vault…** and **Browser Vault…** where the browser supports them (disabled when there's nothing to offer); then **New note** and **Hide sidebar** icon buttons (`PaneToolbarButton`).

## Local State & Storage
- State: The open menu (local).
- Persistence: None.

## Dependencies
- Core: `TabContextMenu`, `PaneToolbarButton`, `useRecentVaults`, `useFileSystem`, `atom_newVaultFlowOpen`, `atom_browserVaultDialogOpen`.
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
