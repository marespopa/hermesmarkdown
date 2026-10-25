# FileDiffSection

Description: One changed file on the Changes page. A sticky header with a chevron toggle (`aria-expanded`), the path (a button when the file can be opened, plain text otherwise), the status word and +/−; below it the unified diff (`DiffLines`) or a message: "Binary file", "File too large to show", "Couldn't read this file", "Diff not loaded — too many changes", "Empty file". A collapsed section renders no rows. The section uses `content-visibility: auto`.

State: the expanded gaps, kept until the file's `diff` changes identity (the next scan).

| Prop | Type | Description |
|---|---|---|
| `file` | `ChangedFile` | The file and its diff |
| `collapsed` | `boolean` | Whether the body is hidden |
| `onToggle` | `() => void` | The chevron |
| `onOpen` | `(line) => void` (optional) | Opens the file at a line; omitted for deleted and non-text files |
| `pathLine` | `number` | The line the path opens (first change) |
| `id` | `string` | DOM id for the jump |

Exports `Counts`, the +/− pair shared with `ChangesSummary`.
