# WorkspaceSidebar

Description: The window's sidebar on desktop, one per window on its leading edge, the same on every /editor route (`EditorShell` hosts it in the editor layout), and kept to the library, as a plain writing app's is: the vault, its pinned items and its files. Switching between open notes is the palette's (`Ctrl/Cmd+K`), and the note's outline is the editor's optional minimap (`markdown-editor/EditorMinimap`, `Ctrl/Cmd+Shift+M`). Everything else is the command palette's (`Ctrl/Cmd+K`, the `SearchPill` in the editor's corner and the page title bars): Home, All Notes, Tags, Tasks, Templates, Trash, Settings, Documentation and search.

It is a plain panel in the page's own paper colour (`bg-surface`, so the window reads as one sheet) with a hairline on its trailing edge, no glass, no shadow, and nothing coloured but the current row: rows are 28px in the primary text colour with neutral grey icons (`sidebar/sidebar-classes.ts`), the current one on a soft accent fill (the file tree's active-row fill). The accent is otherwise kept for the caret and focus.

Top to bottom:
- **Header** (`sidebar/SidebarHeader`), at the top: the app's name, **HermesMarkdown**, as a quiet wordmark that hides the sidebar on a click (vaults are switched from the pane title's first crumb), **New note** (sets `atom_newNoteRequested`; the editor page starts the note, coming back to the editor first from a page) and **Hide sidebar**.
- **Pinned** (`sidebar/SidebarPinned`), first in the scroll area, with a vault open and at least one pin: the vault's pins from `.hermes/pins.yaml` (notes, folders, tags and pages), in order, at most nine, each with its emoji or glyph and its `Ctrl/Cmd+1–9` key; a click on the label (or its key) opens it; a click on the icon opens its menu (set the icon, unpin it); drag rows (or Alt+↑/↓) to reorder; drop notes and folders from Files to pin them. Rendered inside `<Suspense>` (it reads `useSearchParams`).
- **Linked from** (`sidebar/LinkedFromSection`), under Pinned, for a vault note (not the draft) on the editor route: the notes linking to the note in front. It renders only when it has results.
- **Files** (`sidebar/SidebarFiles`): a **Filter** box (a regular expression matched against each file's vault path; `sidebar/files-filter.ts`), then `VaultFileTree` in tree view, one click to open, with New Note / New Folder in its ⋯ menu; a note's or folder's menu has Pin / Unpin.

Each section is set apart by a full-width hairline and led by a caption with an always-visible disclosure chevron (`sidebar/SidebarSection`). A note opened from the tree opens in place on the editor; from a page, the route goes back to the editor at that note's URL (`/editor?file=…`, `use-sidebar-navigation`). The current row is only marked on the workspace.

**Show Files** (`Ctrl/Cmd+Shift+E`, `atom_showFiles`) shows the sidebar and unfolds Files; once open, the tree takes keyboard focus (`atom_filesFocusRequested`). **Show in Files** from the pane title's folder popover (`atom_showFolderInFiles`) does the same with that folder open in the tree, with the folders above it, and selected and scrolled to (`atom_filesRevealPath`, passed to the tree's `reveal(path)`). Shown or hidden with `atom_sidebarOpen`, and it stays open until you close it: its header button or **Escape** inside it (one nothing inside handled) hides it; the Sidebar button in the top-left corner (EditorShell, on every route) shows it; `Ctrl/Cmd+\`, `Ctrl/Cmd+Alt+S` (EditorShell) and the **Toggle Sidebar** command toggle it. Clicking in a note or opening one never closes it; with **Close Sidebar While Writing** on (Settings → Editor, `atom_closeSidebarWhileWriting`, off by default), typing in a note (a `beforeinput` inside `.cm-editor`) puts it away. It takes room: the editor page and every `ShellPage` start past it (`--content-left`) and slide with it. Hidden, it slides out by its width and turns `inert`. Drag its trailing edge to resize (`atom_sidebarWidth`, `SIDEBAR_MIN_WIDTH`–`SIDEBAR_MAX_WIDTH`, 240–420px; the minimum keeps the header's whole wordmark, and a narrower saved width opens at it; double-click resets; ArrowLeft / ArrowRight by 8px, 32px with Shift). Folded sections are remembered (`atom_sidebarCollapsed`, by title). Mobile has no sidebar: Show Files opens the full-screen Files page.

## Local State & Storage
- State: `atom_sidebarOpen`, `atom_sidebarWidth`, `atom_closeSidebarWhileWriting`, `atom_sidebarCollapsed`, `atom_filesFocusRequested`, `atom_homeFeedOpen`, `atom_workspaceLayout`, `atom_newNoteRequested` (setter).
- Persistence: `localStorage["sidebarOpen"]`, `localStorage["closeSidebarWhileWriting"]`, `localStorage["sidebarWidth"]`, `localStorage["sidebarCollapsed"]`.

## Dependencies
- Core: `sidebar/*`, `useVaultFileSearch` (the tree's files), `VaultFileTree`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
// EditorShell, desktop only, once the vault is readable:
<div className="fixed inset-y-0 left-0 w-0 z-30"><WorkspaceSidebar /></div>
```

## Props Overview
None.
