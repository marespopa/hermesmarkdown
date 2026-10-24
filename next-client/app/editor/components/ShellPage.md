# ShellPage

Description: The frame of every /editor page (Tasks, Templates, Trash, All Files, Tags, Settings): the same plain page as the editor (`.app-sheet`, `bg-surface`, starting past the open sidebar at EditorShell's `--content-left`), with a title bar (`PANE_HEADER_HEIGHT`, a hairline below it, level with the sidebar's header) with the page's name and, at its trailing end, the `SearchPill` (the command palette), then the page. It slides when the sidebar opens or closes; while the sidebar is hidden the bar leaves room at its start for EditorShell's Show sidebar button. The bar leads with **← Editor**, on desktop and mobile alike (the sidebar is only the library, so this is the way back): it returns to the note in front, at its URL (`editorFileHref(atom_activeFilePath)`).

## Local State & Storage
- State: `atom_sidebarOpen`, `atom_activeFilePath` (read).
- Persistence: None.

## Dependencies
- Core: `Button`, `useIsMobileChrome`, `useRouter`, `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<ShellPage title="Tasks">
  <main className="flex-1 min-h-0 …">…</main>
</ShellPage>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| title | `string` | | The page's name, in the title bar |
| children | `ReactNode` | | The page, in a flex column below the bar |
