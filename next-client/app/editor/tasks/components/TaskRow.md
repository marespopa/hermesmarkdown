# TaskRow

Description: One task on the Tasks page: a checkbox, the task text, and a line with the file subtitle, due date and `#tags`. Also exports `formatDueDate` (Overdue / Due: Today / Due: date labels and colors).

## Local State & Storage
- State: None (presentational).
- Persistence: None. The parent writes status changes back through `useTaskWriteback`.

## Logic
- `task` is a `DisplayTask` from `atom_visibleTasks`. When `isMasked` (the task is in a sensitive note), the text is `MASKED_TEXT` (`aria-hidden`, with sr-only "Sensitive task"), a `SensitiveBadge` follows it, and no tag pills are shown. The checkbox, navigation, due date and subtitle work as usual.

## Dependencies
- Core: `Button`, `SensitiveBadge`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import TaskRow from "@/app/editor/tasks/components/TaskRow";

<TaskRow task={task} subtitle={noteTitle(task.path)} onToggle={() => toggleTask(task)} onNavigate={() => open(task)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| task | `DisplayTask` |  | The task (masked when `isMasked`) |
| subtitle? | `string` |  | Note title, shown when grouped by status |
| onToggle | `() => void` |  | Checkbox change |
| onNavigate | `() => void` |  | Opens the task's source line |
