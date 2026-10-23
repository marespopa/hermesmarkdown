# Toggle

Description: Accessible on/off switch for boolean settings, in the iOS look: the accent when on, the strongest gray control fill (`--fill-press`) when off, a white knob with a soft shadow. `variant` is kept for existing callers; both values look the same.

## Local State & Storage
- State: None (controlled).
- Persistence: None - transient UI state.

## Dependencies
- Core: React only.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import Toggle from "@/app/components/Toggle/Toggle.component";

<Toggle active={vim} onChange={setVim} label="Vim mode" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| active | `boolean` |  | Current value |
| onChange | `(v: boolean) => void` |  | Change handler |
| label? | `string` |  | Accessible label |
| variant? | `"default" \| "soft"` | `"default"` | Style |
