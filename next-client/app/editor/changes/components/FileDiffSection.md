# FileDiffSection

Description: One changed file on the Changes page. A sticky header with a chevron toggle (`aria-expanded`), the path (plain text), the status word, +/− and an **Open file** button (only when the file can be opened; it opens the file at its first change, the only way the page leaves for the editor); below it the unified diff (`DiffLines`) or a message: "Binary file", "File too large to show", "Couldn't read this file", "Diff not loaded — too many changes", "Empty file". A collapsed section renders no rows. The section uses `content-visibility: auto`.

State: the expanded gaps, kept until the file's `diff` changes identity (a scan that changed the file: the page keeps unchanged files' objects, `reuse-result.ts`). Memoized (`React.memo`): with the page's stable callbacks, a rescan re-renders only the sections whose file changed.

| Prop | Type | Description |
|---|---|---|
| `file` | `ChangedFile` | The file and its diff |
| `collapsed` | `boolean` | Whether the body is hidden |
| `onCollapse` | `(path, collapsed) => void` | The chevron: this file's path and its new state |
| `onOpen` | `(path, line) => void` (optional) | Opens a file at a line; omitted for deleted and non-text files |
| `pathLine` | `number` | The line **Open file** opens (first change) |
| `id` | `string` | DOM id for the jump |

Exports `Counts`, the +/− pair shared with `ChangesSummary`.
