# PageOnlyToggleButton

Description: The button for **No Distraction Mode**, before the search pill in the editor's top-right row, shown only while the mode is on (it is the way out), in the pill look (`PILL_BUTTON_CLASS`), pressed (`aria-pressed`, a deeper fill) while the mode is on. One click and only the page is left: [EditorShell](EditorShell.md) hides the row with the rest of the chrome. The way back is `Ctrl/Cmd+Alt+Z`, the palette's **Exit No Distraction Mode**, or a tap on the very top edge, which brings the row back for a few seconds ([PageOnlyPeek](PageOnlyPeek.md)), where this button, pressed, leaves the mode. A brief toast says so as the mode turns on.

## Local State & Storage
- State: `atom_pageOnly` (session only, never stored).
- Persistence: None.

## Dependencies
- Core: `Button` (`unstyled`), `Tooltip`, `formatShortcut`, `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<PageOnlyToggleButton />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| className? | `string` | `""` | Extra classes |
