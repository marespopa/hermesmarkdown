# CalloutTypeMenu

Description: Dropdown of the callout types (`CALLOUT_META`: note, abstract, info, tip, success, question, warning, failure, danger, bug, example, quote), each with its icon in its color, the current type checked. Opens right after `/callout` or `/collapse` inserts one. Picking a type rewrites only the word inside `[!…]`, so a fold sign (`-` / `+`) and the title stay; Esc or a click outside leaves the callout as it was. Home or the arrow keys still reveal the raw `> [!type]` for typing a custom type.

## Local State & Storage
- State: None here; the open menu (title line, position, current type) lives in `use-codemirror-callout-type`.
- Persistence: None - transient UI state.

## Dependencies
- Core: `TabContextMenu` (portaled to `document.body` and clamped to the viewport, so it never gets cut off by the editor), `constants/callouts.ts`.
- Requests: `codemirror/callout-type.ts` (`CALLOUT_TYPE_MENU_EVENT`, sent by the slash menu; `setCalloutType`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
const calloutType = useCodeMirrorCalloutType({ viewRef, containerRef });

{calloutType.menu && (
  <CalloutTypeMenu x={calloutType.menu.x} y={calloutType.menu.y} current={calloutType.menu.current}
    onSelect={calloutType.select} onClose={calloutType.close} />
)}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| x, y | `number` | | Viewport point for the menu's top-left corner |
| current | `string` | | The callout's type, aliases resolved (`resolveCalloutType`) |
| onSelect | `(type: string) => void` | | Picked type |
| onClose | `() => void` | | Esc / click outside |
