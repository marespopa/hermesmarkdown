# SidebarFooter

Description: The sidebar's foot, pinned below the scrolling library (Pinned, Files) and set apart by a full-width hairline, so Settings and help are always one click away. Two quiet sidebar rows (`sidebarItemClass`): **Settings** opens `/editor/settings` and is the current row (`aria-current="page"`, the accent fill) on any Settings page; **Help** opens a small menu (`TabContextMenu`) beside the row, out over the page, with **Documentation** (a new tab, so the note stays put, as the palette's Open Documentation does) and **Keyboard Shortcuts** (`atom_keyboardShortcutsOpen`, the overlay `Ctrl/Cmd+?` also opens) and **Send Feedback…**, which opens the user's own mail app on a `mailto:` to office@marespopa.com (`feedback-mail.ts`: subject set, the app version and browser at the end of the body), so nothing goes through our servers; it also copies the address and says so in a toast, for anyone with no mail app set up (webmail only), where the link does nothing visible.

- Props: none.
- State: the Help menu's position (`useState`), open while set.
- Core: `next/navigation` (`useRouter`, `usePathname`), `Button`, `TabContextMenu`, `sidebar-classes.ts`, `formatShortcut`, `showCopyToast`, `feedback-mail.ts`.
