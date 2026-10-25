# DiffLines

Description: The rows of a unified diff (`DiffRow[]` from `diff-layout.ts`): old and new line numbers, a sign (`+` on the task-done tint, `−` on the danger tint, nothing on context) and the text, wrapped. Folded stretches are full-width "Show N unchanged lines" buttons. Rows are read only: clicking one opens nothing (the section's **Open file** button does), so text can be selected and copied. On narrow screens the number columns shrink.

| Prop | Type | Description |
|---|---|---|
| `rows` | `DiffRow[]` | The laid-out rows |
| `onExpandGap` | `(id) => void` | A gap button was clicked |
