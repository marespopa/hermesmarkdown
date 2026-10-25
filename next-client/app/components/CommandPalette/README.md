# Command Palette

Shared command and quick-open surface. See [CommandPalette.md](./CommandPalette.md) for state, storage, and API.

| File | Role |
|---|---|
| `CommandPaletteContext.tsx` | `CommandPaletteProvider`, `useCommandPalette`, `useRegisterCommand`, `Command` type |
| `CommandPalette.tsx` | Palette UI: search, ranking, execution, menus; the modes in the footer (`PaletteFooter`) |
| `PaletteSearchBar.tsx` | The search field as the panel's top edge (`PALETTE_FIELD_CLASS`; the toolbar's `SearchPill` morphs into it): icon, input, clear |
| `PaletteFooter.tsx` | The foot: a chip per search mode (`#` `!` `@` `/` `~` `>`), the mode in use lit, and the version. See [PaletteFooter.md](./PaletteFooter.md) |
| `use-palette-pins.ts` | The palette's pins: notes are the vault's pinned notes (`pin-atoms.ts`, kept on this device), in pin order, the same ones the sidebar's Pinned section lists; commands are the palette's own (up to 5). |
| `AppCommands.tsx` | App-wide commands, registered once for every route: Open HermesMarkdown Website (the landing page; not offered inside the editor), the editor's pages (Open All Files, Open Tags, Show Changes, Open Trash, and Open Tasks / Open Templates off the editor route), Open Editor, Open Documentation (a new tab), Open Free Tools (not in the editor), Open Settings, `Theme: Light` / `Dark` / `System` (the current one disabled), Show Keyboard Shortcuts. Editor preferences are in `editor/settings/components/SettingsCommands.tsx` |
| `command-search.ts` | Client-side matching and ranking |
| `palette-model.tsx` | Constants (`TOP_LEVEL_MENU`, the empty palette's menu), row / scope types, `commandRow`, `buildMenuRows` (a menu command's rows), `SCOPES` (the modes and their prefixes), `buildTemplateRows` (`~`), `buildCreateRow`, `buildTaskRows` (masked tasks only for the empty `!` query), `buildContentRows` (`/` hits → rows, dropping notes the palette doesn't list), and small helpers |
| `PaletteRow.tsx` | One result row (`Button variant="menu-item"`): label with highlights, lock, context, folder, shortcut / spinner; content rows take two lines. See [PaletteRow.md](./PaletteRow.md) |
| `use-palette-content-search.ts` | `usePaletteContentSearch(active, query, files)`: the `/` scope — 150 ms debounced search in the metadata worker over non-private palette files; rows, status, `pending` / `capped` |
| `use-palette-files.ts` | `usePaletteFiles(showHiddenFiles)`: the file list filtered through `atom_noteDisplayItems` (Privacy Mode), `filesByTag`, and `existingFiles` (unfiltered, used only to decide the Create row) |

## Command contract
- Register with `useRegisterCommand`. A command that takes you away from the note sets `opens`: `"page"` (another page of the app) or `"tab"` (a new browser tab); the palette lists it with the pages, marked. A menu is a command with `subcommands` (plain `Command`s, not registered on their own); keep the top level short and put families of actions in a menu. IDs must be stable and globally unique. Register each command once: app-wide ones in `AppCommands` / `SettingsCommands`, editor ones in `editor/components/editor-commands`.
- Labels are "Verb Object" in title case (Open Settings, Toggle Word Wrap, Export as Markdown), or "Group: Choice" for a set of choices (`Theme: Dark`, `Focus: Off`). Say "note", not "file", for notes.
- Register thin adapters over shared actions, so that buttons, menus, shortcuts, and commands share confirmation and error handling.
- When a command is relevant but unavailable, keep it visible with a `disabledReason` rather than hiding it.

## Search and keyboard
- `Ctrl/Cmd+K` or `Ctrl/Cmd+P` opens file search. `Ctrl/Cmd+Shift+K` or `Ctrl/Cmd+Shift+P` opens with `>` prefilled. At most 12 rows are visible at once (`MAX_VISIBLE_ROWS`).
- Prefixes stay in the input: `#` tags, `!` tasks, `@` headings, `/` note text, `~` templates (Enter inserts into the note in front, `Ctrl/Cmd+Enter` makes a new note from it), `>` commands. The footer's chips enter the same modes. With no prefix, the query searches files. `Ctrl/Cmd+Shift+F` opens with `/` prefilled.
- `/` note text: case-insensitive; every whitespace-separated term must occur in the note body (frontmatter excluded, code included); 2-character minimum; no fuzzy or regex matching. Search runs in the metadata worker. Ranking: exact phrase over scattered words, at most 3 lines per note, 50 hits per response. Choosing a row opens the note and sets `atom_pendingScrollTarget` `{ path, line, column }`, so the caret lands on the first match in that line. Private notes never match, in any Privacy Mode. A footnote shows "Indexing note text… N notes left" while notes are still being indexed, or the size-cap notice.
- The empty query lists pinned items (max 5, toggled with `Ctrl/Cmd+D`) and up to 5 recent notes, then the actions (Search in Files…, Ask or Edit with AI…, New File, Insert template…, Toggle Focus Mode) and, set apart, the pages (Open Tasks, Open Templates, Open Settings, Open Documentation).
- A command with `subcommands` is a menu: choosing it lists them in place (Backspace on an empty field goes back). `Ctrl/Cmd+J` opens the AI menu (`openMenu`).
- Ranking order: title prefix, then title fuzzy/substring, then path. No network requests. File, tag, command, task and heading search runs in memory; note-text search runs in the metadata worker.
- A file query with no exact title match ends with a `Create "<query>"` row when the editor has registered a create handler (`setCreateNote`).
- Private notes (frontmatter `private: true` or a `private` tag) get a lock on their file rows; their `!` tasks show as `••••••••` with a lock, only for the empty `!` query, never matched by text. In Privacy Mode "Hide from lists" (`hidden`) they're left out of search, `#tag`, recent and pinned rows (stored pins and recents are untouched).
- Arrow keys move the selection, Enter runs, Escape closes. Uses combobox/listbox semantics.
