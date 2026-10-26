# Open notes storage

How `atom_openFiles` (file-atoms.ts) is kept in browser storage without blocking typing.

| File | Role |
|------|------|
| `open-notes-persister.ts` | `openNotesPersister`: finds which notes changed since the last write, writes only those when the browser is idle (and at once on `pagehide` / hidden), keeps the names in `localStorage["openNotes"]`, moves the old `localStorage["openFiles"]` value over once, and falls back to it without IndexedDB. |
| `open-notes-db.ts` | The IndexedDB store (`HermesMDOpenNotes`): `texts` (content, plus `lastSavedContent` only while it differs, and a pending conflict) and `snapshots`, one record per path. |
| `legacy-storage.ts` | `debouncedJSONStorage`: the old single-value localStorage writer, used as the fallback, with its `storage-full` warning. |
