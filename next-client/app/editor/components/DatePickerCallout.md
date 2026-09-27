# DatePickerCallout

Description: Calendar dialog for picking or replacing a date in the editor, with keyboard navigation and quick relative actions.

## Local State & Storage
- State: Viewed month and focused day (useState/useMemo).
- Persistence: None - transient UI state.
- Handles ISO (`YYYY-MM-DD`), wiki (`[[YYYY-MM-DD]]`), slashed (`MM/DD/YYYY`) and dotted (`DD.MM.YYYY`) formats, and offers Today, Tomorrow, +1 week and +1 month shortcuts.

## Dependencies
- Core: `DialogModal`, `Button`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import DatePickerCallout from "./DatePickerCallout";

<DatePickerCallout isOpen={open} initialDate={new Date()} onSelectDate={insertDate} onClose={close} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isOpen | `boolean` |  | Visibility |
| initialDate | `Date` |  | Focused date on open |
| onSelectDate | `(date: Date) => void` |  | Selection handler |
| onClose | `() => void` |  | Dismiss handler |
