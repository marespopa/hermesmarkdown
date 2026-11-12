# SettingsButton

Description: Opens Settings (`/editor/settings`), as the palette's **Open Settings** does. It sits just before the `SearchPill` in the window's top-right corner: on the editor (`EditorShell`'s corner row, desktop; with the row, it rests invisible until the row or the top edge is hovered) and in every page's title bar (`ShellPage`, desktop, except on Settings itself). It has the pill's look (`PILL_BUTTON_CLASS`): the same height, tint and rounding, a cog icon and a "Settings" tooltip. On a phone, Settings stays at the foot of the drawer (`MobileDrawer`). `EDITOR_CORNER_WIDTH` (`SearchPill`) counts this button, so the pane's floating title keeps clear of the corner.

## Local State & Storage
- State: None.
- Persistence: None.

## Dependencies
- Core: `Button`, `Tooltip`, `next/navigation`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<div className="fixed top-1.5 right-2 z-30 flex items-center gap-1.5">
  <CopyContentButton />
  <SettingsButton />
  <SearchPill />
</div>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| className? | `string` | `""` | Extra classes for placement |
