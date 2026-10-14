# FolderPrompt

Description: Asks where notes live, once there is something to keep. There is no setup flow: a first visit lands on the home feed (`useVaultOpenBehavior`), and this quiet bar appears at the bottom of the window while no vault is open and the draft has text. It holds one sentence ("Choose where your notes live." plus what happens until then), **Not Now**, and one primary action:

- **Choose Folder…** where the browser can open folders: the OS folder picker, which can also make a new folder (`useChooseFolder` → `openVault`). Opening a vault clears every open tab, so `useChooseFolder` holds the draft's text meanwhile, puts it back once the vault is open, saves it into the vault straight away, and keeps it in front (the home feed doesn't open over it).
- **Keep Notes in This Browser** where it can't (Safari, Firefox, phones): opens the browser-vault dialog; the vault made there gets the draft the same way.
- **Download** where neither works: downloads the note as Markdown.

It sits at the bottom of the window, and on phones at the top, under the file bar, clear of the keyboard and of the formatting toolbar docked above it. **Not Now** shrinks it to a small "Not saved to a folder" mark for the rest of the visit; clicking the mark opens the bar again. The bar fades with the rest of the chrome while you type (`.typing-chrome`). Cmd/Ctrl+S with no vault runs the same choice (the editor page's `handleSave`).

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
| `placement` | `"bottom" \| "top"` | `"bottom"` | `"top"` on phones. |
