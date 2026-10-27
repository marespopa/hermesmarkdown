# Folder templates (scaffolding) — engineer report

## Built
- Detection/exclusion: `app/utils/templates/template-registry.ts` (`FolderTemplate`, `isScaffoldFlag`, `listFolderTemplates`, `exclude` on `listTemplates`/`groupTemplatePacks`); `app/atoms/template-atoms.ts` (`atom_folderTemplates`, `atom_templates` excludes them); `app/editor/templates/page.tsx` passes the exclude set.
- `dropKeys`: `app/utils/templates/template-frontmatter.ts`.
- Planner: `app/utils/templates/folder-template.ts` (labels, name expansion, display name, `planScaffold`).
- Disk ops: `app/hooks/file-system/folder-template-ops.ts` (`readScaffoldSource`, `writeScaffold`, `rollbackScaffold`, `ScaffoldClashError`).
- Pending rows: `app/atoms/pending-tree-atoms.ts`; merged in `app/editor/hooks/useVaultFileSearch.ts` (`allFiles`, `folderPaths`); `BusyOp` gains `"create"`.
- Hook: `app/hooks/file-system/use-folder-template.ts`, composed in `use-file-crud.ts` (not in `held`); `readClipboard` is now exported from `use-template-notes.ts`.
- Palette: `document-vault-commands.ts` + `use-editor-command-context.ts` ("New from folder template…").
- Tree menu: `tree-model.ts` prop, `use-tree-actions.ts` returns `reveal`, `tree-menu-items.tsx` item; `SidebarFiles.tsx` and `files/page.tsx` pass the prop only when `atom_folderTemplates` is non-empty. `VaultFileTree.tsx` untouched.

## Tests/docs
- Tests: `template-registry.test.ts`, `template-frontmatter.test.ts`, `folder-template.test.ts` (new), `folder-template-ops.test.ts` (new), `useVaultFileSearch.test.tsx` (new), `use-folder-template.test.tsx` (new), `build-editor-commands.test.ts`, `tree-menu-items.test.tsx`, `SidebarFiles.test.tsx`.
- Docs: `utils/templates/README.md`, `atoms/README.md`, `hooks/README.md`, `vault-tree/README.md`, `TreeContextMenu.md`, `VaultFileTree.md`, `SidebarFiles.md`, `editor/templates/README.md`, in-app `documentation/content/templates.tsx` (Folder templates section + keywords).

## Decisions
- No `README.md` exists in `hooks/file-system/`; the rows went into `app/hooks/README.md`.
- A pending binary file (e.g. `.png`) is not drawn as a row because `useVaultFileSearch`'s visible-file filter hides non-text files (PRD: "same filters").
- A failure after the writes (rescan/index) does not roll back; rows clear and the error is logged.
- `ScaffoldClashError.beforeWrites` marks the top-folder clash so the hook skips rollback there.

## Not done / open
- Nothing from the PRD deferred. Not checked in a real browser (local vault vs. browser vault).

## To verify
- `corepack yarn tsc --noEmit`
- `corepack yarn vitest run app/utils/templates app/hooks/file-system/folder-template-ops.test.ts app/hooks/file-system/use-folder-template.test.tsx app/editor/hooks/useVaultFileSearch.test.tsx app/editor/components/editor-commands app/editor/components/vault-tree/tree-menu-items.test.tsx app/editor/components/sidebar/SidebarFiles.test.tsx`
- Manual: `_templates/{{prompt:Client}} engagement/README.md` with `scaffold: true`, add a subfolder note; run from the palette and a folder's context menu.
