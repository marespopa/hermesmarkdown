# SearchPill

Description: The command palette's search field at rest, in toolbar size: the app's main way in. It sits in every page's title bar (`ShellPage`) and, in the editor, in the window's top-right corner at the same spot (`EditorShell`), always `SEARCH_PILL_WIDTH` wide (`clamp(9rem,28vw,18rem)`, exported so the editor's floating title keeps clear of it); the home feed has its own, larger one (`FeedBar`). A click (or Ctrl/Cmd+K anywhere) opens the palette. Like the feed's pill it is the palette's morph anchor (`data-palette-anchor` and the shared `PALETTE_SEARCH_TRANSITION` view-transition name), so opening the palette grows the pill into its field, and it turns invisible while the palette is open. Outside a `CommandPaletteProvider` (a page under test) it renders nothing (`useOptionalCommandPalette`).

## Local State & Storage
- State: the palette's `isOpen` (read).
- Persistence: None.

## Dependencies
- Core: `useOptionalCommandPalette`, `SEARCH_OR_CREATE_PLACEHOLDER` / `SEARCH_KBD_CLASS` (`palette-model`), `Button`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<SearchPill className="shrink" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| className? | `string` | `""` | Placement (e.g. `shrink`, or `fixed` in the editor corner) |
