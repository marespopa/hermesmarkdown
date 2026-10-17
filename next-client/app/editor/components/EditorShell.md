# EditorShell

Description: The one frame around every /editor route (`app/editor/layout.tsx`, inside `VaultAccessGate`), so moving between the editor, Tasks, Templates, Trash, All Notes and Settings never changes the navigation. On desktop, once the vault is readable, it hosts the `WorkspaceSidebar` (fixed on the leading edge, `z-30`, in a zero-width `.typing-chrome` wrapper that takes the typing fade) and sets `--content-left` (the open sidebar's width, else 0): the sidebar is a plain panel on the window's edge and takes room, so the editor page and every `ShellPage` start past it and slide with it, pushed over, never covered. While the chrome is faded for typing, `.editor-frame` sets `--content-left` to 0 (editor.scss), so the page slides into the sidebar's room. Flat throughout: no canvas, no glass sheets. While the sidebar is hidden, a **Show sidebar** button sits in the top-left corner of the pages (the editor has its own, in the pane toolbar). It owns the sidebar shortcuts on every route: `Ctrl/Cmd+\` and `Ctrl/Cmd+Alt+S` (`isSidebarToggleShortcut`). It also renders the vault dialogs (`NewVaultDialog`, `GitHubVaultDialog`, `BrowserVaultDialog`), so the sidebar's vault switcher works from any page. Mobile has no sidebar and no inset.

## Local State & Storage
- State: `atom_sidebarOpen`, `atom_sidebarWidth`, `atom_isVaultRestoring`, `atom_isVaultPending`.
- Persistence: through `atom_sidebarOpen` / `atom_sidebarWidth` (`localStorage`).

## Dependencies
- Core: `WorkspaceSidebar`, `PaneToolbarButton`, the vault dialogs, `useIsMobileChrome`, `usePathname`.
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
