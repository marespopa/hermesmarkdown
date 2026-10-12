# TasksList

Description: Vault-wide task list extracted from note metadata, shown as one of four lists (Now, Today, Upcoming, All; see `task-views.ts`) under [`TasksToolbar`](TasksToolbar.md), with search and tag filters and in-place status write-back. Now, Today and Upcoming show fixed sections of open tasks. All groups by status (follows the box character, `task.status`: In Progress, To Do, On Hold, Done, Cancelled; Done and Cancelled start collapsed) or by note, with the toolbar menu's sort. Sections render through [`TaskSection`](TaskSection.md); every list and grouping is built as one array of groups.

## Status changes
- A change from a row (ring click, status menu, swipe) goes through `changeStatus`: `useTaskLinger` holds the list still for 1.2 s, the changed row showing its new status in place (each further change restarts the beat; switching list, grouping, sort or filters lets go at once), then `setTaskStatus` writes the line, then `showUndoToast` says what happened ("Completed “Ship report”", or "a task" for a masked one). Undo calls `restoreTaskLine`, which puts the line back exactly as it was, stamps included. Toasts share the id `task-status`, so only the latest offers Undo. No toast when the write fails.

## Local State & Storage
- State: `atom_visibleTasks` (count and empty state), `atom_filteredTasks`, `atom_allTaskTags`, `atom_taskSearchQuery`, `atom_taskTagFilter`, `atom_taskView`, `atom_tasksGroupBy`, `atom_fileMetadata`. Sort (default `dueDate:asc`) and collapsed groups and files are local useState.
- Persistence: `localStorage["tasksView"]` and `localStorage["tasksGroupBy"]`. Status changes are written back to the local Markdown files through `useTaskWriteback`.

## Privacy
- Tasks come from `atom_visibleTasks`: tasks in sensitive notes are masked (text and tags, see [`TaskRow`](TaskRow.md)) and never match the text search or tag filters; in Privacy Mode "hidden" they're left out and not counted. The status ring still writes back (`useTaskWriteback` uses the task's raw line, which masking keeps off screen).

## Dependencies
- Core: [`TasksToolbar`](TasksToolbar.md), [`TaskSection`](TaskSection.md), [`TaskRow`](TaskRow.md), `use-task-linger`, `showUndoToast`, `task-views`, `task-sort`, `app/utils/taskExtractor`, `app/utils/task-status`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import TasksList from "@/app/editor/tasks/components/TasksList";

<TasksList onFileSelect={(handle, path, line) => openAt(handle, path, line)} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onFileSelect | `(handle: FileSystemFileHandle, path: string, line: number) => void` |  | Opens the task's source line |
