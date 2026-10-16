# OverlayLayer

Description: Shared overlay primitives. `OverlayPanel` provides a portal, positioning, dismissal, focus trap, and scroll lock. `OverlayBackdrop` renders the dim or transparent backdrop. `modal` and `sheet` overlays end at the top of the on-screen keyboard where it overlays the page instead of resizing it (iOS Safari), via `useKeyboardInset`.

## Local State & Storage
- State: Mount/exit-animation state, dismissal, scroll lock and focus logic live in `useOverlay.ts` (`useOverlayDismissal`); the panel element ref is the only local state.
- Persistence: None - transient UI state.

## Dependencies
- Core: `Portal`, `useKeyboardInset`, `overlay-types.ts`.
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
| dismissOn? | `("escape" \| "click-outside" \| "mouse-leave")[]` | `["escape", "click-outside"]` | Dismiss triggers |
| exitDurationMs? | `number` | `0` | Keeps it mounted for the exit animation |
| lockScroll? | `boolean` | `true` for `modal` / `sheet` | Locks body scroll while open |
| disableFocusTrap? | `boolean` | `false` | Disables the focus trap |
| ariaLabelledBy? / ariaDescribedBy? | `string` |  | ARIA ids |
| onConfirm? | `() => void` |  | Enter handler |
| containerClassName? / panelClassName? / backdropClassName? | `string` | `""` | Styling hooks |
| panelStyle? | `CSSProperties` |  | Inline styles for runtime values (e.g. a keyboard-fitted max height) |
| role? | `string` | `"dialog"` | ARIA role |

`OverlayBackdrop`: `variant`, `onClick?`, `className?`.
