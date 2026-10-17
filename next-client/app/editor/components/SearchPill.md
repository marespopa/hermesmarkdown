# SearchPill

Description: The command palette's search field at rest, in toolbar size: the app's main way in. It sits in the pane toolbar (`PaneWindowActions`, top-right pane) and in every page's title bar (`ShellPage`); the home feed has its own, larger one (`FeedBar`). A click (or Ctrl/Cmd+K anywhere) opens the palette. Like the feed's pill it is the palette's morph anchor (`data-palette-anchor` and the shared `PALETTE_SEARCH_TRANSITION` view-transition name), so opening the palette grows the pill into its field, and it turns invisible while the palette is open. Outside a `CommandPaletteProvider` (a page under test) it renders nothing (`useOptionalCommandPalette`).

## Local State & Storage
- State: the palette's `isOpen` (read).
- Persistence: None.

## Dependencies
- Core: `useOptionalCommandPalette`, `SEARCH_OR_CREATE_PLACEHOLDER` / `SEARCH_KBD_CLASS` (`palette-model`), `Button`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<SearchPill className="ml-2 w-[clamp(9rem,22vw,18rem)]" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| className? | `string` | `""` | Width and placement |
