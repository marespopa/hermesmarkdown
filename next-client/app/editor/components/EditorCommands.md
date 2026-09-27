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

<EditorCommands onNewFile={newFile} onSave={save} onExport={exportDoc} onImport={importFile}
  onOpenTasks={openTasks} onHome={goHome} onOpenDocumentation={openDocs}
  onNewAIFile={newAIFile} onRunAIAction={runAIAction} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| onNewFile / onSave / onExport / onImport | `() => void` |  | Document actions |
| onNewAIFile | `() => void` |  | "Generate new note with AI" |
| onRunAIAction | `(id: string) => void` |  | Runs a palette AI action (`improve`, `summarize`, …) |
| onOpenTasks / onHome / onOpenDocumentation | `() => void` |  | Navigation |
| githubVault? | `boolean` |  | Enables the GitHub commands |
| onGitHubCommit? / onGitHubPush? / onGitHubPull? / onGitHubSync? | `() => void` |  | GitHub actions |
| isMobileChrome? / onOpenMobileFiles? / onRefreshVault? |  |  | Mobile and vault helpers |
| isVoiceSupported? / isVoiceListening? / hasVoicePreview? | `boolean` |  | Voice input state |
| onToggleVoice? / onCommitVoice? / onDiscardVoice? | `() => void` |  | Voice input actions |

`RegisteredCommands` takes `commands: Command[]`. See `editor-commands/README.md`.
