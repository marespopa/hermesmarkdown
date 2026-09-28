# WorkflowPill

Description: Floating pill on a workflow tag (for example `#todo`) with prev/next arrows to cycle its state.

## Local State & Storage
- State: None (controlled).
- Persistence: None - transient UI state.

## Dependencies
- Core: `Button`, `constants` (`TAG_COLORS`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import { WorkflowPill } from "./WorkflowPill";

<WorkflowPill tag="todo" pos={{ top, left }} onPrev={prev} onNext={next} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| tag | `string` |  | Current state |
| pos | `{ top: number; left: number }` |  | Screen position |
| onPrev / onNext | `() => void` |  | Cycle handlers |
| noHash? | `boolean` |  | Hides the `#` prefix |
