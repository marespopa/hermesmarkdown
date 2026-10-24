# SidebarPinned

Description: The sidebar's **Pinned** section, its first, shown with a vault open and at least one pin listed. While a vault's pins are read for the first time on this device (`status: "loading"` without `cached`), its header shows alone at once; after that `usePinsSync` starts from the pins this device last read (`pins-cache.ts`), so the rows show at once too. It lists the vault's pins from `.hermes/pins.yaml` (notes, folders, tags and app pages) in the file's order, at most nine (`PINS_MAX`; a pin past that isn't added, and `usePins` toasts "You can pin up to 9 items. Unpin one to make room."; a hand-edited file listing more shows only the first nine). Each row leads with its emoji icon (shown only here; `aria-hidden`) or its kind's default glyph (`pinGlyph`), then its label: a note's file name without `.md` (steady from the first paint; a private note shows Privacy Mode's masked title, and one hidden from lists is left out), a folder's last segment, `#tag`, or the page's name.

- **Click** on the label (`usePinnedRows`): a note opens (back to the editor from other routes); a folder is revealed in Files (`atom_showFolderInFiles`); a tag opens `/editor/tags?tag=…`, or is picked in place when already on the Tags page; a page opens (no-op when already there).
- **Ctrl/Cmd+1–9** opens the pin in that place, from anywhere in the window (a `keydown` listener on `window`; ignored when something handled the key first, as `TemplatePicker` does for its own numbered rows). Each row shows its key faintly at its end (`formatShortcut`, hidden on touch screens) and carries `aria-keyshortcuts`.
- **Current row** (`aria-current`, the accent fill): the note in front on the editor, the tag shown on the Tags page, or the page you're on (Tags only with no tag chosen). Folders are never current.
- **Missing**: a note or folder that isn't in the vault (once the index is idle) shows faint with the title "Not found in this vault"; a click toasts. It stays in the file and can be unpinned.
- **Row menu** (a click on the row's icon, a right-click, or the menu key; `TabContextMenu`). The icon is its own button, with no divider between it and the label. The menu has Set Icon… / Change Icon… (opens `PinIconPopover` under the row) and Unpin. Each change is written to the file at once (`usePins`).
- **Reorder**: dragging a row fades it and shows a thin `bg-fg-faint` insertion line; dropping moves the pin there. Alt+↑ / Alt+↓ on either of a row's buttons moves it one place (nothing past the ends). Moves are among listed pins only (`movePin` reorders them within the places they hold, so hidden entries keep theirs). The drag carries its own payload type (`application/x-hermes-pin`), so pinned rows can't be dropped into Files, and nothing from elsewhere drops here: pinning is done from the Files and note menus, the palette, the Tags page and **Pin Page to Sidebar…**. The whole section takes the drop (title included, which means the top).

## Local State & Storage
- State: the open row menu (position and row), the open emoji picker (row and anchor rect).
- Persistence: none here; pins live in the vault file (`atom_pinsState`, `atom_updatePins`). The section's fold is remembered by `SidebarSection` (`atom_sidebarCollapsed["Pinned"]`).

## Dependencies
- Core: `SidebarSection`, `usePinnedRows`, `usePins`, `TabContextMenu`, `PinIconPopover`, `pinned-pages.tsx`, `sidebar-classes.ts`, `Button`.
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
