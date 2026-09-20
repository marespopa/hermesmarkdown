# Command Palette

The command palette is the shared command and quick-open surface for HermesMarkdown.
`CommandPaletteProvider` owns registration, visibility, and local command-use state;
`CommandPalette` renders and executes the currently registered commands alongside vault
file results.

## Command contract

Register commands with `useRegisterCommand`. IDs must be stable and globally unique.
Commands may include a category, description, aliases/keywords, shortcut, disabled reason,
danger marker, and an asynchronous action. Prefer a visible disabled command with a useful
reason when the action is relevant but unavailable.

Feature components should expose reusable actions and register thin adapters over those
actions. Buttons, menus, shortcuts, and commands must share the same underlying behavior,
including confirmation dialogs and error reporting.

## Search and keyboard behavior

- `Ctrl/Cmd+K` opens file search; `Ctrl/Cmd+Shift+P` opens the Commands scope.
- A plain query searches vault files only. Select a scope chip (or type its trigger) to search tags, commands, tasks, Smart Views, or live headings.
- Typed triggers become removable scope chips: `#` Tags, `>` Commands, `!` Tasks, `%` Views, and `:` Headings. Click a chip to select it, press Tab with an empty query to cycle scopes, or press Backspace with an empty query to remove the active chip.
- The zero state shows locally persisted pinned files/commands, up to five recently opened files, and up to three frequently used commands. Pin or unpin the selected file/command with `Ctrl/Cmd+D`, or use its context menu. At most five entries may be pinned.
- Results are ranked client-side by title prefix, title fuzzy/substring match, then path/breadcrumb match. Matching characters are emphasized in both labels where applicable. Palette operations make no network requests.
- Arrow keys change the active result. Enter and Ctrl/Cmd+Enter run/open it in the current pane; Shift+Enter displays a non-closing item-details preview. Escape closes the palette.

The result surface uses combobox/listbox semantics. Disabled commands remain discoverable
and explain which context or capability is required.
