# Command Palette

Shared command and quick-open surface. See [CommandPalette.md](./CommandPalette.md) for state, storage, and API.

| File | Role |
|---|---|
| `CommandPaletteContext.tsx` | `CommandPaletteProvider`, `useCommandPalette`, `useRegisterCommand`, `Command` type |
| `CommandPalette.tsx` | Palette UI: search, ranking, execution; theme / settings actions in the footer |
| `PaletteSearchBar.tsx` | The search field, drawn as the same pill as the home feed's search bar: icon, input, clear, ⌘K hint, and a `>` button that toggles command mode |
| `AppCommands.tsx` | Global app commands: home, editor, docs, settings, theme, shortcuts |
| `command-search.ts` | Client-side matching and ranking |
| `palette-model.tsx` | Constants, row / scope types, `buildCreateRow`, `buildTaskRows` (masked tasks only for the empty `!` query), and small helpers |
| `use-palette-files.ts` | `usePaletteFiles(showHiddenFiles)`: the file list filtered through `atom_noteDisplayItems` (Privacy Mode), `filesByTag`, and `existingFiles` (unfiltered, used only to decide the Create row) |

## Command contract
- Register with `useRegisterCommand`. IDs must be stable and globally unique.
- Register thin adapters over shared actions, so that buttons, menus, shortcuts, and commands share confirmation and error handling.
- When a command is relevant but unavailable, keep it visible with a `disabledReason` rather than hiding it.

## Search and keyboard
- `Ctrl/Cmd+K` or `Ctrl/Cmd+P` opens file search. `Ctrl/Cmd+Shift+K` or `Ctrl/Cmd+Shift+P` opens with `>` prefilled. At most 12 rows are visible at once (`MAX_VISIBLE_ROWS`).
- Prefixes stay in the input: `#` tags, `>` commands, `!` tasks, `@` headings. With no prefix, the query searches files.
- The empty query lists pinned items (max 5, toggled with `Ctrl/Cmd+D`), up to 5 recent files, top actions, and up to 3 frequently used commands.
- Ranking order: title prefix, then title fuzzy/substring, then path. No network requests.
- A file query with no exact title match ends with a `Create "<query>"` row when the editor has registered a create handler (`setCreateNote`).
- Sensitive notes (frontmatter `sensitive: true`, `private: true` or a `sensitive` / `private` tag) get a lock on their file rows; their `!` tasks show as `••••••••` with a lock, only for the empty `!` query, never matched by text. In Privacy Mode "hidden" they're left out of search, `#tag`, recent and pinned rows (stored pins and recents are untouched).
- Arrow keys move the selection, Enter runs, Escape closes. Uses combobox/listbox semantics.
