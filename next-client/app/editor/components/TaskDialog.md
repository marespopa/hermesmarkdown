# TaskDialog

Description: Form for building a task line (title, status, priority, due date, tags). It returns the Markdown task text through `buildTaskText`. Below the date field, Today / Tomorrow / +1 Week are a segmented control (`aria-pressed` on the one matching the date), with a small Clear button once a date is set.

## Local State & Storage
- State: Form fields (useState).
- Persistence: None - transient UI state.

## Dependencies
- Core: `DialogModal`, `Button`, `Input`, `utils/task-template`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import TaskDialog from "./components/TaskDialog";

<TaskDialog isOpen={open} onClose={close} onConfirm={(text) => insert(text)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isOpen | `boolean` |  | Visibility |
| onClose | `() => void` |  | Dismiss handler |
| onConfirm | `(value: string) => void` |  | Receives the task Markdown |
