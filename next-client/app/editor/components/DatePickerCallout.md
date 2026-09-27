# DatePickerCallout

Description: Calendar dialog for picking or replacing a date in the editor, with keyboard navigation and quick relative actions.

## Local State & Storage
- State: Viewed month and focused day (useState/useMemo).
- Persistence: None - transient UI state.
- Works on a `Date` value and offers Today, Tomorrow, +1 week and +1 month shortcuts. Detecting and rewriting date text in its original format (ISO `YYYY-MM-DD`, wiki `[[YYYY-MM-DD]]`, slashed, dotted) happens in the caller via `editor/utils/date-detection.ts` and `components/regex.ts`.

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
