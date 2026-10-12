# Vault-Native Template Engine — architect report

## Run 1 — 2026-10-04 (blocked)

**PRD:** not written yet. Three design-changing questions are in `next-client/plans/004-vault-templates/blocked.md`.

### Why it's blocked
1. **The journal trigger depends on a feature that doesn't exist.** The brief assumes Cmd+Shift+D already opens Today's `journal/YYYY-MM-DD.md`. Nothing in the code does this: there's no shortcut, no Today command, no `journal/` convention, and no worklog-vision plan in the repo. The plan either builds a minimal Today command or defers trigger 1. Also, Ctrl+Shift+D is Chrome's "Bookmark all tabs" on Windows/Linux.
2. **Wikilink routing conflicts with link resolution.** If a template's `target_folder` / `file_name` overrides the path the link names, the clicked `[[rfcs/auth-spec]]` stays unresolved. The only fix would be rewriting the user's note.
3. **Missing-link click behavior.** Today, clicking a missing link only shows a "File not found" toast. The brief doesn't say whether creating the note needs a confirmation, or what happens with no templates.

Each question has a recommended answer. If all three are accepted, the plan would have 4 phases: (1) template engine and discovery, (2) slash `/template` insert with the prompt modal, (3) wikilink creation and "New note from template…", (4) the Today command plus the default template setting.

### Already exists (to reuse)
- **Discovery for free.** `_templates/` and `templates/` files are already in `atom_fileMetadata`: `collectVaultFiles` skips only dotfolders (`app/hooks/file-system/vault-scan.ts:88`). The template registry can be a derived atom over that index; no new watcher is needed. Added or deleted templates show up after any in-app create/rename/delete (each one rescans), after the focus rescan, and after the periodic rescan (`app/hooks/use-vault-sync.ts`: on focus, plus every 5 min, or 1 min for cloud vaults). Reading the template body fresh at instantiation means edits always apply.
- **Slash menu.** `app/editor/codemirror/slash-menu.ts` already has the hooks to extend: `TEMPLATES` sentinels, `applyTemplate`, `CURSOR_SENTINEL` caret placement and the `SHORTCODES` expansion.
- **Wikilink creation path.** `useCreateItem#createWikiLinkFile` (`app/hooks/file-system/use-create-item.ts:181`), `createUniqueFile` / `normalizeFolderPath` (`unique-file.ts`), and `writeFileContent` (`app/services/file-writer.ts`). These run on every backend: local folders, the browser vault (OPFS) and GitHub vaults.
- **Settings.** The Files settings page (`app/editor/settings/sections/FilesSettings.tsx`) and the per-vault map pattern keyed by `atom_vaultKey` (`atom_fileTreeExpansion`) give a home for the templates folder and default template settings.
- `app/hooks/file-system/resolve-file-by-name.ts` already resolves missing vs. existing links.

### Decisions I'll take without asking (for the PRD after unblock)
- **Folder setting.** The templates folder is a per-vault setting (`hermes_templateSettings`, keyed by vault). When empty, the first existing folder of `templates/`, `_templates/`, `Templates/` is used.
- **Token formats.** `{{date}}` is `YYYY-MM-DD`, `{{time}}` is `HH:mm`, `{{weekday}}` / `{{monthName}}` are English full names, and `{{month}}` / `{{day}}` are zero-padded. If clipboard read fails or is denied, `{{clipboard}}` becomes an empty string. Only the first `{{cursor}}` places the caret; any others are removed.
- **Frontmatter keys.** `target_folder` / `file_name` are removed from created notes. An empty frontmatter block is dropped.
- **Template files in listings.** Template files are left out of the Tasks page and home feed. They stay visible in the Explorer and in palette file search.

### Handoff
After `scripts/factory unblock 004`, run the architect again to write `prd.md`. The engineer follows after that.

## Run 2 — 2026-10-04 (unblock)

**PRD:** `next-client/plans/004-vault-templates/prd.md` (written this run; run 1 had stopped before writing it).

### Summary (4 phases)
1. **Engine, registry, setting.** Pure token expansion, frontmatter routing and a registry under `app/utils/templates/`. Per-vault Templates Folder setting (default order `templates` > `_templates` > `Templates`). The registry is derived from `atom_fileMetadata`, so updates reach it on every rescan. Template files are left out of the Tasks page and home feed.
2. **Dialogs + `/template`.** A searchable template picker and a prompt form, both driven by `atom_templateDialog`. The slash menu gets one **Template** entry (`/tpl` matches it), inserted through a new no-SHORTCODES path. Without that path, `{{date}}` would become `{2026-10-04}`.
3. **Missing links + palette.** Clicking a missing link creates the note at the link's own path, from a folder-matched template (one-line confirm) or the picker (Blank note first). New palette command "New note from template…" that uses `target_folder` / `file_name`.
4. **AI chat template skill.** Turns on by keyword. The model emits a `~~~~hermes-template name.md` block, and the user saves it from a card under the reply. Optional override file at `.hermes/skills/create-template.md`. No tool calling and no new network calls.

### Already exists
- Template folders are already indexed (`vault-scan.ts:88`), and the vault rescans keep them current.
- File creation pieces: `ensureVaultFolder`, `createUniqueFile`, `writeFileContent`, `resolveFileHandleAtPath`. They work on all three backends.
- `atom_pendingScrollTarget` places the `{{cursor}}` caret.
- `dialog.confirm` already confirms on Enter and cancels on Esc.
- `atom_newNoteFolder` and the `atom_vaultKey` per-vault pattern.

### Answers folded in
- Q1: the journal trigger is removed entirely.
- Q2 (a): the link decides; routing keys apply only to "New note from template…".
- Q3: always confirm; Blank note first; no templates → only Blank note; folderless links go to `atom_newNoteFolder`.

### Decisions to look at
- Only direct children of the templates folder are templates. Dot folders can't be the templates folder.
- A missing-link path is relative to the vault root, not the linking note's folder.
- `/template` in a non-empty note inserts the body only and leaves out the template's frontmatter.
- AI skill: fenced block plus an explicit Save/Replace click, with no stacked confirm. It's only active when a message mentions "template".
- Open: should link resolution skip template files, so `[[meeting]]` never opens `templates/meeting.md`? Should missing links be created relative to the linking note?

### Handoff
"Implement next-client/plans/004-vault-templates/prd.md, phase 1" (then phases 2–4 in order).

## Run 3 — 2026-10-04 (re-validation, specced)

**PRD:** `next-client/plans/004-vault-templates/prd.md`. Written in Run 2 and re-checked against the current code in this run. Run 2 ended without setting `state: specced`, so `brief.md` was still at `new`.

### What changed
- Checked the anchors against the current tree: `use-open-file.ts:202`, `PaneLeaf.tsx:51,254`, `slash-menu.ts:26/50/104/132/167-184`, `MainPage.tsx:75`, `ui-atoms.ts:71/164/203`, `vault-atoms.ts:38/50`, `feed-model.ts:24/62`, `unique-file.ts`, `use-file-crud.ts:21,55`, `document-vault-commands.ts:49`, and the file sizes (AIChatDialog 328, MarkdownEditor 360, ui-atoms 305).
- Fixed the line anchor for `buildChatSystemPrompt`: it is at `chat-helpers.ts:131`, not :155.
- Phase 2 slash entry: `AVAILABLE_TEMPLATES` filters only `aiOnly`. The PRD now has the engineer add a `vaultOnly` flag so the **Template** entry is offered only when `onInsertVaultTemplate` is wired, the same way the AI chat entry works.

### Summary (4 phases), unchanged
1. Engine, registry, and a per-vault Templates Folder setting. Template files are left out of Tasks and the home feed.
2. The template picker and prompt dialogs, plus slash `/template` and `/tpl`, inserted without the SHORTCODES pass.
3. Clicking a missing `[[link]]` creates the note at the link's own path, after a confirm or the picker. Plus the palette command "New note from template…", which uses `target_folder` / `file_name`.
4. AI chat template skill: a fenced `~~~~hermes-template` block and a Save/Replace card, an optional `.hermes/skills/create-template.md` override, and no new network calls.

### Already exists
Unchanged from Run 2: template folders are already indexed and kept current by rescans. The file-creation helpers work on all three backends. `atom_pendingScrollTarget` handles caret placement. `dialog.confirm` handles Enter/Esc. `atom_newNoteFolder` and the per-vault `atom_vaultKey` pattern are in place.

### Decisions / open questions to look at
Same as Run 2. A missing-link path is relative to the vault root. Only direct children of the templates folder are templates. Template files still resolve by basename. The AI skill turns on by keyword.

### Handoff
"Implement next-client/plans/004-vault-templates/prd.md, phase 1" (then phases 2–4 in order).
