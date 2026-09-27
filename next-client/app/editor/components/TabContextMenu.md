# TabContextMenu

Description: Right-click menu positioned at the cursor and clamped to the viewport, used for tab and file actions.

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
| items | `TabContextMenuItem[]` |  | `{ label, onClick, disabled?, icon?, divider? }` |
| onClose | `() => void` |  | Dismiss handler |
