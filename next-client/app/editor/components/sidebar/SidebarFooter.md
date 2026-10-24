# SidebarFooter

Description: The sidebar's foot, pinned below the scrolling library (Pinned, Files) and set apart by a full-width hairline, so Settings and help are always one click away. Two quiet sidebar rows (`sidebarItemClass`): **Settings** opens `/editor/settings` and is the current row (`aria-current="page"`, the accent fill) on any Settings page; **Help** opens a small menu (`TabContextMenu`) beside the row, out over the page, with **Documentation** (a new tab, so the note stays put, as the palette's Open Documentation does) and **Keyboard Shortcuts** (`atom_keyboardShortcutsOpen`, the overlay `Ctrl/Cmd+?` also opens).

- Props: none.
- State: the Help menu's position (`useState`), open while set.
- Core: `next/navigation` (`useRouter`, `usePathname`), `Button`, `TabContextMenu`, `sidebar-classes.ts`, `formatShortcut`.
