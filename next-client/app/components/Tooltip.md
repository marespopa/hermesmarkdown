# Tooltip

Description: CSS-only delayed hover tooltip for icon-only controls, with an optional shortcut hint.

## Local State & Storage
- State: None (pure CSS `group-hover`).
- Persistence: None - transient UI state.

## Dependencies
- Core: React only.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import Tooltip from "@/app/components/Tooltip";

<Tooltip label="New file" shortcut="⌘N" position="right"><Button variant="icon" /></Tooltip>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| children | `ReactNode` |  | Trigger |
| label | `string` |  | Tooltip text |
| shortcut? | `string` |  | Key hint |
| position? | `"right" \| "top" \| "bottom" \| "bottom-end"` | `"bottom"` | Placement (`bottom-end` for triggers near a right edge) |
