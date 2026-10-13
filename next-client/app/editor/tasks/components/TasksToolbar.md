# TasksToolbar

Description: The Tasks page's one toolbar. The top row holds the "Tasks" title, the total count, and (in All only) a ⋯ button whose menu groups by status or by note and sorts by due date, priority, status, note or title, ascending or descending. Below it sits a segmented control switching between Board · Now · Today · Upcoming · All (Board first, the default), each with its count, then one search field (`UnifiedSearchInput`) where typing `#` picks tag filters, shown as chips under the field. Also exports `taskListMenuItems` (the menu's items).

## Local State & Storage
- State: `menuAt`, where the ⋯ menu is open (null while closed).
- Persistence: None here. The parent keeps the view and grouping (`atom_taskView`, `atom_tasksGroupBy`, both in localStorage), sort, search and tags.

## Logic
- Picking a sort field starts it in its natural direction (priority: high first; everything else ascending); Ascending / Descending flip the current field.
- The segmented control is a `tablist`; each segment is a `tab` with `aria-selected`.
- The menu is `TabContextMenu`, anchored to the ⋯ button so a second press closes it.

## Dependencies
- Core: `Button`, `TabContextMenu`, `UnifiedSearchInput`, `task-views` (`TASK_VIEWS`), `task-sort` types.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import TasksToolbar from "@/app/editor/tasks/components/TasksToolbar";

<TasksToolbar view={view} counts={counts} onViewChange={setView} groupBy={groupBy} onGroupByChange={setGroupBy}
  sort={sort} onSortChange={setSort} searchQuery={q} onSearchQueryChange={setQ}
  tagFilter={tags} allTags={allTags} onTagAdd={addTag} onTagRemove={removeTag} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| view | `TaskView` |  | The list showing: `now`, `today`, `upcoming` or `all` |
| counts | `Record<TaskView, number>` |  | Tasks per list (`all` is also the title's count) |
| onViewChange | `(view: TaskView) => void` |  | A segment picked |
| groupBy / onGroupByChange | `"status" \| "file"` / setter |  | All's grouping |
| sort / onSortChange | `` `${TaskSortField}:${TaskSortDirection}` `` / setter |  | All's sort |
| searchQuery / onSearchQueryChange | `string` / setter |  | Text filter |
| tagFilter | `string[]` |  | Picked tags |
| allTags | `string[]` |  | Tag suggestions |
| onTagAdd / onTagRemove | `(tag: string) => void` |  | Tag chip changes |
