# SidebarHeader

Description: The sidebar's top bar, at the top: the app's name, **HermesMarkdown**, as a quiet wordmark (plain text, `text-ui-footnote` semibold, not a button), then **New note** and **Hide sidebar** icon buttons (`PaneToolbarButton`). It no longer switches vaults: that's the pane title's first crumb (`PaneTitle`: the vault root's `FolderPopover`, or the "No vault" crumb's menu) and the command palette.

## Local State & Storage
- State: None.
- Persistence: None.

## Dependencies
- Core: `PaneToolbarButton`.
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
