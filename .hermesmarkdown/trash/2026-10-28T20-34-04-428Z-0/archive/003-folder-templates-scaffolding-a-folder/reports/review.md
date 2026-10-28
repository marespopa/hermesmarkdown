## Review 1

**Verdict:** Approve with nits

**Checks:** Deferred to CI (factory mode).

**PRD coverage**
- Detection/exclusion: done. `template-registry.ts` has `isScaffoldFlag`, `listFolderTemplates` and the `exclude` parameters. `template-atoms.ts` has `atom_folderTemplates`, and `atom_templates` passes `exclude`. The Templates page passes it too.
- Planner (`folder-template.ts`): done.
  - Prompt label order, name-token whitelist and sanitising are as specified.
  - Empty-name and case-insensitive duplicate checks are in place.
  - README `{{title}}` is the folder name.
  - `scaffold` is dropped, and an empty root README is skipped.
  - `cursor` is kept only on the root README.
- Disk ops (`folder-template-ops.ts`): done. It has the typed clash error, a pre-write clash that skips rollback, `entryExists` before each write, `"\n"` for empty content, and `rollbackScaffold` built on `emptyDirectory`.
- Optimistic UI and hook (`use-folder-template.ts`): done.
  - Pending rows and `create` busy are set after preflight.
  - Writes run inside `holdVaultSync`.
  - Success path: folder paths, `scanVault`, `indexVaultTags`, then clear, toast, and open the README with the scroll target.
  - Failure path: rollback, clear, rescan, toast.
  - The hook is left out of `held`, as the PRD says.
- Entry points: done.
  - Palette command, inside the vault-open block.
  - Tree menu item hidden under `_templates`; `reveal` is returned.
  - Props wired in `SidebarFiles` and the Files page.
  - `VaultFileTree.tsx` is untouched.
- File sizes are all under 400 lines (the largest new file is 192).
- Docs: atoms, vault-tree, SidebarFiles, VaultFileTree, templates README, hooks README and in-app docs are updated. In-app docs are 175 lines.
- No network calls, and nothing mentions daily notes.

**Findings (minor, no action required)**
- `use-folder-template.ts:86-100`: if `scanVault` or `indexVaultTags` throws after a successful write, the `finally` clears the rows, but no success toast or README open follows. The error only reaches the `.catch` console log. The files are on disk, so the user just sees no feedback. Consider a toast.
- `use-folder-template.ts:173-186`: a second run with the same name started before the first run's first write passes preflight, because the top folder isn't on disk yet. `writeScaffold` then hits `ScaffoldClashError` with `beforeWrites`, which is safe and gives an error toast, so there is no data loss.
- Cancelling at the folder-template pick or the destination step has no dedicated test. The prompts-cancel test covers the same early-return pattern.

**Tests and docs gaps:** none that block approval. The PRD-listed cases I checked are present: hook tests for no templates, prompts once, destination skip, exists, success ordering, failure rollback and rollback failure.

**Handoff:** none.
