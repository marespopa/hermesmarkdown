# Sensitive notes privacy — engineering PRD

## Context
Source: [`brief.md`](brief.md). Users mark notes as sensitive in plain Markdown frontmatter. A global, persisted **Privacy Mode** then decides how those notes look in every listing that shows note content: title plus a lock and a masked preview, a blurred preview, or left out entirely. Opening a sensitive note in the editor needs an intentional reveal, either per note or for the whole session. This is about what's visible on screen. It doesn't encrypt anything.

What exists today:
1. **Frontmatter is already indexed.** `app/workers/metadata.worker.ts:50` stores `parseFmFields(content)` in `FileMetadata.frontmatter` (`app/atoms/metadata.ts:6`). Values are strings: `sensitive: true` → `"true"`, and `tags: [a, private]` or a block list → `"a, private"` (`app/utils/frontmatter-utils.ts:3`). Nothing reads a `sensitive` key yet. `FileMetadata.tags` merges frontmatter tags **and** inline `#hashtags` (`metadata.worker.ts:55-58`), so it can't tell where a tag came from.
2. **Home feed leaks body text.** `app/editor/components/home-feed/feed-model.ts#buildFeed` (:57) copies `entry.preview` (worker `notePreview`, `app/utils/markdown-preview.ts:32`) into `FeedEntry.preview`. `FeedRow.tsx:33-36` renders it as 3 lines. `feedTitle()` (:25) is frontmatter `title` (the worker fills it from the first H1, `metadata.worker.ts:61-64`), else the file name. It never falls back to a body paragraph.
3. **Command palette search leaks content.** `app/components/CommandPalette/CommandPalette.tsx:67-71` builds `files` from `atom_fileMetadata`. File, recent, pinned and `#tag` rows show the name, folder and tags. They show no body text, but they list every sensitive note. The `!` task scope (:139-145) lists **task text** (body content) from every note, via `atom_allTasks`. The `@` heading scope reads only the active editor.
4. **Tasks page leaks content.** `app/editor/tasks/components/TasksList.tsx:105-106` reads `atom_allTasks` / `atom_filteredTasks` (`app/atoms/task-atoms.ts:5,36`), and `TaskRow` (:342) renders `task.text` and `#tags`.
5. **The editor shows a sensitive note's content as soon as it opens.** `app/editor/components/PaneLeaf.tsx:322` mounts `MarkdownEditor` with the tab's content directly.
6. **No Privacy Mode setting or commands exist.** Settings sections are listed in `app/editor/settings/page.tsx:17`. Palette commands are built in `app/editor/components/editor-commands/*` and assembled in `build-editor-commands.ts`.
7. **No "link previews" exist today.** `app/editor/codemirror/link-display.ts:71` only sets a `title` attribute to the link target. There is nothing to change there. Any future hover preview must use the display factory (see Out of scope).

Missing: 1 (sensitivity detection), the display factory and derived atom, routing 2–4 through it, 5 (editor veil and session reveal), and 6.

## Behavior
**Marking.** A note is sensitive when either of these holds in its YAML frontmatter:
- `sensitive: true` (case-insensitive, quotes allowed);
- `tags` (flow list, block list or scalar) has an entry equal to `sensitive` or `private`, ignoring case, a leading `#` and quotes.

Any positive signal wins; `sensitive: false` doesn't cancel a `private` tag. Inline body `#private` hashtags do **not** count: only frontmatter does, as the brief specifies. Notes without frontmatter are never sensitive.

**Privacy levels** (Settings → Privacy → Privacy Mode, and palette commands). The setting is persisted and the default is `show_title`.

| Surface | `show_title` (default) | `blurred` | `hidden` |
|---|---|---|---|
| Home feed row | title + lock badge; preview replaced by `MASKED_PREVIEW` (fixed-length bullets) | title + lock; real preview rendered blurred, unblurred on row hover / keyboard focus | row omitted |
| Palette file / recent / pinned / `#tag` rows | name + lock badge | name + lock badge | omitted |
| Palette `!` task rows | text replaced by `MASKED_TEXT`, lock, `path:line` detail; match only the empty query | same as `show_title` | omitted |
| Tasks page rows | text masked, tags hidden, lock; checkbox, due date and file subtitle kept; never match text search or tag filters | same as `show_title` | omitted (and not counted) |
| Editor | veiled until revealed (see below) | same | same |
| File tree / Explorer / mobile search panel / Smart folders / wiki-link picker | unchanged (names only) | unchanged | unchanged |

- **Title** of a sensitive note in any listing: frontmatter `title` (or the H1 the worker stores there), else the file name without `.md`, else `"Untitled sensitive note"`. It never comes from `preview` or body text.
- **Not yet indexed.** A note that hasn't been parsed yet (no `preview`, no frontmatter) is treated as not sensitive. It shows the feed's skeleton placeholder, so no body text appears either way. Once it's parsed, the level applies: in `hidden` it disappears. The IndexedDB metadata cache (`services/metadata-cache.ts`) restores frontmatter on reload, so known notes are classified from the first paint.
- **Empty results.** If `hidden` removes every note, the feed shows its existing "Start writing" empty state and the palette shows "No matches found".
- **Editor veil.** When the active tab's note is sensitive, the pane shows `SensitiveNoteVeil` instead of mounting `MarkdownEditor`. The veil has a lock, "Sensitive note", the title, a **Show note** button (`secondary`) and **Show all sensitive notes this session** (`tertiary`). The veil applies in every privacy level.
  - Sensitivity comes from the tab's own content (`isSensitiveContent`), OR-ed with the indexed metadata, so a note opened before the indexer reaches it is still veiled.
  - **Show note** adds the path to a session-only reveal set: switching tabs and coming back doesn't re-veil it. Rename or move keeps the reveal (the paths are remapped).
  - **Show all** sets a session-only flag that skips every veil. Both reset on reload.
  - Once the editor has been shown for a tab with non-empty, non-sensitive content (including a draft), it stays shown for that editor instance. Typing `sensitive: true` into an open note never hides it mid-edit, and a draft saved as a file stays visible. The note is veiled the next time it's opened after a reload.
  - While veiled, nothing is written and the `@` heading scope finds nothing (there's no active `EditorView`). Tab title, save state, Copy Markdown and close keep working.
- **Reveal is editor-only.** The session reveal doesn't change listings; the privacy level governs those.
- **All vault backends** (local File System Access, browser/OPFS, GitHub) behave the same: everything is derived from `atom_fileMetadata` and tab content. **Mobile** uses the same `PaneLeaf`, `HomeFeed` and palette, so it gets the same behavior. The veil buttons use the 44px mobile row height (`min-h-11`).

## Design
**Pure modules** (no React or Jotai; `note-privacy.ts` must stay worker-safe):

`app/utils/note-privacy.ts`
```ts
export const SENSITIVE_TAGS: readonly string[] = ["sensitive", "private"];
export function isSensitiveFrontmatter(frontmatter: Record<string, unknown> | undefined): boolean;
export function isSensitiveContent(content: string): boolean; // parseFmFields + isSensitiveFrontmatter
```
`tags` may be a string (`"a, private"`) or an array (defensive), so split on `,` and normalize: trim, strip quotes and `#`, lowercase.

`app/utils/note-display.ts`, the display factory:
```ts
export type PrivacyLevel = "show_title" | "blurred" | "hidden";
export const PRIVACY_LEVELS: readonly PrivacyLevel[];
export function normalizePrivacyLevel(value: unknown): PrivacyLevel; // unknown → "show_title"
export const MASKED_PREVIEW = "•••• ••••••• ••••• •••••••• •••"; // fixed: length leaks nothing
export const MASKED_TEXT = "••••••••";
export const UNTITLED_SENSITIVE_TITLE = "Untitled sensitive note";
export type PreviewStyle = "plain" | "masked" | "blurred";
export interface NoteDisplayItem {
  id: string;            // vault path
  title: string;
  preview: string;       // MASKED_PREVIEW when masked; real text when plain/blurred
  isSensitive: boolean;
  isMasked: boolean;     // previewStyle === "masked"
  previewStyle: PreviewStyle;
  isIndexed: boolean;    // preview !== undefined
}
export function noteDisplayTitle(meta: Pick<FileMetadata, "name" | "frontmatter">, isSensitive: boolean): string;
export function createNoteDisplayItem(meta: FileMetadata, level: PrivacyLevel): NoteDisplayItem | null; // null = exclude
export function buildNoteDisplayItems(metadata: Record<string, FileMetadata>, level: PrivacyLevel): Map<string, NoteDisplayItem>;
export function maskTask<T extends { text: string; tags: string[] }>(task: T): T; // text → MASKED_TEXT, tags → []
```
`noteDisplayTitle(meta, false)` must equal today's `feedTitle`. Move `feedTitle`'s logic here and keep `feedTitle` as a re-export, so its callers and tests keep working.

**Atoms** in `app/atoms/privacy-atoms.ts` (re-exported from `atoms.ts`):
```ts
export const atom_privacyLevel = atomWithStorage<PrivacyLevel>("hermes_privacy_mode", "show_title", undefined, { getOnInit: true });
export const atom_revealAllSensitive = atom(false);                       // session only
export const atom_revealedSensitivePaths = atom<ReadonlySet<string>>(new Set()); // session only
export const atom_revealSensitivePath = atom(null, (get, set, path: string) => …); // action
export const atom_noteDisplayItems = atom((get) =>
  buildNoteDisplayItems(get(atom_fileMetadata), normalizePrivacyLevel(get(atom_privacyLevel))));
```
`getOnInit: true` is required. Without it the first render uses the default, and in `hidden` mode sensitive titles would flash on screen during a screen share. That's the same pattern as `atom_draftFolderDeclined` (`ui-atoms.ts:78`).

In `app/atoms/task-atoms.ts`:
```ts
export type DisplayTask = TaskItem & { isMasked: boolean };
export const atom_visibleTasks = atom<DisplayTask[]>(…); // from atom_fileMetadata + level: hidden → skip sensitive files; else maskTask + isMasked
```
`atom_allTaskTags` and `atom_filteredTasks` derive from `atom_visibleTasks`. A masked task fails any non-empty query or tag filter. `atom_allTasks` stays unchanged as the raw list (writeback and other logic).

**Components**
- `app/components/SensitiveBadge/SensitiveBadge.tsx` (+ `.md`, `index.ts`): a `HiOutlineLockClosed` icon (14px, `text-fg-faint`, `shrink-0`) with `role="img"` and `aria-label="Sensitive note"`. It takes an optional `className`. FeedRow, the palette, TaskRow and the veil all use it.
- `app/editor/components/SensitiveNoteGate.tsx` (+ `.md`). Props: `{ filePath: string; content: string; isActivePane: boolean; children: React.ReactNode }`. Logic:
  - `sensitive = isSensitiveContent(content) || isSensitiveFrontmatter(meta[filePath]?.frontmatter)`;
  - `veiled = sensitive && !revealAll && !revealed.has(filePath) && !shownRef.current`;
  - while not veiled and `content.trim()` is non-empty, set `shownRef.current = true` (the instance latch).
  - It renders the veil or `children`. PaneLeaf passes the editor's key as the gate's `key`, so the latch follows the editor instance. That's why a draft saved as a file keeps it.
- `app/editor/components/SensitiveNoteVeil.tsx` (+ `.md`). The centered `bg-surface` panel described under Behavior: `Button variant="secondary"` "Show note" and `variant="tertiary"` "Show all sensitive notes this session". "Show note" autofocuses when `isActivePane`.

Why a gate around the editor instead of an overlay over a mounted editor: an overlay leaves the text in the DOM, where it shows up in browser find, screen readers and the `@` heading scope, and it needs blur and pointer blocking. Not mounting the editor is simpler and leaks nothing.

Why one pure factory plus a derived `Map` atom instead of a class: the codebase models are pure functions (`feed-model.ts`, `palette-model.tsx`). A `Map` gives the palette O(1) lookups and the feed keeps its ordering logic.

## Phase 1: model, setting, home feed
- `app/utils/note-privacy.ts` (new): `isSensitiveFrontmatter`, `isSensitiveContent`, `SENSITIVE_TAGS`.
- `app/utils/note-display.ts` (new): everything in Design except `maskTask` (which can land here now; it's used in phase 2).
- `app/atoms/privacy-atoms.ts` (new): `atom_privacyLevel`, `atom_noteDisplayItems`. The reveal atoms land in phase 3. Re-export from `app/atoms/atoms.ts`.
- `app/editor/components/home-feed/feed-model.ts`:
  - `FeedEntry` gains `isSensitive: boolean` and `previewStyle: PreviewStyle`;
  - `feedTitle` delegates to `noteDisplayTitle(meta, false)`;
  - `buildFeed(metadata, displayItems: Map<string, NoteDisplayItem>, now)` (:57) skips paths missing from `displayItems` and takes `title`, `preview`, `isIndexed`, `isSensitive` and `previewStyle` from the item. Day labels are computed **after** exclusion, so a hidden note doesn't leave an orphan label.
- `app/editor/components/HomeFeed.tsx:43-47`: read `atom_noteDisplayItems` and pass it to `buildFeed`; recompute `now` on changes to either atom.
- `app/editor/components/home-feed/FeedRow.tsx:31-36`: `SensitiveBadge` next to the title (title row becomes `flex items-center gap-1.5`, title keeps `truncate`).
  - `masked`: render `MASKED_PREVIEW` with `aria-hidden` and a `sr-only` "Preview hidden".
  - `blurred`: real preview with `aria-hidden`, `select-none`, `blur-sm`, `motion-safe:transition`, unblurred by `group-hover:blur-none group-focus-visible:blur-none` (add `group` to the row `Button`), plus `sr-only` "Preview blurred".
  - The selected state does **not** unblur: index 0 is selected by default.
- `app/editor/settings/sections/PrivacySettings.tsx` (new, + `.md`): `SettingGroup title="Privacy"` with a `SettingItem` "Privacy Mode" using `SegmentedControl` options "Show titles" / "Blur previews" / "Hide notes". The description explains marking: "Mark a note with `sensitive: true` or a `private` tag in its frontmatter."
- `app/editor/settings/page.tsx:17`: add `{ id: "privacy", label: "Privacy", icon: HiOutlineLockClosed, content: <PrivacySettings /> }` after "files".
- `app/editor/components/editor-commands/privacy-commands.ts` (new): `buildPrivacyCommands(context)` returns three commands:
  - `privacy-mode-show-title` "Privacy mode: Show titles only";
  - `privacy-mode-blurred` "Privacy mode: Blur previews";
  - `privacy-mode-hidden` "Privacy mode: Hide sensitive notes".

  Each has keywords `"privacy sensitive private screen share recording mask"` and category "Privacy". The active level gets `disabledReason: "Current mode"`.
- `app/editor/components/editor-commands/use-editor-command-context.ts`: expose `privacyLevel` and `setPrivacyLevel` (pattern at :110 / :170). The file is at 197 lines, fine.
- `build-editor-commands.ts`: append `...buildPrivacyCommands(context)` after `workspaceTasksViews.preferencesAndNavigation`.

## Phase 2: command palette and Tasks page
- `app/atoms/task-atoms.ts`: add `atom_visibleTasks` and rebase `atom_allTaskTags` / `atom_filteredTasks` on it (as in Design).
- `app/components/CommandPalette/use-palette-files.ts` (new): extract `files` + `filesByTag` (`CommandPalette.tsx:67-83`) into `usePaletteFiles(showHiddenFiles)`. It reads `atom_fileMetadata` and `atom_noteDisplayItems`, keeps only paths present in the map, and sets `FileResult.isSensitive`. The extraction keeps `CommandPalette.tsx` under 400 lines.
- `app/components/CommandPalette/palette-model.tsx`:
  - `FileResult` gains `isSensitive: boolean`; the `task` Row gains `isMasked: boolean`.
  - Add `buildTaskRows(query, tasks: DisplayTask[])`, moved from `CommandPalette.tsx:139-145`. Masked tasks are included only when `query` is empty, with `label: MASKED_TEXT`.
- `CommandPalette.tsx`: use `usePaletteFiles`, `atom_visibleTasks` and `buildTaskRows`. In the row render (:342), add `<SensitiveBadge />` after the label when `row.kind === "file" && row.file.isSensitive` or `row.kind === "task" && row.isMasked`. Recent and pinned rows resolve through `files` (:178), so in `hidden` they disappear automatically and the persisted pins/recents stay untouched.
- `app/editor/tasks/components/TaskRow.tsx` (new, + `.md`): move `TaskRow` and `formatDueDate` out of `TasksList.tsx:334-379`, so `TasksList.tsx` stays under 400 lines. Prop `task: DisplayTask`. When `isMasked`: render `MASKED_TEXT` (`aria-hidden`) plus `sr-only` "Sensitive task", a `SensitiveBadge`, and no tag pills. Checkbox, navigation, due date and subtitle stay unchanged.
- `TasksList.tsx:105`: `allTasks` → `atom_visibleTasks` (count and empty state).

## Phase 3: editor veil and session reveal
- `app/atoms/privacy-atoms.ts`: add `atom_revealAllSensitive`, `atom_revealedSensitivePaths` and `atom_revealSensitivePath`.
- `app/atoms/vault-atoms.ts#atom_remapVaultPaths` (:129): also remap `atom_revealedSensitivePaths` through `remapPath` (as for `atom_fileTreeExpansion`, :196). Use the barrel-free import from `./privacy-atoms` to avoid a cycle.
- `app/editor/components/SensitiveNoteVeil.tsx` and `SensitiveNoteGate.tsx` (new, + `.md`): as in Design.
- `app/editor/components/PaneLeaf.tsx:322`: wrap `<MarkdownEditor …/>` in `<SensitiveNoteGate key={editorKeyRef.current.key} filePath={filePath} content={content} isActivePane={isActive}>`. Move the `key` from the editor to the gate. The file is at 364 lines and this adds about 4.
- `privacy-commands.ts`: add `reveal-sensitive-session`. Its label toggles between "Show all sensitive notes this session" and "Hide sensitive notes again". Turning it off clears the reveal set too, so open sensitive notes are veiled again on their next mount.
- `use-editor-command-context.ts`: expose `revealAllSensitive` and `setRevealAllSensitive`.

## Tests
All tests are fully mocked: `useFileSystem`, `next/navigation` (`useRouter`, `usePathname`) and the network. Wrap Jotai consumers in `<Provider>`, and seed `atom_fileMetadata` via `useHydrateAtoms` or a store.

Phase 1:
- `app/utils/note-privacy.test.ts`:
  - `sensitive: true`, `"true"` and `TRUE` → true; `false` or a missing key → false;
  - tags as a flow list, a block list and a scalar, with `private`, `#Sensitive` and quoted entries → true;
  - an inline body `#private` only → false;
  - no frontmatter → false;
  - `sensitive: false` plus `tags: [private]` → true.
- `app/utils/note-display.test.ts`:
  - each level × sensitive or not: null for hidden + sensitive, `MASKED_PREVIEW` for show_title, real preview + `previewStyle: "blurred"` for blurred;
  - the title fallback chain, including `UNTITLED_SENSITIVE_TITLE` when the name is empty;
  - a non-sensitive item equals the old feed output;
  - `normalizePrivacyLevel("garbage")` → `show_title`;
  - `maskTask`.
- `feed-model.test.ts`: update the `buildFeed` calls; hidden notes are excluded and day labels are recomputed; a sensitive entry carries `isSensitive` and `previewStyle`.
- `HomeFeed.test.tsx` (add or extend): the default level shows the lock and the masked preview and doesn't render the real preview text; `hidden` removes the row; `blurred` renders the text with "Preview blurred" for screen readers.
- `app/editor/settings/sections/PrivacySettings.test.tsx`: choosing a segment updates `atom_privacyLevel`, and `localStorage["hermes_privacy_mode"]` is written.
- `build-editor-commands.test.ts`: the three privacy commands exist, the current one is disabled, and running one sets the level.

Phase 2:
- `task-atoms` (new `task-atoms.test.ts`): `atom_visibleTasks` masks in show_title and blurred and excludes in hidden; masked tasks fail text and tag filters; tags of masked tasks are absent from `atom_allTaskTags`.
- `CommandPalette.test.tsx`:
  - the lock appears on a sensitive file row;
  - in `hidden`, a sensitive file is absent from search, `#tag`, recent and pinned rows;
  - `!` with an empty query shows a masked row and never the real task text;
  - `!secret` doesn't match the masked task.
- `TaskRow` / `TasksList` test: a masked row renders no task text or tags but still toggles.

Phase 3:
- `SensitiveNoteGate.test.tsx` (mock `MarkdownEditor` as a stub child):
  - sensitive content → veil, no child;
  - "Show note" → child, and the path joins the reveal set;
  - remount with the same path → no veil;
  - "Show all" → no veil for another sensitive path;
  - content turning sensitive after the first non-empty render → stays unveiled;
  - an empty content first render followed by sensitive content → veiled (the latch needs non-empty content);
  - metadata-only sensitivity → veiled.
- `remap-vault-paths.test.ts`: a revealed path follows a file rename and a folder move.
- `build-editor-commands.test.ts`: the reveal toggle sets and clears the flag, and turning it off clears the path set.

## Docs
- New sibling docs: `SensitiveBadge.md`, `SensitiveNoteGate.md`, `SensitiveNoteVeil.md`, `TaskRow.md` and `PrivacySettings.md`.
- Update the sibling docs: `HomeFeed.md`, `PaneLeaf.md`, `TasksList.md`, `CommandPalette/CommandPalette.md` (privacy filtering, the lock, masked tasks, `usePaletteFiles`).
- Indexes:
  - `app/components/README.md`: add SensitiveBadge;
  - `app/editor/components/README.md`: add the gate and the veil;
  - `home-feed/README.md`: `buildFeed` signature, previewStyle;
  - `CommandPalette/README.md`: `use-palette-files.ts`;
  - the `app/editor/tasks/components` docs: TaskRow;
  - `app/atoms/README.md`: a new `privacy-atoms.ts` row, `task-atoms` `atom_visibleTasks`, and the cross-domain edges `privacy-atoms → metadata`, `vault-atoms → privacy-atoms`, `task-atoms → privacy-atoms`;
  - `app/editor/settings` docs for the new section.
- `ARCHITECTURE.md` Jotai atoms bullet: mention privacy (the display factory feeds every note listing).
- In-app docs: add a "Sensitive notes" section to `app/documentation/content/vault.tsx`, or `editor-writing.tsx` if it fits better. It covers how to mark a note, the three Privacy Mode levels, the editor reveal (per note or per session, resets on reload), what isn't hidden (file names in the file tree, files on disk), and that this is screen privacy, not encryption.

## Acceptance criteria
- [ ] `sensitive: true`, or `sensitive` / `private` in frontmatter `tags`, marks a note; inline `#private` doesn't.
- [ ] Settings → Privacy → Privacy Mode offers Show titles / Blur previews / Hide notes, persisted under `hermes_privacy_mode`, default Show titles, with no flash of the default on reload.
- [ ] Palette commands switch the level; the current one is disabled.
- [ ] Home feed: show_title → lock + bullets and no real text in the DOM; blurred → blurred text revealed on hover or focus; hidden → row gone and day labels correct.
- [ ] Palette: a lock on sensitive file rows; hidden removes them from search, `#tag`, recent and pinned; `!` tasks are masked or omitted and never matched by text.
- [ ] Tasks page: sensitive tasks masked (text and tags), still toggleable; omitted and not counted in hidden.
- [ ] A sensitive title never falls back to body text; empty name → "Untitled sensitive note".
- [ ] Opening a sensitive note shows the veil; "Show note" reveals that note for the session; "Show all…" (or the palette command) reveals every note for the session; both reset on reload.
- [ ] A note opened before indexing is still veiled (content check).
- [ ] Marking an open note sensitive doesn't hide it mid-edit; a draft saved as a file stays visible.
- [ ] Renaming or moving a revealed note keeps it revealed.
- [ ] Works the same on local, browser/OPFS and GitHub vaults, and on mobile.
- [ ] No new network calls; no raw `<button>` / `<input>`; tokens only; every touched source file under 400 lines; docs updated.

## Decisions
- **No "off" level.** The three brief levels only. With no sensitive notes there's nothing to hide, and the session reveal covers editor friction.
- **Reveal is editor-only.** Listings follow the privacy level alone, which keeps the two controls orthogonal and predictable during a screen share.
- **Tasks count as body snippets.** Task text is note content, so the Tasks page and the palette `!` scope go through the same rules. Masked rows keep the checkbox, due date and file, so the list stays usable.
- **Scope of `hidden`:** home feed, command palette (all file and task rows) and the Tasks page. The file tree, Explorer filter, mobile search panel, Smart folders and the wiki-link picker show names only and are left alone, per the brief's out-of-scope note on file tree names.
- **H1 counts as a title, not an excerpt.** The worker already stores it as `frontmatter.title`, and the tab/title bar and draft file names use it. "Never a body excerpt" means never the `preview` or paragraph text.
- **Any positive marker wins.** `sensitive: false` doesn't override a `private` tag, which is safer.
- **Blurred reveals on hover or keyboard focus, not on selection,** because the first row is selected by default. Touch users open the note instead.
- **Fixed-length mask strings,** so the bullet count can't reveal the content's length.
- **Storage key `hermes_privacy_mode`** per the `hermes_*` convention, read with `getOnInit`.

## Out of scope / Deferred
- Encryption; passwords or authentication to reveal.
- Hiding sensitive file names in the file tree / Explorer, tab titles, the mobile search panel, Smart folders or the wiki-link picker.
- Changing what's stored at rest. Previews in the IndexedDB metadata cache and tab content in `localStorage["openFiles"]` stay as they are.
- Wikilink hover previews (none exist). Any future one must go through `createNoteDisplayItem`.
- Excluding sensitive notes from AI `@vault` / `@folder` context (`ai-chat/use-chat-mentions.ts`). See Open questions.
- A keyboard shortcut for Privacy Mode or reveal.

## Open questions
1. AI chat `@vault` / `@folder` mentions send note content to the AI provider, including sensitive notes. Should sensitive notes be excluded, or need confirmation? Recommended: exclude them by default, in a follow-up plan.
2. Should `hidden` also filter the Explorer filter search and the mobile search panel (names only today)? Recommended: no for now; revisit if screen-share users ask.
3. Draft notes are named after their first line, so a sensitive draft whose first line is secret puts that text in the file name. Is a hint in the docs enough? Recommended: yes, a docs hint only.
