# Engineer report — 004 vault templates

## Run 1 (2026-10-04)

All four phases of `prd.md` are implemented. No build, typecheck or tests were run (project rule: only on request).

### Built
**Phase 1: engine, registry, setting**
- Token engine: `app/utils/templates/template-tokens.ts` (`expandTemplate` is one regex pass that records the cursor offset directly, so no `\0` sentinel is needed; also `slugify`, `usesToken`, `extractPromptLabels`, `offsetToLineColumn`).
- Routing frontmatter: `app/utils/templates/template-frontmatter.ts` (`splitTemplate`, `templateBody`).
- Registry: `app/utils/templates/template-registry.ts` (`resolveTemplatesFolder`, `listTemplates`, `isTemplatePath`, `matchTemplateForFolder`, `sanitizeNoteName`, `parseMissingLink`).
- Atoms: `app/atoms/template-atoms.ts` (`atom_templateFolderSettings`, `atom_templatesFolder`, `atom_templates`, `atom_templateDialog`), re-exported from `app/atoms/atoms.ts`.
- Templates Folder setting: `app/editor/settings/sections/TemplatesFolderSetting.tsx`, mounted in `FilesSettings.tsx` after New Notes Folder. Saved per vault, normalized on blur, dot folders rejected with an inline hint, an empty value deletes the key, disabled without a vault.
- Template files are left out of tasks (`app/atoms/task-atoms.ts`, both atoms; this also covers the palette `!` scope) and the home feed (`feed-model.ts` `buildFeed(…, templatesFolder?)`, passed from `HomeFeed.tsx`).

**Phase 2: dialogs and `/template`**
- `app/hooks/use-template-dialog.ts` provides `pickTemplate` and `askPrompts`.
- `app/components/TemplateDialog/` has `TemplateDialogHost` (mounted in `MainPage.tsx` next to `GlobalDialog`; each request gets a fresh keyed dialog), `TemplatePicker` (search, ↑/↓/Enter/Esc/click, Blank note row, empty state, `min-h-11` rows) and `TemplatePromptForm` (one `Input` per label, Enter submits, Esc/Cancel cancels).
- `constants.ts`: `VAULT_TEMPLATE_SENTINEL`, a `Template` entry with `vaultOnly`, and `Template.vaultOnly`.
- `slash-menu.ts`:
  - `onInsertVaultTemplate` callback.
  - The sentinel removes the trigger text, then calls the callback.
  - The entry is offered only when the callback is set.
  - New `insertExpandedTemplate` (no SHORTCODES, one undo step, caret at `{{cursor}}` or the end).
- `use-codemirror-templates.ts` wires the callback.
- `app/editor/hooks/use-vault-template-insert.ts`: picker → read from disk → title from `noteDisplayTitle` (`""` in the draft) → `instantiate` → insert. A blank doc gets the full text; otherwise the body only, with the cursor offset shifted. Nothing is inserted if the view was destroyed. `MarkdownEditor.tsx:84,113` passes the callback only while a vault is open (+3 lines, 363 total).

**Phase 3: missing links and "New note from template…"**
- `app/hooks/file-system/use-template-notes.ts`:
  - `readTemplate`: fresh handle, so the disk text is used.
  - `instantiate`: prompts, then clipboard (read only when used), then one context. It also expands the routing values.
- `app/hooks/file-system/use-template-create.ts`:
  - `writeNewNote`.
  - `createNoteFromMissingLink`: the link decides the path. The New Notes Folder is used for folderless links. An existing file on disk opens unchanged, without any prompt. A folder match asks for confirmation; otherwise the picker opens with Blank first. Invalid names show a toast.
  - `createNoteFromTemplate`: `target_folder`/`file_name` → `createUniqueFile`.
  - Caret placement goes through `atom_pendingScrollTarget`.
- `app/hooks/file-system/use-open-or-create-link.ts` provides `openOrCreateLink`. All three hooks are exposed through `use-file-crud.ts` → `useFileSystem`.
- `PaneLeaf.tsx:51,254` now passes `openOrCreateLink` as `onWikiLinkClick`. `openFileByName` is unchanged.
- Palette: `document-vault-commands.ts:56-65` adds "New note from template…" (category Vault, vault only). `use-editor-command-context.ts` passes it through.

**Phase 4: AI chat template skill**
- `app/utils/templates/template-lint.ts`: `lintTemplate`, plus `TEMPLATE_SYNTAX_GUIDE` built from `TEMPLATE_TOKENS`.
- `app/editor/components/ai-chat/chat-skills.ts`: `TEMPLATE_SKILL`, `isSkillActive`, `loadSkillInstructions` (the `.hermes/skills/create-template.md` body wins; on a read error it falls back to the built-in), `parseTemplateBlocks` and `sanitizeTemplateFileName`.
- `chat-helpers.ts` `buildChatSystemPrompt(…, skillInstructions = [])` appends `--- SKILL ---` blocks.
- `ai-chat/use-chat-skills.ts`: `skillInstructionsFor`, `saveTemplate` (`ensureVaultFolder` + `writeFileContent`, then rescan and toast), `templateExists`.
- `ai-chat/TemplateSaveCard.tsx` shows the path, the lint warnings and a Save / Replace / Saved button, disabled with "Open a vault to save" when no vault is open.
- `ChatMessageItem.tsx` renders the cards. `AIChatDialog.tsx` adds 9 lines (337 total).

### Tests and docs
- **New tests:**
  - `utils/templates/template-{tokens,frontmatter,registry,lint}.test.ts`
  - `TemplatesFolderSetting.test.tsx`
  - `TemplateDialog/TemplatePicker.test.tsx`, `TemplatePromptForm.test.tsx`
  - `editor/hooks/use-vault-template-insert.test.ts`
  - `hooks/file-system/use-template-notes.test.ts`: link and palette flows plus clipboard, with an in-memory fake vault
  - `use-open-or-create-link.test.ts`
  - `ai-chat/chat-skills.test.ts`
  - `AIChatDialog.test.tsx`
- **Updated tests:**
  - `task-atoms.test.ts`, `feed-model.test.ts`
  - `slash-menu.test.ts`
  - `build-editor-commands.test.ts`: new ID in the order list, plus a vault-only test
  - `chat-helpers.test.ts`, `ChatMessageItem.test.tsx`
  - `PaneLeaf.test.tsx`: mock key renamed to `openOrCreateLink`
- **New docs:**
  - `utils/templates/README.md`
  - `TemplateDialog/README.md` plus three component `.md` files
  - `ai-chat/TemplateSaveCard.md`
  - `TemplatesFolderSetting.md`
  - in-app `documentation/content/templates.tsx` (registered in `content/index.ts`)
- **Updated docs:**
  - `atoms/README.md`, `components/README.md`, `hooks/README.md`
  - `MainPage.md`, `MarkdownEditor.md`, `PaneLeaf.md`, `AIChatDialog.md`
  - `ai-chat/README.md`, `ChatMessageItem.md`, `FilesSettings.md`
  - `editor-commands/README.md`, `ARCHITECTURE.md`
  - in-app `editor-writing.tsx` (wikilinks no longer say "File not found"; new slash row), `ai-features.tsx` (new "AI templates" section), `settings-mobile.tsx` (Templates Folder)

### Decisions
- **In-app docs:** the Templates section went into a new `content/templates.tsx` instead of `editor-writing.tsx`. That file was at 360 lines and the section would have pushed it past 400.
- **Settings test:** the setting is its own component, `TemplatesFolderSetting`, to keep `FilesSettings` small. Its test replaces the PRD's "FilesSettings test".
- **Existing file on disk:** for a missing link, the disk check runs first, before any confirm or picker. An unindexed file that already exists opens straight away (after a rescan, so the link resolves). `writeNewNote` checks again at write time.
- **Prompts in routing keys:** prompt labels and `{{clipboard}}` in `target_folder` / `file_name` are collected too. `instantiate` returns the routing values already expanded with the same context, which matches "expanded later with the same context".
- **Palette commands:** `Insert: …` leaves out the vault Template entry (`vaultOnly`), because it would do nothing without the editor's callback. "New note from template…" covers the palette.
- **Lint:** misspelled-key warnings cover only `target-folder`, `targetfolder`, `targetFolder`, `file-name`, `filename` and `fileName`. Generic keys like `name` or `folder` are left alone to avoid false positives.
- **Without a vault:** a missing-link click keeps the old "File not found" toast. Nothing can be created without a vault.
- **Picker title:** for links it reads `New note: <path>`.
- **Focus:** the picker and prompts dialogs hide the DialogModal close button, so the overlay's first-focus lands on the search field or the first prompt field. Cancel buttons replace it.

### Not done / open
- PRD open questions are unchanged: resolving `[[meeting]]` to `templates/meeting.md` by basename, and vault-root-relative link creation.
- `useChatSkills` calls `useFileSystem()` (for `scanVault` / `indexVaultTags`), adding one more facade instance inside `AIChatDialog`. `MarkdownEditor` and `PaneLeaf` already do the same.
- Mobile and the GitHub / OPFS backends were not checked by hand. Every read and write goes through the vault handles listed in the PRD.

### To verify
From `next-client`:
```
corepack yarn tsc --noEmit
corepack yarn vitest run app/utils/templates app/atoms/task-atoms.test.ts app/editor/components/home-feed/feed-model.test.ts app/editor/settings/sections/TemplatesFolderSetting.test.tsx app/components/TemplateDialog app/editor/codemirror/slash-menu.test.ts app/editor/hooks/use-vault-template-insert.test.ts app/hooks/file-system/use-template-notes.test.ts app/hooks/file-system/use-open-or-create-link.test.ts app/editor/components/editor-commands/build-editor-commands.test.ts app/editor/components/ai-chat app/editor/components/AIChatDialog.test.tsx app/editor/components/PaneLeaf.test.tsx
```
Manual checks in the app:
1. **Registry and setting.** Add `templates/rfc.md` with `target_folder: docs/rfcs`, `file_name: rfc-{{date}}-{{slug}}`, `# {{title}}`, `Owner: {{prompt:Owner}}` and `{{cursor}}`. `/tpl` → Template lists `rfc`. Set Templates Folder to `_tpl`: the list switches, and the setting is kept per vault.
2. **Insert.** In a non-empty note, `/tpl` → rfc → Owner → body inserted, caret after Owner, one Ctrl+Z undoes it. In an empty note, the non-routing frontmatter is inserted too.
3. **Missing link with a template.** Ctrl/Cmd+click `[[rfcs/auth-spec]]` → "Create rfcs/auth-spec from template rfc?" → Enter → `rfcs/auth-spec.md` opens with the caret placed, and the link now resolves. Esc writes nothing.
4. **Other missing links.** `[[idea]]` shows the picker with Blank note first and creates the note in the New Notes Folder. In Preview, a plain click (and link pills on mobile) does the same.
5. **Palette.** "New note from template…" → rfc → "Auth Spec" creates `docs/rfcs/rfc-<today>-auth-spec.md`. Running it again creates `… (1).md`.
6. **Filters.** Template tasks are missing from Tasks and the `!` scope. Template files are missing from the home feed.
7. **AI chat.** "make me an RFC template that asks for an owner" shows a card for `templates/rfc.md`. Save → it appears in `/template`. An existing name shows "Replace template".

## Run 2 (2026-10-04): Review 1 fix list

### Built
1. **B1 (tsc / build).** `app/editor/hooks/use-vault-template-insert.test.ts:28-39` now uses a complete `FileMetadata` literal checked with `satisfies`, not a cast.
2. **B2 (lint).** `app/hooks/file-system/use-template-notes.test.ts:52-67`: `FakeDir.at` / `FakeDir.put` walk the path with `reduce`, seeded with `this`. There's no `this` alias and no disable comment.
3. **B3 (vitest).** `app/editor/settings/sections/TemplatesFolderSetting.test.tsx`: `setup(vaultId, initialSettings?)` seeds `atom_templateFolderSettings` before `render`. The "deletes the vault's key when cleared" test now asserts that the input shows `_tpl`, clears it, blurs, and expects `{ "browser:other": "x" }`. There's no `act` warning.
4. **m2.** `app/editor/components/ai-chat/TemplateSaveCard.tsx:25-30` remembers the content it last saw. When `block.content` changes (an in-place edit of the reply), the status goes back to idle, so Save or Replace is offered again. This uses the render-time "adjust state on prop change" pattern, with no effect.
5. **m1: no code change.** As the reviewer asked, this waits for the PRD owner (see Not done / open).

### Tests and docs
- New test in `ai-chat/ChatMessageItem.test.tsx`: "offers saving again after the reply is edited in place". It saves, re-renders with edited content and an existing file, then expects an enabled **Replace template** that saves the edited block.
- `ai-chat/TemplateSaveCard.md` now says that the card resets after an edit.

### Checks (from `next-client`)
| Check | Result |
|---|---|
| `corepack yarn tsc --noEmit` | pass (no output) |
| `corepack yarn eslint app` | pass (no problems) |
| `corepack yarn vitest run` | 1004 passed and 1 failed (140 files). The one failure is `CommandPalette/command-search.test.ts`, "filters 5,000 local file records within the interaction budget", which took 20.2 ms against a 16 ms budget. That's a wall-clock perf check this change doesn't touch, and it failed under full-suite load. Rerun alone together with the four fixed test files, all 5 files and 40 tests pass. |
| `corepack yarn build` | pass |

### Decisions
- **Card reset:** the card resets on a content change, not a re-key. A re-key would also have dropped a save that was still in flight.

### Not done / open
- **m1 (PRD owner):** the PRD contradicts itself on the draft confirm. The Draft bullet says "`openFile` keeps its existing unsaved-draft confirm", but Behavior step 4 and Phase 3 prescribe `openFile(handle, path, true)`, which skips it. The current code follows `force=true`. The draft text isn't lost: it stays in `openFiles.draft`. If the confirm is wanted, the fix is to drop `force` in `use-template-create.ts:85` for the link flow, add a test, and make the toast name the created file even when the open is cancelled. I didn't block the plan on this.
- The PRD's open questions are unchanged.

### To verify
```
corepack yarn tsc --noEmit
corepack yarn eslint app
corepack yarn vitest run app/editor/settings/sections/TemplatesFolderSetting.test.tsx app/editor/components/ai-chat/ChatMessageItem.test.tsx app/hooks/file-system/use-template-notes.test.ts app/editor/hooks/use-vault-template-insert.test.ts
corepack yarn build
```
Manual check: in AI Chat, save a template from a reply, edit the reply in place and change the template body, then commit the edit. The card should offer **Replace template** again.
