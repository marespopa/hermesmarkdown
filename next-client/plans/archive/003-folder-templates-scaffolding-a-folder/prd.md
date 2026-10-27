# Folder templates (scaffolding) — engineering PRD

Factory mode: this PRD names every file, pattern and constraint the engineer and reviewer need. Read the files it cites, not `ARCHITECTURE.md`/`DESIGN.md`.

## Context

Source: `brief.md`. A **folder template** is a folder inside `_templates/` whose `README.md` frontmatter says `scaffold: true`. Using it copies the whole folder (subfolders, notes, other files) into the vault. `{{prompt:Label}}` and date tokens fill in in file names, folder names and note bodies, and each prompt is asked once. It is reached from a palette command and from a folder's context menu in Files. It never overwrites anything: if a target is already there, it stops before writing. The tree shows the result at once, the writes happen behind it, and a failure rolls everything back. Daily logs and dated-note generators are out of scope (daily sheets were removed on 2026-10-13 and must not come back).

What already exists:

1. **Templates folder and packs.** `app/utils/templates/template-registry.ts`: `TEMPLATES_FOLDER = "_templates"` (:9). `packOf()` (:42) treats a `.md` file directly in `_templates/` as a loose template and one in a direct subfolder as a template in a **pack**. Files deeper than that don't count. `listTemplates()` (:58) and `groupTemplatePacks()` (:71) are pure and work from indexed paths. `groupTemplatePacks` also lists empty pack folders from `folderPaths`. `app/atoms/template-atoms.ts` derives `atom_templatesFolder` (:11) and `atom_templates` (:16) from `atom_fileMetadata`. **Problem:** a folder template is a direct subfolder of `_templates/`, so today its `README.md` and every top-level `.md` in it would show up as templates in a pack. That would put them in the template picker, the palette's `~` templates, the empty-note pills and the Templates page.
2. **Token engine.** `app/utils/templates/template-tokens.ts`: `templateTokenRegex()` (:78), `parseTemplateToken()` (:99), `isValidToken()` (:112), `formatDate()`/`shiftDate()`, `extractPromptLabels()` (:215, distinct, trimmed, first-appearance order), `usesToken()` (:206) and `expandTemplate(body, ctx)` (:225). Expansion is one pass. Unknown `{{name}}` blanks stay literal. The first `{{cursor}}` becomes an offset and later ones are removed. `TemplateContext` = `{ now, title, clipboard, prompts, selection? }` (:55).
3. **Template frontmatter.** `app/utils/templates/template-frontmatter.ts#templateContent()` (:25) removes column-0 comment lines and the retired keys `RETIRED_KEYS` (:6) from the frontmatter. If nothing else is left, it drops the block. Frontmatter values from `parseFmFields()` (`app/utils/frontmatter-utils.ts:5`) are **strings**, so `scaffold: true` is `"true"`.
4. **Prompts form.** `app/hooks/use-template-dialog.ts#askPrompts(labels, confirmLabel)` resolves to the answers, or `null` when cancelled. `TemplateDialogHost` renders it. `app/hooks/file-system/use-template-notes.ts#instantiate()` (:50) is the single-note path. It shows the prompt → clipboard → `expandTemplate` order this feature follows, and `readClipboard()` (:21) is the pattern to copy.
5. **File helpers.** `app/hooks/file-system/directory-ops.ts`:
   - `entryExists(dir, name)` (:26) is true for a file or a folder.
   - `emptyDirectory()` (:13) + `parent.removeEntry(name)` is the proven rollback; see `moveDirectoryByCopy` (:104–113). Don't use `removeEntry(name, { recursive: true })`: it throws on some browsers (comment at :4–12).
   - `directoryAtPath(vault, path, create)` (:123), `copyInto()` (:37). Read the bytes before touching the destination.

   `app/services/file-writer.ts#writeFileContent(handle, content)` (:67) takes a string, Blob, ArrayBuffer or Uint8Array and closes the stream itself. `app/hooks/file-system/shared.ts#withRetry` (:25).
6. **Busy rows.** `app/atoms/busy-path-atoms.ts`: `atom_busyPaths`, and `busyEntry()` (:18), which lets a busy folder cover everything below it. `BusyOp` (:3) has no `"create"` yet. `app/hooks/file-system/busy-paths.ts#withBusyPaths`. `FileRow`/`FolderRow` show `RowBusySpinner` after a delay and ignore clicks while busy (`FileRow.tsx:131,231`, `FolderRow.tsx:93–105`).
7. **Tree rows come from indexed state only.** `app/editor/hooks/useVaultFileSearch.ts`: `foundFiles` (:71) comes from `atom_fileMetadata` + `atom_vaultTextFiles`. `allFiles` (:100) adds the startup snapshot's rows with `handle: null`. `folderPaths` (:112) = `atom_vaultFolderPaths` ∪ the latest listing ∪ the snapshot. **Missing:** a way to show rows for items that are being written and aren't indexed yet. Without it there is no optimistic create.
8. **Create patterns.** `app/hooks/file-system/use-create-item.ts#promptAndCreateFolder` (:83–118) adds a new folder's path to `atom_vaultFolderPaths` (:104), then `scanVault` + `void indexVaultTags()`. `app/hooks/file-system/use-template-create.ts#writeNewNote` (:72) opens the note and sets `atom_pendingScrollTarget` (:97) at `{{cursor}}`. Writes never produce 0-byte files (Google Drive hangs on them, :90). `holdVaultSync()` (`vault-sync-hold.ts:13`) holds the background sync while vault writes run. `useHeldSync` (`use-held-sync.ts`) wraps hooks with it.
9. **Entry points.**
   - Palette: `app/editor/components/editor-commands/document-vault-commands.ts`, `lifecycle`; "New template…" is at :80–88. Its context comes from `use-editor-command-context.ts`: `useFileSystem()` is destructured at :60–79 and returned at :119–181.
   - Tree menu: `app/editor/components/vault-tree/tree-menu-items.tsx#treeMenuItems()`. Folder rows are at :81–85 and the background (vault root) at :30. Its props are `VaultFileTreeProps` (`tree-model.ts:22–62`). `VaultFileTree.tsx` passes `props` straight to `treeMenuItems` (:380). **Don't edit `VaultFileTree.tsx`: it is at 395 lines.** `useTreeActions` (`use-tree-actions.ts`, 282 lines) has a `reveal(paths)` (:94) that expands ancestors and selects the rows once they show. It isn't returned yet.
   - Tree hosts: `app/editor/components/sidebar/SidebarFiles.tsx` (:45–48 destructure `useFileSystem`, props at :114–125) and `app/editor/files/page.tsx` (:20–37, props at :148–156). The sidebar is also the file view on mobile (long-press opens the same menu). There is no separate mobile file overlay.
   - Facade: `app/hooks/file-system/use-file-crud.ts` composes the hooks and wraps writers in `useHeldSync` (:88–99). `app/hooks/use-file-system.ts` spreads it.
10. **Backends.** Local File System Access and the browser vault (OPFS) are the only two backends; GitHub sync was removed (`app/services/README.md` "Legacy GitHub vaults"). Both support `getDirectoryHandle`/`getFileHandle({create})`/`removeEntry`. OPFS is case-sensitive.
11. **Hidden paths.** `useVaultFileSearch#isHiddenPath` (:56) hides any path with a segment starting with `_` unless Show Hidden Files is on, so `_templates/` and folder templates don't show in the tree by default.

Missing: (A) telling folder templates apart and keeping them out of the single-note template lists; (B) a pure planner that expands names and bodies and finds clashes; (C) disk read/write/rollback for a whole folder; (D) optimistic tree rows for paths not written yet; (E) the palette command and the tree menu item; (F) docs.

## Behavior

**What a folder template is**
- A direct subfolder `F` of `_templates/` is a folder template when `_templates/F/README.md` exists (file name matched in any case) and its frontmatter has `scaffold` equal to `true` (the string, trimmed, any case: `true`, `True`, `"true"`).
- Detection reads the index (`atom_fileMetadata[path].frontmatter`). A folder template that hasn't been parsed yet counts as a pack until it is.
- A folder template is never a pack. None of its files are templates: they don't appear in the template picker, the palette's `~` list, the empty-note pills, `matchTemplateForName`, or the Templates page's "Your templates".
- Its display name is the folder name with each `{{prompt:Label}}` shown as `Label` and every other `{{…}}` token expanded for now (for example `{{date:YYYY}} {{prompt:Client}} engagement` → `2026 Client engagement`).

**Starting it**
- **Palette:** "New from folder template…" (category Vault, only while a vault is open).
  1. Pick the folder template from a `dialog.select` list sorted by display name. A list of one is still shown, so the user sees what will run.
  2. Pick the destination from a `dialog.select` list. The first entry is the vault root (`/ <vault name> (root)`, the wording used at `use-create-item.ts:70`). After it come the indexed folders (`atom_vaultFolderPaths`), sorted, leaving out any path with a segment starting with `_` or `.`.
- **Files context menu:** "New from Folder Template…" on a folder row (destination = that folder) and on the tree's empty space (destination = the vault root). It is listed only when the vault has at least one folder template, and never on a folder inside `_templates/`. After the folder-template pick there is no destination step.
- **No folder templates:** the palette command shows `toast.error("No folder templates yet. Add scaffold: true to the frontmatter of a README.md in a folder inside _templates/.")` and does nothing else.
- Cancelling any dialog (pick, destination or prompts) ends the action and writes nothing.

**Reading the source.** After the destination is chosen, the source folder is read from disk with fresh handles: disk wins, and unsaved editor text is never used. The walk is recursive, skips entries whose name starts with `.`, and includes empty folders. `.md` files are read as text; every other file as bytes.

**Prompts.** Labels are gathered in this order, each label once (`extractPromptLabels` per string, then de-duplicated in first-appearance order):
1. the folder template's own name;
2. every entry's name, folders before their contents, siblings by name;
3. every `.md` body (after `templateContent`).

If there are any, `askPrompts(labels, "Create")` asks once. `{{clipboard}}` reads the clipboard once, and only when some `.md` body uses it.

**Names.** Each segment (the folder template's own name and every entry name) expands only:
- `{{prompt:Label}}`;
- the date/time tokens `date`, `time`, `year`, `month`, `day`, `weekday`, `weekdayShort`, `monthName`, `monthNameShort`, `week`, `quarter`, with formats and date math as in bodies (`{{date:YYYY-MM-DD}}`, `{{date+1w}}`);
- the legacy `weekSheet`/`monthSheet`/`quarterSheet`/`yearSheet`.

Every other token (`title`, `slug`, `clipboard`, `selection`, `cursor`, blanks) stays as typed. After expansion, each segment:
1. replaces `\ / : * ? " < > |` with `-` (`{{time}}` gives `10:30`, which becomes `10-30`);
2. is trimmed;
3. loses its leading dots.

If a segment is then empty, the action stops: `toast.error("A name in the folder template is empty after filling in: <source path>. Nothing was created.")`.

**Bodies.**
- `.md` files: `templateContent(raw, { dropKeys: ["scaffold"] })` (see Design), then `expandTemplate` with the shared answers.
  - `title` is the file's expanded base name without `.md`. For a file named `README.md` (any case) it is the expanded name of the folder that holds it.
  - `selection` is `""`.
  - The first `{{cursor}}` is kept as an offset only for the note that opens afterwards (below). In every other note it is simply removed (`expandTemplate` already drops it from the text).
  - An empty result is written as `"\n"`, never 0 bytes.
- Other files are copied byte for byte, with no expansion.
- The root `README.md` (the marker) is copied with the `scaffold` key removed. If it is empty or whitespace after that, it is not copied.

**Where it goes.** The folder template's expanded name becomes a **new** folder `<destination>/<expanded name>` (the "top folder"), and the whole structure goes inside it. It is never merged into an existing folder.

**Never overwrite: preflight, before anything is written**
- The destination folder must still exist (fresh handle). If it doesn't: `toast.error("<destination> no longer exists. Nothing was created.")`.
- The top folder must not exist (`entryExists`). If it does: `toast.error("<top path> already exists. Nothing was created.")`.
- Two sources must not expand to the same target path, compared ignoring case (for example `{{date}}.md` next to `2026-10-27.md`). If they do: `toast.error("Two items in the folder template would both be named <path>. Nothing was created.")`.
- Nothing inside the top folder can already exist once the top folder is new. The write step still creates every file with a check that it isn't there; see Rollback.

**Optimistic UI**
- Right after preflight passes, in the same frame:
  - every target folder and target file path is added to the tree as pending rows (`handle: null`);
  - the top folder is marked busy (`op: "create"`), so it and everything under it show the delayed spinner and take no actions;
  - from the Files context menu, the tree reveals and selects the top folder.
- The writes then run in the background inside `holdVaultSync`. The dialog flow has already resolved, so the user can keep working.
- **Success:**
  1. Add the new folder paths to `atom_vaultFolderPaths`, then `await scanVault(vault)` and `await indexVaultTags()`.
  2. Then remove the pending rows and the busy mark together, so rows don't flicker or briefly have no handle.
  3. `toast.success("Created <top path>: <n> note(s)")`, where n counts the `.md` files written.
  4. If the root `README.md` was written, open it with the fresh handle (`openFile(handle, path, true)`) and, if it had a `{{cursor}}`, set `atom_pendingScrollTarget` as `writeNewNote` does (`use-template-create.ts:94–98`). Otherwise nothing opens.
- **Failure** (any write throws, or a file already exists while writing):
  1. Roll back. `emptyDirectory(top)`, then `destinationDir.removeEntry(topName)`, using a fresh destination handle.
  2. Remove the pending rows and the busy mark.
  3. `await scanVault(vault)`.
  4. `toast.error("Couldn't create <top path>: <reason>. Nothing was kept.")`. If the rollback itself fails: `toast.error("Couldn't create <top path>, and some of it is still there. Check <top path>.")`.

**Edge cases**
- Empty vault (no folders): the palette's destination list has only the root.
- Show Hidden Files off: pending rows under `_`-prefixed destinations stay hidden (same rule as other rows). The destination list never offers them anyway.
- An open, unsaved tab is never touched: only new paths are written.
- A second run while one is writing: each run has its own pending entry. Because preflight checks the disk and the first run's top folder exists from its first write, the second run's preflight fails with "already exists" when the names match.
- Mobile: same palette command; the same tree menu (long-press) in the sidebar.

## Design

**Detection and exclusion (pure).** Add to `template-registry.ts`:

```ts
export interface FolderTemplate {
  /** The folder's own name (may contain tokens). */
  name: string;
  /** Vault-relative folder: `_templates/<name>`. */
  folder: string;
  /** Vault-relative path of its README.md marker (case as on disk). */
  readmePath: string;
}
/** Direct subfolders of `folder` whose README.md frontmatter has scaffold: true. */
export function listFolderTemplates(folder: string, metadata: Record<string, { frontmatter?: Record<string, unknown> }>): FolderTemplate[];
export function isScaffoldFlag(value: unknown): boolean; // "true"/true, trimmed, any case
```

`listTemplates(folder, paths, exclude: ReadonlySet<string> = new Set())` and `groupTemplatePacks(folder, templates, folderPaths = [], exclude: ReadonlySet<string> = new Set())` gain an `exclude` set of pack names (folder-template names). `packOf` results whose pack is in `exclude` are dropped. `resolveTemplatesFolder` is unchanged.

**Atoms.** In `template-atoms.ts`:
- `atom_folderTemplates = atom((get) => listFolderTemplates(get(atom_templatesFolder).folder, get(atom_fileMetadata)))`, sorted by display name.
- `atom_templates` passes `new Set(get(atom_folderTemplates).map((t) => t.name))` as `exclude`.

These are derived only; nothing is stored.

**Planner (pure).** New file `app/utils/templates/folder-template.ts` (no React, no I/O):

```ts
export interface ScaffoldSourceEntry { path: string; kind: "folder" | "file"; text?: string; bytes?: ArrayBuffer } // path relative to the folder template, "/"-joined
export interface ScaffoldSource { name: string; entries: ScaffoldSourceEntry[] } // entries: folders before contents, siblings by name
export interface ScaffoldPlanEntry { path: string; kind: "folder" | "file"; content?: string | ArrayBuffer; isRootReadme?: boolean; cursor?: number | null } // path relative to the destination, top folder included
export type ScaffoldPlan =
  | { ok: true; topName: string; entries: ScaffoldPlanEntry[]; noteCount: number }
  | { ok: false; reason: "empty-name" | "duplicate"; sourcePath: string; targetPath?: string };

export function folderTemplateDisplayName(name: string, now: Date): string;
export function scaffoldPromptLabels(source: ScaffoldSource): string[];      // order per Behavior › Prompts
export function scaffoldUsesClipboard(source: ScaffoldSource): boolean;
export function expandNameSegment(segment: string, ctx: Pick<TemplateContext, "now" | "prompts">): string; // name tokens only, then sanitized
export function planScaffold(source: ScaffoldSource, ctx: Omit<TemplateContext, "title" | "selection">): ScaffoldPlan;
```

`planScaffold` does the following:
- expands every segment;
- checks for empty segments and case-insensitive duplicate targets;
- for `.md` entries, runs `templateContent(text, { dropKeys: ["scaffold"] })` → `expandTemplate`, with `title` per Behavior;
- leaves out the root README when it is empty;
- keeps `cursor` only on the root README entry.

`expandNameSegment` walks `templateTokenRegex()` matches. It replaces a prompt with its answer, and a token whose `parseTemplateToken(inner).name` is in `NAME_TOKENS` and `isValidToken(inner)` with `expandTemplate(match, ctx).text`. Any other match stays literal. `NAME_TOKENS` is the date/time list in Behavior plus `LEGACY_TEMPLATE_TOKENS`.

**Frontmatter.** `templateContent(raw: string, { dropKeys = [] }: { dropKeys?: string[] } = {})` merges `dropKeys` into the keys it removes (`{ ...RETIRED_KEYS, ...Object.fromEntries(dropKeys.map((k) => [k, null])) }`). Existing callers don't change.

**Disk ops.** New file `app/hooks/file-system/folder-template-ops.ts` (no React):

```ts
export async function readScaffoldSource(vault: FileSystemDirectoryHandle, template: FolderTemplate): Promise<ScaffoldSource>;
export async function writeScaffold(destination: FileSystemDirectoryHandle, plan: Extract<ScaffoldPlan, { ok: true }>): Promise<{ rootReadme: FileSystemFileHandle | null }>;
export async function rollbackScaffold(destination: FileSystemDirectoryHandle, topName: string): Promise<boolean>; // false when cleanup failed
```

- `readScaffoldSource` walks with fresh handles from `directoryAtPath(vault, template.folder)` and skips dot entries. It reads `.md` as text and everything else as `arrayBuffer()`.
- `writeScaffold` does the following, in order:
  1. Creates the top folder with `getDirectoryHandle(topName, { create: true })`.
  2. Throws `new Error("<topName> already exists")` if the top folder isn't empty, in case another writer got there first. Thrown before any write, so the rollback must **not** run in that case. Use a typed error (`class ScaffoldClashError`) the hook checks.
  3. Creates folders in plan order.
  4. Writes each file with an `entryExists` check first (throws `ScaffoldClashError` if present), then `withRetry(() => dir.getFileHandle(name, { create: true }))` and `withRetry(() => writeFileContent(handle, content || "\n"))`. `writeFileContent` closes its stream itself.
- `rollbackScaffold` = `emptyDirectory(top)` + `destination.removeEntry(topName)` inside try/catch.

**Pending tree rows.** New file `app/atoms/pending-tree-atoms.ts`:

```ts
export interface PendingTreeEntry { files: string[]; folders: string[] } // vault-relative
export const atom_pendingTreeEntries = atom<ReadonlyMap<string, PendingTreeEntry>>(new Map()); // by run id; never persisted
export const atom_addPendingTree = atom(null, (get, set, [id, entry]: [string, PendingTreeEntry]) => …);
export const atom_removePendingTree = atom(null, (get, set, id: string) => …);
export const atom_pendingTreePaths = atom((get) => /* { files: Set<string>; folders: string[] } flattened */);
```

`useVaultFileSearch` merges `atom_pendingTreePaths`:
- `allFiles`: pending files not already found, as `{ name, kind: "file", handle: null, path }`. Same hidden/visible filters, then sorted as now.
- `folderPaths`: union with the pending folders before the hidden filter.

In `busy-path-atoms.ts`, `BusyOp` gains `"create"`.

**Hook.** New file `app/hooks/file-system/use-folder-template.ts`:

```ts
export function useFolderTemplate({ scanVault, indexVaultTags, openFile }: UseFolderTemplateProps): {
  /** Destination given (tree menu, "" = root): no destination step. Resolves to the top folder's
   *  vault path as soon as the optimistic rows are shown, or null (cancelled, no templates, preflight failed).
   *  The writes continue in the background. */
  newFromFolderTemplate: (destinationPath?: string) => Promise<string | null>;
};
```

Flow: pick → destination → `readScaffoldSource` → `askPrompts` → clipboard → `planScaffold` → preflight → optimistic (`atom_addPendingTree`, `atom_markBusy([[topPath, { op: "create" }]])`) → `void holdVaultSync(() => runWrites(...))` → `return topPath`. `runWrites` does the success or failure path from Behavior. In a `finally`, it removes the pending entry and clears busy (`atom_clearBusy([topPath])`) after the rescan and index. A read failure before the optimistic step shows `toast.error("Couldn't read the folder template <name>")` and returns null. Use `useDialog()` for the selects (`select(message, options, title)` → value or falsy), `useTemplateDialog().askPrompts`, `useStore()` for atoms.

The hook isn't wrapped in `useHeldSync` in `use-file-crud.ts`, because `holdVaultSync` must cover the background writes, which outlive the returned promise. It calls `holdVaultSync` itself.

**Why this approach**
- Marker vs name prefix: the README frontmatter keeps the folder name free for tokens (`{{prompt:Client}}`) and leaves nothing in the copied names. The cost is a short window before the first parse, which only affects listing. A prefix (`+Project`) would leak into every created folder.
- Pending-rows atom vs writing fake entries into `atom_fileMetadata`: metadata consumers (search, tags, tasks, links) would see notes with no content or handle. A separate ephemeral atom touches only the tree's row source.
- Copying into a new top folder vs merging into the destination: rollback can then remove exactly one folder it created, which is what makes "rolls everything back" safe.

## Phase 1: Detection, exclusion and the planner

- `app/utils/templates/template-registry.ts`:
  - add `FolderTemplate`, `isScaffoldFlag()` and `listFolderTemplates()` after `resolveTemplatesFolder` (:38);
  - add the `exclude` parameter to `listTemplates` (:58) and `groupTemplatePacks` (:71);
  - update the header comment (:3–7) to say that a subfolder with a `scaffold: true` README is a folder template, not a pack.

  The file goes from about 169 to about 205 lines.
- `app/atoms/template-atoms.ts`: add `atom_folderTemplates`, and pass `exclude` in `atom_templates` (:16).
- `app/editor/templates/page.tsx:36`: pass `new Set(folderTemplates.map((t) => t.name))` (from `useAtomValue(atom_folderTemplates)`) as `groupTemplatePacks`'s 4th argument, so a folder template isn't listed as an (empty) pack.
- `app/utils/templates/template-frontmatter.ts:25`: the `dropKeys` option.
- New `app/utils/templates/folder-template.ts` per Design (about 150 lines). Import `templateTokenRegex`, `parseTemplateToken`, `isValidToken`, `expandTemplate`, `extractPromptLabels`, `usesToken`, `LEGACY_TEMPLATE_TOKENS` from `template-tokens.ts`, and `templateContent` from `template-frontmatter.ts`.

## Phase 2: Disk ops, optimistic rows, hook, palette command

- `app/atoms/busy-path-atoms.ts:3`: add `"create"` to `BusyOp`, and update the comment at :11.
- New `app/atoms/pending-tree-atoms.ts` per Design.
- `app/editor/hooks/useVaultFileSearch.ts`: read `atom_pendingTreePaths`; merge it into `allFiles` (:100–107, applied whether or not `treeSnapshot` is set) and `folderPaths` (:112–120). The file stays under 220 lines.
- New `app/hooks/file-system/folder-template-ops.ts` per Design (about 110 lines). Reuse `entryExists`, `emptyDirectory` and `directoryAtPath` from `directory-ops.ts`.
- New `app/hooks/file-system/use-folder-template.ts` per Design (about 180 lines). Toast with `react-hot-toast`. Folder-path follow-up as at `use-create-item.ts:104`: `store.set(atom_vaultFolderPaths, (prev) => [...new Set([...prev, ...newFolders])])`.
- `app/hooks/file-system/use-file-crud.ts`: compose `useFolderTemplate({ scanVault, indexVaultTags, openFile })` and return `newFromFolderTemplate` (not in `held`; see Design).
- `app/editor/components/editor-commands/use-editor-command-context.ts`: destructure `newFromFolderTemplate` from `useFileSystem()` (:60–79) and return it (:119+).
- `app/editor/components/editor-commands/document-vault-commands.ts`: inside the `vaultHandle ? [...]` block (:61–89), after `new-template`, add:
  ```ts
  { id: "new-from-folder-template", label: "New from folder template…", category: "Vault" as const,
    keywords: "folder template scaffold structure project new folder from template copy",
    action: () => { void newFromFolderTemplate(); } }
  ```

## Phase 3: Files context menu and docs

- `app/editor/components/vault-tree/tree-model.ts` (`VaultFileTreeProps`, :22–62): add
  ```ts
  // Folder templates (use-folder-template.ts): given only while the vault has one.
  // Resolves to the created top folder's path once it shows, or null.
  newFromFolderTemplate?: (destinationPath: string) => Promise<string | null>;
  ```
- `app/editor/components/vault-tree/use-tree-actions.ts:275–281`: also return `reveal`.
- `app/editor/components/vault-tree/tree-menu-items.tsx`:
  - in `newItems(parentPath)` (:24–28), append when `props.newFromFolderTemplate` is set and `parentPath` is neither `_templates` nor inside it (`!/^_templates(\/|$)/.test(parentPath)`, using `TEMPLATES_FOLDER`): `{ label: "New from Folder Template…", icon: <HiOutlineTemplate {...ICON} />, onSelect: () => void props.newFromFolderTemplate!(parentPath).then((path) => { if (path) actions.reveal([path]); }) }`;
  - add `reveal` to the test `actions` stub's type use.

  The item then shows on folder rows (:82) and the background menu (:30). `HiOutlineTemplate` is in `react-icons/hi`.
- `app/editor/components/sidebar/SidebarFiles.tsx` and `app/editor/files/page.tsx`: destructure `newFromFolderTemplate` from `useFileSystem()`. Read `useAtomValue(atom_folderTemplates)`, and pass `newFromFolderTemplate={folderTemplates.length > 0 ? newFromFolderTemplate : undefined}` to `VaultFileTree`. `VaultFileTree.tsx` itself does not change: it already forwards `props`.
- Docs: see **Docs**.

## Tests

All Vitest, fully mocked. Wrap hooks/components in a Jotai `<Provider>` or use `createStore()` and seed atoms with `store.set` (`atomWithStorage` reads at module load, so seeding storage does nothing). Mock `next/navigation` `useRouter` wherever a component renders. Use `vi.setSystemTime` for every date-dependent assertion; never fixture dates in the far future. No person names in fixtures: use products, tasks and statuses (`Acme launch`, `Q3 roadmap`).

**Phase 1**
- `app/utils/templates/template-registry.test.ts`:
  - `listFolderTemplates` finds `_templates/Launch/README.md` with `scaffold: "true"`, also `"True"` and `readme.md`;
  - ignores `scaffold: "false"`, a missing key, a README two levels deep, and a README directly in `_templates/`;
  - `listTemplates`/`groupTemplatePacks` with `exclude` drop that folder's files and its empty-pack entry, and keep other packs.
- `app/utils/templates/folder-template.test.ts` (new):
  - `scaffoldPromptLabels` order: top name → names (folders before contents) → bodies; duplicates once;
  - `expandNameSegment`: prompts and `{{date:YYYY-MM}}`/`{{date+1d}}` expand; `{{title}}` and blanks stay literal; `{{time}}` `10:30` → `10-30`; `a/b` answer → `a-b`; leading dots stripped;
  - `planScaffold`:
    - empty segment → `{ ok: false, reason: "empty-name" }`;
    - `{{date}}.md` + `2026-10-27.md` (system time 2026-10-27) → `duplicate`;
    - case-only duplicate → `duplicate`;
    - `.md` body `{{title}}` = the file's base name;
    - README `{{title}}` = its folder's expanded name;
    - the `scaffold` key is removed from the root README, and the frontmatter block is dropped when it was the only key;
    - a README with only `scaffold: true` is left out;
    - binary entries pass through untouched;
    - `cursor` is kept only on the root README;
    - `noteCount` counts written `.md` files.
  - `folderTemplateDisplayName`.
- `app/utils/templates/template-frontmatter.test.ts`: `dropKeys` removes a key, keeps the others, and drops an emptied block. Existing behavior without options is unchanged.

**Phase 2**
- `app/hooks/file-system/folder-template-ops.test.ts` (new), using `app/services/memory-file-system.test-utils.ts`:
  - `readScaffoldSource` walks nested folders, includes empty folders, skips dot entries, reads `.md` as text and others as bytes;
  - `writeScaffold` creates the structure;
  - with a non-empty pre-existing top folder it throws `ScaffoldClashError` and writes nothing;
  - `rollbackScaffold` removes a partially written tree and returns false when removal throws.
- `app/editor/hooks/useVaultFileSearch.test.ts` (add if absent, else extend): pending files appear in `allFiles` with `handle: null` and pending folders in `folderPaths`; `_`-prefixed pending paths stay hidden with Show Hidden Files off; removing the entry removes the rows.
- `app/hooks/file-system/use-folder-template.test.tsx` (new). Mock `useDialog` (`select`), `useTemplateDialog` (`askPrompts`), `react-hot-toast`, `../use-file-system` and the ops module where noted. Use an in-memory vault seeded in `atom_vaultHandle`, and `atom_fileMetadata` seeded with a folder template. Assert:
  - no folder templates → error toast, no dialogs;
  - cancel at pick, destination or prompts → nothing written, no pending rows;
  - prompts are asked once with the combined labels;
  - top folder exists → error toast, nothing written, no pending rows;
  - success: pending rows and busy are set before `writeScaffold` resolves (hold the write on a deferred promise and assert the atoms in between); after resolving, `scanVault` and `indexVaultTags` are called, the pending entry and busy are cleared, the success toast shows, and `openFile` is called with the root README;
  - a write failure → `rollbackScaffold` called, rows cleared, the "Nothing was kept" toast;
  - given a `destinationPath`, no destination select is shown.
- `app/editor/components/editor-commands/build-editor-commands.test.ts`: "New from folder template…" is listed with a vault open and absent without one; its action calls `newFromFolderTemplate()` with no argument.

**Phase 3**
- `app/editor/components/vault-tree/tree-menu-items.test.tsx`:
  - with `newFromFolderTemplate`, a folder row lists `["New File", "New Folder", "New from Folder Template…", "Pin", "Rename", "Move to Trash"]`;
  - the background menu lists it;
  - a folder under `_templates/` doesn't;
  - without the prop it's absent;
  - selecting it calls the prop with the folder path and then `actions.reveal` with the resolved path.

  Update the existing expectation at :38 only if the prop is in the shared `props()` fixture; prefer passing it per test.
- `app/editor/components/sidebar/SidebarFiles.test.tsx`: the prop reaches the tree only when `atom_folderTemplates` is non-empty. Seed `atom_fileMetadata`.

## Docs

- `app/utils/templates/README.md`: add rows for `folder-template.ts`; note `listFolderTemplates`/`isScaffoldFlag` and the `exclude` parameters in the `template-registry.ts` row and `dropKeys` in the `template-frontmatter.ts` row.
- `app/hooks/file-system/` index (README if present; otherwise the sibling docs convention): `folder-template-ops.ts`, `use-folder-template.ts`.
- `app/atoms/README.md`: `atom_folderTemplates`, `pending-tree-atoms.ts`, the `"create"` busy op.
- `app/editor/components/vault-tree/README.md` and `TreeContextMenu.md`: the new menu item and when it shows.
- `app/editor/components/sidebar/SidebarFiles.md`, `app/editor/components/VaultFileTree.md` (the new prop), and `app/editor/hooks` docs for `useVaultFileSearch` if one exists: pending rows.
- `app/editor/templates/` page doc, if present: folder templates aren't listed as packs.
- In-app docs: in `app/documentation/content/templates.tsx`, add a `<h4>Folder templates</h4>` section, or a new `Subsection` `id: "folder-templates"` if the file would pass 200 lines; it is 148 now. Cover:
  - how to make one (`scaffold: true` in the folder's `README.md`);
  - the two entry points;
  - that prompts and date fields work in names too, with an example (`_templates/{{prompt:Client}} engagement/`);
  - that it never replaces anything and stops if the folder exists;
  - that the README is copied without the `scaffold` line.

  Add keywords `folder template scaffold structure`. Don't mention daily notes or dated-note generators.

## Acceptance criteria

- [ ] A `_templates/<F>/README.md` with `scaffold: true` makes `<F>` a folder template. Its files appear in no template picker, palette `~` list, empty-note pills or Templates page pack.
- [ ] `scaffold: false` or no key → `<F>` stays a pack, as before.
- [ ] Palette "New from folder template…" exists only with a vault open, and asks folder template → destination → prompts (only if any).
- [ ] With no folder templates, the palette command shows the hint toast and opens nothing.
- [ ] The Files context menu shows "New from Folder Template…" on folder rows and empty space only when a folder template exists, never inside `_templates/`, and skips the destination step.
- [ ] Each `{{prompt:Label}}` is asked once even when it is used in the top name, file names and bodies.
- [ ] Date tokens with formats and math expand in folder and file names; `:` and other forbidden characters become `-`.
- [ ] `{{title}}` in a note = its file name; in a README = its folder's name.
- [ ] Non-`.md` files are copied byte for byte; empty folders are created.
- [ ] If the top folder exists, or two items collide (ignoring case), or a name expands to empty, an error toast says so and nothing is written: the disk, the tree and the pending rows are unchanged.
- [ ] The tree shows the new top folder and its contents in the same frame the action passes preflight, with a busy spinner on them until done.
- [ ] On success: rows become real, the spinner clears, a success toast names the path and note count, and the root README opens with the caret at its `{{cursor}}`.
- [ ] On a mid-write failure, the top folder is removed, the rows disappear, and the error toast says nothing was kept.
- [ ] Unsaved tab text is never written or read; the source is read from disk.
- [ ] Works on a local folder vault and a browser vault (engineer notes the result if able).
- [ ] No new source file is over 400 lines; `VaultFileTree.tsx` is unchanged.
- [ ] No new network calls; nothing mentions daily notes or dated-note generation.
- [ ] Tests and docs per the sections above.

## Decisions

- **Marker:** `scaffold: true` in the folder's `README.md` frontmatter, as the brief prefers, not a name prefix. Folder names stay free for tokens, and no marker leaks into created names.
- **Copy shape:** the folder template becomes one new top folder under the destination; it is never merged into an existing folder. This makes "stop if any target exists" a single check and the rollback exact.
- **README handling:** the marker README is copied with the `scaffold` key removed (it usually doubles as the project's index note), and is skipped if nothing is left. After success it opens, like other create-from-template actions open the new note.
- **Names expand only prompts and date/time tokens.** The brief names those two. `{{title}}` is circular for a name, and `{{clipboard}}`/`{{selection}}` can hold newlines.
- **Bodies expand only in `.md` files.** Other files are copied as bytes, so binary attachments are never corrupted.
- **Palette destination:** a folder list (root first, hidden `_`/`.` folders left out) from the indexed folders, so it opens instantly. The tree menu supplies its own folder.
- **Picker:** a `dialog.select` list, not the note-template picker, which previews single notes and offers Blank/Board.
- **Pending rows** live in a separate ephemeral atom, so metadata consumers never see notes that don't exist yet.
- **Busy until indexed:** the top folder stays busy until `indexVaultTags()` resolves, so no pending row with a null handle can be clicked.
- **Labels:** the palette uses sentence case like "New template…"; the tree menu uses title case like "New Folder".

## Out of scope / Deferred

- Daily logs, dated-note generators, or any automatic or scheduled creation (removed 2026-10-13; must not return).
- A "Folder templates" section on the Templates page (listing, add/duplicate/delete), and built-in folder-template packs.
- Undo (⌘Z) for a created structure; it can be moved to the Trash like any folder.
- Token expansion in non-`.md` text files; linting of names (`template-lint.ts`).
- Merging into an existing folder, or "create anyway with a suffix".
- A "Save folder as template" action.

## Open questions

- Should the Templates page list folder templates (read-only, with a "Use" button) in a follow-up? Right now they're discoverable only through the palette, the tree menu and the docs.
- Should `.txt`/other plain-text files in a folder template also expand tokens? The current answer is no (copied as is).
