# TaskDialog

Description: Form for building a task line (title, status, priority, due date, tags). It returns the Markdown task text through `buildTaskText`.

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
