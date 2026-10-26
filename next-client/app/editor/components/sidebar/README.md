# sidebar

The parts of `WorkspaceSidebar` (one level up), top to bottom, and what they share. The sidebar is the library (vault, Pinned, Files), with Settings and Help at its foot; everything else (switching open notes too) is the command palette's, and the note's outline is the editor's optional one (`markdown-editor/EditorOutline`).

| Item | Purpose |
|---|---|
| [SidebarHeader](SidebarHeader.md) | Vault switcher (the open vault's name and its menu), New note, Hide sidebar. |
| [SidebarPinned](SidebarPinned.md) | First, with a vault and at least one pin: the vault's pins (kept on this device, `pin-atoms.ts`) — notes, folders, tags and pages — in order, at most nine, each with its emoji or glyph and its Ctrl/Cmd+1–9 key; a click on a row's icon opens its menu (set the icon, unpin it); drag rows (or Alt+↑/↓) to reorder. |
| [SidebarFiles](SidebarFiles.md) | The vault's file tree under a Search field (a regular expression on paths); a note's or folder's menu has Pin / Unpin. |
| [SidebarFooter](SidebarFooter.md) | At the foot, below a hairline: Settings (current on a Settings page) and Help, whose menu opens the Documentation in a new tab or the Keyboard Shortcuts overlay. |
| [SidebarSection](SidebarSection.md) | A collapsible group set apart by a full-width hairline, its chevron always shown, with an optional ⋯ menu. |
| `sidebar-classes.ts` | The quiet look every part uses: 28px rows in the primary text colour, neutral grey icons (`SIDEBAR_ICON_CLASS`), the current row on a soft accent fill (`SIDEBAR_ACCENT_FILL`, the file tree's active-row fill), quiet icon buttons. |
| `files-filter.ts` | The Files filter: `compileFilesFilter(query)` (a case-insensitive regular expression, or the text as typed when it isn't valid) and `filterVault(files, folderPaths, filter, pathOf)` (matching files and the folders around them). |
| `use-pinned-rows.ts` | `usePinnedRows(activePath)`: the Pinned section's rows — label, tooltip, missing (only once the index is idle), current, and what a click does — with Privacy Mode applied. |
| `pinned-pages.tsx` | `PINNED_PAGES` (the pinnable app pages: label, href, glyph) and `pinGlyph(pin)`, a row's default glyph. |
| `use-pin-return.ts` | `usePinReturn(activePath)`: Ctrl/Cmd+0, back to where the last Ctrl/Cmd+1–9 jump left from (again to return to the pin). |
| `use-sidebar-navigation.ts` | Opening a tree row or an open note, and New note, from any /editor route: in place on the editor, else back to it at the note's URL. |
