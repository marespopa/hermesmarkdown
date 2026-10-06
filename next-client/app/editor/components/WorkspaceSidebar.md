# WorkspaceSidebar

Description: The window's sidebar on desktop — one per window, on its leading edge, for **navigation only** (commands stay in the toolbar). With a vault, a **Home** item at the top opens the home feed (`aria-current` while the feed is showing, so no note is marked current then; the toolbar has no Home button, so this is the desktop way back to the feed). Below it, two collapsible sections with small grey headers, each led by an always-visible disclosure chevron (points right when collapsed, down when open): **Open Notes** (every tab across every pane, from `getWorkspaceTabs`; the current one highlighted with `aria-current`, an amber dot for unsaved changes; clicking focuses that pane and tab and leaves the home feed) and, with a vault, **Files** (`VaultFileTree` in tree view with `singleClickOpen` — one click opens a file, as in a code editor's explorer — plus the usual file and folder actions). The tree has no row for the vault itself (the header names it). The **Files** section header has an always-visible ⋯ button ("Files options") at its trailing end, opening the same kind of menu as a folder row: **New Note** and **New Folder**, with icons, which start naming the new item in place at the vault's root (through the tree's `controllerRef`; `createNewFile(vault)` / `createFolder(vault)` when the tree isn't shown). The tree also gets `trashItems`, `moveItems` and `undoFileOperation` (selection, Trash with Undo, ⌘Z). Esc or a click outside closes it. To create inside a folder, use that folder's ⋯ menu. A header row, level with the pane toolbar (`PANE_HEADER_HEIGHT`), shows the vault's name ("Workspace" without a vault) as a small uppercase title, as in a code editor's side bar, and at its trailing end a **Hide sidebar** button (filled Codicon panel glyph in a toolbar capsule). Shown or hidden with `atom_sidebarOpen` — that header button hides it, the toolbar's Sidebar button (top-left pane, only while hidden) shows it; Ctrl/Cmd+Alt+S, the **Show sidebar** command and Settings → Appearance → Show Sidebar toggle it. Hidden, it slides out past the window's left edge (negative margin) and turns `inert`. Drag its trailing edge to resize (`atom_sidebarWidth`, clamped to `SIDEBAR_MIN_WIDTH`–`SIDEBAR_MAX_WIDTH`); double-click the edge to reset. `app/editor/page.tsx` renders it beside the workspace, desktop only, not while the vault is locked and not on the home feed (a full-width landing view) — so Home takes you to a sidebar-less feed, and opening a note brings the sidebar back. Mobile keeps `MobileFileOverlay`.

## Local State & Storage
- State: `atom_sidebarOpen`, `atom_sidebarWidth`, `atom_workspaceLayout`, `atom_activePaneId`, `atom_activeFilePath` (setter), `atom_openFiles`, `atom_homeFeedOpen`; section expansion is local.
- Persistence: `localStorage["sidebarOpen"]`, `localStorage["sidebarWidth"]`.

## Dependencies
- Core: `VaultFileTree`, `useVaultFileSearch`, `useFileSystem`, `PaneTab` (`statusDot`), `Button`, `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
{!isMobileChrome && !isVaultLocked && !isHomeFeedOpen && <WorkspaceSidebar />}
```

## Props Overview
None.
