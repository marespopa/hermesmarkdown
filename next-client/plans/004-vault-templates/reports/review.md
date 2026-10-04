# Review — 004 vault templates

## Review 1 (2026-10-04)

**Verdict: Changes requested**

The feature is complete and close to the PRD across all four phases. It has tests and docs for every phase, and I found no correctness blocker in the product code. But typecheck, lint, the test suite and the production build all fail, and the cause is three new test files from this change. "Never push changes that break the test suite" applies. All three fixes are small and only touch tests.

### Checks (run from `next-client` with Corepack)

| Check | Result | Caused by the change? |
|---|---|---|
| `corepack yarn tsc --noEmit` | **FAIL** | **Yes.** It's a new test file. |
| `corepack yarn lint` | **FAIL** | **Partly.** 2 errors are in a new test file. Everything else is pre-existing (see below). |
| `corepack yarn vitest run` | **FAIL**: 1 failed, 1003 passed (140 files) | **Yes.** It's a new test file. |
| `corepack yarn build` | **FAIL** (TypeScript step) | **Yes.** It's the same `tsc` error. |

- **tsc / build:**
  ```
  app/editor/hooks/use-vault-template-insert.test.ts(29,22): error TS2352: Conversion of type '{ path: string; name: string; frontmatter: { title: string; }; }' to type 'FileMetadata' may be a mistake …
    Type … is missing the following properties from type 'FileMetadata': tags, links, modifiedAt, wordCount, and 2 more.
  ```
- **lint** (`corepack yarn eslint app` gives exactly 2 problems):
  ```
  app/hooks/file-system/use-template-notes.test.ts
    56:9  error  Unexpected aliasing of 'this' to local variable  @typescript-eslint/no-this-alias
    62:9  error  Unexpected aliasing of 'this' to local variable  @typescript-eslint/no-this-alias
  ```
  The full `yarn lint` run also reports hundreds of errors in `next-client/next-client/.next/dev/static/chunks/*`. That nested folder is git-ignored build output dated Sep 28, so it predates this change. It's worth deleting or ignoring in ESLint config, but it's not part of this review.
- **vitest:**
  ```
  FAIL app/editor/settings/sections/TemplatesFolderSetting.test.tsx > TemplatesFolderSetting > deletes the vault's key when cleared
  AssertionError: expected { 'browser:v1': '_tpl', …(1) } to deeply equal { 'browser:other': 'x' }
  ❯ TemplatesFolderSetting.test.tsx:50:52
  ```
  The test is wrong, not the component. The test seeds `atom_templateFolderSettings` with `store.set` *after* `render` and outside `act` (that's the "not wrapped in act" warning in the output). The input's DOM value is still `""` when `fireEvent.change(input, { value: "" })` runs, so React's value tracker sees no change and doesn't fire `onChange`. `draft` stays `null`, and `commit` returns early. In the app, a user who clears a typed `_tpl` goes through `onChange` → `commit`, which deletes the key (`TemplatesFolderSetting.tsx:36-38`).
- **New and changed test files:** they all ran, and they all pass except the one above:
  - `utils/templates/*`, `TemplatePicker`, `TemplatePromptForm`
  - `slash-menu`, `use-vault-template-insert`, `use-template-notes`, `use-open-or-create-link`
  - `build-editor-commands`, `chat-skills`, `chat-helpers`, `ChatMessageItem`, `AIChatDialog`
  - `task-atoms`, `feed-model`, `PaneLeaf`

### PRD coverage

| Requirement / acceptance criterion | Status | Evidence |
|---|---|---|
| Templates Folder setting: per vault, normalized, dot folders rejected, placeholder, disabled without a vault | done | `app/editor/settings/sections/TemplatesFolderSetting.tsx:28-41,50-58`; mounted at `FilesSettings.tsx:64` |
| Default folder order and an "exists" check based on direct children | done | `app/utils/templates/template-registry.ts` `resolveTemplatesFolder` |
| Registry lists direct `*.md` children, sorted case-insensitively; hot reload through `atom_fileMetadata` | done | `template-registry.ts` `listTemplates`; `app/atoms/template-atoms.ts` |
| Body read fresh from disk (the saved file wins over unsaved tab text) | done | `app/hooks/file-system/use-template-notes.ts:41-46` (`readTemplate`) |
| Templates left out of Tasks, the palette `!` scope and the home feed, but still in Explorer and search | done | `app/atoms/task-atoms.ts:16,34` (the palette uses `atom_visibleTasks`); `feed-model.ts:74`; `HomeFeed.tsx` |
| Token grammar: one pass, unknown tokens kept, whitespace allowed, the cursor | done | `app/utils/templates/template-tokens.ts` `expandTemplate`, `tokenValue` |
| Routing frontmatter stripped, and an empty block dropped | done | `app/utils/templates/template-frontmatter.ts` `splitTemplate` |
| Prompts modal: one field per label, Enter submits, Esc or Cancel aborts | done | `app/components/TemplateDialog/TemplatePromptForm.tsx:36,47-54`; `use-template-notes.ts:55-61` |
| `/template` and `/tpl` entry shown only when the callback is set; removes the trigger, opens the picker | done | `app/editor/codemirror/slash-menu.ts:29,156-159,208`; `MarkdownEditor.tsx:84,113` |
| Insert without SHORTCODES, caret at `{{cursor}}`, one undo step | done | `slash-menu.ts:79-90` |
| Blank note gets frontmatter; non-blank gets the body only; unmounted view inserts nothing | done | `app/editor/hooks/use-vault-template-insert.ts:52-57` |
| Missing link: path from the link, folderless link → New Notes Folder, invalid name → toast | done | `app/hooks/file-system/use-template-create.ts:106-120` |
| Missing link: folder match → confirm; otherwise picker with Blank note first | done | `use-template-create.ts:134-143` |
| Missing link: a file already on disk opens unchanged | done | `use-template-create.ts:121-131`, with a recheck in `writeNewNote` at `:68-75`. The check runs before the confirm, which is a sound reordering. |
| Missing link: write, rescan, open, caret, toast; routing keys ignored | done | `use-template-create.ts:59-93,147-152` |
| Missing link from the draft keeps `openFile`'s unsaved-draft confirm | **partial / question** | See finding m1 |
| `PaneLeaf` uses `openOrCreateLink`; `openFileByName` unchanged | done | `PaneLeaf.tsx:51,254`; `app/hooks/file-system/use-open-or-create-link.ts:19-26` |
| Palette "New note from template…": vault only; picker → title → prompts → `target_folder`/`file_name` → unique name | done | `document-vault-commands.ts:56-65`; `use-template-create.ts:155-169` |
| Picker: search `BareInput`, ↑/↓/Enter/Esc/click, `menu-item` rows, `min-h-11`, empty state | done | `TemplatePicker.tsx:63-73,83-90,108-119` |
| AI skill: keyword activation, built-in text from `TEMPLATE_SYNTAX_GUIDE`, `.hermes/skills/create-template.md` override | done | `app/editor/components/ai-chat/chat-skills.ts:44-69`; `AIChatDialog.tsx:143` |
| `~~~~hermes-template` parsing, file name sanitizing | done | `chat-skills.ts:78-99` |
| Save card: path, lint warnings, Save/Replace/Saved, disabled without a vault, writes only on click, creates `templates/` | done | `ai-chat/TemplateSaveCard.tsx`; `ai-chat/use-chat-skills.ts:42-59`; `ChatMessageItem.tsx:126-135` |
| Lint warnings | done | `app/utils/templates/template-lint.ts` |
| No new network calls; no raw `<button>`/`<input>`; no hard-coded colors; files under 400 lines | done | Grep of the new UI is clean (`bg-paper-softgray` and `dark:bg-paper-dark-surface` are existing Tailwind palette tokens). Largest touched files: `MarkdownEditor.tsx` 363, `editor-writing.tsx` 362, `AIChatDialog.tsx` 337. |
| Same behavior on every backend and on mobile | done by construction | All I/O goes through `ensureVaultFolder`, `createUniqueFile`, `writeFileContent` and `resolveFileHandleAtPath`. Preview clicks and pills reach `onWikiLinkClick` (`use-codemirror-features.ts:196`, `MarkdownEditor.tsx:145`, `EditorPills.tsx:77`). Not checked by hand. |

**Scope creep:** none. The Journal/Today trigger is absent as the PRD decided. `WikiLinkDialog`'s create option and link resolution are unchanged.

### Findings

**Blocker**

- **B1. Typecheck and build fail.** At `app/editor/hooks/use-vault-template-insert.test.ts:29`, the partial `FileMetadata` literal is cast straight to `FileMetadata` (TS2352). That breaks `tsc --noEmit` and therefore `yarn build`.
  - **Fix:** build a full `FileMetadata`, as the `meta()` helper in `TemplatesFolderSetting.test.tsx:13` does, or cast through `unknown`.
- **B2. Lint fails.** `app/hooks/file-system/use-template-notes.test.ts:56,62` alias `this` to a local (`let dir: FakeDir … = this`), which `@typescript-eslint/no-this-alias` rejects.
  - **Fix:** walk from a function argument instead, e.g. a `walk(start: FakeDir, …)` helper, or write `let dir = this as FakeDir | undefined` without the alias declaration pattern. Don't add a disable comment.
- **B3. The test suite fails.** In `app/editor/settings/sections/TemplatesFolderSetting.test.tsx:45-51` ("deletes the vault's key when cleared"), the test seeds the setting after `render`, outside `act`, so clearing the input never fires `onChange` (see Checks).
  - **Fix:** seed the store before rendering. For example, give `setup` an `initialSettings` argument that calls `store.set(atom_templateFolderSettings, …)` before `render`. Then assert that the input shows `_tpl`, clear it, blur, and expect `{ "browser:other": "x" }`.

**Major**

- None.

**Minor**

- **m1 (partly a PRD question). Missing-link creation from an unsaved draft skips the draft confirm.**
  - **Where:** `use-template-create.ts:85` calls `openFile(handle, path, true)`, and `force=true` skips the "unsaved changes in your draft" confirm (`use-open-file.ts:83`).
  - **Conflict:** the PRD Behavior says "`openFile` keeps its existing unsaved-draft confirm". Behavior step 4 and Phase 3 also prescribe `openFile(handle, path, true)`, so the PRD contradicts itself.
  - **Scenario:** the user types in the draft, Ctrl+clicks `[[idea]]` and picks Blank. The draft tab is replaced by `idea.md` without a prompt. The text is not lost: it stays in `openFiles.draft` and returns through `atom_openDraft`.
  - **Suggested resolution:** decide in the PRD. Either keep the current behavior and drop the sentence, or pass `force=false` for this flow so the draft prompt appears. With `force=false`, a cancel leaves a created-but-unopened file, so the toast should still say what was created.
- **m2. A save card stays on "Saved" after the reply is edited.**
  - **Where:** `TemplateSaveCard.tsx:24` keeps `status` in local state, keyed by `` `${i}-${block.fileName}` `` (`ChatMessageItem.tsx:128`). Editing an assistant reply in place (`AIChatDialog.tsx:166-168`) keeps the same key.
  - **Scenario:** Save `rfc.md`, edit the reply to change the template body, then commit the edit. The card still shows "Saved" and the button stays disabled, so the edited template can't be saved without asking the model again.
  - **Fix:** reset `status` when `block.content` changes, or add a content hash to the key.

### Tests & docs gaps

- **Tests:** they cover every PRD-listed case, including clipboard denied or unused, the `C++ & Go` slug, single-pass expansion, the existing-on-disk case, the ` (1)` collision, the override file and AIChatDialog skill gating. The only gaps are the three broken test files above (B1–B3). The `act(...)` warning in `TemplatesFolderSetting.test.tsx` goes away with the B3 fix.
- **Docs:** complete.
  - New: `utils/templates/README.md`; the `TemplateDialog` README plus three `.md` docs; `TemplateSaveCard.md`; `TemplatesFolderSetting.md`.
  - Updated: the atoms, components and hooks READMEs; `MainPage.md`, `MarkdownEditor.md`, `PaneLeaf.md`, `AIChatDialog.md`, `ChatMessageItem.md`; the `ai-chat` and `editor-commands` READMEs; `FilesSettings.md`; `ARCHITECTURE.md`.
  - In-app: the Templates section went into a new `documentation/content/templates.tsx`, registered in `index.ts`, instead of `editor-writing.tsx`, so that file stays under 400 lines (now 362). That is an acceptable deviation.
  - No forbidden names were added. The "Sidebar" wording in `PaneLeaf.md` was already on that line.

### Handoff (fix list for hermes-engineer)

1. In `app/editor/hooks/use-vault-template-insert.test.ts:29`, use a complete `FileMetadata` literal (or cast through `unknown`) so `tsc --noEmit` and `yarn build` pass.
2. In `app/hooks/file-system/use-template-notes.test.ts:56,62`, remove the `this` aliasing in `FakeDir.at` / `FakeDir.put` so `yarn lint` passes for `app/`. Don't add a disable comment.
3. In `app/editor/settings/sections/TemplatesFolderSetting.test.tsx`, seed `atom_templateFolderSettings` before `render` in "deletes the vault's key when cleared". The test must pass with no `act` warning.
4. (m2) Reset `TemplateSaveCard`'s "Saved" state when its block content changes, and add a `ChatMessageItem` test: save, then re-render with edited content, and expect "Save template" or "Replace template" to be available again.
5. (m1) No code change until the PRD owner decides. If the draft confirm must stay, call `openFile(handle, path)` without `force` in `writeNewNote` for the link flow, and add a test.
6. Re-run `corepack yarn tsc --noEmit`, `corepack yarn eslint app`, `corepack yarn vitest run` and `corepack yarn build` and report the results.

## Review 2 (2026-10-04)

**Verdict: Approve with nits**

The engineer fixed the three Review 1 blockers (B1–B3) and m2. m1 (opening the draft link flow with `force=true`) is closed by the user decision recorded in the PRD (line 69), so I don't flag it again. All four checks pass. I re-read the template source files in full and found one new minor issue (m3), which doesn't block merging.

### Checks (run from `next-client` with Corepack)

| Check | Result | Caused by the change? |
|---|---|---|
| `corepack yarn tsc --noEmit` | **pass** (no output) | — |
| `corepack yarn lint` | **fails, but not because of this change.** `corepack yarn eslint app` is clean (0 problems). | **No.** All 25,617 reported problems are in the git-ignored nested build output `next-client/next-client/.next/dev/static/chunks/*`. Filtering that path out leaves zero problems. It's the same noise noted in Review 1. |
| `corepack yarn vitest run` | **pass**: 138 files and 1000 tests passed. Vitest also reported 2 "unhandled errors": the threads worker didn't start in time for `PrivacySettings.test.tsx` and `use-home-feed-url.test.ts` ("Timeout waiting for worker to respond", with about 7.7 s startup per worker on this device). | **No.** Neither file is in the diff, and both pass when run on their own (see below). This is environment load. The perf-budget flake the engineer reported (`command-search`) didn't happen in this run. |
| `corepack yarn build` | **pass** | — |

- **Rerun on its own:** `PrivacySettings`, `use-home-feed-url`, `TemplatesFolderSetting`, `ChatMessageItem`, `use-template-notes` and `use-vault-template-insert` passed: 6 files, 40 tests. There's no `act(...)` warning in `TemplatesFolderSetting` or `ChatMessageItem`.
- **New and changed test files:** they all ran in the full suite and passed: `utils/templates/*`, `TemplatesFolderSetting`, `TemplatePicker`, `TemplatePromptForm`, `slash-menu`, `use-vault-template-insert`, `use-template-notes`, `use-open-or-create-link`, `build-editor-commands`, `chat-skills`, `chat-helpers`, `ChatMessageItem`, `AIChatDialog`, `task-atoms`, `feed-model` and `PaneLeaf`.

### Review 1 fix list: verification

| Item | Status | Evidence |
|---|---|---|
| B1: TS2352 in `use-vault-template-insert.test.ts` | fixed | `use-vault-template-insert.test.ts:28-39` uses a full `FileMetadata` literal with `satisfies` and no cast. `tsc` is clean. |
| B2: `no-this-alias` in `use-template-notes.test.ts` | fixed | `FakeDir.at` / `put` (`:53-67`) walk the path with `reduce` seeded with `this`. There's no alias and no disable comment. `eslint app` is clean. |
| B3: the cleared-key test in `TemplatesFolderSetting.test.tsx` | fixed | `setup(vaultId, initialSettings)` seeds the store before `render` (`:17-26`). The test checks that the input shows `_tpl` before clearing it (`:45-51`). It passes with no `act` warning. |
| m2: the save card stays on "Saved" after an in-place edit | fixed | `TemplateSaveCard.tsx:25-30` uses React's "adjust state when a prop changes" pattern (state set during render). The new test "offers saving again after the reply is edited in place" is at `ChatMessageItem.test.tsx:104-136`. `TemplateSaveCard.md` is updated. |
| m1: the draft confirm | closed by user decision | PRD line 69. `use-template-create.ts:85` keeps `openFile(handle, path, true)`. |

### PRD coverage

Same as Review 1: every requirement and acceptance criterion is **done**. Run 2 changed no product code except `TemplateSaveCard.tsx`, and that change makes the "Replace template" criterion work after an edit too.
- **File size:** every touched source file is under 400 lines. The largest are `MarkdownEditor.tsx` (363), `editor-writing.tsx` (362) and `AIChatDialog.tsx` (337).
- **Rule scan:** there are no new raw `<button>` or text `<input>` elements. The only two `<input>` elements are `AIChatDialog`'s existing hidden `type="file"` pickers. There are no hex colors, no `console.log`, no `fetch(` and no forbidden names in new code.
- **Scope creep:** none. The untracked `plans/005-new-template-command/` is a different plan and isn't part of this change.

### Findings

**Blocker:** none.

**Major:** none.

**Minor**

- **m3. A heading link to an existing note can offer to create a duplicate.**
  - **Where:** `app/hooks/file-system/use-open-or-create-link.ts:20` passes the raw link value to `resolveFileMetaByName`. The resolver strips `|alias` but not `#heading` (`resolve-file-by-name.ts:33`), and `findLinkAtPos` passes `match[1]` with the `#…` part included (`link-detection.ts:25`). `parseMissingLink` *does* strip `#heading` (`template-registry.ts:73`).
  - **Scenario:** `projects/launch.md` exists, and the New Notes Folder is `inbox`. The user Ctrl/Cmd+clicks `[[launch#Goals]]`. The resolver looks for `launch#Goals.md` and finds nothing, so `createNoteFromMissingLink` runs. It checks `inbox/launch.md` on disk, finds nothing, and opens the picker titled "New note: launch" with Blank note first. Enter creates an empty `inbox/launch.md` next to the real note. Before this change the same click showed "File not found", so heading links never navigated, but they never created files either. If the target is in the vault root or the New Notes Folder, the existing-file check opens it, which is an improvement.
  - **Why it's minor:** the user still has to confirm in the picker, and no data is lost. The PRD prescribes "resolve the way `openFileByName` does", and the engineer followed that.
  - **Fix:** in `openOrCreateLink`, resolve on the link with the heading removed (`name.split("|")[0].split("#")[0]`, keeping the rest of the resolver unchanged). Add a `use-open-or-create-link.test.ts` case: `[[note#h]]`, where `note.md` is in another folder, opens it and doesn't call the create flow.
- **nit. `send`'s `useCallback` is rebuilt on every render.** At `AIChatDialog.tsx:152`, `skills` is in the dependency list, and `useChatSkills` returns a new object literal on every render (`use-chat-skills.ts:61`). Nothing breaks, but the memoization does nothing. Depending on `skills.skillInstructionsFor`, which is stable, would fix it.

### Tests & docs gaps

- **Tests:** none beyond the m3 case above. All PRD-listed cases are covered (see Review 1).
- **Docs:** complete. `TemplateSaveCard.md` documents the reset.

### Handoff

No changes are required to approve. These are optional follow-ups for `hermes-engineer`:
1. (m3) Strip `#heading` before resolving in `use-open-or-create-link.ts`, and add the test above.
2. (nit) Depend on `skills.skillInstructionsFor` instead of `skills` in `AIChatDialog`'s `send` dependencies.
