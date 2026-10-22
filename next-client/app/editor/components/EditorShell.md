# EditorShell

Description: The one frame around every /editor route (`app/editor/layout.tsx`, inside `VaultAccessGate`), so moving between the editor, Tasks, Templates, Trash, All Notes and Settings never changes the navigation. On desktop, once the vault is readable, it hosts the `WorkspaceSidebar` (fixed on the leading edge, `z-30`, in a zero-width wrapper it slides out of) and sets `--content-left` (the open sidebar's width, else 0): the sidebar is a plain panel on the window's edge and takes room, so the editor page and every `ShellPage` start past it and slide with it, pushed over, never covered. The sidebar opens and closes only when you toggle it, remembered (`atom_sidebarOpen`); nothing hides while you type. Flat throughout: no canvas, no glass sheets. While the sidebar is hidden, a **Show sidebar** button sits in the top-left corner of the pages, the editor included (it has no toolbar). On the editor (`/editor`, desktop) the same `SearchPill` as the pages' title bars sits in the top-right corner, placed where theirs is (`top-1.5 right-8`), so it stays put moving between the editor and the pages; it opens the command palette, the way to every note and command. Just left of it, in its look, `CopyMarkdownButton` copies the active note as Markdown. Note-text search stays on `Ctrl/Cmd+Shift+F` and the palette's `/` scope. It owns the sidebar shortcuts on every route: `Ctrl/Cmd+\`, `Ctrl/Cmd+Alt+S` and `Ctrl+[` (Ctrl on macOS too; not when the editor took it, as Vim's Escape) (`isSidebarToggleShortcut`). It also renders the vault dialogs (`NewVaultDialog`, `GitHubVaultDialog`, `BrowserVaultDialog`), so the sidebar's vault switcher works from any page. Mobile has no sidebar and no inset.

## Local State & Storage
- State: `atom_sidebarOpen`, `atom_sidebarWidth`, `atom_isVaultRestoring`, `atom_isVaultPending`.
- Persistence: through `atom_sidebarOpen` / `atom_sidebarWidth` (`localStorage`).

## Dependencies
- Core: `WorkspaceSidebar`, `PaneToolbarButton`, the vault dialogs, `useIsMobileChrome`, `SearchPill`, `CopyMarkdownButton`, `usePathname`.
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
