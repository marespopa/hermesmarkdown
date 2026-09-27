# EditorCommands

Description: Renders nothing visible. It builds the editor's command-palette entries (`buildEditorCommands`) and registers them through `RegisteredCommands`.

## Local State & Storage
- State: `useEditorCommandContext(props)`, which aggregates file-system, vault, and pane atoms. `RegisteredCommands` calls `useRegisterCommand` once per command.
- Persistence: None itself.

## Dependencies
- Core: `editor-commands/*` contributor modules, `CommandPaletteContext`.
- Zero-Cloud: No side effects on mount. GitHub commands call the GitHub API only when the user runs them, via the `onGitHub*` handlers.

## Quick Usage
```tsx
import EditorCommands from "./EditorCommands";

<EditorCommands onNewFile={newFile} onSave={save} onExport={exportDoc} onOpenTasks={openTasks}
  onHome={goHome} onOpenDocumentation={openDocs} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onNewFile / onSave / onExport | `() => void` |  | Document actions |
| onOpenTasks / onHome / onOpenDocumentation | `() => void` |  | Navigation |
| githubVault? | `boolean` |  | Enables the GitHub commands |
| onGitHubCommit? / onGitHubPush? / onGitHubPull? / onGitHubSync? | `() => void` |  | GitHub actions |
| isMobileChrome? / onOpenMobileFiles? / onRefreshVault? |  |  | Mobile and vault helpers |

`RegisteredCommands` takes `commands: Command[]`. See `editor-commands/README.md`.
