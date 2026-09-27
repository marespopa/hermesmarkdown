# OverlayLayer

Description: Shared overlay primitives. `OverlayPanel` provides a portal, positioning, dismissal, focus trap, and scroll lock. `OverlayBackdrop` renders the dim or transparent backdrop.

## Local State & Storage
- State: Mounted/exit-animation state (useState). Dismissal and focus logic live in `useOverlay.ts`.
- Persistence: None - transient UI state.

## Dependencies
- Core: `Portal`, `overlay-types.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import OverlayPanel from "@/app/components/OverlayLayer/OverlayPanel";

<OverlayPanel isOpen={open} onClose={close} variant="modal" dismissOn={["escape", "click-outside"]}>
  {content}
</OverlayPanel>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isOpen | `boolean` |  | Visibility |
| onClose | `() => void` |  | Dismiss handler |
| variant | `"modal" \| "sheet" \| "edge-panel" \| "popover"` |  | Layout |
| backdrop? | `"dim" \| "transparent" \| "none"` | `"dim"` | Backdrop style |
| dismissOn? | `("escape" \| "click-outside" \| "mouse-leave")[]` |  | Dismiss triggers |
| exitDurationMs? | `number` | `0` | Keeps it mounted for the exit animation |
| lockScroll? / disableFocusTrap? | `boolean` | `disableFocusTrap=false` | Behavior toggles |
| onConfirm? | `() => void` |  | Enter handler |
| containerClassName? / panelClassName? / backdropClassName? | `string` | `""` | Styling hooks |
| role? | `string` | `"dialog"` | ARIA role |

`OverlayBackdrop`: `variant`, `onClick?`, `className?`.
