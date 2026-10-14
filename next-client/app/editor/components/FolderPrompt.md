# FolderPrompt

Description: Asks where notes live, once there is something to keep. There is no setup flow: a first visit lands on an empty draft (`useFirstRun`), and this quiet bar appears at the bottom of the window while no vault is open and the draft has text. It holds one sentence ("Choose where your notes live." plus what happens until then), **Not Now**, and one primary action:

- **Choose Folder…** where the browser can open folders: the OS folder picker, which can also make a new folder (`useChooseFolder` → `openVault`). The draft is saved into the folder straight away and stays in front (the home feed doesn't open over it).
- **Keep Notes in This Browser** where it can't (Safari, Firefox, phones): opens the browser-vault dialog.
- **Download** where neither works: downloads the note as Markdown.

**Not Now** shrinks it to a small "Not saved to a folder" mark for the rest of the visit; clicking the mark opens the bar again. The bar fades with the rest of the chrome while you type (`.typing-chrome`). Cmd/Ctrl+S with no vault runs the same choice (the editor page's `handleSave`).

## Local State & Storage
- State: `atom_openFiles` (the draft's text), `atom_folderPromptDismissed` (in memory, so the next visit asks again), `useFileSystem` (`isVaultSupported`, `isBrowserVaultSupported`).
- Persistence: None of its own; the draft's text is kept in browser storage until it is saved to a folder.

## Dependencies
- Core: `Button`, `.glass-panel`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
{!vaultHandle && !isVaultLocked && !isHomeFeedOpen && (
  <FolderPrompt onChooseFolder={() => void chooseFolder()} onDownload={handleExport} />
)}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| `onChooseFolder` | `() => void` | — | Picks a folder (or the browser vault where folders can't be opened) and saves the draft into it. |
| `onDownload` | `() => void` | — | Downloads the note where no vault of any kind is available. |
