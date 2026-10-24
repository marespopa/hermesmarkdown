# Pinned section — engineering PRD

## Context

Product ask (user decisions, 2026-10-24): one **Pinned** section in the sidebar holds anything the user pins: notes, vault folders, tags, and app pages (All Notes, Tags, Tasks, Templates, Trash, Settings). Single tasks are not pinnable. It replaces today's note pins. Pins and their optional emoji icons live in the vault in `.hermes/pins.yaml`, so they sync across devices, GitHub vaults included. The icon shows only in the Pinned section. This plan replaces the earlier tag icons and pins design (`tag-icons-and-pins.md`), which was dropped. Its code was reverted.

What exists (verified 2026-10-24 on `release/6.41.0`):

1. **Note pins, per device.** `atom_notePins = atomWithStorage<Record<string, string[]>>("hermes_home_pins", {})` (`app/atoms/ui-atoms.ts:269`) is keyed by `atom_vaultKey` (`app/atoms/vault-atoms.ts:73`: `local:<folder name>`, `browser:<id>`, `github:<owner>/<repo>@<branch>`), newest first. `app/atoms/note-pin-atoms.ts` has `atom_pinnedNotePaths`, `atom_toggleNotePin` and `atom_forgetNotePins`. Renames and moves are followed in `atom_remapVaultPaths` (`vault-atoms.ts:257-261`). Deletes call `atom_forgetNotePins` (`app/hooks/file-system/use-delete-item.ts:79`). `ui-atoms.ts` is 384 lines.
2. **Consumers of note pins** (all must move to the new store):
   - `SidebarFiles.tsx:35-37,77-107` renders the "Pinned notes" list at the top of Files and its Unpin menu. It passes `isPinned`/`togglePin` to the tree (`:128-129`).
   - The tree's note menu has Pin / Unpin: `vault-tree/tree-menu-items.tsx:77-83`, props declared in `vault-tree/tree-model.ts:23-25`. Folders have no pin item (`:69-72`).
   - The note menu has Pin Note / Unpin Note (pane title, Open Notes): `app/editor/hooks/use-note-menu-items.tsx:26-27,58-64`.
   - The palette command Pin Note / Unpin Note is in `editor-commands/document-vault-commands.ts:159-165`. Its context comes from `use-editor-command-context.ts:109-110,129-130`.
   - `app/components/CommandPalette/use-palette-pins.ts` lists pinned notes first in the empty palette and toggles them with Ctrl/Cmd+D. A one-time effect (`:23-29`) moves old palette-pinned notes into note pins. The palette's pinned commands (`atom_palettePinnedItems`) are its own and are not part of this work.
3. **`.hermes/` travels with every vault backend.**
   - Local folders: it's a real folder.
   - Browser (OPFS) vaults use the same handle API.
   - GitHub vaults import and commit `.hermes/**` except the Trash: `isGitHubVaultPathAllowed` (`app/services/github-vault-workspace.ts:71-75`), the workspace walk (`:166-185`) and the server routes (`app/api/github/repos/[owner]/[repository]/sync/route.ts:57`, `tree/route.ts:48`). Sync diffs the workspace against the manifest (`app/services/github-vault-sync.ts:121-148`), so a written `pins.yaml` is committed like a note.
   - Pull merges files three-way (`github-vault-sync.ts:40-68`). A conflict leaves markers in the file.
4. **Live-update plumbing, with a dot-folder gap.**
   - `observeVault` (`app/hooks/file-system/file-observer.ts:113`) ignores every change under a `.` folder (`changesFileList`, `:103-106`), so it never reacts to `.hermes/pins.yaml`.
   - What does fire: `createFileObserver(onChange)` (`file-observer.ts:41`, a per-file FileSystemObserver on Chromium; existing files only), and `atom_fileSystemVersion` (`vault-atoms.ts:45`).
   - `scanVault` bumps that version on every run (`app/hooks/file-system/use-vault-manager.ts:117`). It runs on window focus, on the 1/5-minute timer and from the folder watcher (`app/hooks/use-vault-sync.ts:38-105`), after file operations, and after a GitHub Pull (`refreshVault` → `handleRefreshVault`, `app/editor/page.tsx:82-86`).
   - The open-file watcher's debounce is 250 ms (`app/hooks/use-file-watcher.ts:14`).
5. **YAML.** `js-yaml` ^4.2.0 is a dependency (`package.json:86`), loaded lazily only in `app/editor/codemirror/markdown-problems.ts:137-141`. Its local typings (`types/js-yaml.d.ts`) declare only `load`.
6. **Write helpers.**
   - `writeFileContent(handle, content)` (`app/services/file-writer.ts:67`) closes the writable in `finally` and falls back to the OPFS worker where `createWritable` is missing (Safari).
   - `ensureVaultFolder(vault, path)` (`app/hooks/file-system/unique-file.ts:32`) and `withRetry` (`app/hooks/file-system/shared.ts:25`).
   - `resolveFileHandleAtPath` (`vault-atoms.ts:85`) throws `NotFoundError` for a missing segment.
   - `remapPath(path, old, new)` (`app/atoms/utils.ts`) handles a file or a folder prefix.
7. **Tags page reads `?tag` once on mount.** `app/editor/tags/page.tsx:35` uses `useEffect(() => setSelected(readUrlParam(TAG_PARAM)), [])`. A pinned-tag click while already on `/editor/tags` would change the URL and leave the page on the old tag. Nothing in `app/` uses `useSearchParams` yet. Next 16 requires a `<Suspense>` boundary around a client component that calls it in a prerendered route, or the production build fails (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md:82-88,177-179`). `replaceUrlParam` (`app/editor/utils/editor-url.ts:34`) uses `history.replaceState(null, …)`, which the App Router syncs into `useSearchParams` (`editor-url.ts:8-9`).
8. **Tags are normalised** by `normalizeTag` (`app/workers/parse-note.ts:13`, not exported): trim, strip quotes and a leading `#`, lowercase. Nested tags like `project/alpha` are allowed. `parse-note.ts` imports worker-side parsers, so the main thread should not import it.
9. **Emoji search exists.** `app/editor/codemirror/emoji-index.ts` provides `loadEmojiIndex()` (about 1,900 entries in a lazily loaded local chunk, curated shortcodes first), `matchEmojis(entries, query)` (`:39`) and `EmojiEntry { index, name, emoji, words }`.
10. **Sidebar building blocks.**
    - `SidebarSection` (`sidebar/SidebarSection.tsx:62`): a titled, collapsible section; collapse is remembered by title in `atom_sidebarCollapsed`.
    - Row classes: `sidebarItemClass`, `SIDEBAR_ICON_CLASS` (`sidebar/sidebar-classes.ts`).
    - `TabContextMenu` (`app/editor/components/TabContextMenu.tsx`): items `{ label, onClick, icon?, disabled?, divider? }`, with `anchorRef` and `align`.
    - `SectionMenu` (`SidebarSection.tsx:17-54`) is the ⋯-button pattern.
    - `FolderPopover.tsx` is the pattern for a portal popover with a search field (`BareInput` + `FIELD_COMPACT_CLASS`, `MENU_PANEL_CLASS` from `menu-classes.ts`).
    - `useSidebarNavigation()` (`sidebar/use-sidebar-navigation.ts`) provides `openHandle` and the move back to the editor from other routes.
    - `atom_showFolderInFiles(path)` (`vault-atoms.ts:268`) opens the Files tree on a folder.
11. **Sidebar layout.**
    - `WorkspaceSidebar.tsx:105-123` renders Open Notes, then Outline, then Linked from, then Files.
    - The sidebar is desktop only: `EditorShell.tsx:58` sets `hasSidebar = !isMobileChrome && !isVaultLocked`.
    - Page commands are in `AppCommands.tsx:88-106` (`/editor/files`, `/editor/tags`, `/editor/trash`, `/editor/tasks`, `/editor/templates`), with Settings at `:108-116`.
12. **"Missing" needs the index state.** `atom_indexerState` (`ui-atoms.ts:334`) is `{ status: "compiling" }` while the vault index runs and `"idle"` otherwise (`use-vault-manager.ts:140,151,174`). Notes come from `atom_fileMetadata` (`app/atoms/metadata.ts:18`), folders from `atom_vaultFolderPaths` (`vault-atoms.ts:22`). Privacy rules come from `atom_noteDisplayItems` (`app/atoms/privacy-atoms.ts`).

Missing:
- The vault pins file: its format, reader and writer (3, 5, 6).
- The in-memory pin state and its live sync (4).
- Migration from item 1.
- Following renames, moves and deletes (1).
- The Pinned section with row menus and the emoji picker (10, 11).
- Folder, tag and page pinning entry points (2, 11).
- The reactive Tags page `?tag` (7).

## Behavior

### `.hermes/pins.yaml`

- What the app writes:
  ```yaml
  # Pinned items for this vault's sidebar (HermesMarkdown). One per line, in order.
  version: 1
  pins:
    - {note: projects/roadmap.md, icon: 🚀}
    - {folder: projects}
    - {tag: release, icon: 🏷️}
    - {page: tasks}
  ```
  Each pin is one line (a flow mapping, `js-yaml` `dump` with `flowLevel: 2`, `lineWidth: -1`, `noRefs: true`). This keeps GitHub three-way merges clean when two devices pin different things.
- **Entry rules.** An entry is a mapping with exactly one kind key, `note`, `folder`, `tag` or `page`, holding a non-empty string, plus an optional `icon`.
  - `note`: a vault-relative path ending in `.md`. Leading `./` and `/` are stripped. Backslashes and `.`/`..` segments are rejected.
  - `folder`: a vault-relative folder path. A trailing `/` is stripped, and the same segment rules apply. The vault root (`""`) is rejected.
  - `tag`: normalised with `normalizeTag`, so `"#Release"` reads as `release`.
  - `page`: one of `files`, `tags`, `tasks`, `templates`, `trash`, `settings`.
  - `icon`: exactly one emoji grapheme (`normalizePinIcon`, below). Any other value is ignored, and the pin shows its default glyph.
- **Lenient reading.**
  - Entries that break the rules (unknown kind, two kind keys, a bad page id, a non-mapping) are not shown, and app writes keep them where they are.
  - A duplicate of an earlier pin (same kind and target) is not shown and is kept on write.
  - Unknown top-level keys are kept.
  - A missing `pins` key, an empty file or a comment-only file (YAML `null`) means no pins.
- **Missing file, or missing `.hermes/`:** no pins. This is not an error. The first pin creates the folder and the file.
- **Invalid YAML,** a root that isn't a mapping, or `pins` that isn't a list:
  - Keep the pins last read for this vault, so a half-saved external edit doesn't blank the section.
  - `console.warn`.
  - If the vault opens with the file already invalid, it shows no pins.
  - Every app write (pin, unpin, icon, reorder, remap, migration) is refused, and the app shows the toast `“.hermes/pins.yaml” isn't valid YAML. Fix it, then try again.` The user's file is never overwritten.
- **`version` greater than 1:** read the entries that pass the rules, and refuse writes with the toast `“.hermes/pins.yaml” was saved by a newer version of HermesMarkdown.`
- **Writes.**
  - Read the file fresh from disk.
  - Parse it. Refuse to write if it's invalid or newer.
  - Apply one change to the entry list (raw values, so unknown keys inside an entry survive).
  - If nothing changed, don't write.
  - Otherwise write the whole file: header comment, then `version: 1` (set if absent), then the other top-level keys as parsed.
  - Writes are serialised in a module-level promise chain, so two quick actions never lose each other's changes.
  - Hand-written comments are not preserved (js-yaml can't round-trip them). The header is always written.
  - If `.hermes/pins.yaml` is open in a tab, the write goes to disk and the open-file watcher reloads the tab (disk wins, no prompt).
- **Live updates.** The pins update without a reload after:
  - (a) An external edit. This is near-instant where the browser has FileSystemObserver and the file already exists (Chromium local folders). Otherwise it happens on the next window focus or vault rescan.
  - (b) A GitHub Pull.
  - (c) Saving `.hermes/pins.yaml` in the app's own editor (with Show Hidden Files on).
  - (d) The app's own writes, which apply at once.
- **Switching or closing the vault** resets the pins to none, then reads the new vault's file.

### Following the vault

- **In-app rename or move** of a note or folder rewrites every note and folder pin at that path or under it (`remapPath`). This covers undoing a rename or move, which goes through the same `atom_remapVaultPaths`. A pin keeps its icon and position.
- **In-app delete** (move to Trash) of a note or folder removes the pins at that path and under it, as today. Restoring from the Trash does not re-pin.
- **Renames, moves and deletes outside the app** can't be followed. The pin becomes *missing*.
- **Missing targets.** A note pin whose path isn't in `atom_fileMetadata`, or a folder pin whose path isn't in `atom_vaultFolderPaths`, counts as missing only once `atom_indexerState === "idle"`. While indexing it renders normally, so the section doesn't flicker on open.
  - A missing pin stays in the file and in the list. It shows its label in `text-fg-faint` with the title `Not found in this vault`.
  - Clicking it shows the toast `“<label>” isn't in this vault any more.`
  - Its menu still has Unpin.
  - This also covers a pin synced from another device before that note was pulled.
- **Tags and pages are never missing.** A tag no note carries still opens its Tags page view ("No notes carry this tag.").
- **Privacy Mode "Hide from lists"** leaves out a note pin whose note is private (it isn't in `atom_noteDisplayItems`). The pin stays in the file. In "Mask in lists", the row shows the masked title from `atom_noteDisplayItems`, as the pinned list does today.

### The Pinned section

- **Placement.** The first section in the sidebar's scroll area, above Open Notes (`WorkspaceSidebar.tsx:106`), titled **Pinned**. It renders only with a vault open and at least one listed pin. It's collapsible like the other sections (`atom_sidebarCollapsed["Pinned"]`) and has no header ⋯ menu.
- **Order** follows the file. New pins are added at the end.
- **Row:** two `Button variant="unstyled"` controls inside one row that uses `sidebarItemClass(isCurrent)`: a 15px leading icon button, then the label button. There is no ⋯ button (D18).
  - The icon button opens and closes the row menu. Nothing divides it from the label: no border or line. Keyboard focus uses the sidebar's usual focus style. Its accessible name is `<label> actions`.
  - The label button opens the pin. It carries `aria-current` and the tooltip.
  - The slot holds the emoji when set. Otherwise it holds the kind's default glyph in `SIDEBAR_ICON_CLASS`:
    - note: `HiOutlineDocumentText`
    - folder: `HiOutlineFolder`
    - tag: a `#` text glyph
    - pages: `files` `HiOutlineCollection`, `tags` `HiOutlineHashtag`, `tasks` `HiOutlineCheckCircle`, `templates` `HiOutlineTemplate`, `trash` `HiOutlineTrash`, `settings` `HiOutlineCog`
  - The emoji is `aria-hidden`. Accessible names stay the label.
  - Labels:
    - note: its display title from `atom_noteDisplayItems`. The `title` attribute is the path unless the note is private.
    - folder: its last segment, with the full path as `title`.
    - tag: `#release`.
    - page: `All Notes`, `Tags`, `Tasks`, `Templates`, `Trash`, `Settings`.
- **Click:**
  - note: opens it (`useSidebarNavigation().openHandle(metadata[path].handle, path)`), and comes back to the editor from other routes.
  - folder: `atom_showFolderInFiles(path)`. Files unfolds with the folder open, selected and scrolled to.
  - tag: on `/editor/tags`, `replaceUrlParam(TAG_PARAM, tag)` (no history entry). Elsewhere, `router.push(editorTagHref(tag))`.
  - page: `router.push(href)`. It's a no-op when already there.
- **Current row** (`aria-current="page"`, the accent fill):
  - note: when it's the active tab on `/editor`.
  - tag: when on `/editor/tags` with `?tag=<tag>`.
  - page: when the pathname equals its href, and for `tags` only when no `?tag` is set.
  - Folders are never current.
- **Row menu.** Clicking the leading icon, or a right-click or the menu key on either button, opens a `TabContextMenu` labelled `<label> actions` with:
  - **Set Icon…**, which reads **Change Icon…** when an icon is set. It opens the emoji picker.
  - **Unpin** (`divider: true`).
- **Reorder** (D6, same pattern as `SidebarOpenNotes.tsx`): dragging a row shows the thin `bg-fg-faint` insertion line and fades the dragged row. Dropping moves the pin to that point. Alt+↑ / Alt+↓ on a focused row moves it one place. Moves are among *listed* pins only; hidden and unrecognised entries keep their place in the file. The drag uses its own payload type, so Pinned rows can't be dropped into Open Notes or the Files tree. Notes and folders dragged from Files or Open Notes do drop here: they're pinned at the insertion line, and one already pinned moves there; with nothing pinned, a **Drop to pin** zone shows during such a drag (user decision, 2026-10-24).
- **Emoji picker popover** (`PinIconPopover`), anchored under the row:
  - A `BareInput` with `FIELD_COMPACT_CLASS`, placeholder `Search emoji`, autofocused.
  - A grid of up to 64 matches as square `Button variant="unstyled"` tiles (`aria-label` = the name with `_` → space). An empty query shows the index's own order (curated first). If the field holds exactly one emoji (a paste), a first tile uses it. The current icon's tile is `aria-pressed`.
  - **Remove Icon** at the bottom (`Button variant="secondary"`, full width), disabled without an icon.
  - While the index loads, it shows `Loading emoji…`. With no matches, `No emoji found`.
  - Enter picks the first tile. Clicking a tile sets the icon and closes the popover.
  - Escape or a click outside closes without writing.
  - If the write fails, the toast shows (from `atom_updatePins`) and the popover stays open.
- **Mobile** has no sidebar, so there is no Pinned section. Pinned notes still lead the empty command palette.

### Entry points (one way per kind, plus the existing note ones)

- **Notes:** these existing places stay and now write the vault file.
  - The sidebar Files tree's right-click menu: **Pin** / **Unpin**.
  - The note menu (pane title, Open Notes): **Pin Note** / **Unpin Note**.
  - The palette command **Pin Note** / **Unpin Note** (active note).
  - Ctrl/Cmd+D on a palette note row.
- **Folders:** the sidebar Files tree's folder right-click menu gets **Pin** / **Unpin**, after New Note / New Folder and before Rename.
- **Tags:** the Tags page, beside the selected tag's heading. A `Button variant="secondary"` reads **Pin** (`TbPinned`). When the tag is pinned it reads **Pinned** (`TbPinnedFilled`) and is disabled: unpinning happens from the pinned row's menu. The button is hidden on mobile chrome (no sidebar).
- **Pages:** a palette menu command **Pin Page to Sidebar…** (`id: "pin-page"`, category `Workspace`, keywords `pin page sidebar tasks tags templates trash settings all notes favorite`). It has one subcommand per page (`pin-page:<id>`, label `All Notes`, `Tags`, …). An already pinned page has `disabledReason: "Already pinned"`. Running a page pins it.
  - The menu itself has `disabledReason: "Open a vault first"` without a vault.
  - On mobile chrome it has `"The sidebar isn't shown on this screen"`.
- **Unpin, icon and reorder** are only in the pinned row's own menu. For notes and folders, the tree's existing Pin/Unpin toggle stays.
- **Pinning with no vault** is a no-op. The palette's note pin keeps today's toast `Open a vault to pin notes`.

### Migration from `hermes_home_pins`

- It runs once per vault per session, after that vault's pins file is read and found valid, missing or empty. If the file is invalid, nothing is migrated (this retries on a later read, once the file is fixed).
- It reads `localStorage["hermes_home_pins"]` directly (JSON `Record<vaultKey, string[]>`) for the current `atom_vaultKey`. If it holds paths, they are appended as note pins in their stored order (newest pin first, as the user saw them), skipping ones already pinned. This is one write.
- When the write returns ok or unchanged, that vault key is deleted from the stored object. When the object empties, the localStorage key is removed. If the write fails, the legacy entry stays for the next time.
- Two devices each migrating into a synced GitHub or cloud-folder vault end up with the union of their pins.
- `use-palette-pins.ts`'s older migration (palette-pinned notes, `:23-29`) adds through the same store. It drops those palette items only after the write returns ok or unchanged.

## Design

### Pure format: `app/services/vault-pins-format.ts` (new, ~170 lines, no I/O)

```ts
export const PINS_PATH = ".hermes/pins.yaml";
export const PIN_PAGES = ["files", "tags", "tasks", "templates", "trash", "settings"] as const;
export type PinPage = (typeof PIN_PAGES)[number];
export type PinKind = "note" | "folder" | "tag" | "page";
export interface Pin { kind: PinKind; target: string; icon: string | null }
export const pinKey = (pin: Pick<Pin, "kind" | "target">) => `${pin.kind}:${pin.target}`;

// The parsed file: raw top-level keys, raw entries (kept verbatim), and the listed pins.
export interface PinsDocument { root: Record<string, unknown>; items: unknown[] }
export type ParsedPins =
  | { ok: true; doc: PinsDocument; pins: Pin[]; newer: boolean }
  | { ok: false };
type YamlLoad = (source: string) => unknown;
type YamlDump = (value: unknown, options?: { flowLevel?: number; lineWidth?: number; noRefs?: boolean }) => string;

export function normalizePinIcon(value: unknown): string | null;
export function parsePinItem(raw: unknown): Pin | null;              // entry rules above
export function parsePins(text: string, load: YamlLoad): ParsedPins; // "" / null → ok, empty
export function listedPins(doc: PinsDocument): Pin[];                // recognised, first of each key
export function serializePins(doc: PinsDocument, dump: YamlDump): string; // header + version 1 + root + items

// Edits: each returns a new doc, or null when nothing changes (no write).
export function addPins(doc: PinsDocument, pins: Pick<Pin, "kind" | "target">[]): PinsDocument | null; // appends, skips present
export function removePin(doc: PinsDocument, key: string): PinsDocument | null;
export function setPinIcon(doc: PinsDocument, key: string, icon: string | null): PinsDocument | null;
export function movePin(doc: PinsDocument, key: string, delta: -1 | 1, listed: readonly string[]): PinsDocument | null; // swaps with neighbour in `listed`
export function remapPinPaths(doc: PinsDocument, oldPath: string, newPath: string): PinsDocument | null; // note + folder, via remapPath
export function forgetPinPaths(doc: PinsDocument, deletedPath: string): PinsDocument | null;
export function samePins(a: readonly Pin[], b: readonly Pin[]): boolean;
```

- `normalizePinIcon`:
  - Trim. Reject a value that is empty or longer than 32 UTF-16 units.
  - It must match `/\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u`.
  - It must be one grapheme by `Intl.Segmenter(undefined, { granularity: "grapheme" })`. Where `Intl.Segmenter` is missing, accept it after the regex check.
- Edits change raw entries in place on a copied `items` array. `setPinIcon` sets or deletes `icon` on the entry object and keeps any other keys in it. `remapPinPaths` rewrites `entry.note` / `entry.folder`.
- `movePin` takes `listed`, the keys of the rows the sidebar actually shows (privacy-hidden pins excluded). It swaps the two entries' positions in `items`.
- `remapPath` comes from `app/atoms/utils.ts` (a pure function; that module imports only types).

### I/O: `app/services/vault-pins.ts` (new, ~110 lines)

```ts
export class PinsFileInvalidError extends Error {}
export class PinsFileNewerError extends Error {}
export function loadYaml(): Promise<{ load: YamlLoad; dump: YamlDump }>;   // cached dynamic import("js-yaml")
export async function readPinsFile(vault: FileSystemDirectoryHandle): Promise<{ text: string; handle: FileSystemFileHandle } | null>; // null on NotFoundError / TypeMismatchError
// Serialised (module promise chain): read fresh → parse → edit → write. Returns the listed pins after.
export async function updatePinsFile(
  vault: FileSystemDirectoryHandle,
  edit: (doc: PinsDocument, pins: Pin[]) => PinsDocument | null,
): Promise<{ pins: Pin[]; changed: boolean }>;
```

- `readPinsFile` walks `.hermes` → `pins.yaml` with `getDirectoryHandle` / `getFileHandle` (no `create`). It uses a fresh handle every call.
- `updatePinsFile`:
  - Calls `readPinsFile`, then `parsePins`.
  - Invalid → throw `PinsFileInvalidError`. `newer` → throw `PinsFileNewerError`.
  - `edit` returns null → return `{ pins, changed: false }`.
  - Otherwise `ensureVaultFolder(vault, ".hermes")` → `withRetry(() => dir.getFileHandle("pins.yaml", { create: true }))` → `withRetry(() => writeFileContent(handle, serializePins(next, dump)))`.
  - The chain continues after a rejection (`chain = run.catch(() => {})`).

### Atoms: `app/atoms/pin-atoms.ts` (new, ~110 lines)

```ts
export interface PinsState {
  vault: FileSystemDirectoryHandle | null;  // the vault these pins were read from
  status: "none" | "loading" | "ok" | "invalid";
  pins: readonly Pin[];
}
export const atom_pinsState = atom<PinsState>({ vault: null, status: "none", pins: [] });
export const atom_pins = atom((get) => get(atom_pinsState).pins);
// Note paths in pin order (the palette's pinned notes; the tree's and menus' isPinned).
export const atom_pinnedNotePaths = atom<string[]>((get) => ...);  // memoised: same array while pins unchanged
export type PinsWriteResult = "ok" | "unchanged" | "no-vault" | "invalid" | "newer" | "error";
// The one writer. Uses atom_pinsState.vault (no vault-atoms import), toasts on failure,
// and applies the result only if the pins' vault is still the same.
export const atom_updatePins = atom(null, async (get, set, edit: Parameters<typeof updatePinsFile>[1]): Promise<PinsWriteResult> => ...);
// Called by atom_remapVaultPaths / useDeleteItem. Skip the write when no in-memory note/folder pin is affected.
export const atom_remapPins = atom(null, async (get, set, change: { oldPath: string; newPath: string }) => ...);
export const atom_forgetPins = atom(null, async (get, set, deletedPath: string) => ...);
```

- `pin-atoms.ts` imports only `jotai`, `react-hot-toast` and the two services, never `vault-atoms`, so `vault-atoms.ts` can import it without a cycle. The vault handle travels inside `atom_pinsState`. The sync hook sets it.
- Toasts:
  - invalid: the exact invalid-YAML text above.
  - newer: the newer-version text.
  - error: `Couldn't save pins`, plus `console.warn`.

### Hooks

`app/hooks/use-pins-sync.ts` (new, ~120 lines). It's mounted once in `EditorShell`.

```ts
// Keeps atom_pinsState equal to the open vault's .hermes/pins.yaml, and migrates hermes_home_pins once per vault.
export function usePinsSync(enabled: boolean): void;
```

- `read()` is guarded by a run counter, so a stale read for an earlier vault never lands.
  - No vault → `{ vault: null, status: "none", pins: [] }`.
  - File missing → `ok`, no pins.
  - Parse ok → set the pins unless `samePins` says they're unchanged.
  - Invalid → keep the previous pins if they're from the same vault, set `status: "invalid"`, `console.warn`.
- What triggers a read:
  - A vault handle change (set `{ vault, status: "loading", pins: [] }` first).
  - An `atom_fileSystemVersion` change.
  - The open tab's `atom_openFiles[PINS_PATH]?.lastSavedContent` (through a `selectAtom` or a derived atom, so other tabs don't re-trigger).
  - A `createFileObserver` callback, debounced 250 ms. Re-`sync` the observer with `new Map([[PINS_PATH, handle]])` after each read that found the file. Disconnect it on vault change and on unmount.
- After the first non-invalid read for a vault, run the migration (below) once. A `useRef` holds the set of vault keys done this session.
- `enabled` is `!isVaultLocked`. While disabled, the hook does nothing.

Migration lives in `app/hooks/pins-migration.ts` (new, ~40 lines):

```ts
export const LEGACY_NOTE_PINS_KEY = "hermes_home_pins";
export function readLegacyNotePins(vaultKey: string): string[];      // tolerant JSON parse; [] on anything odd
export function forgetLegacyNotePins(vaultKey: string): void;        // deletes the key's entry; removes the storage key when empty
```

`app/hooks/use-pins.ts` (new, ~60 lines). This is what components use.

```ts
export function usePins(): {
  pins: readonly Pin[];
  isPinned: (kind: PinKind, target: string) => boolean;
  pin: (kind: PinKind, target: string) => Promise<PinsWriteResult>;
  togglePin: (kind: PinKind, target: string) => Promise<PinsWriteResult>;
  unpin: (key: string) => Promise<PinsWriteResult>;
  setIcon: (key: string, icon: string | null) => Promise<PinsWriteResult>;
  move: (key: string, delta: -1 | 1, listed: readonly string[]) => Promise<PinsWriteResult>;
};
```

Each action calls `atom_updatePins` with the matching pure edit. Tags go through `normalizeTag` before use.

### Components

- `app/editor/components/sidebar/pinned-pages.tsx` (new, ~40 lines): `PINNED_PAGES: Record<PinPage, { label: string; href: string; icon: ReactNode }>`. The hrefs match `AppCommands.tsx:101-115`.
- `app/editor/components/sidebar/use-pinned-rows.ts` (new, ~110 lines): `usePinnedRows(): PinnedRow[]`. Each row is `{ key, pin, label, title?, glyph, missing, current, open() }`. It resolves pins against `atom_fileMetadata`, `atom_vaultFolderPaths`, `atom_noteDisplayItems`, `atom_indexerState`, `usePathname()` and `useSearchParams()`, and drops privacy-hidden note pins. It uses `useSidebarNavigation`, `useRouter`, `atom_showFolderInFiles` and `replaceUrlParam`.
- `app/editor/components/sidebar/SidebarPinned.tsx` (new, ~150 lines): the section. It renders a `SidebarSection title="Pinned"` with `role="list" aria-label="Pinned"` rows, the row menu and `PinIconPopover`. `WorkspaceSidebar` renders it inside `<Suspense fallback={null}>`, because `usePinnedRows` calls `useSearchParams`.
- `app/editor/components/PinIconPopover.tsx` (new, ~170 lines): the emoji picker, a portal into `document.body` with `MENU_PANEL_CLASS`, positioned and kept on screen like `FolderPopover`. Props: `{ anchor: DOMRect; current: string | null; onPick(icon: string | null): Promise<boolean>; onClose(): void }`. It closes when `onPick` resolves true.
- `app/editor/components/editor-commands/PinCommands.tsx` (new, ~50 lines): registers **Pin Page to Sidebar…** through `RegisteredCommands`. It's mounted in `EditorShell`, so it's available on every `/editor` route.

Why a vault file plus a small in-memory atom, rather than indexing `pins.yaml` through the metadata worker: the walk only collects `.hermes` files with Show Hidden Files on (`app/hooks/file-system/vault-scan.ts:121-125`), and the worker parses notes, not YAML. One path read works on every backend.

Why `vault-atoms` calls `atom_remapPins`, rather than each rename, move and undo hook: `atom_remapVaultPaths` is the single place that follows paths today (tabs, metadata, tree expansion, pins), and every caller (`use-rename-item.ts:27`, `use-move-item.ts:30`, `use-file-undo.ts:29`) already goes through it.

## Implementation (one phase)

The user wants the whole feature in one go. Nothing here is useful shipped alone (the store without the section, or the section without migration, would lose or hide pins), so there is a single phase. Suggested order: format → I/O → atoms → hooks → consumers → UI → tests and docs.

- `types/js-yaml.d.ts`: add `export function dump(value: unknown, options?: { flowLevel?: number; lineWidth?: number; noRefs?: boolean }): string;`. Update the comment to name both users (markdown-problems for `load`, vault pins for both).
- `app/utils/tag-normalize.ts` (new): move `normalizeTag` here from `app/workers/parse-note.ts:13` and export it. `parse-note.ts` imports it from the new file.
- `app/services/vault-pins-format.ts`, `app/services/vault-pins.ts`: new, as in Design.
- `app/atoms/pin-atoms.ts`: new.
- `app/atoms/note-pin-atoms.ts` and `note-pin-atoms.test.ts`: delete.
- `app/atoms/ui-atoms.ts:265-269`: remove `atom_notePins` and its comment. The legacy key now lives in `pins-migration.ts`.
- `app/atoms/vault-atoms.ts`:
  - `:4`: drop `atom_notePins` from the import, and import `atom_remapPins` from `./pin-atoms`.
  - `:257-261`: replace the `atom_notePins` block with `await set(atom_remapPins, { oldPath, newPath });` after the `vaultKey` block (it doesn't need the vault key).
  - Update the comment at `:163-169` ("Home pins" → "the vault's pins, `.hermes/pins.yaml`").
- `app/hooks/file-system/use-delete-item.ts:15,56,79,83`: use `atom_forgetPins` (`void forgetPins(path)`).
- `app/hooks/use-pins-sync.ts`, `app/hooks/pins-migration.ts`, `app/hooks/use-pins.ts`: new.
- `app/editor/components/EditorShell.tsx`:
  - After `isVaultLocked` (`:57`), call `usePinsSync(!isVaultLocked)`.
  - Mount `{!isVaultLocked && <PinCommands />}` beside `RecoveryBanner` (`:108`).
  - Add a sentence to the component comment.
- `app/editor/components/WorkspaceSidebar.tsx:105-106`: before `SidebarOpenNotes`, render `{hasVault && <Suspense fallback={null}><SidebarPinned onEditor={onWorkspace} activePath={currentPath} /></Suspense>}`. Update the comment (`:21-24`: "the vault's Pinned items, …").
- `app/editor/components/sidebar/SidebarFiles.tsx`:
  - Remove the pinned list, `pinMenu`, `TabContextMenu` and the `TbPinned`, `note-pin-atoms`, `atom_fileMetadata` and `atom_noteDisplayItems` imports if unused (`:5-8,33-38,77-107`).
  - Pass the tree `isPinned={(path, kind) => isPinned(kind === "folder" ? "folder" : "note", path)}` and `togglePin={(path, kind) => void togglePin(kind === "folder" ? "folder" : "note", path)}` from `usePins()`.
  - Update the comment (`:26-31`).
- `app/editor/components/vault-tree/tree-model.ts:23-25`: change the signatures to `isPinned?: (path: string, kind: "file" | "folder") => boolean; togglePin?: (path: string, kind: "file" | "folder") => void;`, and update the comment ("Pins (pin-atoms.ts): with both, notes and folders offer Pin / Unpin").
- `app/editor/components/vault-tree/tree-menu-items.tsx`:
  - Build one `pinItem(kind)` helper.
  - Folder branch (`:69-72`): `[...create, ...pinItems("folder"), { ...rename, separated: true }, trash]`, with the pin item `separated: create.length > 0`.
  - Note branch (`:77-83`): pass `"file"`.
- `app/editor/hooks/use-note-menu-items.tsx:9,26-27,59,63,89`: use `usePins()`: `isPinned("note", path)` and `togglePin("note", path)`.
- `app/editor/components/editor-commands/use-editor-command-context.ts:4,109-110`: get `pinnedNotePaths` from `useAtomValue(atom_pinnedNotePaths)` (now in `pin-atoms`), and `toggleNotePin` as `(path) => void togglePin("note", path)` from `usePins()`. `document-vault-commands.ts` and `build-editor-commands.test.ts` keep the same context names, so they need no change.
- `app/components/CommandPalette/use-palette-pins.ts`:
  - Source `pinnedNotePaths` from `pin-atoms`, and `toggleNotePin` from `usePins().togglePin("note", …)`.
  - In the migration effect (`:23-29`), call `pin` for all file items in one `atom_updatePins` (`addPins`). Filter them out of `atom_palettePinnedItems` only on `"ok" | "unchanged"`. A ref guards against re-running while a write is in flight.
  - Update the header comment. `CommandPalette.tsx` is not changed.
- `app/editor/utils/editor-url.ts`: add `editorTagHref(tag: string): string` → `/editor/tags?tag=<tag>` via `serialize`, and list it in the header comment.
- `app/editor/tags/page.tsx` (item 7):
  - `export default function TagsPage() { return <Suspense fallback={null}><TagsView /></Suspense>; }`.
  - `TagsView` reads `const urlTag = useSearchParams().get(TAG_PARAM)` and derives `selected` from it. It drops the `selected` state and the mount effect, so there is no set-state-in-effect.
  - `pick` keeps `replaceUrlParam`.
  - The heading row becomes `flex flex-wrap items-center gap-3 mb-4`, with the `<h1>` as `flex-1 min-w-0`. On desktop (`!useIsMobileChrome()`) a `Button variant="secondary"` reads `Pin` / `Pinned`, as in Entry points, and is disabled with no vault.
  - The page stays under 200 lines. If it nears that, extract `TagHeading.tsx` beside it.
- `app/editor/components/sidebar/pinned-pages.tsx`, `use-pinned-rows.ts`, `SidebarPinned.tsx`, `app/editor/components/PinIconPopover.tsx`, `app/editor/components/editor-commands/PinCommands.tsx`: new.
- Every file above stays under 400 lines. `ui-atoms.ts` shrinks, `vault-atoms.ts` stays about 300, and `VaultFileTree.tsx` (387) is not touched: the props pass through.

Constraints to honour throughout:
- Project components only: `Button` variants (`secondary` for Pin and Remove Icon, `unstyled` for rows and tiles), `BareInput`, `TabContextMenu`. No raw `<button>` or `<input>`.
- Design tokens only: `text-fg-faint`, `bg-fill`, `bg-accent/15` through `sidebarItemClass`, `MENU_PANEL_CLASS`. No hard-coded colours.
- No new network calls. The emoji index and js-yaml load from local chunks.
- Never write "sidebar rail", "iAWriter" or "Typora" in code, comments or docs.

## Tests

All tests use Vitest with a Jotai `<Provider>` or `createStore`. Mock `next/navigation` (`useRouter`, plus `usePathname` / `useSearchParams` where a component reads them), mock `useFileSystem` where it's used, and make no network calls. Fake directory handles are plain objects with `getDirectoryHandle` / `getFileHandle` / `getFile().text()` / `createWritable` (`write`, `close`). Fixtures use products, tasks and statuses (`projects/roadmap.md`, `release`, `bug`, `project/alpha`), never person names. Nothing reads the clock. If a test does, use `vi.setSystemTime`.

- `app/services/vault-pins-format.test.ts` (new; real `js-yaml` `load`/`dump`):
  - Parses all four kinds and icons.
  - Normalises a note path (`./a.md` → `a.md`) and a tag (`"#Release"` → `release`).
  - Rejects `..`, backslashes, non-`.md` notes, the root folder, an unknown page, two kind keys and non-mappings, and keeps all of them in `items`.
  - Shows only the first of duplicate pins.
  - Ignores bad icons (`"abc"`, `"🚀🚀"`, `""`, `42`) and accepts `🇷🇴`, `1️⃣`, `🧑‍💻`.
  - An empty file, a comment-only file and a missing `pins` key give no pins.
  - Invalid YAML, a list root and a non-list `pins` give `{ ok: false }`. `version: 2` gives `newer: true`.
  - `addPins` appends and skips present pins. `removePin`, `setPinIcon` (set, replace, clear) and `movePin` (with a hidden entry between, which stays in place) all return null when nothing changes and never mutate their input.
  - `remapPinPaths` moves a note, a folder and notes and folders under a moved folder, and never `notes-old` for `notes`. `forgetPinPaths` does the same for deletes.
  - `serializePins` starts with the header, writes one line per pin, keeps unknown top-level keys and entry keys, and round-trips through `load`.
- `app/services/vault-pins.test.ts` (new):
  - `readPinsFile` returns null without `.hermes` or without the file.
  - `updatePinsFile` creates `.hermes/` and `pins.yaml` on first write.
  - It reads fresh (a change made to the fake file between two calls survives).
  - It throws `PinsFileInvalidError` / `PinsFileNewerError` and writes nothing.
  - It doesn't write when the edit returns null.
  - Two concurrent calls both land.
  - The writable is closed when `write` throws.
- `app/atoms/pin-atoms.test.ts` (new; mock `@/app/services/vault-pins`):
  - `atom_updatePins` sets the pins on success, returns `"no-vault"` without a vault, and toasts the exact invalid-YAML text on `PinsFileInvalidError` (mock `react-hot-toast`).
  - It doesn't apply the result if the vault changed meanwhile.
  - `atom_pinnedNotePaths` keeps file order.
  - `atom_remapPins` skips the write when nothing matches.
- `app/hooks/use-pins-sync.test.tsx` (new; mock `vault-pins` and `@/app/hooks/file-system/file-observer`):
  - Reads on vault open, and sets no pins without a file or without a vault.
  - Keeps the previous pins with `status: "invalid"`.
  - Re-reads on an `atom_fileSystemVersion` bump, on the open tab's `lastSavedContent` change for `.hermes/pins.yaml`, and on an observer callback after 250 ms (fake timers).
  - Resets and re-reads on vault change, and drops a late read from the previous vault.
  - Does nothing while disabled.
  - Migration: seed `localStorage["hermes_home_pins"]` before rendering (the migration reads storage directly, not through an `atomWithStorage`).
    - It appends legacy paths in order, skipping present ones.
    - It removes that vault's entry, and the key once it's empty.
    - It doesn't migrate when the file is invalid, and keeps the legacy entry when the write fails.
    - It runs once per vault per session.
- `app/atoms/remap-vault-paths.test.ts:158-162`: replace "moves Home pins with a folder move" with a test that seeds `.hermes/pins.yaml` in the fake vault and `atom_pinsState` (`vault`, `ok`, the pins). After `atom_remapVaultPaths({ oldPath: "notes", newPath: "archive" })`, the file and the state hold `archive/deep/idea.md`, a folder pin `notes` becomes `archive`, and `notes-old.md` is untouched. Add "writes nothing when no pin is affected".
- `app/hooks/file-system/use-delete-item` coverage (its existing test, or a new one): deleting a folder calls `atom_forgetPins` with its path.
- `app/editor/components/WorkspaceSidebar.test.tsx:365-386`: replace the pinned-notes test. Seed `atom_pinsState`, mock `vault-pins`, and add `useSearchParams` to the `next/navigation` mock. Cases:
  - The Pinned section lists a note, a folder, a tag and a page in file order, above Open Notes.
  - Each row has its default glyph, or its emoji when set.
  - Clicking the note opens it. Clicking the folder sets `atom_filesRevealPath`. The tag pushes `/editor/tags?tag=release` from `/editor` and rewrites the URL on `/editor/tags`. The page pushes its href.
  - The current row has `aria-current`.
  - The row menu's Set Icon… and Unpin call the right action. Dragging a row onto another position, and Alt+↑/↓ on a focused row, write the new order; Alt+↑ on the first row and Alt+↓ on the last do nothing.
  - A missing note (indexer idle, no metadata) shows faint and toasts on click. While compiling it isn't marked missing.
  - A private note is hidden in "Hide from lists".
  - With nothing pinned there's no Pinned section.
- `app/editor/components/PinIconPopover.test.tsx` (new; mock `@/app/editor/codemirror/emoji-index` with a few entries such as rocket, bug and check_mark):
  - Typing filters the grid.
  - A tile calls `onPick(emoji)` and closes on success, and stays open on false.
  - A pasted single emoji plus Enter uses it.
  - Remove Icon is disabled without an icon and calls `onPick(null)` with one.
  - Escape closes without picking.
- `app/editor/components/vault-tree` coverage (`VaultFileTree.test.tsx` or a tree-menu test): a folder's menu has Pin, and calls `togglePin(path, "folder")`. A note's menu calls `togglePin(path, "file")`.
- `app/editor/tags/page.test.tsx`:
  - Add `useSearchParams` to the mock.
  - The selected tag follows a `?tag` change after mount (rerender with a new mocked value).
  - Pin calls the writer, and the button then reads Pinned, disabled.
  - There's no Pin button with mobile chrome (mock `@/app/hooks/use-mobile-chrome`).
- `app/editor/components/editor-commands/PinCommands.test.tsx` (new; mock `useRegisterCommand` and collect registrations): the subcommands list the six pages, and a pinned one is disabled with "Already pinned". Running one pins it. Check the disabled reasons for no vault and for mobile chrome.
- `app/components/CommandPalette/CommandPalette.test.tsx:35,444`: seed `atom_pinsState` instead of `atom_notePins`, and mock `vault-pins`. Ctrl/Cmd+D on a note row calls the writer. The palette-file-pin migration test expects an `addPins` write, and the palette item is dropped after it.
- `app/editor/utils/editor-url` (existing test or new): `editorTagHref("project/alpha")` → `/editor/tags?tag=project/alpha`.
- `app/workers` parse tests keep passing with `normalizeTag` moved. Add `app/utils/tag-normalize.test.ts` with 3 cases.

## Docs

- `app/atoms/README.md`: replace the `note-pin-atoms.ts` row with a `pin-atoms.ts` row: in-memory state from `.hermes/pins.yaml`, `atom_updatePins` as the only writer, remap and forget. Note that `atom_remapVaultPaths` calls `atom_remapPins`, and drop `atom_notePins` from the ui-atoms row.
- `app/hooks/README.md`: `use-pins-sync.ts`, `use-pins.ts`, `pins-migration.ts`.
- `app/services/README.md`: `vault-pins-format.ts` (file format, lenient reading, edits) and `vault-pins.ts` (read, serialised writes, refusal on invalid or newer files).
- `app/editor/components/sidebar/README.md`: `SidebarPinned`, `use-pinned-rows.ts`, `pinned-pages.tsx`. Add a new `SidebarPinned.md`. Update `SidebarFiles.md`, which no longer has the pinned list and gains folder Pin in the tree.
- `app/editor/components/WorkspaceSidebar.md`: Pinned comes first.
- `app/editor/components/README.md` and a new `PinIconPopover.md`. Update `EditorShell.md` for `usePinsSync` and `PinCommands`.
- `app/editor/components/vault-tree/README.md` and `TreeContextMenu.md`: folders have Pin / Unpin, and the `isPinned`/`togglePin` signatures change.
- `app/editor/components/editor-commands/README.md`: `PinCommands.tsx`, mounted by `EditorShell`.
- `app/components/CommandPalette/README.md:11` and `CommandPalette.md`: pinned notes come from the vault's pins (`pin-atoms.ts`), in pin order.
- `app/editor/README.md`: the Navigation row for `/editor/tags?tag=` (reacts to URL changes; pinned tags link here), and the Tags page Pin button.
- The `types/js-yaml.d.ts` comment.
- In-app docs:
  - `app/documentation/content/get-started.tsx:200-222`: rewrite "Pinned notes" as **Pinned**, with keywords adding folder, tag, page, icon, emoji, reorder, sync. The section covers:
    - Pin notes and folders from Files' right-click menu (and notes as today).
    - A tag from the Tags page's Pin button.
    - A page from **Pin Page to Sidebar…**.
    - Everything appears in the sidebar's Pinned section, in order.
    - Clicking a row's icon opens its menu, which sets an emoji icon (shown only there) or unpins it. Drag rows (or Alt+↑/↓) to reorder.
    - Pins are saved in the vault and sync with it.
    - Pinned notes still lead the empty palette.
    - Palette commands can still be pinned in the palette (its own, up to five).
  - `app/documentation/content/vault.tsx:24-31`: mention `.hermes/pins.yaml` beside the Trash. Add a short subsection covering what it holds, that it syncs (folders and GitHub), the format with an example, that the app rewrites it without comments, and that an invalid file is never overwritten.
  - Describe behavior only, and name no other editor products.

## Acceptance criteria

- [ ] With a vault open and nothing pinned, the sidebar has no Pinned section. Pinning a note from Files' right-click menu creates `.hermes/pins.yaml` (header, `version: 1`, one line per pin), and the section appears above Open Notes.
- [ ] Notes and folders pin from the Files tree's menu. A tag pins from the Tags page. A page pins from **Pin Page to Sidebar…**. Single tasks have no pin action anywhere.
- [ ] Each row shows its emoji, or the kind's default glyph. The emoji appears nowhere else (file list, Tags page, palette and editor pills are unchanged).
- [ ] The row menu sets and changes the icon through the emoji picker (search, paste, Remove Icon) and unpins. Dragging a row, or Alt+↑/↓ on it, reorders the pins. Each change is written to the file at once.
- [ ] A click opens the note, reveals the folder in Files, selects the tag (in place when already on the Tags page) or opens the page. The current row is highlighted.
- [ ] `/editor/tags?tag=x` follows URL changes while the page is open.
- [ ] Renaming or moving a pinned note or folder (or a folder above it) in the app, and undoing it, keeps the pin with its icon and position. Moving to Trash removes it.
- [ ] A pin whose target is gone shows faint once indexing is done, toasts on click, and can be unpinned.
- [ ] An external edit to `pins.yaml` updates the section without a reload (at once on Chromium when the file exists, otherwise on window focus). Saving it in the app's editor, or a GitHub Pull that changes it, updates the section too.
- [ ] With invalid YAML, the last pins stay. Every pin action shows the invalid-YAML toast and leaves the file byte-for-byte unchanged.
- [ ] Unknown entries and keys in the file survive app writes.
- [ ] On first open after upgrading, each vault's `hermes_home_pins` notes move into its `pins.yaml` in the same order, and the legacy entry is removed. Nothing is lost when the file is invalid or the write fails.
- [ ] The palette's empty list still leads with pinned notes (in pin order), and Ctrl/Cmd+D, Pin Note and the note menu still pin and unpin.
- [ ] Switching vaults shows only the new vault's pins. GitHub vault pins are committed on the next sync.
- [ ] Mobile: there is no Pinned section, no Tags page Pin button, and the page command is disabled with a reason.
- [ ] Only project components and design tokens are used. Buttons are filled (`secondary`). There are no new network requests.
- [ ] `note-pin-atoms.ts` and `atom_notePins` are gone, and no code reads `hermes_home_pins` except `pins-migration.ts`.
- [ ] Every new or changed source file is under 400 lines. `CommandPalette.tsx` and `VaultFileTree.tsx` are unchanged.
- [ ] The tests above are added or updated, and CI passes. Docs are updated.

## Decisions

- **D1. One file, `.hermes/pins.yaml`, one line per pin** (a flow mapping in a block list), so two devices pinning different items merge cleanly on GitHub Pull. Rejected: a `pins:` map keyed by target (order is the point of the list).
- **D2. Unrecognised entries and keys are kept verbatim** on app writes, so a newer app's pins or a hand-written note in an entry are never dropped. `version > 1` refuses writes.
- **D3. Comments aren't preserved** (js-yaml), but a fixed header is always written. This is the same trade-off the user accepted for the earlier tags.yaml design.
- **D4. An invalid file keeps the last pins and refuses every write**, migration included. A file with GitHub conflict markers is invalid, so it falls under the same rule.
- **D5. Live sync uses three signals:** a per-file FileSystemObserver, `atom_fileSystemVersion` (focus, timers, watcher, file ops, GitHub Pull) and the app's own save of the file. `observeVault` is not extended: its dot-folder filter exists to keep Trash writes from rescanning the vault.
- **D6. New pins go to the end**, and order is changed by dragging rows, or Alt+↑/↓ on a focused row, reusing the Open Notes reorder pattern (user decision, 2026-10-24). This replaces today's newest-first order and the earlier Move Up / Move Down menu items.
- **D7. Pinned is the first sidebar section, above Open Notes,** and hidden when empty. It's the user's chosen shortcuts, so it goes first.
- **D8. Existing note entry points stay** (tree menu, note menu, Pin Note command, palette Ctrl/Cmd+D). They are four views of the same pin, and removing them would be a regression. New kinds get exactly one entry each: folders the tree menu, tags the Tags page button, pages the palette menu. New entry points only pin. Unpinning tags, pages and icons happens in the row menu, as the brief asks. The tree's existing Pin/Unpin toggle extends to folders for consistency within that menu.
- **D9. Folder click reveals it in Files** (`atom_showFolderInFiles`). There is no folder route, and the Files page has no folder parameter.
- **D10. Missing targets stay listed (faint, unpinnable)** rather than hidden, so pins synced ahead of their notes, or orphaned by an external delete, are visible and removable. They are judged missing only once the indexer is idle, to avoid a flash on open.
- **D11. In-app delete removes the pin** (today's behavior). Restoring from the Trash doesn't re-pin. Keeping dead pins after a deliberate delete would be clutter.
- **D12. The pinnable pages are All Notes, Tags, Tasks, Templates, Trash and Settings:** every `/editor` page the palette navigates to.
- **D13. `pin-atoms.ts` never imports `vault-atoms.ts`.** The vault handle lives in `atom_pinsState`, so `atom_remapVaultPaths` can call `atom_remapPins` without an import cycle.
- **D14. `normalizeTag` moves to `app/utils/tag-normalize.ts`,** so the main thread doesn't import the worker's parse module.
- **D15. The emoji picker is a popover anchored on the row** (`FolderPopover`'s portal pattern), not a dialog, as the brief asks.
- **D16. Mobile:** there's no sidebar, so the Tags page Pin button is hidden and the page command is disabled with a reason (per the command contract). Note pins still matter on mobile through the palette.
- **D17. One phase,** as the user prefers. The pieces depend on each other: the store needs migration, and the section needs the store.
- **D18. The leading icon is the row's menu button** (user decision, 2026-10-24). It replaces the hover ⋯ button, so the row has no extra trailing control. No border or divider separates the icon from the label (user decision, 2026-10-24). The icon-to-label gap is about 12px instead of 8px.

## Out of scope / Deferred

- Pinning single tasks, headings, palette commands (they keep the palette's own pins) or external links.
- Icons anywhere outside the Pinned section (file list, Tags page, palette, editor and frontmatter pills, Tasks).
- Following renames, moves or deletes made outside the app.
- Showing pinned folders, tags or pages in the palette's empty list.
- Groups or sections inside Pinned, and per-pin colours.
- A Pinned view on mobile.
- Preserving hand-written comments in `pins.yaml`.
- Re-pinning on restore from Trash.

## Open questions

None. All answered by the user on 2026-10-24:
- Q1. Pinned sits above Open Notes.
- Q2. All four note entry points stay (D8).
- Q3. New pins go to the end; reorder by dragging (or Alt+↑/↓), as in Open Notes.
- Q4. In-app delete removes the pin (D11).
