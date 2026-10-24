# SidebarPinned

Description: The sidebar's **Pinned** section, its first, shown with a vault open and at least one pin listed. It lists the vault's pins from `.hermes/pins.yaml` (notes, folders, tags and app pages) in the file's order, at most nine (`PINS_MAX`; a pin past that isn't added, and `usePins` toasts "You can pin up to 9 items. Unpin one to make room."; a hand-edited file listing more shows only the first nine). Each row leads with its emoji icon (shown only here; `aria-hidden`) or its kind's default glyph (`pinGlyph`), then its label: a note's display title (Privacy Mode applies; a note hidden from lists is left out), a folder's last segment, `#tag`, or the page's name.

- **Click** on the label (`usePinnedRows`): a note opens (back to the editor from other routes); a folder is revealed in Files (`atom_showFolderInFiles`); a tag opens `/editor/tags?tag=…`, or is picked in place when already on the Tags page; a page opens (no-op when already there).
- **Ctrl/Cmd+1–9** opens the pin in that place, from anywhere in the window (a `keydown` listener on `window`; ignored when something handled the key first, as `TemplatePicker` does for its own numbered rows). Each row shows its key faintly at its end (`formatShortcut`, hidden on touch screens) and carries `aria-keyshortcuts`.
- **Current row** (`aria-current`, the accent fill): the note in front on the editor, the tag shown on the Tags page, or the page you're on (Tags only with no tag chosen). Folders are never current.
- **Missing**: a note or folder that isn't in the vault (once the index is idle) shows faint with the title "Not found in this vault"; a click toasts. It stays in the file and can be unpinned.
- **Row menu** (a click on the row's icon, a right-click, or the menu key; `TabContextMenu`). The icon is its own button, with no divider between it and the label. The menu has Set Icon… / Change Icon… (opens `PinIconPopover` under the row) and Unpin. Each change is written to the file at once (`usePins`).
- **Reorder**: dragging a row fades it and shows a thin `bg-fg-faint` insertion line; dropping moves the pin there. Alt+↑ / Alt+↓ on either of a row's buttons moves it one place (nothing past the ends). Moves are among listed pins only (`movePin` reorders them within the places they hold, so hidden entries keep theirs). The drag carries its own payload type (`application/x-hermes-pin`), so pinned rows can't be dropped into Files.
- **Drag in to pin**: notes and folders dragged from Files (a selection drags all of it) carry the pinnable payload (`utils/pin-drag.ts`). The whole section is the drop target (title included, which means the top): the insertion point is before the first row whose middle is below the pointer, else after the last, and the same line shows there. Dropped, new ones are pinned there and ones already pinned move there, in one write (`usePins().pinAt` → `insertPins`). Other files and drags (desktop files, tasks) are ignored. With nothing pinned the section is hidden, but while such a drag is under way it shows a dashed **Drop to pin** zone (it listens for `dragstart`/`dragend`/`drop` on the document). The zone appears a tick after `dragstart`, never during it: a browser cancels a drag whose `dragstart` moves the page under it, and the zone pushes Files down. On touch screens the Files tree drags with its own long press (`use-touch-tree-drag.ts`), not the browser's drag and drop, so it announces `start` / `move` / `end` as a `hermes:pin-touch-drag` document event (`announcePinTouchDrag`); the section shows the same zone and line while the finger is over it (`elementFromPoint`) and pins on lift.

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
