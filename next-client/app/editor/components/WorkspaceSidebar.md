# WorkspaceSidebar

Description: The window's sidebar on desktop, one per window on its leading edge, the same on every /editor route (`EditorShell` hosts it in the editor layout), and kept to the library, as a plain writing app's is: the vault, the note's outline and its files. Everything else is the command palette's (`Ctrl/Cmd+K`, the `SearchPill` in the toolbar and title bars): Home, All Notes, Tags, Tasks, Templates, Trash, Settings and search; Export and Settings are also in the toolbar's More menu.

It is a plain panel in the chrome colour with a hairline on its trailing edge, no glass, no shadow, and nothing coloured but the current row: rows are 28px in the primary text colour with neutral grey icons (`sidebar/sidebar-classes.ts`), the current one on a soft accent fill (the file tree's active-row fill). The accent is otherwise kept for the caret and focus.

Top to bottom:
- **Header** (`sidebar/SidebarHeader`), level with the pane toolbar: the vault's name as a switcher (recent vaults, then Open / Create / Browser Vault), **New note** (sets `atom_newNoteRequested`; the editor page starts the note, coming back to the editor first from a page) and **Hide sidebar**.
- **Outline** (`sidebar/SidebarOutline`), on the workspace only: the note in front's H1–H3 as a tree; a click puts the caret on that heading (`atom_pendingScrollTarget`).
- **Files** (`sidebar/SidebarFiles`): `VaultFileTree` in tree view, one click to open, with New Note / New Folder in its ⋯ menu.

Each section is set apart by a hairline and led by a caption with an always-visible disclosure chevron (`sidebar/SidebarSection`). A note opened from the tree opens in place on the editor; from a page, the route goes back to the editor at that note's URL (`/editor?file=…`, `use-sidebar-navigation`). The current row is only marked on the workspace.

**Show Files** (`Ctrl/Cmd+Shift+E`, `atom_showFiles`) shows the sidebar and unfolds Files; once open, the tree takes keyboard focus (`atom_filesFocusRequested`). Shown or hidden with `atom_sidebarOpen`, and it stays open until you close it: its header button or **Escape** inside it (one nothing inside handled) hides it; the Sidebar button at the top left (the pane toolbar's on the workspace, EditorShell's elsewhere) shows it; `Ctrl/Cmd+\`, `Ctrl/Cmd+Alt+S` (EditorShell) and the **Toggle Sidebar** command toggle it. Clicking in a note or opening one never closes it; with **Close Sidebar While Writing** on (Settings → Editor, `atom_closeSidebarWhileWriting`, off by default), typing in a note (a `beforeinput` inside `.cm-editor`) puts it away. It takes room: the editor page and every `ShellPage` start past it (`--content-left`) and slide with it. Hidden, it slides out by its width and turns `inert`. Drag its trailing edge to resize (`atom_sidebarWidth`, `SIDEBAR_MIN_WIDTH`–`SIDEBAR_MAX_WIDTH`, double-click resets; ArrowLeft / ArrowRight by 8px, 32px with Shift). Folded sections are remembered (`atom_sidebarCollapsed`, by title). Mobile has no sidebar: Show Files opens the full-screen Files page.

## Local State & Storage
- State: `atom_sidebarOpen`, `atom_sidebarWidth`, `atom_closeSidebarWhileWriting`, `atom_sidebarCollapsed`, `atom_filesFocusRequested`, `atom_homeFeedOpen`, `atom_workspaceLayout`, `atom_activePaneId`, `atom_pendingScrollTarget` (setter), `atom_newNoteRequested` (setter).
- Persistence: `localStorage["sidebarOpen"]`, `localStorage["closeSidebarWhileWriting"]`, `localStorage["sidebarWidth"]`, `localStorage["sidebarCollapsed"]`.

## Dependencies
- Core: `sidebar/*`, `useVaultFileSearch` (the tree's files), `VaultFileTree`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
// EditorShell, desktop only, once the vault is readable:
<div className="typing-chrome fixed inset-y-0 left-0 w-0 z-30"><WorkspaceSidebar /></div>
```

## Props Overview
None.
