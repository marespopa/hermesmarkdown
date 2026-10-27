# Architect report — 003 folder templates

## Run 1

**PRD:** `next-client/plans/003-folder-templates-scaffolding-a-folder/prd.md`

**Summary** (3 phases)
- **Phase 1:** a folder in `_templates/` whose `README.md` has `scaffold: true` is detected from the index (`atom_folderTemplates`). It is excluded from the single-note template lists and from the packs. A pure planner (`app/utils/templates/folder-template.ts`) does three things: it expands prompts and date tokens in names, and every token in `.md` bodies; it finds clashes and names that end up empty; and it collects each prompt label once.
- **Phase 2:** disk ops (`folder-template-ops.ts`: read the source from disk, write the structure, roll back) and an ephemeral `atom_pendingTreeEntries` that `useVaultFileSearch` merges in, so the tree shows the new structure in the same frame with a `"create"` busy spinner. Also the hook `useFolderTemplate` and the palette command "New from folder template…".
- **Phase 3:** "New from Folder Template…" in a folder's (and the empty space's) context menu in Files, with reveal; in-app docs and directory READMEs.
- Never overwrites: everything goes into one new top folder, checked before anything is written. A mid-write failure removes that folder.

**Already exists**
- The `_templates/` registry with packs, the token engine (prompts, date formats and math, one-pass expansion), the prompts form (`askPrompts`), and `templateContent` for cleaning frontmatter.
- Directory helpers with a proven rollback (`emptyDirectory` + `removeEntry`), `writeFileContent`, `withRetry`, `holdVaultSync`.
- Busy-row spinners (`atom_busyPaths`), and tree rows without handles (the startup snapshot).
- Tree menu plumbing (`treeMenuItems` gets `props` directly, so `VaultFileTree.tsx`, at 395 lines, needs no edit).

**Decisions / open questions to look at**
- The folder template is copied as a **new top folder** (its expanded name) under the destination, never merged into an existing folder. This makes "stop if anything exists" and the rollback exact.
- The marker README is copied with `scaffold` removed, skipped if empty, and opened afterwards.
- Names expand only prompts and date/time tokens. Bodies expand only in `.md` files; other files are copied byte for byte.
- From the palette, the destination is a folder list (root first, `_`/`.` folders left out). From the tree menu it is the clicked folder.
- Open: should the Templates page list folder templates later? Should plain-text files expand tokens too? Both are deferred.

**Handoff:** "Implement next-client/plans/003-folder-templates-scaffolding-a-folder/prd.md, phases 1–3."
