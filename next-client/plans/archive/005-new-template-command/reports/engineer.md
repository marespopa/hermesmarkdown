# Engineer report: 005 New template command

## Run 1
This run continued an interrupted earlier run (see the RESUME note in `mailbox.md`). That run had already written the sanitiser move, the comment stripping, the starter, `createTemplate` and the palette entry. This run added the wiring, the hook and command tests, and the docs, then reviewed the whole diff against the PRD.

### Built
- **Shared sanitiser (M2):** `sanitizeTemplateFileName` moved to `app/utils/templates/template-registry.ts:70`. It also strips leading dots now. `app/editor/components/ai-chat/chat-skills.ts:4` imports it from there and doesn't re-export it.
- **Starter body (M4):** `app/utils/templates/template-starter.ts`, `TEMPLATE_STARTER`, the exact PRD text ending in `\n`.
- **Frontmatter comment stripping (M3):** `stripFmComments` in `app/utils/templates/template-frontmatter.ts:18`, used by `splitTemplate` (:32). It removes only column-0 `#` lines. A block left holding only comments is dropped with `dropLeadingBlankLines`. Otherwise the existing routing logic runs on the cleaned text (`splitRouting`, :40). Line endings (`\r\n` or `\n`) are kept.
- **Action (M1):** `createTemplate` in `app/hooks/file-system/use-template-create.ts:178`:
  1. Returns if there is no vault.
  2. Prompts `"Template name:"`. Cancel or a blank name returns.
  3. Sanitises the name and takes the folder from `atom_templatesFolder`.
  4. Looks the name up in the registry, ignoring case. On a match it gets a fresh handle and opens the file with the toast `Opened existing template: <path>`. A stale entry falls through.
  5. Otherwise calls `writeNewNote(…, { text: TEMPLATE_STARTER, cursor: null }, { unique: false, onExisting })`. That covers the on-disk check, the folder create, the write, the rescan, tag indexing, opening the file and the `Created:` toast.

  `writeNewNote` gained an optional `onExisting` callback (:77). The missing-link callers don't pass it, so their behavior is unchanged.
- **Wiring:** `app/hooks/file-system/use-file-crud.ts:57,79` → `app/editor/components/editor-commands/use-editor-command-context.ts:92,159`. The context type is inferred, so no type edit was needed.
- **Palette command:** `app/editor/components/editor-commands/document-vault-commands.ts:67-75`. It is `new-template`, "New template…", category Vault, keywords `create template add template new template`. It appears only inside the existing `vaultHandle` branch. Desktop and mobile use the same palette, and no chrome was added.

### Tests/docs
- Tests:
  - `app/utils/templates/template-registry.test.ts`: the `sanitizeTemplateFileName` block, with the moved cases plus dot-file, spacing, forbidden-character and `.MD` cases.
  - `app/editor/components/ai-chat/chat-skills.test.ts`: the moved block and its import are removed.
  - `app/utils/templates/template-frontmatter.test.ts`: four new comment cases (comment-only block, comment plus key, comment plus routing, indented `#` inside a block scalar).
  - `app/utils/templates/template-starter.test.ts` (new): split, lint, prompt labels, expansion of the "Auth" note and the caret offset.
  - `app/hooks/file-system/use-template-notes.test.ts`: a `createTemplate` describe with these cases:
    - creates the file with the raw starter and opens it
    - uses `_templates/`
    - uses the folder from the setting
    - turns `../evil/.Rfc.md` into `Rfc.md`
    - opens an indexed existing template unchanged
    - opens an on-disk file that isn't indexed yet, unchanged
    - matches `RFC` to `rfc.md`
    - writes nothing for a cancelled or blank name
    - doesn't prompt without a vault
    - shows the `Failed to create file` toast on a failed write

    The file stays well under 400 lines, so the fakes weren't extracted.
  - `app/editor/components/editor-commands/build-editor-commands.test.ts`: `createTemplate: vi.fn()` added to the defaults, plus a "New template…" test covering the vault gating, the keywords and the action.
- Docs:
  - `app/utils/templates/README.md`: the starter row, the sanitiser, and the comment stripping.
  - `app/hooks/README.md`: `createTemplate` and `onExisting`.
  - `app/editor/components/editor-commands/README.md`
  - `app/editor/components/ai-chat/README.md`: the sanitiser's new source.
  - In-app docs, `app/documentation/content/templates.tsx`: the "New template…" sentence, the keywords, and a paragraph on frontmatter comments.

### Decisions
- If the registry lookup throws something other than not-found, it is reported with `reportCreateError` and nothing is written. Falling through to a write could overwrite a file.
- The in-app docs sentence adds "If a template with that name already exists, it opens unchanged." This tells users what the no-prompt behavior does.
- In the sanitiser, a `.trim()` follows the leading-dot strip, so `. foo` doesn't keep a leading space.

### Not done / open
- Nothing is deferred beyond the PRD's out-of-scope list.
- I didn't run typecheck or tests (project rule: only on request).
- Open question carried from the PRD: should the starter keep `{{prompt:Owner}}`? It is kept as specified.

### To verify
```bash
cd next-client
corepack yarn tsc --noEmit
corepack yarn vitest run app/utils/templates app/hooks/file-system/use-template-notes.test.ts app/editor/components/editor-commands/build-editor-commands.test.ts app/editor/components/ai-chat/chat-skills.test.ts
```
Manual checks:
1. With a vault open, the palette lists "New template…" for "create template" and "add template". Without a vault, it isn't listed.
2. Run it and enter `Meeting`. `templates/Meeting.md` opens with the starter, and the toast reads `Created: templates/Meeting.md`.
3. Run it again with `meeting`. The existing file opens, and the toast reads "Opened existing template".
4. Run "New note from template…", pick Meeting, title it "Auth", and enter an Owner. The note starts `# Auth`, has no frontmatter, and the caret sits at the end.
5. Repeat on mobile through the palette.

## Run 2 — review 1 fixes

### Built
- **Fix 1 (required):** added `"new-template"` after `"new-note-from-template"` to the command ID order list in `app/editor/components/editor-commands/build-editor-commands.test.ts:134`. This matches the registration order in `document-vault-commands.ts:59-68`.
- **Fix 2 (nit):** `sanitizeTemplateFileName` (`app/utils/templates/template-registry.ts:70-80`) now trims before it strips leading dots, so `a/ .x` gives `x.md` and not the dot-file `.x.md`. Added that case to `app/utils/templates/template-registry.test.ts:117`.

### Tests/docs
- Tests: the two files above. No doc changes; the README row for the sanitiser already says "no leading dots".

### Verification run (the reviewer asked for it)
- `corepack yarn vitest run app/editor/components/editor-commands/build-editor-commands.test.ts app/utils/templates/template-registry.test.ts`: 2 files, 23 tests, all passed.
- I didn't run the full suite or tsc.

### Not done / open
- Nothing new. The open question about `{{prompt:Owner}}` from Run 1 still stands.

### To verify
```bash
cd next-client
corepack yarn tsc --noEmit
corepack yarn vitest run
```
