## Folder templates

- A folder in `_templates/` whose `README.md` has `scaffold: true` is a folder template: "New from folder template…" in the palette, or "New from Folder Template…" on a folder or empty space in Files, copies it into a new folder.
- Prompts and date tokens fill in file and folder names as well as notes, each prompt asked once. It never overwrites: an existing folder, a name clash or an empty name stops it before anything is written.
- The new folder shows in the tree at once with a spinner while the writes run in the background; a failure removes everything it created.
- Wiring: folder templates are excluded from packs and template lists (`atom_folderTemplates`); optimistic rows live in `atom_pendingTreeEntries` (merged in `useVaultFileSearch`), with a new `"create"` busy op; `useFolderTemplate` holds the vault sync itself.
