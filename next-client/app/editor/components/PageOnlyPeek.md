# PageOnlyPeek

Description: Brings the top-corner buttons (Show sidebar, Copy Contents, search; `.corner-peek`, resting invisible, shown on hover or focus) back on a tap or a resting mouse at the top edge, and is the way out of **No Distraction Mode** without a keyboard (a tablet). It is always mounted on the editor, not only in that mode. With the mode on, nothing is left on screen, so a thin strip across the very top of the window (8px, in the page's top margin, clear of the text) answers a finished tap, or a mouse (not a finger) resting on it, by bringing the top-right row back for four seconds (`PEEK_MS`): the button to leave the mode, and the search pill that opens the palette. The row carries `data-page-only-row` and `.page-only-peek`; a press inside it, or on the strip itself, keeps it up another four seconds, a press anywhere else puts it away, as does switching the mode off. It reveals on the finished tap, never the press: on a touch screen the tap that ends under the finger would otherwise land on whatever just appeared there, such as the search pill in the corner and open the palette. The reveal is `data-page-only-peek` on `<html>` (see the `.page-only-peek` rule in `globals.scss`).

## Local State & Storage
- State: `peek` in local `useState`; reads `atom_pageOnly`.
- Persistence: None.

## Dependencies
- Core: `atom_pageOnly`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
{hasSidebar && onEditor && <PageOnlyPeek />}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props; renders nothing while the mode is off |
