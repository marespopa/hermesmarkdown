# SidebarPinned

Description: The sidebar's **Pinned** section, its first, shown with a vault open and at least one pin listed. It lists the vault's pins, kept on this device (`pin-atoms.ts`; notes, folders, tags and app pages), in order, at most nine (`PINS_MAX`; a pin past that isn't added, and `usePins` toasts "You can pin up to 9 items. Unpin one to make room."). Each row leads with its emoji icon (shown only here; `aria-hidden`) or its kind's default glyph (`pinGlyph`), then its label: a note's file name without `.md` (steady from the first paint; a private note shows Privacy Mode's masked title, and one hidden from lists is left out), a folder's last segment, `#tag`, or the page's name.

- **Click** on the label (`usePinnedRows`): a note opens, optimistically: its row is current at once (`atom_openingFilePath`, set by `openFile` before the read), with a small spinner in place of its shortcut after a moment (`.loading-bar-appear`; `aria-busy`), while the pane shows its title and an outlined body; from other routes the editor comes up at once too (`openHandle` navigates before the read); a folder opens the pane title breadcrumb's folder list under its row (`FolderPopover`: its notes and subfolders, filter, New File / New Folder through `useFolderCreateActions`, and **Show in Files**, which reveals it in the tree, `atom_showFolderInFiles`); the row keeps the current fill while it's open; with the sidebar hidden (its Ctrl/Cmd+number) the list opens centred near the window's top (`centered`); and a second click (or its Ctrl/Cmd+number) closes it; a tag opens `/editor/tags?tag=…`, or is picked in place when already on the Tags page; a page opens (no-op when already there). While a rename, move or move to Trash works on a pinned note or folder (`atom_busyPaths`), its row shows the same delayed spinner, a rename's new name at once, and a click does nothing until it's done.
- **Ctrl/Cmd+1–9** opens the pin in that place, from anywhere in the window (a `keydown` listener on `window`; ignored when something handled the key first, as `TemplatePicker` does for its own numbered rows). **Ctrl/Cmd+0** goes back to the note opened before this one, however either was opened (a pin, Files, the palette, a link; `usePreviousNote`), so pressing it again returns — a toggle between the last two notes. Off the editor it brings back the last note in front. With no note to go back to the key is left alone; a note that's gone since shows a toast. Kept in memory for this window only. Each row shows its key faintly at its end (`formatShortcut`, hidden on touch screens) and carries `aria-keyshortcuts`.
- **Read ahead**: resting the pointer on a note's row for ~100ms reads it ahead (`useHoverPrefetchHandlers`, `note-prefetch.ts`; never on touch), so the click finds its text in memory.
- **Current row** (`aria-current`, the accent fill): the note in front on the editor, the tag shown on the Tags page, or the page you're on (Tags only with no tag chosen). Folders are never current.
- **Missing**: a note or folder that isn't in the vault (once the index is idle) shows faint with the title "Not found in this vault"; a click toasts. It stays pinned and can be unpinned.
- **Icon**: its own button, with no divider between it and the label. A click opens the emoji picker under the row straight away (`PinIconPopover`, `anchorRef` so a second click closes it; Remove Icon clears it), as the sidebar header's vault icon does. With no emoji, the kind's glyph turns into a smiley on hover or focus.
- **Row menu** (a right-click or the menu key; `TabContextMenu`): Set Icon… / Change Icon… (the same picker) and Unpin. Each change is saved at once (`usePins`).
- **Reorder**: dragging a row fades it and shows a thin `bg-fg-faint` insertion line; dropping moves the pin there. Alt+↑ / Alt+↓ on either of a row's buttons moves it one place (nothing past the ends). Moves are among listed pins only (`movePin` reorders them within the places they hold, so hidden entries keep theirs). The drag carries its own payload type (`application/x-hermes-pin`), so pinned rows can't be dropped into Files, and nothing from elsewhere drops here: pinning is done from the Files and note menus, the palette, the Tags page and **Pin Page to Sidebar…**. The whole section takes the drop (title included, which means the top).

## Local State & Storage
- State: the open row menu (position and row), the open emoji picker (row and anchor rect).
- Persistence: none here; pins are kept on this device (`atom_pins`, `atom_updatePins`). The section's fold is remembered by `SidebarSection` (`atom_sidebarCollapsed["Pinned"]`).

## Dependencies
- Core: `SidebarSection`, `usePinnedRows`, `usePins`, `TabContextMenu`, `PinIconPopover`, `FolderPopover`, `useFolderCreateActions`, `useSidebarNavigation`, `pinned-pages.tsx`, `sidebar-classes.ts`, `Button`.
- `usePinnedRows` reads `useSearchParams`, so `WorkspaceSidebar` renders this inside a `<Suspense>` boundary.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<Suspense fallback={null}>
  <SidebarPinned activePath={currentPath} />
</Suspense>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| activePath | `string \| null` | | The note in front on the editor (null on other routes): its pinned row is current |
