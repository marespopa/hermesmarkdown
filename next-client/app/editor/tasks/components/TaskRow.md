# TaskRow

Description: One task on the Tasks page: a status ring ([`TaskStatusButton`](TaskStatusButton.md)), the task text, a line with the file subtitle, due date and `#tags`, and a ⋯ button (shown on hover, always on touch) that opens the status menu. Done tasks are struck and faded, cancelled ones struck and fainter. Under the text, besides the subtitle, due date and tags, a work date from the task's stamps (`workDateLabel`): "Started 2 days ago" while in progress or on hold, "Done today" once done. On touch and pen, the row swipes (`use-task-swipe.ts`): right moves the task forward (Start, Complete, Resume, Reopen), left sets it aside (Hold, or Cancel when on hold). The action's color and label show behind the row, arm past 80px (a short vibration where supported), run on release, and the row springs back. A swipe never also opens the note or ticks the box. Also exports `formatDueDate` (Overdue / Due: Today / Due: date labels and colors; a done or cancelled task's date never warns).

## Local State & Storage
- State: `menuAt`, where the ⋯ button opened the status menu (null while closed); the swipe's offset and armed state (`useTaskSwipe`).
- Persistence: None. The parent writes status changes back through `useTaskWriteback`.

## Logic
- `task` is a `DisplayTask` from `atom_visibleTasks`. When `isMasked` (the task is in a private note), the text is `MASKED_TEXT` (`aria-hidden`, with sr-only "Private task"), a `PrivateBadge` follows it, and no tag pills are shown. The status ring, navigation, due date and subtitle work as usual.

## Dependencies
- Core: `Button`, `PrivateBadge`, `TaskStatusButton`, `useTaskSwipe`, `task-views` (`workDateLabel`, `localISODate`), `app/utils/task-status`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import TaskRow from "@/app/editor/tasks/components/TaskRow";

<TaskRow task={task} subtitle={noteTitle(task.path)} onToggle={() => toggleTask(task)} onSetStatus={(status) => setTaskStatus(task, status)} onNavigate={() => open(task)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| task | `DisplayTask` |  | The task (masked when `isMasked`) |
| subtitle? | `string` |  | Note title, shown when grouped by status |
| onToggle | `() => void` |  | Click on the ring: complete, or reopen a done/cancelled task |
| onSetStatus | `(status: TaskStatus) => void` |  | A status picked from the menu |
| onNavigate | `() => void` |  | Opens the task's source line |
