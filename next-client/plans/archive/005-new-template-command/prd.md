# New template command — engineering PRD

## Context
Source: [`brief.md`](brief.md). Right now there are two ways to make a template: ask AI Chat, or hand-create a `.md` file in the templates folder. Both mean knowing the folder name and the token syntax. This plan adds a palette command, **"New template…"**. It asks for a name, creates `<templates folder>/<name>.md` with a short starter body that shows the syntax, and opens it. It builds on plan 004 (`004-vault-templates`, approved; its code is in the working tree).

What already exists:
1. **Templates folder resolution.** `resolveTemplatesFolder` (`app/utils/templates/template-registry.ts:20`) uses the per-vault setting if one is set. Otherwise it takes the first existing folder of `templates`, `_templates`, `Templates`, and falls back to `templates` with `exists: false`. `atom_templatesFolder` / `atom_templates` (`app/atoms/template-atoms.ts`) are derived from `atom_fileMetadata`, so a rescan updates them.
2. **Note writing.** `useTemplateCreate#writeNewNote` (`app/hooks/file-system/use-template-create.ts:59-93`) handles the write path. With `{ unique: false }`, a file already on disk is opened unchanged. Otherwise it runs `ensureVaultFolder`, writes, then `scanVault` and `indexVaultTags`, then `openFile(handle, path, true)`, then shows `toast.success("Created: …")`. Errors go through `reportCreateError`. This is exactly the create-or-open-existing behavior the brief asks for.
3. **The AI chat file-name sanitiser.** `sanitizeTemplateFileName` (`app/editor/components/ai-chat/chat-skills.ts:78`) keeps the base name only. It removes `..`, turns `: * ? " < > |` into `-`, adds `.md`, and turns an empty name into `template.md`. Its tests are in `chat-skills.test.ts:65-70`.
4. **Palette wiring.** `buildDocumentVaultCommandGroups` (`app/editor/components/editor-commands/document-vault-commands.ts:48-66`) already adds "New note from template…" when `vaultHandle` is set. `createNoteFromTemplate` is passed through `use-file-crud.ts:57,78` and `use-editor-command-context.ts:91,157`. Desktop and mobile use the same palette.
5. **Prompt dialog.** `useDialog().prompt(message, defaultValue, title)` (`app/hooks/use-dialog.ts:48`) exists.

Missing or broken:
- **M1.** No create-template action and no palette command.
- **M2.** The sanitiser lives in AI chat UI code, not in the shared template utils. It also lets a leading dot through, so `.foo` becomes `.foo.md`: a dot-file that isn't indexed by default and so never shows up in the registry.
- **M3.** `splitTemplate` (`app/utils/templates/template-frontmatter.ts:18`) keeps YAML comment lines. If the starter's "commented-out" `target_folder` / `file_name` lines were left as they are, every note created from it would carry a `---` block of comments.
- **M4.** There is no starter body.

## Behavior
- **Command:** "New template…", category Vault. Keywords: `create template add template new template`. It is listed only when a vault is open (`vaultHandle`). Desktop and mobile both reach it through the palette. No new buttons, chrome or Explorer entries.
- **Flow:**
  1. `dialog.prompt("Template name:", "", "New template")`. Cancel, or a name that is empty after trimming, does nothing.
  2. **File name:** `sanitizeTemplateFileName(name)`. It keeps the base name only (anything up to the last `/` or `\` is dropped), removes `..`, removes leading dots, turns `: * ? " < > |` into `-`, strips a trailing `.md`, then adds `.md`. If nothing is left, the name becomes `template.md`. Spaces and case are kept: `Meeting Notes` → `Meeting Notes.md`.
  3. **Folder:** `atom_templatesFolder.folder`. That is the setting, else the first existing default folder, else `templates`. Missing folders are created (`ensureVaultFolder`).
  4. **Already exists:** if `atom_templates` has an entry whose name matches case-insensitively (this covers case-sensitive backends such as OPFS), or the file is found on disk at `<folder>/<file>`, that file is opened unchanged. There is no prompt and no write. The toast is `Opened existing template: <path>`.
  5. **Otherwise:** write `TEMPLATE_STARTER`, rescan, index tags, open the file in the editor, and toast `Created: <path>` (all through `writeNewNote`). The starter is written **raw**: no token expansion.
- **Starter body** (exact text):
  ```markdown
  ---
  # Optional, used by "New note from template…":
  # target_folder: notes
  # file_name: {{date}}-{{slug}}
  ---
  # {{title}}

  Date: {{date}}
  Owner: {{prompt:Owner}}

  {{cursor}}
  ```
  The frontmatter holds only YAML comments, so other editors read it as a valid, empty-valued block. When the template is used, those comment lines are removed (M3). The empty block is then dropped, so created notes start at `# <title>`.
- **Registry:** the new template appears in `/template`, the missing-link picker and "New note from template…" after the rescan that `writeNewNote` runs. No reload is needed.
- **Backends:** everything goes through vault handles, so local, browser (OPFS) and GitHub vaults behave the same. A GitHub vault commits the file through its existing sync.
- **Unsaved draft:** `openFile(…, true)` is used, as in plan 004's link flow. The draft text is kept in `openFiles.draft`.
- **Network:** none.

## Design
- **Shared sanitiser:** move `sanitizeTemplateFileName` to `template-registry.ts` and add the leading-dot strip. `chat-skills.ts` imports it from there. The AI save card and the palette command then name files the same way, as the brief asks.
- **Starter:** new `app/utils/templates/template-starter.ts`:
  ```ts
  /** Raw body written by "New template…". Plain Markdown; never expanded on write. */
  export const TEMPLATE_STARTER: string;
  ```
- **Comment stripping:** `splitTemplate(raw)` first removes frontmatter lines matching `/^#/`. Only column-0 `#` lines are removed; indented lines may belong to a block scalar and are kept. If the block is then empty, it is dropped, using the same `dropLeadingBlankLines` handling as today. The existing routing-key logic then runs on the result. This changes what plan-004 templates produce only for frontmatter comments, which have no meaning in a created note.
- **Action:** `useTemplateCreate` gains `createTemplate(): Promise<void>`. It reuses `writeNewNote(folder, baseName, { text: TEMPLATE_STARTER, cursor: null }, { unique: false })` for the disk check and the create. Before that, it checks `atom_templates` case-insensitively. On a match it resolves a fresh handle with `resolveFileHandleAtPath` and calls `openFile(handle, path, true)`.
- **Alternative rejected:** a `{ unique: true }` create (`Meeting (1).md`). The brief says to open the existing template. A duplicate would also add a confusing near-namesake to the picker.

## Phase 1: "New template…" command
- `app/utils/templates/template-registry.ts`: add `sanitizeTemplateFileName(info: string): string`, moved from `chat-skills.ts:77-85`. Add `.replace(/^\.+/, "")` after the `..` removal, then trim. Leave `sanitizeNoteName` unchanged.
- `app/editor/components/ai-chat/chat-skills.ts:77-85`: delete the local function. Import it from `@/app/utils/templates/template-registry` for `parseTemplateBlocks` (:96). Don't re-export it.
- `app/utils/templates/template-starter.ts` (new): `TEMPLATE_STARTER`, the exact text from Behavior, ending with `"\n"`.
- `app/utils/templates/template-frontmatter.ts#splitTemplate` (:18):
  - After the `FM_REGEX` match, build `cleaned` with the block's column-0 `#` lines removed.
  - If `cleaned` differs from `raw` and its block is empty, return `{ routing: {}, content: dropLeadingBlankLines(rest) }`.
  - Otherwise continue the existing logic on `cleaned`, including the `return { routing, content: cleaned }` early exit at :30.
  - Keep the file under ~70 lines.
- `app/hooks/file-system/use-template-create.ts` (172 → about 205 lines): add `createTemplate` after `createNoteFromTemplate` (:155). It needs `atom_templatesFolder` from `template-atoms`, plus `sanitizeTemplateFileName` and `TEMPLATE_STARTER`. Flow:
  1. Return if there is no vault.
  2. Prompt for the name. Return if it's empty.
  3. `fileName = sanitizeTemplateFileName(name)`, `baseName = fileName.slice(0, -3)`, `folder = store.get(atom_templatesFolder).folder`.
  4. Look for `store.get(atom_templates).find(t => t.name.toLowerCase() === baseName.toLowerCase())`. On a hit, use `findExisting(vault, t.path)`. If that returns a handle, call `openFile(handle, t.path, true)`, show `toast.success(\`Opened existing template: ${t.path}\`)`, and return. A stale index entry falls through.
  5. Otherwise call `writeNewNote(folder, baseName, { text: TEMPLATE_STARTER, cursor: null }, { unique: false })`.
  6. For the on-disk-but-not-indexed case, give `writeNewNote`'s existing-file branch (:68-74) an optional `onExisting?: (path: string) => void` option. `createTemplate` uses it to show the same "Opened existing template" toast. Missing-link callers pass nothing, so their behavior doesn't change.
  7. Return `createTemplate` with the other functions (:171).
- `app/hooks/file-system/use-file-crud.ts:57,78`: destructure and return `createTemplate`.
- `app/editor/components/editor-commands/use-editor-command-context.ts:91,157`: pass `createTemplate` through, next to `createNoteFromTemplate`, and add it to the context type.
- `app/editor/components/editor-commands/document-vault-commands.ts`:
  - Destructure `createTemplate` (:13).
  - After the `new-note-from-template` entry (:57-65), add `{ id: "new-template", label: "New template…", category: "Vault" as const, keywords: "create template add template new template", action: () => { void createTemplate(); } }`.
  - The file goes from 207 to about 217 lines.

## Tests
Use Vitest and mock everything. The existing harness in `use-template-notes.test.ts` already mocks `next/navigation`, `react-hot-toast`, `file-writer`, `use-dialog`, and `use-template-dialog`, and provides `FakeDir`/`FakeFile` and a Jotai `createStore` + `<Provider>`. Reuse it.

- `app/utils/templates/template-registry.test.ts`: add a `sanitizeTemplateFileName` block. Move the cases from `chat-skills.test.ts:65-71` (`../x` → `x.md`, `a/b.md` → `b.md`, blank → `template.md`, `..` → `template.md`). Add these cases:
  - `.hidden` → `hidden.md`
  - `...` → `template.md`
  - `Meeting Notes` → `Meeting Notes.md`
  - `a:b?` → `a-b-.md`
  - `x.MD` → `x.md`
- `app/editor/components/ai-chat/chat-skills.test.ts`: drop the moved block and the import (:6). Keep the `parseTemplateBlocks` name-sanitising assertions.
- `app/utils/templates/template-frontmatter.test.ts`, assert that:
  - A comment-only block is dropped and the body starts at the first content line.
  - Comments are removed while `status: draft` is kept.
  - Comments are removed and routing keys are taken out in one template.
  - An indented `  # x` line inside a `notes: |` block scalar is kept.
  - Templates without comments come out exactly as before (existing cases still pass).
- `app/utils/templates/template-starter.test.ts` (new):
  - `splitTemplate(TEMPLATE_STARTER)` returns `{ routing: {} }` and content starting with `# {{title}}`.
  - `lintTemplate(TEMPLATE_STARTER)` is `[]`.
  - `extractPromptLabels` gives `["Owner"]`.
  - `expandTemplate` gives exactly one cursor offset.
- `app/hooks/file-system/use-template-notes.test.ts`, a `createTemplate` describe that asserts:
  - With no templates folder, `templates/Meeting.md` is created with `TEMPLATE_STARTER` exactly (no expansion), then `scanVault`, `openFile(handle, "templates/Meeting.md", true)` and toast `Created: templates/Meeting.md` run.
  - With `_templates/x.md` indexed, the new file goes to `_templates/`.
  - A configured setting folder is used.
  - Name `../evil/.Rfc.md` → `templates/Rfc.md`.
  - An existing `templates/rfc.md` on disk is opened unchanged, nothing is written, and the "Opened existing template" toast shows.
  - Typing `RFC` when `rfc` is indexed opens `templates/rfc.md`.
  - A cancelled or blank prompt writes and opens nothing.
  - No vault means no prompt.
  - A write failure shows the `Failed to create file` toast.

  If the file passes 400 lines, move `FakeDir`/`FakeFile`/`notFound` to `app/hooks/file-system/template-test-fakes.ts` and import them.
- `app/editor/components/editor-commands/build-editor-commands.test.ts` (near :257):
  - "New template…" is listed only with a vault.
  - Its action calls `createTemplate`.
  - Add `createTemplate: vi.fn()` to `createContext` defaults.

## Docs
- `app/utils/templates/README.md`:
  - Add a `template-starter.ts` row.
  - In the `template-registry.ts` row, mention `sanitizeTemplateFileName()` (base name only, no `..`/leading dots, `.md` added; shared by AI chat and "New template…").
  - In the `template-frontmatter.ts` row, add "drops column-0 YAML comment lines".
- `app/hooks/README.md:76`: extend the `use-template-create.ts` row with `createTemplate()`: name prompt, `<templates folder>/<name>.md` with the starter body, an existing template opened instead of overwritten.
- `app/editor/components/editor-commands/README.md:15`: add `New template…` next to `New note from template…`.
- `app/editor/components/ai-chat/README.md`: if it describes `sanitizeTemplateFileName`, say it now comes from `template-registry.ts`.
- In-app docs, `app/documentation/content/templates.tsx`:
  - In the first paragraph (around :13-20), add one sentence: "Run **New template…** from the command palette to create one: name it, and it opens with a short example showing the frontmatter keys, `{{title}}`, `{{date}}`, a prompt and `{{cursor}}`."
  - Add `new template create template` to the keywords (:9).
  - Mention that `#` comment lines in a template's frontmatter are documentation and don't reach created notes.

## Acceptance criteria
- [ ] With a vault open, the palette lists "New template…" (Vault) for "create template", "add template" and "new template". Without a vault, it isn't listed.
- [ ] Naming it `Meeting` in a vault with no templates folder creates `templates/Meeting.md` with the starter text exactly as given. It opens in the editor, and the toast reads `Created: templates/Meeting.md`.
- [ ] With `_templates/` existing, or with Templates Folder set in Settings, the file goes into that folder.
- [ ] `../a/.Rfc.md` creates `Rfc.md` in the templates folder. Nothing is written outside it, and the file is never a dot-file.
- [ ] An existing template with the same name, compared case-insensitively, is opened unchanged, with no prompt and no write.
- [ ] Cancel, or an empty name, writes nothing.
- [ ] Without a reload, the new template appears in `/template`, the missing-link picker and "New note from template…".
- [ ] Using the starter via "New note from template…" titled "Auth" creates a note that starts `# Auth`, has today's date, asks once for Owner, puts the caret at `{{cursor}}`, and has **no** frontmatter block.
- [ ] Existing plan-004 frontmatter tests and AI-chat block-name tests still pass. The AI save card names files exactly as before, except that leading dots are stripped.
- [ ] Works the same on a local folder, a browser vault, a GitHub vault, and on mobile through the palette.
- [ ] No new UI chrome, no raw `<button>`/`<input>`, no new network calls. Every touched file stays under 400 lines.

## Decisions
- **Empty name cancels.** This matches `createNoteFromTemplate`'s title prompt. A name that sanitises to nothing (`..`) still becomes `template.md`, so it shares the AI save card's rule.
- **Leading dots are stripped** in the shared sanitiser, because dot-files aren't indexed and would never reach the registry. The AI save card gains this fix too.
- **Existing check is case-insensitive** against the registry, plus a disk check. This avoids `RFC.md` next to `rfc.md` on case-sensitive backends. A disk-only check would miss that on OPFS.
- **"Commented-out" frontmatter** uses YAML `#` lines, and the engine now drops column-0 `#` lines from frontmatter when a template is used. The alternative was a body-level HTML comment. It would be copied into every created note, and the brief wants plain Markdown that stays readable elsewhere.
- **Starter text** has no explanatory prose in the body, because the body is copied into notes. The single comment line in the frontmatter is the only guidance, and the in-app docs cover the rest.
- **No caret placement** in the new template file. The file opens at the top, which is the standard open behavior.
- **Toast for an existing template:** "Opened existing template: <path>". This is informational, not a prompt, so it respects "no prompt".

## Out of scope / Deferred
- "Save current note as template", a template gallery or built-in library, and editing the starter in Settings (all from the brief).
- Explorer context-menu or button entry points.
- Choosing the folder in the command, or creating templates in subfolders.
- Changing `noteDisplayTitle` so template files don't show `{{title}}` as their tab or Explorer title.

## Open questions
- Should the starter include `{{prompt:Owner}}`? The brief asks for one prompt example, so it's included. Every note made from an unedited starter will then ask for an Owner, which is acceptable for a starter the user is meant to edit.
