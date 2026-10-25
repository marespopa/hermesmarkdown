# DiffLines

Description: The rows of a unified diff (`DiffRow[]` from `diff-layout.ts`): old and new line numbers, a sign (`+` on the task-done tint, `−` on the danger tint, nothing on context) and the text, wrapped. Folded stretches are full-width "Show N unchanged lines" buttons. A single click handler on the container reads `data-line` from the clicked row and calls `onOpen(line)`; without `onOpen` rows have no `data-line` and show `cursor-default`. On narrow screens the number columns shrink.

| Prop | Type | Description |
|---|---|---|
| `rows` | `DiffRow[]` | The laid-out rows |
| `onOpen` | `(line) => void` (optional) | Open the file at a line |
| `onExpandGap` | `(id) => void` | A gap button was clicked |
