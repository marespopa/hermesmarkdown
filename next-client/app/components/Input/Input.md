# Input

Description: Labelled text/number/password/date input with clear button, debounce, and password reveal. The barrel also exports `Textarea` and `Select`.

## Local State & Storage
- State: Password-visibility and debounce timer (useState/useRef).
- Persistence: None - transient UI state.

## Dependencies
- Core: React `forwardRef`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import Input, { Textarea, Select } from "@/app/components/Input";

<Input name="title" label="Title" value={v} handleChange={(e) => setV(e.target.value)} onClear={() => setV("")} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| name | `string` |  | Input id/name |
| value | `string \| number \| undefined` |  | Controlled value |
| handleChange | `(e: ChangeEvent<HTMLInputElement>) => void` |  | Change handler |
| label? / helperText? | `string` |  | Label and hint |
| type? | `"number" \| "text" \| "password" \| "date"` | `"text"` | Input type |
| onClear? | `() => void` |  | Shows the clear button |
| debounceMs? / onDebouncedChange? | `number` / handler |  | Debounced change callback |
| selectOnFocus? | `boolean` |  | Selects the text on focus |
| validation? | `{ min: number; max: number }` |  | Numeric bounds |
| autoFocus? | `boolean` |  | Focuses on mount |
| autoComplete? | `string` | `"off"` | Browser autocomplete |
| ...rest | `input` attributes |  | Forwarded to `<input>` |
| inputClassName? / className? | `string` | `""` | Style overrides |

`BareInput` is an unlabelled `<input>` (forwarded ref, `autoComplete="off"`, any input attributes) for search boxes and inline fields styled via `className`.

`Textarea` takes `name, value, handleChange, label?, helperText?`. `Select` takes `name, label, value, options: {value,label}[], handleChange, helperText?, compact?, fullWidth?`.
