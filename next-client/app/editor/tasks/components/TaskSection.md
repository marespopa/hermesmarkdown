# TaskSection

Description: A titled run of task rows on the Tasks page: a small-caps caption with an optional status ring (`TaskStatusIcon`), the title and the count, over its rows. Collapsible (chevron, `aria-expanded`) when `onToggle` is given, as All's groups are; the smart lists' sections (In Progress, Up Next, Overdue, a day in Upcoming, …) are plain headings that always stay open.

## Local State & Storage
- State: None (the parent owns `collapsed`).
- Persistence: None.

## Dependencies
- Core: `Button`, `TaskStatusIcon`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import TaskSection from "@/app/editor/tasks/components/TaskSection";

<TaskSection title="In Progress" count={tasks.length} status="prog">{rows}</TaskSection>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| title | `string` |  | Caption (also the section's accessible name) |
| count | `number` |  | Shown after the title |
| status? | `TaskStatus` |  | Ring drawn before the title |
| overdue? | `boolean` |  | Title in the warning color |
| caps? | `boolean` | `true` | Small caps; note titles pass `false` |
| collapsed? | `boolean` | `false` | Rows hidden |
| onToggle? | `() => void` |  | Makes the caption a collapse toggle |
| children | `ReactNode` |  | The rows |
