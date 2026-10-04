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
- `document-vault-commands.ts` defines document lifecycle, file operations, and
  vault commands, including `New note from template…` (with a vault open:
  template picker, title prompt, then the template's `target_folder` /
  `file_name` place and name the note) and `New template…` (with a vault open:
  name prompt, then `<templates folder>/<name>.md` with a starter body, or the
  existing template of that name opened unchanged).
- `editor-ai-voice-commands.ts` defines editor formatting, templates, AI, and
  voice commands. The `Insert: …` commands skip the slash menu's vault
  **Template** entry (`vaultOnly`).
- `workspace-task-view-commands.ts` defines panels, panes, tabs, preferences,
  tasks, views, and workspace navigation.
- `github-vault-commands.ts` defines the `GitHub: Commit / Push / Sync / Pull`
  commands, registered only while a GitHub vault is open.
- `vault-storage-commands.ts` defines `Browser vaults…` (where browser storage
  is available), whole-vault export/import (zip for every vault, folder copy on
  Chromium, folder import where the browser supports it), and `Delete browser
  vault` while a browser vault is open.
- `privacy-commands.ts` defines the `Privacy mode: …` commands (Show titles only /
  Blur previews / Hide sensitive notes; the current level is disabled with
  "Current mode") and `reveal-sensitive-session`, which toggles the session-only
  editor reveal ("Show all sensitive notes this session" / "Hide sensitive notes
  again"; turning it off also clears per-note reveals). Registered right after
  the preferences and navigation group.
- `RegisteredCommands.tsx` applies the existing `useRegisterCommand` pattern to
  the ordered command list.

## Ordering and behavior

Each contributor returns named command groups. `build-editor-commands.ts`
combines those groups in the same order as the former implementation;
`EditorCommands.tsx` only builds the context and renders the result. Conditional
commands are omitted from the list when unavailable; commands that remain
visible use their original `disabledReason`.

When adding a command, place it in the contributor matching its behavior and
insert its group in `build-editor-commands.ts` at the intended registration position.
