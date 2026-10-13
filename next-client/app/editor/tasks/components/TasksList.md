# TasksList

Description: Vault-wide task list extracted from note metadata, shown as the Board (the default, first in the switcher) or one of four lists (Now, Today, Upcoming, All; see `task-views.ts`) under [`TasksToolbar`](TasksToolbar.md), with search and tag filters and in-place status write-back. Now, Today and Upcoming show fixed sections of open tasks. All groups by status (follows the box character, `task.status`: In Progress, To Do, On Hold, Done, Cancelled; Done and Cancelled start collapsed) or by note, with the toolbar menu's sort. Board shows a column per status (`buildBoardColumns`: To Do, In Progress, On Hold, Done; cancelled tasks stay off) through [`TaskBoard`](TaskBoard.md). Sections render through [`TaskSection`](TaskSection.md); every list, grouping and the board is built as one array of groups.

## Opening a task's note
- `handleNavigate` takes the note's handle from `atom_fileMetadata`, or, when the entry has none (restored from the index cache), resolves it from `atom_vaultHandle` by path (`resolveFileHandleAtPath`). If neither works, an error toast says the note couldn't be found instead of doing nothing.

## Status changes
- A card dropped on another board column calls `changeStatus` with `lingerFirst` false: no hold, the card moves once the line is written; the toast and Undo are the same.
- A change from a row (ring click, status menu, swipe) goes through `changeStatus`: `useTaskLinger` holds the list still for 1.2 s, the changed row showing its new status in place (each further change restarts the beat; switching list, grouping, sort or filters lets go at once), then `setTaskStatus` writes the line, then `showUndoToast` says what happened ("Completed “Ship report”", or "a task" for a masked one). Undo calls `restoreTaskLine`, which puts the line back exactly as it was, stamps included. Toasts share the id `task-status`, so only the latest offers Undo. No toast when the write fails.

## Local State & Storage
- State: `atom_vaultHandle`, `atom_visibleTasks` (count and empty state), `atom_filteredTasks`, `atom_allTaskTags`, `atom_taskSearchQuery`, `atom_taskTagFilter`, `atom_taskView`, `atom_tasksGroupBy`, `atom_fileMetadata`. Sort (default `dueDate:asc`) and collapsed groups and files are local useState.
- Persistence: `localStorage["tasksView"]` (default `board`) and `localStorage["tasksGroupBy"]`. Status changes are written back to the local Markdown files through `useTaskWriteback`.

## Privacy
- Tasks come from `atom_visibleTasks`: tasks in private notes are masked (text and tags, see [`TaskRow`](TaskRow.md)) and never match the text search or tag filters; in Privacy Mode "Hide from lists" (`hidden`) they're left out and not counted. The status ring still writes back (`useTaskWriteback` uses the task's raw line, which masking keeps off screen).

## Dependencies
- Core: [`TasksToolbar`](TasksToolbar.md), [`TaskBoard`](TaskBoard.md), [`TaskSection`](TaskSection.md), [`TaskRow`](TaskRow.md), `use-task-linger`, `showUndoToast`, `task-views`, `task-sort`, `app/utils/taskExtractor`, `app/utils/task-status`, `react-icons`.
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
