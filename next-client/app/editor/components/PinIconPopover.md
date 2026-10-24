# PinIconPopover

Description: The emoji picker for a pinned row in the sidebar's Pinned section (`SidebarPinned`'s Set Icon… / Change Icon…), a popover anchored under the row. A compact search field (`BareInput`, placeholder "Search emoji", focused on open) filters the app's local emoji index (`codemirror/emoji-index.ts`: `loadEmojiIndex`, `matchEmojis`; curated emojis first with nothing typed) into a grid of up to 64 square tiles, each named by its emoji's name (`check_mark` → "check mark"); the current icon's tile is pressed. A single emoji pasted into the field (`normalizePinIcon`) is offered as the first tile. **Remove Icon** (a filled secondary button) clears it, disabled when there's none. It shows "Loading emoji…" while the index loads and "No emoji found" with no matches.

Enter picks the first tile, a click picks that one; the popover closes once `onPick` resolves true (the icon was written), and stays open when the write failed (`atom_updatePins` toasts why). Escape or a click outside closes it without writing; Escape doesn't reach the sidebar (which would hide). Rendered into `document.body` in the shared menu look (`MENU_PANEL_CLASS`), kept on screen like `FolderPopover`; focus returns where it was on close.

## Local State & Storage
- State: the loaded index, the query, whether a pick is being saved, the clamped position.
- Persistence: None.

## Dependencies
- Core: `Button`, `BareInput`, `FIELD_COMPACT_CLASS`, `menu-classes.ts`, `emoji-index.ts`, `normalizePinIcon` (`services/pins-model.ts`).
- Zero-Cloud: the emoji index is a local chunk; no network or telemetry side effects.

## Quick Usage
```tsx
<PinIconPopover
  anchor={rowRect}
  current={pin.icon}
  onPick={async (icon) => ["ok", "unchanged"].includes(await setIcon(key, icon))}
  onClose={() => setPicker(null)}
/>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| anchor | `DOMRect` | | The row it hangs under |
| current | `string \| null` | | The pin's icon now (pressed tile; enables Remove Icon) |
| onPick | `(icon: string \| null) => Promise<boolean>` | | Saves an icon (null removes it); true once written |
| onClose | `() => void` | | Closes the popover |
