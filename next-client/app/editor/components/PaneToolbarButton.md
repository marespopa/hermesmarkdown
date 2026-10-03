# PaneToolbarButton

Description: One toolbar button in the pane header: an icon, plus its label under it in "Icon and Text". The tooltip names it (with its shortcut) in both modes, portaled to `document.body` so the pane's clipping can't cut it off. It reads the header's effective style from `ToolbarModeContext` (exported here with `useToolbarMode`), which `PaneLeaf` provides: the user's `atom_toolbarDisplayMode`, falling back to icons in a narrow header. Hover, keyboard focus and the pressed / open state (`active`) share the look of the Edit / Preview switch's selected segment — a raised surface pill with a soft shadow and hairline ring (`PANE_ACTION_ACTIVE_CLASS`); keyboard focus adds a hairline accent ring. It uses Button's `unstyled` variant so these classes own every state. Forwards its ref (the More menu anchors to it) and any button attributes (`aria-pressed`, `aria-haspopup`, …); `aria-label` defaults to the label.

## Local State & Storage
- State: None (reads `ToolbarModeContext`).
- Persistence: None.

## Dependencies
- Core: `Button`, `Tooltip`, `pane-header-classes.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<PaneToolbarButton icon={<HiOutlineSearch size={16} />} label="Search" aria-label="Command palette" shortcut="⌘K" onClick={open} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| icon | `ReactNode` |  | Glyph |
| label | `string` |  | Shown under the icon in "Icon and Text"; default accessible name and tooltip |
| onClick | `(event) => void` |  | Action |
| shortcut? | `string` |  | Shown in the tooltip |
| tooltip? | `string` |  | Tooltip text when it differs from the label |
| tooltipPosition? | `"bottom" \| "bottom-start" \| "bottom-end"` | `"bottom"` | `bottom-start` / `bottom-end` near the left / right edge |
| active? | `boolean` | `false` | Pressed / open look |
| …button attributes |  |  | Passed through |
