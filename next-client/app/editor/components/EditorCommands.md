# EditorCommands

Description: Renders nothing visible. It builds the editor's command-palette entries (`buildEditorCommands`) and registers them through `RegisteredCommands`. App-wide commands (Open Settings, Open Documentation, the `Theme: …` set, Show Keyboard Shortcuts) come from `AppCommands`, and editor preferences (word wrap, line numbers, Focus, …) from `SettingsCommands`, so each command is registered once. The editor's Home command is `Open Home` (`use-home-feed.ts`).

## Local State & Storage
- State: `useEditorCommandContext(props)`, which aggregates file-system, vault, and pane atoms. `RegisteredCommands` calls `useRegisterCommand` once per command.
- Persistence: None itself.

## Dependencies
- Core: `editor-commands/*` contributor modules, `CommandPaletteContext`.
- Zero-Cloud: No side effects on mount. GitHub commands call the GitHub API only when the user runs them, via the `onGitHub*` handlers.

## Quick Usage
```tsx
import EditorCommands from "./EditorCommands";

<EditorCommands onNewFile={newFile} onSave={save} onExport={exportDoc} onImport={importFile}
  onOpenTasks={openTasks} onOpenTemplates={openTemplates}
  onRunAIAction={runAIAction} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onNewFile / onSave / onExport / onImport | `() => void` |  | Document actions: New Note, Save, Export as Markdown (`onExport`, always a .md download, never a save), Open Note from Disk… (`onImport`) |
| onRunAIAction | `(id: string) => void` |  | Runs a palette AI action (`improve`, `summarize`, …) |
| onOpenTasks / onOpenTemplates | `() => void` |  | Navigation |
| githubVault? | `boolean` |  | Enables the GitHub commands |
| onGitHubCommit? / onGitHubPush? / onGitHubPull? / onGitHubSync? | `() => void` |  | GitHub actions |
| isMobileChrome? / onRefreshVault? |  |  | Mobile and vault helpers |

`RegisteredCommands` takes `commands: Command[]`. See `editor-commands/README.md`.
