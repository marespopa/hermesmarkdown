# Toggle

Description: Accessible on/off switch for boolean settings.

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
| variant? | `"default" \| "soft"` |  | Style |
