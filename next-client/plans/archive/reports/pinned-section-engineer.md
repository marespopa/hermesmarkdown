# Pinned section: engineer report

## Run 1

PRD: `next-client/plans/pinned-section.md` (single phase, whole feature). Nothing was run: no build, typecheck, lint or tests, as instructed. Nothing is committed.

### Built
- **`.hermes/pins.yaml` format** (header, `version: 1`, one flow mapping per pin, entry rules, lenient reading, kept unknown entries and keys, `newer`, the edits): `app/services/vault-pins-format.ts` (`parsePinItem`, `parsePins`, `serializePins`, `addPins`, `removePin`, `setPinIcon`, `movePin`, `remapPinPaths`, `forgetPinPaths`, `normalizePinIcon`, `samePins`).
- **Read and serialised writes** (fresh read, refused when invalid or newer, no write when nothing changes, `ensureVaultFolder` + `withRetry` + `writeFileContent`, chain continues after a rejection): `app/services/vault-pins.ts:44` (`readPinsFile`), `:81` (`updatePinsFile`).
- **In-memory state and the one writer** (toasts with the exact PRD texts; result applied only while the vault is the same; remap and forget skip the write when no pin is affected): `app/atoms/pin-atoms.ts:43` (`atom_updatePins`), `:75` (`atom_remapPins`), `:82` (`atom_forgetPins`), `:27` (`atom_pinnedNotePaths`, memoised through `selectAtom`).
- **Live sync** (vault open or change resets first, `atom_fileSystemVersion`, the tab's `lastSavedContent`, a per-file observer debounced 250 ms, run counter for stale reads, invalid keeps the last pins, disabled while locked): `app/hooks/use-pins-sync.ts:30`, mounted at `app/editor/components/EditorShell.tsx:61`.
- **Migration** from `hermes_home_pins` (once per vault per session after a valid read; one `addPins` write; legacy entry removed only on ok or unchanged; the key removed when empty): `app/hooks/pins-migration.ts`, `app/hooks/use-pins-sync.ts:40`. Palette-pinned notes: `app/components/CommandPalette/use-palette-pins.ts` (one `addPins` write; items dropped only on ok or unchanged; in-flight ref).
- **Following the vault**: rename, move and undo through `app/atoms/vault-atoms.ts:262`; in-app delete through `app/hooks/file-system/use-delete-item.ts:79`.
- **Pinned section**: `app/editor/components/sidebar/SidebarPinned.tsx` (rows; the row menu opens from a click on the row's icon, a right-click or the menu key; the picker), `use-pinned-rows.ts:37` (labels, titles, missing only when the indexer is idle at `:42`, current row, click behaviour, privacy), `pinned-pages.tsx` (pages and default glyphs). It's rendered first, inside `<Suspense>`, at `app/editor/components/WorkspaceSidebar.tsx:111`.
- **Emoji picker**: `app/editor/components/PinIconPopover.tsx` (search, up to 64 tiles, a pasted emoji first, `aria-pressed` current, Remove Icon as a filled secondary button, Loading and No emoji states, Enter, Escape and click-outside handling, stays open on a failed write).
- **Entry points**:
  - Folder Pin / Unpin in the tree: `vault-tree/tree-menu-items.tsx:71-90` and `tree-model.ts` (new signatures), passed from `sidebar/SidebarFiles.tsx`, which no longer lists pinned notes.
  - Note menu: `app/editor/hooks/use-note-menu-items.tsx`.
  - Pin Note command: `editor-commands/use-editor-command-context.ts`.
  - Palette Ctrl/Cmd+D: `use-palette-pins.ts`.
  - Tags page Pin / Pinned button: `app/editor/tags/TagHeading.tsx`.
  - **Pin Page to Sidebar…**: `editor-commands/PinCommands.tsx`, mounted at `EditorShell.tsx:112`.
- **Reactive `?tag`**: `app/editor/tags/page.tsx:44` (`useSearchParams` inside `<Suspense>`). `editorTagHref`: `app/editor/utils/editor-url.ts:28`.
- `normalizeTag` moved to `app/utils/tag-normalize.ts`. `parse-note.ts` imports it.
- `types/js-yaml.d.ts` declares `dump`.
- Removed `note-pin-atoms.ts`, its test and `atom_notePins`. Only `pins-migration.ts` mentions `hermes_home_pins`.

### Tests and docs
- New tests:
  - `app/services/vault-pins-format.test.ts`
  - `app/services/vault-pins.test.ts`
  - `app/atoms/pin-atoms.test.ts`
  - `app/hooks/use-pins-sync.test.tsx`
  - `app/hooks/file-system/use-delete-item.test.tsx`
  - `app/editor/components/sidebar/SidebarPinned.test.tsx`
  - `app/editor/components/PinIconPopover.test.tsx`
  - `app/editor/components/vault-tree/tree-menu-items.test.tsx`
  - `app/editor/components/editor-commands/PinCommands.test.tsx`
  - `app/editor/utils/editor-url.test.ts`
  - `app/utils/tag-normalize.test.ts`
- Updated tests:
  - `app/atoms/remap-vault-paths.test.ts`
  - `app/editor/components/WorkspaceSidebar.test.tsx`
  - `app/editor/tags/page.test.tsx`
  - `app/components/CommandPalette/CommandPalette.test.tsx`
- New component docs:
  - `sidebar/SidebarPinned.md`
  - `PinIconPopover.md`
  - `tags/TagHeading.md`
- Updated docs:
  - READMEs: `app/atoms/README.md`, `app/hooks/README.md`, `app/services/README.md`, `sidebar/README.md`, `components/README.md`, `vault-tree/README.md`, `editor-commands/README.md`, `CommandPalette/README.md`, `app/editor/README.md`
  - Component docs: `sidebar/SidebarFiles.md`, `WorkspaceSidebar.md`, `EditorShell.md`, `vault-tree/TreeContextMenu.md`, `CommandPalette.md`
- In-app docs:
  - `get-started.tsx`: the "Pinned notes" section is now **Pinned**, with the same id.
  - `vault.tsx`: mentions `.hermes/pins.yaml` and adds a new "The pins file" section (`#pins-file`).

### Decisions
- Deviation (Tests, WorkspaceSidebar): most Pinned-section cases are in a new `sidebar/SidebarPinned.test.tsx` that renders the section directly. `WorkspaceSidebar.test.tsx` keeps two cases: Pinned comes first above Open Notes in file order, and there's no section when nothing is pinned. Every listed case is covered, just in a more focused file.
- Deviation (Design, `use-pinned-rows.ts`): rows carry no `glyph`, because a `.ts` file can't hold JSX. `SidebarPinned` calls `pinGlyph(pin)` from `pinned-pages.tsx` instead.
- Deviation (Implementation, WorkspaceSidebar): `SidebarPinned` takes only `activePath`, not `onEditor`. `currentPath` is already null off the editor, so `onEditor` would be redundant.
- Deviation (Implementation, tags page): `selected` comes from `useSearchParams`, plus a short-lived pick override. A click shows its tag at once, and the override is cleared during render as soon as the URL changes, so the URL always wins.
- Deviation (Design, use-palette-pins): the old palette-pin migration waits for `atom_pinsState.status === "ok"` instead of `vaultKey`. Before the sync has read the file, the writer returns `no-vault`, and the effect would never retry.
- `removePin` removes every entry with that key, hidden duplicates included. Otherwise an unpin would just bring a duplicate into view.
- `addPins` skips pins whose target breaks the entry rules (for example, odd legacy paths), so it never writes an entry it wouldn't list.
- A sync read that lands after the app's own write (the state changed during the read) is dropped. Otherwise it could put back pins from before the write.
- Clicking the Tags page pin while a tag is chosen clears `?tag` (back to the list of tags). Already on any other pinned page, a click is a no-op, as the PRD says.
- While indexing, clicking a note pin that isn't in the metadata yet does nothing (no toast). Once indexing is done and it's still missing, a click toasts.
- `pin-atoms` uses `react-hot-toast` directly, as the PRD says. The app's `<Toaster>` styles it.
- Migration is marked done before its write and unmarked if the write returns `invalid`, so it retries once the file is fixed.

### Not done / open
- `CommandPalette.tsx:40` still has a comment saying pinned notes are "shared with the sidebar's Files". I left it alone because the PRD requires `CommandPalette.tsx` to stay unchanged. It's a one-word follow-up.
- Pressing Escape in a pinned row's menu (`TabContextMenu`) also reaches the sidebar's own Escape handler, as the Open Notes menu already does today. I didn't change that. The emoji picker stops its own Escape.
- The dev-server error the user pasted (`ENOENT … editor-commands/TagCommands.tsx` from Tailwind's content tracker) isn't caused by this change. Nothing references that file. It's a stale entry from the reverted tag-icons work. Restarting `next dev` should clear it; if it doesn't, delete `.next`.

### Likely CI failures
- `app/components/CommandPalette/CommandPalette.test.tsx`: the in-memory `vault-pins` mock and the `pinnedNotes()` helper now seed `atom_pinsState`. The Ctrl+D, context-menu pin and migration cases became async (`waitFor`).
- `app/hooks/use-pins-sync.test.tsx`: the fake-timer observer case and the late-read-from-the-previous-vault case depend on effect and cleanup order.
- `app/services/vault-pins-format.test.ts` / `remap-vault-paths.test.ts`: these assert exact `js-yaml` 4.3.2 output (`  - {folder: projects}`, the emoji written unquoted, `version: 1` first).

### To verify
- `cd next-client && corepack yarn tsc --noEmit`
- `corepack yarn vitest run app/services/vault-pins-format.test.ts app/services/vault-pins.test.ts app/atoms/pin-atoms.test.ts app/hooks/use-pins-sync.test.tsx app/hooks/file-system/use-delete-item.test.tsx app/atoms/remap-vault-paths.test.ts app/editor/components/sidebar/SidebarPinned.test.tsx app/editor/components/WorkspaceSidebar.test.tsx app/editor/components/PinIconPopover.test.tsx app/editor/components/vault-tree/tree-menu-items.test.tsx app/editor/components/editor-commands/PinCommands.test.tsx app/editor/tags/page.test.tsx app/components/CommandPalette/CommandPalette.test.tsx app/editor/utils/editor-url.test.ts app/utils/tag-normalize.test.ts`
- Then the full suite and `corepack yarn build` (the Suspense boundaries for `useSearchParams`).
- Manually, in the app:
  1. Pin a note and a folder from Files. `.hermes/pins.yaml` appears and the Pinned section shows above Open Notes.
  2. Pin a tag from the Tags page. Pin a page with **Pin Page to Sidebar…**.
  3. Set and change an icon (search, paste, Remove Icon). Move rows up and down, and unpin.
  4. Rename and move a pinned folder, then undo. Move a pinned note to the Trash.
  5. Edit `pins.yaml` by hand: valid, then invalid (the toast shows on pin and the file is untouched).
  6. Open a vault with old per-device pins: they migrate in.
  7. On mobile width there's no section and no Pin button, and the page command is disabled.

## Run 2

User change during the run: the ⋯ button is gone, to keep the row simpler. A click on a pinned row's leading icon opens the row menu instead (a right-click or the menu key still does too). The icon is its own button; while hovered, focused or open it shows a hairline right border (`border-edge`), setting it apart from the label, which opens the pin.
- `app/editor/components/sidebar/SidebarPinned.tsx`: each row is a container with the current or idle row fill, holding an icon button (`aria-label` "<label> actions", `aria-haspopup="menu"`, the menu anchored under it) and a label button (`aria-current`, the tooltip, open on click). A shared `openMenuAt` handles the right-click and menu-key paths for both buttons.
- Tests: `SidebarPinned.test.tsx` and `WorkspaceSidebar.test.tsx` now read a row's text from the whole row (the icon is now a separate button). The "<label> actions" queries are unchanged.
- Docs: `SidebarPinned.md`, `sidebar/README.md`, `WorkspaceSidebar.md`, in-app `get-started.tsx`.

## Run 3

User change during the run: the pinned row's icon no longer shows a right border on hover, focus or open; the icon and the label simply sit side by side. Reorder now follows D6: Move Up / Move Down are gone from the row menu (Set / Change Icon… and Unpin remain).
- `app/services/vault-pins-format.ts`: `movePin(doc, key, to, listed)` moves a pin to a position among the listed pins, reordering them within the places they already hold, so hidden and unrecognised entries keep theirs. `usePins().move` takes the target index.
- `app/editor/components/sidebar/SidebarPinned.tsx`: rows drag with their own payload type (`application/x-hermes-pin`), fade while dragged and show the `bg-fg-faint` insertion line (the Open Notes pattern). Alt+↑ / Alt+↓ on either button moves a row one place; nothing happens past the ends (no write).
- Tests: `vault-pins-format.test.ts` (move to a position, hidden entries kept, out-of-range and unknown keys) and `SidebarPinned.test.tsx` (menu without Move items, drag via `createEvent` + `clientY`, Alt+arrows and the ends).
- Docs: `SidebarPinned.md`, `sidebar/README.md`, `WorkspaceSidebar.md`, in-app `get-started.tsx`.
- Not run locally (CI runs the checks).

## Run 4

User ask: drag a file or an open note into Pinned.
- `app/editor/utils/pin-drag.ts` (new): `PIN_DRAG_TYPE` (`application/x-hermes-pinnable`), `setPinDragData` (notes `.md` and folders only; nothing else gets a payload), `carriesPinTargets`, `readPinDragData` (tolerant).
- Sources: the Files tree (`use-tree-actions.startDrag(entry, dataTransfer)`, a selection carries all of it; `FileRow`/`FolderRow` pass their `DataTransfer`) and Open Notes rows add the payload. Their `effectAllowed` is now `linkMove` so the Pinned drop can use `dropEffect: "link"`.
- `SidebarPinned.tsx`: a pinnable drag over the rows shows the reorder insertion line; a drop pins the new ones there and moves already-pinned ones there, in one write (`usePins().pinAt` → `insertPins` in `vault-pins-format.ts`, which shares `placePins` with `movePin`). With no pins, a dashed **Drop to pin** zone shows while such a drag is under way (document `dragstart`/`dragend`/`drop` listeners).
- Tests: `pin-drag.test.ts` (new), `vault-pins-format.test.ts` (`insertPins`), `SidebarPinned.test.tsx` (drop into the list, ignored drags, the empty drop zone), `SidebarOpenNotes.test.tsx` (payload on drag). `VaultFileTree`, `WorkspaceSidebar` and `SidebarOpenNotes` test drags now give `setData`/`types`.
- Docs: `SidebarPinned.md`, `SidebarOpenNotes.md`, `FileRow.md`, `FolderRow.md`, `sidebar/README.md`, `WorkspaceSidebar.md`, `hooks/README.md`, `services/README.md`, in-app `get-started.tsx`.
- Not run locally (CI runs the checks).

## Run 5

User report: dragging a file or an open note into Pinned didn't work.
- Cause (likely): with nothing pinned, the **Drop to pin** zone was rendered during `dragstart`, above Open Notes and Files. The layout shift under the drag source makes the browser cancel the drag at once. The zone now appears a tick later (`setTimeout`, cleared on `dragend`/`drop`).
- Also: only the rows took the drop, so the section title and the gaps between rows refused it. The whole section is now the drop target (one wrapper with `dragover`/`dragleave`/`drop`). The insertion point is computed from the pointer against the rows (`indexAt`), on drop too, so it doesn't rely on state a `dragleave` may have cleared.
- Tests: `SidebarPinned.test.tsx` lays out all rows and sets `clientY` on drop events; new cases for a drop on the title and for the zone not showing during `dragstart`.
- Not run locally, and not checked in a browser.

## Run 6

User report: on Chrome for Android, dragging a file from Files into Pinned did nothing (moving files within Files worked).
- Cause: on touch, the tree uses its own long-press drag (`use-touch-tree-drag.ts`) and cancels the browser's drag, so Pinned never got a `drop`.
- Fix: the touch drag announces `start` / `move` / `end` (with `dropped`) as a `hermes:pin-touch-drag` document event carrying the pinnable targets (`announcePinTouchDrag`, `pinTargetsOf` in `utils/pin-drag.ts`). `SidebarPinned` shows the zone on `start`, the insertion line while the finger is over it (`elementFromPoint`), and pins on a lift over it.
- Tests: two touch cases in `SidebarPinned.test.tsx`. Docs: `SidebarPinned.md`, `vault-tree/README.md`.
- Not run locally, and not checked on a device.

## Run 7 — sidebar simplification (direct, not through the factory)

User ask: remove Open Notes (switch with Ctrl/Cmd+K), a regex filter box in Files, Pinned first with at most nine bound to Ctrl/Cmd+1–9 with key badges (the open-notes binding removed), and replace the Outline section with an optional right-hand minimap (off by default, Ctrl/Cmd+Shift+M or Settings).
- Removed: `SidebarOpenNotes` (+ test, doc), `SidebarOutline` (+ doc), `markdown-outline.ts` (+ test, now unused), `atom_workspaceTabs` / `atom_activateWorkspaceTab` / `atom_reorderOpenNote` and their tests, `openOpenNote`, the Ctrl/Cmd+1–9 tab binding in `use-editor-shortcuts.ts`. Drag-to-pin from Open Notes went with it.
- Pins: `PINS_MAX = 9`; `addPins` adds only what fits, `pinsOverLimit` tells `usePins` to toast `PINS_FULL_MESSAGE`. `usePinnedRows` lists the first nine. `SidebarPinned` binds Ctrl/Cmd+1–9 on `window` (skipped when already handled, e.g. TemplatePicker's numbered rows) and shows each key at the row's end.
- Files filter: `sidebar/files-filter.ts` + a `BareInput` in `SidebarFiles`; `VaultFileTree` gained `expandAll`.
- Minimap: `markdown-editor/EditorMinimap.tsx` (canvas, sticky in the pane, click/drag to scroll), `atom_showMinimap`, the shortcut, **Toggle Minimap**, Settings → Editor → View.
- Known trade-off: legacy per-device pins migrating into a full list (nine already) are dropped past the ninth.
- Tests and docs updated. Not run locally, not checked in a browser.

## Run 8

- User decision: drag-to-pin removed (it didn't work for them); pinning is manual. Gone: `utils/pin-drag.ts`, the tree's pin payload and touch announcements (the tree is back to its earlier drag code), the **Drop to pin** zone, `usePins().pinAt`, `insertPins`. Kept: reordering pinned rows by dragging (the whole section takes the drop) and Alt+↑/↓.
- Also this round: pins show at once (`hooks/pins-cache.ts`, parser preloaded, header on first read), pinned notes are labelled by file name, and the Files filter became a Search field at the new `FIELD_SIDEBAR_CLASS` size.
