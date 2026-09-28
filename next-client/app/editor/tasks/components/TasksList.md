# TasksList

Description: Vault-wide task list extracted from note metadata, with search, tag and due filters, grouping (by status or file), sorting, and in-place status write-back.

## Local State & Storage
- State: `atom_allTasks`, `atom_filteredTasks`, `atom_allTaskTags`, `atom_taskSearchQuery`, `atom_taskTagFilter`, `atom_taskDueFilter`, `atom_tasksGroupBy`, `atom_fileMetadata`. Sort (default `dueDate:asc`) and collapsed groups and files are local useState.
- Persistence: `localStorage["tasksGroupBy"]`. Status changes are written back to the local Markdown files through `useTaskWriteback`.

## Dependencies
- Core: `SelectControl`, `task-sort`, `app/utils/taskExtractor`, `react-icons`.
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
