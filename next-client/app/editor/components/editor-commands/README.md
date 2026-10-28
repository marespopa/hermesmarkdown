# Editor command contributors

`EditorCommands.tsx` is the single editor-route entry point for command-palette
registration. This directory separates command definitions by responsibility
without changing the public props contract or command behavior.

## Structure

- `use-editor-command-context.ts` owns the shared hooks and derived editor
  state. Its hook sequence mirrors the original monolithic component so hooks
  are called once and unconditionally.
- `build-editor-commands.ts` combines contributor groups in their original
  registration order.
- `document-vault-commands.ts` defines document lifecycle, note operations, and
  vault commands: `New File` (a draft named from its first line),
  `New board` (with a vault open: asks the name, then `<name>.board.md` in the
  New Files folder, numbered `<name> (1).board.md` on a clash; `useCreateBoard`), `Edit Board as
  Markdown` / `Open as Board` (the active note, only when it is a board),
  `Export as Markdown` (always a .md download of the note, vault note or
  draft; it never saves), `Open File from Disk…` (a file from the device opens
  as a draft; distinct from `Import files into vault…`), Duplicate / Move /
  Rename / Delete File, and `New template…` (with a vault open: name prompt, then
  `_templates/<name>.md` with a minimal body, or the existing template of that
  name opened unchanged).
- `editor-ai-commands.ts` defines editor formatting, `Go to Line…`
  (`Ctrl/Cmd+Alt+G`), templates and AI
  commands. The `Insert: …` commands skip the slash menu's vault
  **Template** entry (`vaultOnly`). AI is one menu command, **Ask or Edit
  with AI…** (`ai-menu`, `Ctrl/Cmd+J`), listed only with AI Features switched
  on (`isAiEnabled`); its `subcommands` are four modes: Freeform Prompt (AI
  Chat), then Improve Writing, Summarize / Structure and Insert Element (table,
  Mermaid diagram, formula), each a menu of one-click actions, disabled until a
  key is set.
- `workspace-task-view-commands.ts` defines panels, tabs, the editor-only
  toggles (Toggle Hidden Files), Show Token Cost, the welcome
  tour, tasks and views.

App-wide commands are not registered here, so each command exists once: Open
Settings, Open Documentation, `Theme: …` and Show Keyboard Shortcuts come from
`components/CommandPalette/AppCommands.tsx`; word wrap, line numbers, Focus and
the other editor preferences from `settings/components/SettingsCommands.tsx`;
Show Files from the palette itself.
- `vault-storage-commands.ts` defines `Browser vaults…` (where browser storage
  is available), whole-vault export/import (zip for every vault, folder copy on
  Chromium, folder import where the browser supports it), and `Delete browser
  vault` while a browser vault is open.
- `privacy-commands.ts` defines the `Privacy mode: …` commands (Mask in lists /
  Hide from lists, for notes with `private: true` or a `private` tag; the
  current level is disabled with "Current mode") and `reveal-private-session`,
  which toggles the session-only editor reveal ("Show all private notes this
  session" / "Hide private notes again"; turning it off also clears per-note
  reveals). Registered right after
  the preferences and navigation group.
- `RegisteredCommands.tsx` applies the existing `useRegisterCommand` pattern to
  the ordered command list.
- `SwitchVaultCommands.tsx` registers **Switch Vault…** (`switch-vault`, Vault), a
  menu with one command per pinned vault, only while two or more are pinned;
  the open vault is disabled ("Current vault"). `EditorShell` mounts it.
- `PinCommands.tsx` registers **Pin Page to Sidebar…** (`pin-page`, Workspace),
  a menu with one command per app page (`pin-page:files` All Files, Tags,
  Tasks, Templates, Trash, Settings) that pins it to the sidebar's Pinned
  section; an already pinned page is disabled ("Already pinned"), and the menu
  is disabled without a vault ("Open a vault first") or on mobile ("The
  sidebar isn't shown on this screen"). Mounted by `EditorShell`, not
  `EditorCommands`, so it's offered on every /editor route.

## Ordering and behavior

Each contributor returns named command groups. `build-editor-commands.ts`
combines those groups in the same order as the former implementation;
`EditorCommands.tsx` only builds the context and renders the result. Conditional
commands are omitted from the list when unavailable; commands that remain
visible use their original `disabledReason`.

When adding a command, place it in the contributor matching its behavior and
insert its group in `build-editor-commands.ts` at the intended registration position.

