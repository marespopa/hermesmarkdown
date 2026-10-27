# ShellCommands

The shell's palette commands: **Show Sidebar** / **Hide Sidebar** (`toggle-sidebar`, `atom_sidebarOpen`) and **Show AI Companion** / **Hide AI Companion** (`toggle-companion`, `atom_companionOpen`). The label follows the state.

## Props
| Prop | Type | Description |
|---|---|---|
| hasCompanion | `boolean` | Whether the companion exists (AI set up); the companion command is registered only then |

[EditorShell](EditorShell.md) mounts it on every `/editor` route except Settings, with the vault unlocked, so the commands work with no note open. Registered through `useRegisterCommand`; renders nothing.
