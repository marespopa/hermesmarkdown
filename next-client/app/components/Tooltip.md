# Tooltip

Description: Delayed hover tooltip for icon-only controls, with an optional shortcut hint. CSS-only by default; `portal` mode renders into `document.body` so it escapes clipping containers.

## Local State & Storage
- State: None in default mode (pure CSS `group-hover`). In `portal` mode, the trigger's measured rect (set 400ms after mouseenter, cleared on mouseleave/mousedown).
- Persistence: None - transient UI state.

## Dependencies
- Core: React, `Portal` (for `portal` mode).
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
| portal? | `boolean` | `false` | Render via portal with fixed positioning — use inside `overflow` containers that would clip the bubble (e.g. the pane tab strip) |
