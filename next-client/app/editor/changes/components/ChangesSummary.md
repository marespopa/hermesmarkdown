# ChangesSummary

Description: The top of the Changes page. "N files changed", the total `+added` (`text-task-done`) and `−removed` (`text-danger`) lines, the short HEAD commit, whether the scan is done (`status`, a [ScanStatus](ScanStatus.md): **Up to date**, or "Checking N of M files…" while a scan runs), **Collapse All** / **Expand All**, and a list of changed files (status letter A / M / D, path, +/−). A row calls `onJump(path)`; the page expands that section and scrolls to it.

| Prop | Type | Description |
|---|---|---|
| `files` | `ChangedFile[]` | The changed files, sorted by path |
| `commit` | `string \| null` | HEAD's commit id (first 7 characters shown) |
| `status` | `ReactNode` | Optional; the scan's state, after the commit |
| `onJump` | `(path) => void` | A file row was clicked |
| `onCollapseAll` / `onExpandAll` | `() => void` | The buttons |

Binary files count as 0 lines and show "—" for their +/−.
