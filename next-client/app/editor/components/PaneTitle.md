# PaneTitle

Description: The pane's quiet title, in place of a tab strip: the note in front by name (without `.md`; "No note open" when the pane is empty), and a small dot beside it only while the note is unsaved, saving or failed to save (`statusDot` in `save-state.tsx`; the error dot's tooltip is the error). It is the way into the command palette, the center of the app: a click opens the palette (tooltip "Go to a note or command", Ctrl/Cmd+K) and a right-click opens the note's menu. Its accessible name says both: "Roadmap — Unsaved changes. Go to a note or command".

## Local State & Storage
- State: None (props only).
- Persistence: None.

## Dependencies
- Core: `Button` (`unstyled`), `Tooltip`, `save-state.tsx`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<PaneTitle title="Roadmap" saveState="dirty" onOpen={openPalette} onContextMenu={openNoteMenu} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| title | `string \| null` |  | The note's name as shown; null when nothing is open |
| saveState | `SaveState` |  | Drives the dot (shown for `dirty`, `saving`, `error`) |
| saveErrorMessage? | `string` |  | The error dot's tooltip |
| onOpen | `() => void` |  | Opens the command palette |
| onContextMenu | `(event) => void` |  | Opens the note's menu |
