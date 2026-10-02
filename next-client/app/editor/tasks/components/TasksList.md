# TasksList

Description: Vault-wide task list extracted from note metadata, with search, tag and due filters, grouping (by status or file), sorting, and in-place status write-back.

## Local State & Storage
- State: `atom_visibleTasks` (count and empty state), `atom_filteredTasks`, `atom_allTaskTags`, `atom_taskSearchQuery`, `atom_taskTagFilter`, `atom_taskDueFilter`, `atom_tasksGroupBy`, `atom_fileMetadata`. Sort (default `dueDate:asc`) and collapsed groups and files are local useState.
- Persistence: `localStorage["tasksGroupBy"]`. Status changes are written back to the local Markdown files through `useTaskWriteback`.

## Privacy
- Tasks come from `atom_visibleTasks`: tasks in sensitive notes are masked (text and tags, see [`TaskRow`](TaskRow.md)) and never match the text search or tag filters; in Privacy Mode "hidden" they're left out and not counted. The checkbox still writes back (`useTaskWriteback` uses the task's raw line, which masking keeps off screen).

## Dependencies
- Core: [`TaskRow`](TaskRow.md), `SelectControl`, `task-sort`, `app/utils/taskExtractor`, `react-icons`.
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
