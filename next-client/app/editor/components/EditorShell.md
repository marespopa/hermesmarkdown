# EditorShell

Description: The one frame around every /editor route (`app/editor/layout.tsx`, inside `VaultAccessGate`), so moving between the editor, Tasks, Templates, Trash, All Files and Settings never changes the navigation. On desktop, once the vault is readable, it hosts the `WorkspaceSidebar` (fixed on the leading edge, `z-30`, in a zero-width wrapper it slides out of) and sets `--content-left` (the open sidebar's width, else 0): the sidebar is a plain panel on the window's edge and takes room, so the editor page and every `ShellPage` start past it and slide with it, pushed over, never covered. The sidebar opens and closes only when you toggle it, remembered (`atom_sidebarOpen`); nothing hides while you type. Flat throughout: no canvas, no glass sheets. While the sidebar is hidden, a **Show sidebar** button sits in the top-left corner of the pages, the editor included (it has no toolbar). On the editor (`/editor`, desktop) the same `SearchPill` as the pages' title bars sits in the top-right corner, placed where theirs is (`top-1.5 right-8`), so it stays put moving between the editor and the pages; it opens the command palette, the way to every note and command. Just left of it, in its look, `CopyContentButton` copies the active note as Markdown, left of that [OutlineToggleButton](OutlineToggleButton.md) shows or hides the note's outline, and left of that [GitChangesToggleButton](GitChangesToggleButton.md) shows or hides the Git Changes diff. Note-text search stays on `Ctrl/Cmd+Shift+F` and the palette's `/` scope. It owns the sidebar shortcuts on every route: `Ctrl/Cmd+\`, `Ctrl/Cmd+Alt+S` and `Ctrl+[` (Ctrl on macOS too; not when the editor took it, as Vim's Escape) (`isSidebarToggleShortcut`). Once the vault is unlocked it also owns the page keys, `Ctrl/Cmd+Alt+T` Tasks, `Ctrl/Cmd+Alt+G` Changes, `Ctrl/Cmd+Alt+P` Templates and `Ctrl/Cmd+,` Settings (`<PageShortcuts />`, its own component so palette context changes don't re-render the shell; see the CommandPalette README). It also renders the vault dialogs (`NewVaultDialog`, `BrowserVaultDialog`, `RecentVaultsDialog`), so the vault switcher (the pane title's first crumb, the palette) works from any page, and [ActiveFileIndexer](ActiveFileIndexer.md), which re-indexes the note being edited. Once the vault is unlocked it mounts [RecoveryBanner](RecoveryBanner.md), the floating line shown while notes can't be saved, and `PinCommands` (**Pin Page to Sidebar…** in the palette), `SwitchVaultCommands` (**Switch Vault…**, with two or more pinned vaults), and shows the open vault's pins, kept on this device (`useVaultPins`, enabled while the vault is unlocked). On every route it loads the recent vaults and keeps them in step with the open vault (`useRecentVaultTracker`), so the Vault menu lists them on Settings and the other pages too, and it keeps the vault's file list and index in step with the disk (`useVaultSync`), since the sidebar shows them on every page; until the vault's walk has listed every file, the sidebar's tree shows the vault as last seen (`useVaultTreeSnapshot`). In dev builds it mounts [PerfReadout](../../components/PerfReadout/PerfReadout.md), the timings readout (palette: Toggle Performance Readout, or `?perf=1`). Mobile has no sidebar and no inset.

## Local State & Storage
- State: `atom_sidebarOpen`, `atom_sidebarWidth`, `atom_isVaultRestoring`, `atom_isVaultPending`.
- Persistence: through `atom_sidebarOpen` / `atom_sidebarWidth` (`localStorage`).

## Dependencies
- Core: `WorkspaceSidebar`, `ActiveFileIndexer`, `PaneToolbarButton`, the vault dialogs, `useIsMobileChrome`, `SearchPill`, `CopyContentButton`, `RecoveryBanner`, `PinCommands`, `SwitchVaultCommands`, `useVaultPins`, `useVaultSync`, `useVaultTreeSnapshot`, `PerfReadout`, `usePathname`.
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
Once AI is set up (`atom_isAiConfigured`) and the vault is unlocked, the shell mounts [CompanionPanel](companion/CompanionPanel.md) on the trailing edge (a sheet on mobile) and sets `--content-right` to its width while it's open, so the editor page, every ShellPage, the corner buttons and RecoveryBanner stop short of it.

## Settings and shell commands
Settings (`/editor/settings`) is a page of its own: the shell mounts neither the sidebar nor the AI companion there (`--content-left` and `--content-right` are 0, ShellPage takes the plain edge room). On every other route [ShellCommands](ShellCommands.md) registers **Show / Hide Sidebar** and, once AI is set up, **Show / Hide AI Companion**, so they work with no note open. Ctrl/Cmd+K is the palette provider's own document listener and works on every route.

## Background Changes scan
`useBackgroundGitScan` (hooks/use-background-git-scan.ts) warms the Changes page's scan once the vault is unlocked: after 4s and an idle moment, one scan runs in the worker and fills `atom_gitChangesCache` (and the copy saved for the vault), so Changes opens with a result while its own rescan runs. It skips non-disk vaults, a vault already cached this session, and the Changes route; leaving cancels it. Nothing waits on it.

On the pages (every route but the editor and Settings) Ctrl/Cmd+J opens and closes the companion from the shell; on the editor `useEditorShortcuts` handles it, bringing the note and its selection.
