# EditorShell

Description: The one frame around every /editor route (`app/editor/layout.tsx`, inside `VaultAccessGate`), so moving between the editor, Tasks, Templates, Trash, All Files and Settings never changes the navigation. On desktop, once the vault is readable, it hosts the `WorkspaceSidebar` (fixed on the leading edge, `z-30`, in a zero-width wrapper it slides out of) and sets `--content-left` (the open sidebar's width, else 0): the sidebar is a plain panel on the window's edge and takes room, so the editor page and every `ShellPage` start past it and slide with it, pushed over, never covered. The sidebar opens and closes only when you toggle it, remembered (`atom_sidebarOpen`); nothing hides while you type. Flat throughout: no canvas, no glass sheets. While the sidebar is hidden, a **Show sidebar** button sits in the top-left corner of the pages, the editor included (it has no toolbar). On the editor (`/editor`, desktop) the same `SearchPill` as the pages' title bars sits in the top-right corner, placed where theirs is (`top-1.5 right-8`), so it stays put moving between the editor and the pages; it opens the command palette, the way to every note and command. `SettingsButton` opens Settings immediately to its left, and `CopyContentButton` copies the active note as Markdown before that. Copy Contents and the outline toggle live in the command palette (and the note's menu, and `Ctrl/Cmd+Shift+M`), not in the corner. Note-text search stays on `Ctrl/Cmd+Shift+F` and the palette's `/` scope. It owns the sidebar shortcuts on every route: `Ctrl/Cmd+\`, `Ctrl/Cmd+Alt+S` and `Ctrl+[` (Ctrl on macOS too; not when the editor took it, as Vim's Escape) (`isSidebarToggleShortcut`). Once the vault is unlocked it also owns the page keys, `Ctrl/Cmd+Alt+T` Tasks, `Ctrl/Cmd+Alt+P` Templates and `Ctrl/Cmd+,` Settings (`<PageShortcuts />`, its own component so palette context changes don't re-render the shell; see the CommandPalette README). It also renders the vault dialogs (`NewVaultDialog`, `BrowserVaultDialog`, `RecentVaultsDialog`), so the vault switcher (the pane title's first crumb, the palette) works from any page, and [ActiveFileIndexer](ActiveFileIndexer.md), which re-indexes the note being edited. Once the vault is unlocked it mounts [RecoveryBanner](RecoveryBanner.md), the floating line shown while notes can't be saved, and `PinCommands` (**Pin Page to Sidebar…** in the palette), `SwitchVaultCommands` (**Switch Vault…**, with two or more recent vaults: pinned first, then by recency, top 6 plus **View All Recent Vaults…**), opens files the OS launches the installed app with (`useLaunchFiles`, manifest `file_handlers`), and shows the open vault's pins, kept on this device (`useVaultPins`, enabled while the vault is unlocked). On every route it loads the recent vaults and keeps them in step with the open vault (`useRecentVaultTracker`), so the Vault menu lists them on Settings and the other pages too, and it keeps the vault's file list and index in step with the disk (`useVaultSync`), since the sidebar shows them on every page; until the vault's walk has listed every file, the sidebar's tree shows the vault as last seen (`useVaultTreeSnapshot`). In dev builds it mounts [PerfReadout](../../components/PerfReadout/PerfReadout.md), the timings readout (palette: Enable/Disable Performance Readout, or `?perf=1`). Mobile has no sidebar and no inset.

## Local State & Storage
- State: `atom_sidebarOpen`, `atom_sidebarWidth`, `atom_isVaultRestoring`, `atom_isVaultPending`.
- Persistence: through `atom_sidebarOpen` / `atom_sidebarWidth` (`localStorage`).

## Dependencies
- Core: `WorkspaceSidebar`, `ActiveFileIndexer`, `PaneToolbarButton`, the vault dialogs, `useIsMobileChrome`, `SearchPill`, `SettingsButton`, `CopyContentButton`, `RecoveryBanner`, `PinCommands`, `SwitchVaultCommands`, `useVaultPins`, `useVaultSync`, `useLaunchFiles`, `useVaultTreeSnapshot`, `PerfReadout`, `usePathname`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<VaultAccessGate>
  <EditorShell>{children}</EditorShell>
</VaultAccessGate>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| children | `ReactNode` | | The route |

## AI companion
Once AI is set up (`atom_isAiConfigured`) and the vault is unlocked, the shell mounts [CompanionPanel](companion/CompanionPanel.md) on the trailing edge (a sheet on mobile) and sets `--content-right` to its width while it's open, so the editor page, every ShellPage, the corner buttons and RecoveryBanner stop short of it. There is no toggle icon for it in the header: the search button (`SearchPill`) takes that top-right corner, and the panel opens from **Show AI Companion** in the palette or Ctrl/Cmd+J.

## Settings and shell commands
Settings (`/editor/settings`) is a page of its own: the shell mounts neither the sidebar nor the AI companion there (`--content-left` and `--content-right` are 0, ShellPage takes the plain edge room). On every other route [ShellCommands](ShellCommands.md) registers **Show / Hide Sidebar** and, once AI is set up, **Show / Hide AI Companion**, so they work with no note open. Ctrl/Cmd+P (and double-Shift) is the palette provider's own document listener and works on every route. On desktop editor routes it also runs `usePageOnly` (No Distraction Mode, `atom_pageOnly`): while it is on, `<html>` carries `data-page-only` and the sidebar, companion, corner buttons, top-right row (the search pill, with [PageOnlyToggleButton](PageOnlyToggleButton.md) before it while the mode is on), pane title, outline and word count (all `.page-only-hide`) are hidden, and the frame (`.page-only-room`) sets `--content-left`, `--content-right` and `--companion-toggle-room` to 0, so the page grows into the freed room on the layout transition. Ctrl/Cmd+Alt+Z and the palette's **No Distraction Mode** toggle it on every route, and on a touch screen [PageOnlyPeek](PageOnlyPeek.md) (a tap on the very top edge) brings the top-right row back for a few seconds; Settings has nothing to hide, so it is left as it is there.


On the pages (every route but the editor and Settings) Ctrl/Cmd+J opens and closes the companion from the shell; on the editor `useEditorShortcuts` handles it, bringing the note and its selection.
