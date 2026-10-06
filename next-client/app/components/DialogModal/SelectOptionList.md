# SelectOptionList

Description: The choices of a `GlobalDialog` "select" dialog (e.g. the folder picker for a new note), as folder-icon buttons. Past six options it adds a filter field: typing narrows the list, ↑/↓ move the highlight, Return chooses (without letting the dialog's own Return close it unchosen), and "No matches" shows when nothing fits. The list scrolls within the dialog (`max-h-[50vh]`).

## Local State & Storage
- State: The filter text and highlighted index.
- Persistence: None.

## Dependencies
- Core: `Button`, `BareInput`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import SelectOptionList from "./SelectOptionList";

<SelectOptionList options={config.options} onSelect={(value) => config.resolve(value)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| options | `DialogSelectOption[]` | | `{ label, value }` choices |
| onSelect | `(value: string) => void` | | Called with the chosen value |
