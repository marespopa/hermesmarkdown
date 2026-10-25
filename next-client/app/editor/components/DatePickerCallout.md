# DatePickerCallout

Description: Calendar dialog for picking or replacing a date in the editor, with keyboard navigation and quick relative actions.

## Local State & Storage
- State: Viewed month and focused day (useState/useMemo).
- Persistence: None - transient UI state.
- Works on a `Date` value and offers Today, Tomorrow, +1 week and +1 month shortcuts. Detecting and rewriting date text in its original format (ISO `YYYY-MM-DD` or a datetime such as `2026-10-24T15:14:54Z`, whose time is kept when a new day is picked; wiki `[[YYYY-MM-DD]]`, slashed, dotted) happens in the caller via `editor/utils/date-detection.ts` and `components/regex.ts`.

## Dependencies
- Core: `DialogModal`, `Button`, `react-icons`.
- Callers: `EditorPills` (date under the caret), the template date field, and `markdown-editor/FrontmatterHeaderMenus` (a frontmatter header date chip, writing `YYYY-MM-DD` and keeping a datetime's time).
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
| keptTime | `string?` |  | Time of an ISO datetime (e.g. `15:14:54Z`), shown read-only under the month as "Keeps time …"; the caller keeps it when a day is picked |
| onSelectDate | `(date: Date) => void` |  | Selection handler |
| onClose | `() => void` |  | Dismiss handler |
