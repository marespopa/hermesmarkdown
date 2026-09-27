# TableCallout

Description: Floating toolbar shown when the cursor is inside a pipe table. It offers row/column add and remove, sort, alignment, copy as CSV, remove table, and edit in a dialog.

## Local State & Storage
- State: Expanded sections, pending-delete confirmation, and drag offset (useState/useRef). The toolbar can be dragged.
- Persistence: None - transient UI state.

## Dependencies
- Core: `Button`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects. The toolbar only calls its handlers.

## Quick Usage
```tsx
import { TableCallout } from "./TableCallout";

<TableCallout pos={pos} isMobile={false} isOnHeader={false} currentAlignment="left" {...tableActions} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| pos | `{ top: number; left: number }` |  | Screen position |
| isMobile / isOnHeader | `boolean` |  | Layout context |
| currentAlignment | `string` |  | Column alignment |
| canRemoveRow / canRemoveCol | `boolean` |  | Enables the remove buttons |
| cursorDataRowNumber | `number` |  | Current row |
| onAddRow / onRemoveRow / onAddColumn / onRemoveColumn | `() => void` |  | Structure edits |
| onSortAsc / onSortDesc / onCycleAlign | `() => void` |  | Column ops |
| onRemoveTable / onCopyCSV / onEditDialog | `() => void` |  | Table ops |
