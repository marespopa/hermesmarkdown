# sidebar

The parts of `WorkspaceSidebar` (one level up), top to bottom, and what they share. The sidebar is the library (vault, Pinned, Linked from, Files) and nothing else; everything else (switching open notes, Settings and Documentation too) is the command palette's, and the note's outline is the editor's optional minimap (`markdown-editor/EditorMinimap`).

| Item | Purpose |
|---|---|
| [SidebarHeader](SidebarHeader.md) | App wordmark, New note, Hide sidebar. |
| [SidebarPinned](SidebarPinned.md) | First, with a vault and at least one pin: the vault's pins (`.hermes/pins.yaml`) — notes, folders, tags and pages — in order, at most nine, each with its emoji or glyph and its Ctrl/Cmd+1–9 key; a click on a row's icon opens its menu (set the icon, unpin it); drag rows (or Alt+↑/↓) to reorder; drop notes and folders from Files to pin them. |
| [LinkedFromSection](LinkedFromSection.md) | Shown only when something links here: notes linking to the note in front (wikilinks, embeds); a click opens the source at the link. |
| [SidebarFiles](SidebarFiles.md) | The vault's file tree under a Search field (a regular expression on paths); a note's or folder's menu has Pin / Unpin. |
| [SidebarSection](SidebarSection.md) | A collapsible group set apart by a full-width hairline, its chevron always shown, with an optional ⋯ menu. |
| `sidebar-classes.ts` | The quiet look every part uses: 28px rows in the primary text colour, neutral grey icons (`SIDEBAR_ICON_CLASS`), the current row on a soft accent fill (`SIDEBAR_ACCENT_FILL`, the file tree's active-row fill), quiet icon buttons. |
| `files-filter.ts` | The Files filter: `compileFilesFilter(query)` (a case-insensitive regular expression, or the text as typed when it isn't valid) and `filterVault(files, folderPaths, filter, pathOf)` (matching files and the folders around them). |
| `use-pinned-rows.ts` | `usePinnedRows(activePath)`: the Pinned section's rows — label, tooltip, missing (only once the index is idle), current, and what a click does — with Privacy Mode applied. |
| `pinned-pages.tsx` | `PINNED_PAGES` (the pinnable app pages: label, href, glyph) and `pinGlyph(pin)`, a row's default glyph. |
| `use-sidebar-navigation.ts` | Opening a tree row or an open note, and New note, from any /editor route: in place on the editor, else back to it at the note's URL. |
