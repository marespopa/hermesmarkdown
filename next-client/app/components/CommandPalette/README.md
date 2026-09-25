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

- `Ctrl/Cmd+K` opens file search; `Ctrl/Cmd+Shift+P` opens with the `>` command prefix.
- A plain query searches vault files. Type `#` for tags, `>` for commands, `!` for tasks, or `@` for live headings; these prefixes stay in the input rather than becoming scope controls.
- The initial unified list combines locally persisted pinned files/commands, up to five recent files, top actions (including **Open Explorer**), and up to three frequently used commands. Pin or unpin the selected file/command with `Ctrl/Cmd+D`, or use its context menu. At most five entries may be pinned.
- File results, including pinned and recent suggestions, show the parent-folder path at the right edge; root-level files omit it. Tag matches keep matching tags beside the file name. Command shortcuts appear at the right edge only when the command defines one.
- Empty searches display a small decorative emoji and text-only quick-query tips for file names, `#` tags, `>` commands, `!` tasks, and `@` headings.
- Results are ranked client-side by title prefix, title fuzzy/substring match, then path/breadcrumb match. Matching characters are emphasized in both labels where applicable. Palette operations make no network requests.
- Arrow keys change the active result. Enter and Ctrl/Cmd+Enter run/open it in the current pane. Escape closes the palette.

The result surface uses combobox/listbox semantics. Disabled commands remain discoverable
and explain which context or capability is required.
