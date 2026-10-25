# ChangesSummary

Description: The top of the Changes page. "N files changed", the total `+added` (`text-task-done`) and `−removed` (`text-danger`) lines, the short HEAD commit, **Collapse All** / **Expand All**, and a list of changed files (status letter A / M / D, path, +/−). A row calls `onJump(path)`; the page expands that section and scrolls to it.

| Prop | Type | Description |
|---|---|---|
| `files` | `ChangedFile[]` | The changed files, sorted by path |
| `commit` | `string \| null` | HEAD's commit id (first 7 characters shown) |
| `onJump` | `(path) => void` | A file row was clicked |
| `onCollapseAll` / `onExpandAll` | `() => void` | The buttons |

Binary files count as 0 lines and show "—" for their +/−.
