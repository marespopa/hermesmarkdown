# SearchPill

Description: The command palette's way in, as a search button: the app's main way in. It sits in every page's title bar (`ShellPage`) and, in the editor, in the window's top-right corner (`EditorShell`), the corner the AI companion's icon used to take: a `SEARCH_PILL_WIDTH` (`2rem`) square with the magnifier centered, like the other corner buttons (the width is exported so the editor's floating title keeps clear of it); a hover shows the shared `Tooltip` with the shortcut. The home feed has its own, larger search bar (`FeedBar`). A click (or Ctrl/Cmd+P anywhere, or pressing Shift twice) opens the palette, which appears as one panel; the button doesn't morph into it. Outside a `CommandPaletteProvider` (a page under test) it renders nothing (`useOptionalCommandPalette`).

## Local State & Storage
- State: none (it only calls the palette's `open`).
- Persistence: None.

## Dependencies
- Core: `useOptionalCommandPalette`, `SEARCH_OR_CREATE_PLACEHOLDER` (`palette-model`), `Button`, `Tooltip`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<SearchPill className="shrink" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| className? | `string` | `""` | Placement (e.g. `shrink`, or `fixed` in the editor corner) |
