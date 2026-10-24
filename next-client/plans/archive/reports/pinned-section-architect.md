# Pinned section: architect report

## Run 1

**PRD:** `next-client/plans/pinned-section.md`. This plan replaces `tag-icons-and-pins.md` and its two reports, which have been deleted.

**Summary** (one phase, as the user asked):
- **Storage.** A new vault file, `.hermes/pins.yaml`, holds every pin: `version: 1`, then `pins:` with one line per pin, such as `{note: …, icon: 🚀}`, `{folder: …}`, `{tag: …}` or `{page: tasks}`.
  - The file is read and written by `app/services/vault-pins-format.ts` (pure parsing and edits) and `vault-pins.ts` (I/O and serialised writes).
  - The app keeps the pins in memory in `atom_pinsState` (`app/atoms/pin-atoms.ts`). `atom_updatePins` is the only writer.
  - The file reading is lenient. Entries the app doesn't recognise survive its writes. If the file is invalid YAML, the app keeps the last pins it read and refuses every write with a toast.
- **Live sync.** `usePinsSync`, mounted in `EditorShell`, keeps the pins up to date from three signals: a per-file FileSystemObserver, `atom_fileSystemVersion` (window focus, timers, the folder watcher, file operations, GitHub Pull), and saves of the file in the app's own editor.
- **Migration.** Each vault's `localStorage["hermes_home_pins"]` notes are appended to its file once, after the file has been read and found valid. The legacy entry is removed only after the write succeeds.
- **Following the vault.** Renames, moves and undo go through `atom_remapVaultPaths`, which now calls `atom_remapPins`. In-app deletes call `atom_forgetPins`. A target that is missing (changed outside the app, or not synced yet) shows faint and can still be unpinned.
- **UI.**
  - The new `SidebarPinned` section sits first in the sidebar, above Open Notes, and is hidden when nothing is pinned.
  - Each row has a ⋯ / right-click menu with Set Icon…, Move Up, Move Down and Unpin. Set Icon… opens a `PinIconPopover` emoji picker with search, paste and Remove Icon, built on `emoji-index.ts`.
  - Folders get Pin in the Files tree's menu. Tags get a Pin button on the Tags page. Pages get a palette command, **Pin Page to Sidebar…**.
  - The Tags page now follows `?tag` through `useSearchParams` inside a Suspense boundary.

**Already exists (re-verified in code):**
- Note pins and all their consumers:
  - `note-pin-atoms.ts` and `atom_notePins`
  - `SidebarFiles`
  - the tree menu
  - the note menu
  - the Pin Note command
  - `use-palette-pins.ts`
  - the remap in `vault-atoms.ts:257` and the delete in `use-delete-item.ts:79`
- Every vault type carries `.hermes/`. GitHub vaults import and commit `.hermes/**` except the Trash (`github-vault-workspace.ts:71`, plus the server routes).
- `js-yaml` is loaded lazily. Its typings declare only `load`, so the PRD adds `dump`.
- The dot-folder gap is real: `changesFileList` (`file-observer.ts:103`) ignores changes under `.` folders.
- The Tags page reads `?tag` only once, on mount (`tags/page.tsx:35`).
- Existing building blocks the feature reuses: `writeFileContent` (closes the writable in `finally`), `ensureVaultFolder`, `withRetry`, `remapPath`, `emoji-index.ts`, `TabContextMenu`, `SidebarSection`, the `FolderPopover` portal pattern, and `atom_showFolderInFiles`.

**Choices made where the brief was silent:**
- D1: one line per pin in the YAML, so GitHub three-way merges stay clean.
- D2: unknown entries and keys are kept. A file with `version > 1` refuses writes.
- D4: an invalid file, including one with merge-conflict markers, keeps the last pins and refuses all writes, migration included.
- D6: new pins go at the end. Order changes with Move Up / Move Down in the row menu. Today's order is newest first.
- D7: Pinned is the first sidebar section, above Open Notes, and hidden when empty.
- D8: the existing note entry points stay (tree menu, note menu, Pin Note, palette Ctrl/Cmd+D). Each new kind gets exactly one entry point, and those only pin. Unpinning, icons and reordering happen in the row menu. The Tags page button reads Pin, then Pinned (disabled).
- D9: clicking a folder reveals it in the Files tree.
- D10: missing targets stay listed (faint, can be unpinned). They are judged missing only once the indexer is idle.
- D11: an in-app delete removes the pin, as today. Restoring from the Trash doesn't re-pin.
- D12: the pinnable pages are All Notes, Tags, Tasks, Templates, Trash and Settings.
- D13: `pin-atoms.ts` never imports `vault-atoms.ts`; the vault handle travels in `atom_pinsState`. This avoids an import cycle.
- D14: `normalizeTag` moves to `app/utils/tag-normalize.ts`.
- D16: on mobile, the Tags page Pin button is hidden and the page command is disabled with a reason.

**Open questions** (non-blocking; the PRD uses the choice noted):
- Q1: Pinned above Open Notes (chosen), or just above Files?
- Q2: trim the extra note entry points down to the Files menu only? The PRD keeps them.
- Q3: new pins at the end (chosen) or at the top?
- Q4: on an in-app delete, keep the pin as missing so Undo restores it, instead of removing it (chosen)?

**Handoff:** "Implement next-client/plans/pinned-section.md (single phase, whole feature)."
