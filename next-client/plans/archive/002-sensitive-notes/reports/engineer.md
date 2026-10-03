# Sensitive notes privacy: engineer report

## Run 1

All three phases are implemented in one pass, working from a clean tree with no RESUME notes and no reviewer fix list. Per the rules, I didn't run the typecheck or the tests.

### Built
| PRD requirement | Where |
|---|---|
| Sensitivity detection from frontmatter only (`sensitive: true`, `sensitive`/`private` tags, case / `#` / quotes ignored, any positive marker wins) | `app/utils/note-privacy.ts:27` (`isSensitiveFrontmatter`), `:36` (`isSensitiveContent`) |
| Display factory: `PrivacyLevel`, `normalizePrivacyLevel`, `MASKED_PREVIEW` / `MASKED_TEXT` / `UNTITLED_SENSITIVE_TITLE`, `NoteDisplayItem`, `noteDisplayTitle`, `createNoteDisplayItem`, `buildNoteDisplayItems`, `maskTask` | `app/utils/note-display.ts:43,55,72,85` |
| `atom_privacyLevel` (`hermes_privacy_mode`, `getOnInit`), session reveal atoms, `atom_noteDisplayItems` | `app/atoms/privacy-atoms.ts:14-38`; re-exported from `atoms.ts` |
| Home feed through the factory; day labels computed after exclusion; `isSensitive` / `previewStyle` | `home-feed/feed-model.ts:62` (`feedTitle` delegates to `noteDisplayTitle`), `HomeFeed.tsx:48` |
| Feed row: lock, masked bullets + sr-only "Preview hidden"; blurred preview unblurred on hover / focus-visible (not on selection) + sr-only "Preview blurred" | `home-feed/FeedRow.tsx:20,66` |
| Settings → Privacy → Privacy Mode (Show titles / Blur previews / Hide notes) | `settings/sections/PrivacySettings.tsx`, `settings/page.tsx:38` |
| Palette commands `privacy-mode-show-title/-blurred/-hidden` (current one disabled with "Current mode") plus `reveal-sensitive-session` toggle | `editor-commands/privacy-commands.ts:29`, `build-editor-commands.ts:24`, `use-editor-command-context.ts:126,194`; the "Privacy" category was added to `Command.category` (`CommandPaletteContext.tsx:13`) |
| `atom_visibleTasks` (mask, or exclude in hidden); `atom_allTaskTags` / `atom_filteredTasks` built on it; masked tasks never match text or tag filters; `atom_allTasks` raw | `app/atoms/task-atoms.ts:24,40,60` |
| Palette: `usePaletteFiles` (privacy-filtered files, `isSensitive`), `buildTaskRows` (masked tasks only for the empty `!` query), lock badge, hidden removes the note from search / `#tag` / recent / pinned | `CommandPalette/use-palette-files.ts`, `palette-model.tsx:68`, `CommandPalette.tsx:69,139,326-331` |
| Tasks page: `TaskRow` extracted and masked; list and count from `atom_visibleTasks` | `tasks/components/TaskRow.tsx`, `TasksList.tsx:84` |
| Editor veil: `SensitiveNoteGate` (content OR metadata check, reveal set / reveal-all, instance latch) and `SensitiveNoteVeil` (Show note `secondary` with autofocus, Show all `tertiary`, `min-h-11`) | `editor/components/SensitiveNoteGate.tsx`, `SensitiveNoteVeil.tsx`, `PaneLeaf.tsx:325-335` (the key moved from the editor to the gate) |
| Reveal survives rename / move | `app/atoms/vault-atoms.ts:197` |
| In-app docs | `app/documentation/content/vault.tsx:137,143` (a `sensitive` frontmatter row and a new "Sensitive notes" section) |

### Tests / docs
- New tests: `app/utils/note-privacy.test.ts`, `app/utils/note-display.test.ts`, `app/atoms/task-atoms.test.ts`, `app/editor/settings/sections/PrivacySettings.test.tsx`, `app/editor/components/SensitiveNoteGate.test.tsx`, `app/editor/tasks/components/TaskRow.test.tsx`.
- Updated tests: `home-feed/feed-model.test.ts` (new `buildFeed` signature, hidden exclusion and relabelling, sensitive fields), `HomeFeed.test.tsx` (privacy describe for all three levels), `CommandPalette.test.tsx` (lock, hidden search / `#tag` / recent / pinned, masked `!`, `!secret` doesn't match), `build-editor-commands.test.ts` (ID order, current level disabled, reveal toggle clears the set), `remap-vault-paths.test.ts` (reveal follows a folder move and a file rename).
- New docs: `SensitiveBadge/SensitiveBadge.md`, `SensitiveNoteGate.md`, `SensitiveNoteVeil.md`, `TaskRow.md`, `PrivacySettings.md`.
- Updated docs: `HomeFeed.md`, `PaneLeaf.md`, `TasksList.md`, `CommandPalette/CommandPalette.md`, `app/components/README.md`, `app/editor/components/README.md`, `home-feed/README.md`, `CommandPalette/README.md` (also added the `palette-model.tsx` row, which was missing), `editor-commands/README.md`, `app/atoms/README.md` (the privacy-atoms row, `atom_visibleTasks`, three cross-domain edges), `ARCHITECTURE.md`.

### Decisions (gaps filled)
- **The Create row ignores Privacy Mode.** `usePaletteFiles` also returns `existingFiles`, which isn't privacy-filtered. Only `buildCreateRow` uses it, so in `hidden` mode the palette doesn't offer `Create "Payroll"` when `Payroll.md` already exists. The cost is a tiny side channel: the Create row is missing for a hidden note's exact title.
- **Palette accessible names.** A row's `aria-label` overrides its content, so the badge's label would never be read. Sensitive file rows add "(sensitive)" to the label, and masked task rows read "Sensitive task" instead of the bullets.
- **Category "Privacy"** was added to the `Command["category"]` union, which the PRD's category required.
- **`TaskCheckbox` moved with `TaskRow`** into `TaskRow.tsx`, because only `TaskRow` uses it. `sortTasks` is now generic (`<T extends TaskItem>`), so `DisplayTask[]` keeps its type through sorting.
- **Masked tasks keep `raw` and `lineHash`** (`maskTask` only replaces `text` and `tags`, as specified), because writeback (`patchLineInContent`) needs them. They are never rendered.
- **`buildNoteDisplayItems` keys by `meta.path`** (the item `id`), not the record key. They're equal in the app, and keying by path keeps `buildFeed`'s `displayItems.has(entry.path)` correct.
- **Draft veil title.** A sensitive draft (`filePath === "draft"`) with no frontmatter title shows "Untitled sensitive note".
- **Reveal toggle off** clears the reveal set first, then the flag. Editors that are already mounted stay shown because of the latch, and they're veiled on their next mount, as the PRD says.

### Not done / open
- PRD open questions 1–3 are still open: AI `@vault` / `@folder` exclusion, filtering the Explorer filter / mobile search panel, and the draft-name hint. For Q3 I added the docs hint the PRD recommended to the in-app "Sensitive notes" callout.
- No settings-section index file exists under `app/editor/settings/`, so `PrivacySettings.md` is the only settings doc.
- I didn't run the typecheck or the tests (factory rule), so every acceptance criterion is checked by reading the code only.

### To verify
```bash
cd next-client
corepack yarn tsc --noEmit
corepack yarn vitest run app/utils/note-privacy.test.ts app/utils/note-display.test.ts app/atoms/task-atoms.test.ts app/atoms/remap-vault-paths.test.ts app/editor/components/home-feed/feed-model.test.ts app/editor/components/HomeFeed.test.tsx app/editor/settings/sections/PrivacySettings.test.tsx app/editor/components/editor-commands/build-editor-commands.test.ts app/components/CommandPalette/CommandPalette.test.tsx app/editor/tasks/components/TaskRow.test.tsx app/editor/components/SensitiveNoteGate.test.tsx app/editor/settings/page.test.tsx app/editor/tasks/page.test.tsx
```
Check manually in the app:
- Add `sensitive: true` to a note. The home feed shows its title, a lock and bullets. Switch Settings → Privacy to Blur (hover unblurs) and to Hide (the row is gone and the day labels are still right).
- Reload in Hide mode. Sensitive titles must not flash.
- In the palette: a file search shows the lock; Hide mode removes the note from search, `#tag`, pinned and recent; `!` lists the masked task; `!<task word>` doesn't find it.
- On the Tasks page: the masked row shows no text or tags, the checkbox still toggles the line on disk, and Hide mode drops the task from the count.
- Open the note. The veil appears; Show note reveals it, and switching tabs away and back keeps it revealed. Rename the note and it stays revealed. Run "Show all sensitive notes this session", then "Hide sensitive notes again" from the palette. Reload, and the note is veiled again.
- Type `sensitive: true` into an open plain note. It must stay visible.
