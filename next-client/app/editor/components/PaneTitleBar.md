# PaneTitleBar

Description: Desktop header for a pane showing a single note (tab strip auto-hidden). It uses the same bar as the tab strip — chrome background, blur, hairline divider, 44px height — with the note's title (and its unsaved/saving/error dot) centered in place of the tabs. Home feed sits in its own capsule on the left (vault only), as it does in the tab strip; the command palette, AI Chat (only with an AI key set), Save and More (⋯) share the right-hand capsule. It also exports `PANE_HEADER_CLASS`, `PANE_ACTIONS_CLASS` and `PANE_ACTION_BUTTON_CLASS`, which `PaneLeaf`'s tab strip uses so one tab and many tabs look identical.

## Local State & Storage
- State: None (controlled by `PaneLeaf`).
- Persistence: None.

## Dependencies
- Core: `Button`, `Tooltip`, `PaneTab` (`statusDot`, `statusMeta`), `app/utils/platform`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<PaneTitleBar title="Trip ideas" saveState="dirty" onHome={openFeed}
  onOpenPalette={openPalette} onSave={save} onOptions={(rect) => openMenuAt(rect)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| title | `string` |  | Note title (file name without `.md`, or "New note" for the draft) |
| saveState | `TabSaveState` |  | Drives the title dot and the Save icon |
| saveErrorMessage? | `string` |  | Save tooltip on error |
| onHome? | `() => void` |  | Opens the home feed; the button is hidden when omitted |
| onOpenPalette | `() => void` |  | Opens the command palette |
| onOpenAIChat? | `() => void` |  | Opens AI Chat; pass it only when an AI key is set (same trigger as `Ctrl/Cmd+Shift+B`) |
| onSave | `() => void` |  | Saves (a draft is saved into the vault, named from its first line) |
| onOptions | `(anchor: DOMRect) => void` |  | Opens the More menu below the button |
