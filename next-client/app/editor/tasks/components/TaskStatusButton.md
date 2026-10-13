# TaskStatusButton

Description: A task's status control on the Tasks page: a ring that shows the status (empty for to do, half-filled for in progress, pause bars for on hold, filled with a check for done, dashed for cancelled). A click moves the task on a status, like Ctrl/Cmd+Enter in the editor: to do → in progress → done → to do (on hold resumes, cancelled reopens); its label says what the click does. Right-click (a long press on touch, which fires `contextmenu`) opens a menu of every status, the current one checked, after any `extraItems` (TaskRow's Open Note), set off by a divider. Also exports `TaskStatusIcon` (the ring alone, used in the Tasks page group headers and the menu) and `taskStatusMenuItems`.

## Local State & Storage
- State: `ownMenu`, where a right-click opened the menu. A parent can open the same menu with `menuAt` instead.
- Persistence: None. The parent writes the change back (`useTaskWriteback`).

## Logic
- Status comes from the task's box character (`app/utils/task-status.ts`): `[ ]` todo, `[/]` prog, `[!]` hold, `[x]` done, `[-]` cancelled.
- Colors are the `--task-prog`, `--task-hold` and `--task-done` tokens (globals.scss); to do and cancelled use `--fg-faint`.
- The button is `role="checkbox"`: `aria-checked` is true for done, `mixed` for in progress.
- The menu is `TabContextMenu`. With `menuAt` set, `menuAnchorRef` (the parent's own button) doesn't count as an outside click, so that button can toggle the menu shut.

## Dependencies
- Core: `Button`, `TabContextMenu`, `app/utils/task-status`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import TaskStatusButton from "@/app/editor/tasks/components/TaskStatusButton";

<TaskStatusButton status={task.status} onToggle={() => setTaskStatus(task, cycledStatus(task.status))} onSetStatus={(s) => setTaskStatus(task, s)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| status | `TaskStatus` |  | The task's status |
| onToggle | `() => void` |  | Click: the next status in the cycle (`cycledStatus`) |
| onSetStatus | `(status: TaskStatus) => void` |  | A status picked from the menu |
| menuAt? | `{ x: number; y: number } \| null` |  | Opens the menu at this point (parent-controlled) |
| menuAnchorRef? | `RefObject<HTMLElement \| null>` |  | The parent button that opened `menuAt` |
| onMenuClose? | `() => void` |  | Called when the menu closes |
| extraItems? | `TabContextMenuItem[]` |  | Items shown above the statuses |
