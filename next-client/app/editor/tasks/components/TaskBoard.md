# TaskBoard

Description: The Tasks page's **Board** view: a Kanban column per status, To Do `[ ]`, In Progress `[/]`, On Hold `[!]` and Done `[x]` (`BOARD_STATUSES`, built by `buildBoardColumns` in `task-views.ts`; cancelled tasks stay off). Each column is a [`TaskSection`](TaskSection.md) with the status ring, title and count; each card is a [`TaskRow`](TaskRow.md) from the parent, so the ring, the status menu (with Open Note), double-click and swipe all work as in the lists. Uses the existing task data; nothing new is stored.

## Logic
- Drag and drop (HTML5): dragging a card marks the other columns as targets (tinted while hovered, an empty one reads "Drop here"); dropping calls `onMove(task, status)`. Dropping on the card's own column does nothing.
- Cards are sorted by due date. Empty columns stay, so there's always somewhere to drop.
- Layout: columns at least 15rem wide in one row; on a narrow screen they scroll sideways and snap a column at a time. Each column scrolls on its own.
- Touch: HTML5 drag doesn't start from touch, so on phones a status changes through the ring, its menu or a swipe.

## Local State & Storage
- State: the card being dragged and the column under it.
- Persistence: none.

## Dependencies
- Core: `TaskSection`, `task-views` (`TaskSectionData`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<TaskBoard
  columns={buildBoardColumns(tasks, noteTitle)}
  renderCard={(task) => <TaskRow task={task} … />}
  onMove={(task, status) => changeStatus(task, status, false)}
/>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| columns | `TaskSectionData<DisplayTask>[]` |  | One per status, in order |
| renderCard | `(task: DisplayTask) => ReactNode` |  | A card's content |
| onMove | `(task: DisplayTask, status: TaskStatus) => void` |  | A card dropped on another column |
