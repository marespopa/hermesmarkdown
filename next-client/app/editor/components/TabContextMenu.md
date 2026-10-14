# TabContextMenu

Description: Pop-up menu positioned at a point and clamped to the viewport (`role="menu"`): tab and file context menus, the toolbar's **More** menu, the Home feed's vault menu and its note rows' menu. Items can show a trailing shortcut and a check (`menuitemcheckbox`); labels may repeat (items are keyed by position too). Also the sidebar's section menus and the Tasks page's menus. It sets the shared menu look (`menu-classes.ts`, also used by the file tree's `TreeContextMenu`): the panel material (`.glass-panel`, `globals.scss`), compact 32px rows (40px on coarse pointers) highlighted by the same quiet fill on hover and keyboard focus, icons in a fixed column, checks in the accent colour, shortcuts faint and right-aligned, hairline separators inset from the edges. It grows out of the corner it opened from. On open, focus goes to the first enabled item; ArrowUp / ArrowDown (wrapping), Home and End move between enabled items; on close, focus returns to what had it before, unless an item moved it elsewhere (a dialog, the editor). Closes on outside click or Escape. Rendered into `document.body` through `createPortal` (`fixed z-50`), so it paints above editor overlays such as the frontmatter × even though it opens from inside the pane header's `z-20` stacking context.

## Local State & Storage
- State: Clamped position and growth corner (useState/useLayoutEffect), a ref for outside clicks and keyboard focus.
- Persistence: None - transient UI state.

## Dependencies
- Core: `Button`, `menu-classes.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import TabContextMenu from "./TabContextMenu";

<TabContextMenu x={e.clientX} y={e.clientY} items={[{ label: "Close", onClick: close }]} onClose={hide} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| x / y | `number` |  | Anchor coordinates |
| items | `TabContextMenuItem[]` |  | `{ label, onClick, disabled?, icon?, divider?, shortcut?, checked? }` — `shortcut` shows faint at the trailing edge; `checked` makes a `menuitemcheckbox` with a check column |
| onClose | `() => void` |  | Dismiss handler |
| label? | `string` |  | Accessible name (`role="menu"`) |
| anchorRef? | `RefObject<HTMLElement>` |  | The button that opened the menu; presses on it aren't outside clicks, so it can toggle the menu shut |
| align? | `"start" \| "end"` | `"start"` | `"end"`: `x` is the menu's right edge, for a menu under a trailing button (the toolbar's More, the sidebar's ⋯) |
