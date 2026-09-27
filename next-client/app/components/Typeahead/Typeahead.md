# Typeahead

Description: Input with a portaled suggestion list filtered from local options, supporting comma-separated multi-values (for example tags).

## Local State & Storage
- State: Open state, highlighted index, and dropdown position (useState/useRef).
- Persistence: None - transient UI state.

## Dependencies
- Core: `Input`, `Portal`.
- Zero-Cloud: No network or telemetry side effects. Suggestions come from the `options` prop.

## Quick Usage
```tsx
import Typeahead from "@/app/components/Typeahead";

<Typeahead name="tags" value={tags} onChange={setTags} options={allTags} allowMultiple />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| name | `string` |  | Input name |
| value | `string` |  | Controlled value |
| onChange | `(val: string) => void` |  | Change handler |
| options | `string[]` |  | Suggestions |
| allowMultiple? | `boolean` | `false` | Comma-separated values |
| onOptionSelect? / onDismiss? | handlers |  | Selection / escape |
| label? / placeholder? / autoFocus? |  |  | Passed through to `Input` |
