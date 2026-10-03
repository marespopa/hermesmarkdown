# WorkspaceSidebar

Description: The window's sidebar on desktop — one per window, on its leading edge, for **navigation only** (commands stay in the toolbar). With a vault, a **Home** item at the top opens the home feed (`aria-current` while the feed is showing, so no note is marked current then; the toolbar has no Home button, so this is the desktop way back to the feed). Below it, two collapsible sections with small grey headers: **Open Notes** (every tab across every pane, from `getWorkspaceTabs`; the current one highlighted with `aria-current`, an amber dot for unsaved changes; clicking focuses that pane and tab and leaves the home feed) and, with a vault, **Files** (`VaultFileTree` in tree view, with the usual file and folder actions). A header row, level with the pane toolbar (`PANE_HEADER_HEIGHT` for the toolbar style), holds a chevron-left **Hide sidebar** button on its right. Shown or hidden with `atom_sidebarOpen` — the header chevron to hide, the toolbar's Sidebar button (top-left pane, shown only while the sidebar is hidden) to show, Ctrl/Cmd+Alt+S, the **Show sidebar** command, or Settings → Appearance → Show Sidebar; hidden, it slides out past the window's left edge (negative margin) and turns `inert`. Drag its trailing edge to resize (`atom_sidebarWidth`, clamped to `SIDEBAR_MIN_WIDTH`–`SIDEBAR_MAX_WIDTH`); double-click the edge to reset. `app/editor/page.tsx` renders it beside the workspace, desktop only and not while the vault is locked. Mobile keeps `MobileFileOverlay`.

## Local State & Storage
- State: `atom_sidebarOpen`, `atom_sidebarWidth`, `atom_toolbarDisplayMode` (header height), `atom_workspaceLayout`, `atom_activePaneId`, `atom_activeFilePath` (setter), `atom_openFiles`, `atom_homeFeedOpen`; section expansion is local.
- Persistence: `localStorage["sidebarOpen"]`, `localStorage["sidebarWidth"]`.

## Dependencies
- Core: `VaultFileTree`, `useVaultFileSearch`, `useFileSystem`, `PaneTab` (`statusDot`), `Button`, `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
{!isMobileChrome && !isVaultLocked && <WorkspaceSidebar />}
```

## Props Overview
None.
