# TabContextMenu

Description: Pop-up menu positioned at a point and clamped to the viewport (`role="menu"`): tab and file context menus, the toolbar's **More** menu, and the toolbar's own context menu (Icon Only / Icon and Text). Items can show a trailing shortcut and a check (`menuitemcheckbox`). Closes on outside click or Escape. Rendered into `document.body` through `createPortal` (`fixed z-50`), so it paints above editor overlays such as the frontmatter × even though it opens from inside the pane header's `z-20` stacking context.

## Local State & Storage
- State: Clamped position (useState/useLayoutEffect) and a ref for outside clicks.
- Persistence: None - transient UI state.

## Dependencies
- Core: `Button`.
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
