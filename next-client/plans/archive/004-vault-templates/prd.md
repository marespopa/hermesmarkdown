# Vault-native templates — engineering PRD

## Context
Source: [`brief.md`](brief.md). Templates are plain `.md` files in a vault folder. Tokens (`{{date}}`, `{{title}}`, `{{prompt:Owner}}`, `{{cursor}}`, …) expand when a template is used. There are three ways to use one: the slash command `/template` (or `/tpl`) inserts a template at the cursor, clicking a missing `[[folder/name]]` link creates that note from a template, and a palette command, "New note from template…", creates a named note. The AI chat gets a skill that writes valid template files into the templates folder. The user confirms every save. The Journal / Today trigger was removed from this plan (Q1, see Decisions).

What exists today:
1. **Template files are already indexed.** `collectVaultFiles` (`app/hooks/file-system/vault-scan.ts:78-88`) skips only dot-folders unless hidden files are shown, so `templates/`, `Templates/` and `_templates/` files are in `atom_fileMetadata` (`app/atoms/metadata.ts:20`). `_`-prefixed paths are hidden only in listings: palette (`use-palette-files.ts:20`), home feed (`feed-model.ts:24#isFeedPath`), and AI mentions (`chat-helpers.ts:61`). Every in-app create/rename/delete rescans, and so do focus and the periodic rescan (`app/hooks/use-vault-sync.ts`). Nothing treats any folder as templates.
2. **The slash menu has built-in snippets only.** `app/editor/codemirror/slash-menu.ts`: `TEMPLATES` (`app/editor/components/constants.ts:139`) are hard-coded entries or sentinels. `insertPlainContent` (:50) runs every `SHORTCODES` replacement (`constants.ts:42`: `{date}`, `{time}`, `{day}`, …) and places the caret at `CURSOR_SENTINEL` (`"\0"`, `constants.ts:124`). Because `{{date}}` contains `{date}`, running a vault template through `insertPlainContent` would produce `{2026-10-04}`. Vault templates need their own insert path.
3. **Clicking a missing link shows a toast and nothing else.** `PaneLeaf.tsx:254` passes `openFileByName` (`app/hooks/file-system/use-open-file.ts:196`) as `onWikiLinkClick`. Ctrl/Cmd+click (or a plain click in Preview) reaches it from `use-codemirror-features.ts:186-198`, and pills reach it from `MarkdownEditor.tsx:142` / `EditorPills.tsx:77`. If `resolveFileMetaByName` (`resolve-file-by-name.ts:27`) finds no match, the user gets `toast.error("File not found: …")` (:202).
4. **The file-creation pieces exist.** `ensureVaultFolder`, `normalizeFolderPath` and `createUniqueFile` (`app/hooks/file-system/unique-file.ts`), `writeFileContent` (`app/services/file-writer.ts`, with an OPFS worker fallback), `resolveFileHandleAtPath` (`app/atoms/vault-atoms.ts:50`), the `atom_newNoteFolder` setting (`ui-atoms.ts:71`), and the `atom_pendingScrollTarget` caret placement (`ui-atoms.ts:203`, consumed by `use-scroll-to-pending-target.ts`). They work the same on local, browser (OPFS) and GitHub vaults.
5. **No picker or form for templates.** `GlobalDialog`'s `select` (`app/components/DialogModal/GlobalDialog.tsx:170`) is a plain button list with a folder icon. It has no search and no arrow-key navigation. `dialog.confirm` already confirms on Enter and cancels on Esc (`OverlayLayer/useOverlay.ts:46`).
6. **AI chat has no skills.** `AIChatDialog.tsx` (328 lines) sends `buildChatSystemPrompt` (`ai-chat/chat-helpers.ts:131`) plus messages through `callAIChat`. Replies can only be edited, copied or applied to the note (`ai-chat/ChatMessageItem.tsx`). There is no tool calling, and the `/api/ai` route only relays text.
7. **No template settings.** Settings → Files (`app/editor/settings/sections/FilesSettings.tsx`) has New Notes Folder and Show Hidden Files. Per-vault persisted UI state is keyed by `atom_vaultKey` (`vault-atoms.ts:38`; pattern: `atom_fileTreeExpansion`, `ui-atoms.ts:164`).

Missing: the template engine and registry (1, 7), the picker and prompt dialogs (5), slash insertion (2), creating a note from a missing link plus "New note from template…" (3, 4), and the AI template skill (6).

## Behavior

### Templates folder and registry
- **Setting:** Settings → Files → **Templates Folder**, saved per vault. When empty, the first folder that exists from `templates`, `_templates`, `Templates` is used, checked in that order. A folder "exists" when at least one indexed file sits directly in it. The input's placeholder shows the folder in use, or `templates` if none exists.
- **Valid values** go through `normalizeFolderPath`. A path with a dot-prefixed segment (`.hermes/tpl`) is rejected with an inline hint, because dot folders aren't indexed by default.
- **Registry:** every `*.md` file **directly** inside the templates folder is a template. Subfolders are ignored. A template's name is its file name without `.md`, and the list is sorted by name (case-insensitive).
- **Hot reload:** the registry is derived from `atom_fileMetadata`, so it updates on every rescan (in-app create/rename/delete, window focus, periodic sync). The template body is always read from disk when it's used, so edits apply right away even before a rescan. If the template's tab has unsaved edits, the saved file on disk is used.
- **Listings:** template files are left out of the home feed, the Tasks page and the palette `!` task scope, so `- [ ] {{prompt:Task}}` lines don't show up as tasks. They stay visible in the Explorer, palette file search and content search, where they can be opened and edited like any other note.

### Template syntax and expansion
Tokens are written `{{name}}`. Whitespace inside the braces is allowed (`{{ date }}`). Names are case-sensitive and match the brief's list exactly. Expansion is one pass from left to right, so text a token inserts (clipboard contents, prompt answers) is never expanded again. Unknown tokens such as `{{foo}}` stay as they are.

| Token | Value (local time, at use time) |
|---|---|
| `{{date}}` | `YYYY-MM-DD` |
| `{{time}}` | `HH:mm` (24 h) |
| `{{weekday}}` | English full name, `Sunday` |
| `{{year}}` / `{{month}}` / `{{day}}` | `2026` / `10` / `04` (zero-padded) |
| `{{monthName}}` | English full name, `October` |
| `{{title}}` | the target note's title (see below) |
| `{{slug}}` | `slugify(title)`: NFKD, accents removed, lowercase, every run of other characters becomes `-`, leading/trailing `-` trimmed; `""` if nothing is left |
| `{{clipboard}}` | text from `navigator.clipboard.readText()`, read only if the template uses the token; `""` if the read fails or is denied |
| `{{cursor}}` | removed; the first one sets the caret after the note opens or the insert finishes, and any others are removed |
| `{{prompt:Label}}` | the value entered for `Label` (labels are trimmed and case-sensitive; every occurrence of a label gets the same value) |

**`{{title}}` by trigger:** for a missing link, it's the link's base name (`[[rfcs/auth-spec]]` → `auth-spec`). For "New note from template…", it's the title the user typed. For `/template`, it's the current note's `noteDisplayTitle` (frontmatter `title`/H1, else the file name); in the draft it's `""`.

**Template frontmatter:** `target_folder` and `file_name` are routing keys and are removed from the created note. If removing them leaves the frontmatter block empty, the block is dropped. Other frontmatter keys are kept, and tokens inside them are expanded.

### Prompts
- If the expanded template has any `{{prompt:…}}` token, one **Template fields** modal opens before anything is written or inserted.
- It shows one `Input` per distinct label, in first-appearance order. The first field is focused. Tab and Shift+Tab move between fields, and Enter in any field submits. **Create** / **Insert** (primary) submits, **Cancel** (secondary) cancels, and Esc cancels. Empty answers are allowed and become `""`.
- Cancelling aborts the whole action. No file is created and nothing is inserted.

### Trigger: `/template` (or `/tpl`)
- The slash menu gets one **Template** entry ("Insert a template from your vault"). Both `/template` and `/tpl` match it through the existing fuzzy match.
- Choosing it removes the `/…` trigger text and opens the **template picker** (see below), without the "Blank note" row. If there are no templates, the picker shows "No templates in `<folder>/`" with a hint that templates are `.md` files in that folder.
- After a template is picked and any prompts are answered, the expanded text is inserted at the caret as one undo step, and the caret goes to `{{cursor}}` or to the end of the insert.
- **Frontmatter on insert:** if the note is empty (only whitespace), the full expanded template is inserted, including any non-routing frontmatter. Otherwise only the body (after the frontmatter block) is inserted.
- If the editor was unmounted while the dialogs were open (the tab was switched or closed), nothing is inserted.

### Trigger: clicking a missing `[[link]]` (Q2 a, Q3)
Clicking a link that `resolveFileMetaByName` can't resolve starts a create flow instead of the "File not found" toast:
1. **Target path (the link decides).** Strip `|alias` and `#heading`, and strip `.md`. The folder part goes through `normalizeFolderPath` and is relative to the **vault root**. A link with no folder (`[[name]]`) goes to `atom_newNoteFolder`, or the vault root if that setting is empty. The note is always `<folder>/<basename>.md`, so the link resolves through the resolver's exact-path step.
   - A base name that is empty, or that contains `\ : * ? " < > |`, shows a toast ("Can't create a note named …") and stops.
2. **Pick the template.** The link's **last** folder segment is compared with template names after lowercasing and removing one trailing `s` from each, so `rfcs/` matches `rfc.md` or `rfcs.md`. If several templates match, an exact name match wins, then alphabetical order.
   - **Match:** `dialog.confirm("Create rfcs/auth-spec from template rfc?", "New note", "Create", "Cancel")`. Enter creates and Esc cancels.
   - **No match, or a link without a folder:** the template picker opens with **Blank note** first, then every template. A vault with no templates shows only Blank note.
   - Esc or Cancel at any step writes nothing.
3. **Prompts:** if needed, the prompts modal opens next (see above).
4. **Write:** create the folders (`ensureVaultFolder`). If `<basename>.md` already exists on disk (the index was stale), the existing file is opened unchanged, because what's on disk wins. Otherwise the file is created with the expanded content. A blank note gets `"\n"`, as `createFile` does. Then rescan, open the file (`openFile(handle, path, true)`), set `atom_pendingScrollTarget` to the `{{cursor}}` line and column when there is one, and toast `Created: <path>`.
- Template `target_folder` / `file_name` are **ignored** in this flow, and the link text is never rewritten.
- **Draft:** clicking a missing link from the unsaved draft creates the note too. The new note opens with `openFile(handle, path, true)`, so no unsaved-draft prompt is shown. The draft text is kept in `openFiles.draft` and comes back via `atom_openDraft` (decided by the user 2026-10-04, review 1 m1).

### Trigger: palette "New note from template…" (Q2 a)
- The command is shown when a vault is open (category Vault, next to "New file in folder…").
- **Flow:**
  1. The picker opens without Blank note. With no templates it shows the empty state.
  2. `dialog.prompt("Note title:", "", "New note from template")`. An empty title cancels.
  3. The prompts modal opens, if the template has prompts.
  4. The note is written.
- **Folder:** the template's `target_folder` with tokens expanded and `normalizeFolderPath` applied, else `atom_newNoteFolder`, else the vault root. Missing parent folders are created.
- **Name:** `file_name` with tokens expanded (for example `rfc-{{date}}-{{slug}}`), else the title. Then `\ / : * ? " < > |` are replaced with `-`, whitespace is trimmed, and `.md` is stripped. If the name ends up empty, `untitled` is used. `createUniqueFile` never overwrites; it adds ` (1)`, ` (2)`, ….
- Then the note opens, the caret goes to `{{cursor}}`, and a toast confirms, as in the link flow.

### Template picker
- A `DialogModal` with a search `BareInput`, focused when it opens. The list is filtered with a case-insensitive substring match on the name. ↑/↓ move the highlight, Enter picks, Esc cancels, and clicking a row picks it.
- Rows are `Button variant="menu-item"`, showing the name with the template's folder path as faint detail.
- Mobile uses the same modal. Rows are at least 44 px high (`min-h-11`).

### AI chat: template skill
- **Activation:** the skill is on for a chat when any user message in the thread matches `/\btemplates?\b/i` or starts with `/template`. While it's on, the system prompt gets the skill instructions. These describe the token grammar, the frontmatter keys, and the output block format.
- **Output block format** (the model must use exactly this format; a 4-tilde fence lets the template itself contain ``` blocks):
  ````
  ~~~~hermes-template rfc.md
  ---
  target_folder: rfcs
  file_name: rfc-{{date}}-{{slug}}
  ---
  # {{title}}
  Owner: {{prompt:Owner}}
  {{cursor}}
  ~~~~
  ````
- **Save card:** each block in an assistant reply shows a card under the message. It has the target path (`<templates folder>/<name>.md`), any lint warnings, and a **Save template** button, labeled **Replace template** when the file already exists.
  - Only the click writes. Nothing is saved automatically.
  - If no templates folder exists, `templates/` is created.
  - On success the card shows "Saved" and a toast confirms. The registry picks the file up on the rescan that follows.
- **File name:** taken from the info string, base name only. Slashes and `..` are stripped, `.md` is added, and an empty name becomes `template.md`.
- **Lint warnings** (they never block saving): unknown `{{tokens}}`, an empty `{{prompt:}}` label, more than one `{{cursor}}`, and frontmatter keys other than `target_folder`/`file_name` that look misspelled (`target-folder`, `filename`).
- **Vault override:** if `.hermes/skills/create-template.md` exists, its body (after the frontmatter) replaces the built-in instructions. It's read fresh each time the skill turns on. The app never writes this file.
- **Without a vault** the card's button is disabled ("Open a vault to save").
- **Network:** nothing new. The skill only adds text to the existing opt-in `/api/ai` request.

### Backends and mobile
Every read and write goes through vault handles (`ensureVaultFolder`, `createUniqueFile`, `writeFileContent`, `resolveFileHandleAtPath`), so local, browser (OPFS) and GitHub vaults behave the same. GitHub vaults commit the new files through their existing sync. On mobile, the slash menu, palette command, pickers and AI chat use the same components. Missing links are clicked in Preview mode (a plain click) or through link pills.

## Design

### Pure modules — `app/utils/templates/` (new folder with `README.md`)
`template-tokens.ts`:
```ts
export const TEMPLATE_TOKENS = ["date","time","weekday","year","month","day","monthName","title","slug","clipboard","cursor"] as const;
export interface TemplateContext { now: Date; title: string; clipboard: string; prompts: Record<string, string>; }
export interface ExpandedTemplate { text: string; cursor: number | null; } // cursor = offset in text
export function slugify(title: string): string;
export function usesToken(body: string, token: (typeof TEMPLATE_TOKENS)[number]): boolean;
export function extractPromptLabels(body: string): string[];      // distinct, first-appearance order
export function expandTemplate(body: string, ctx: TemplateContext): ExpandedTemplate; // single regex pass
export function offsetToLineColumn(text: string, offset: number): { line: number; column: number }; // 1-based line
```
Regex: `/\{\{\s*(prompt:[^}]*|[A-Za-z]+)\s*\}\}/g`. Cursor: the first `{{cursor}}` becomes `"\0"` and the rest become `""`, then the offset is recorded and the `"\0"` removed.

`template-frontmatter.ts`:
```ts
export interface TemplateRouting { targetFolder?: string; fileName?: string; }
export function splitTemplate(raw: string): { routing: TemplateRouting; content: string }; // routing keys stripped; empty fm block dropped (uses FM_REGEX, parseFmFields, updateFmFields(..., { target_folder: null, file_name: null }))
export function templateBody(content: string): string; // content after the frontmatter block
```
Routing values are taken **before** expansion. They're expanded later with the same context.

`template-registry.ts`:
```ts
export const DEFAULT_TEMPLATE_FOLDERS = ["templates", "_templates", "Templates"] as const;
export interface TemplateEntry { name: string; path: string; }
export function resolveTemplatesFolder(setting: string | undefined, paths: string[]): { folder: string; exists: boolean };
export function listTemplates(folder: string, paths: string[]): TemplateEntry[];   // direct *.md children, sorted
export function isTemplatePath(path: string, folder: string): boolean;
export function matchTemplateForFolder(segment: string, templates: TemplateEntry[]): TemplateEntry | null;
export function sanitizeNoteName(name: string): string;                 // palette flow
export function parseMissingLink(link: string): { folder: string | null; baseName: string } | null; // null = invalid
```

`template-lint.ts` (Phase 4): `lintTemplate(raw: string): string[]`, plus `TEMPLATE_SYNTAX_GUIDE` (a Markdown string describing tokens and keys, built from `TEMPLATE_TOKENS`). The AI skill uses it, so the docs and the engine can't drift apart.

### Atoms — `app/atoms/template-atoms.ts` (new; `ui-atoms.ts` is 305 lines)
```ts
export const atom_templateFolderSettings = atomWithStorage<Record<string, string>>("hermes_template_folders", {}); // vaultKey → folder
export const atom_templatesFolder = atom((get) => resolveTemplatesFolder(settings[vaultKey], Object.keys(get(atom_fileMetadata))));
export const atom_templates = atom((get) => listTemplates(get(atom_templatesFolder).folder, Object.keys(get(atom_fileMetadata))));
export type TemplateDialogRequest =
  | { kind: "pick"; includeBlank: boolean; title: string; resolve: (value: TemplateEntry | "blank" | null) => void }
  | { kind: "prompts"; labels: string[]; confirmLabel: string; resolve: (value: Record<string, string> | null) => void };
export const atom_templateDialog = atom<TemplateDialogRequest | null>(null); // ephemeral
```
Re-export from `atoms.ts`. No atom duplicates the template list's content. Bodies are read on demand.

### Hooks
- `app/hooks/use-template-dialog.ts` provides `{ pickTemplate(opts), askPrompts(labels, confirmLabel) }`. Both are promise wrappers around `atom_templateDialog`, the same pattern as `useDialog`.
- `app/hooks/file-system/use-template-notes.ts` takes `{ openFile, scanVault, indexVaultTags }` and is exposed through `useFileSystem` the same way `useCreateItem` is (`use-file-crud.ts:21`). It provides:
  ```ts
  readTemplate(entry: TemplateEntry): Promise<string>;                      // fresh handle, disk text
  instantiate(raw: string, title: string, confirmLabel: string): Promise<{ routing: TemplateRouting; expanded: ExpandedTemplate } | null>; // prompts + clipboard + expand; null = cancelled
  createNoteFromMissingLink(link: string): Promise<void>;
  createNoteFromTemplate(): Promise<void>;
  writeNewNote(folder: string, baseName: string, expanded: ExpandedTemplate, { unique }: { unique: boolean }): Promise<void>; // ensure folder, write, rescan, open, caret
  ```
- `app/hooks/file-system/use-open-or-create-link.ts` provides `openOrCreateLink(name)`. It resolves the link the way `openFileByName` does: on a match it opens the file, otherwise it calls `createNoteFromMissingLink`. `PaneLeaf` passes it as `onWikiLinkClick`. `openFileByName` stays unchanged for any other callers.

### Components
- `app/components/TemplateDialog/TemplateDialogHost.tsx` is mounted next to `<GlobalDialog />` in `MainPage.tsx:75`. It renders `TemplatePicker` or `TemplatePromptForm` from `atom_templateDialog`. Both use `DialogModal`, `BareInput`/`Input` and `Button`, and only design tokens.
- `app/editor/components/ai-chat/TemplateSaveCard.tsx` is the save card.

**Alternative rejected:** listing every vault template directly in the CodeMirror slash completion (`/tpl-rfc`). The slash menu closes on a space, can't show prompts, and would grow with the vault. One **Template** entry plus a searchable picker keeps the menu short and reuses the picker the link flow needs anyway. For the AI skill, real tool calling would need changes to `/api/ai` for two providers. A fenced output block plus an explicit save card works with the existing text-only route.

## Phase 1: Template engine, registry, setting
- `app/utils/templates/template-tokens.ts`, `template-frontmatter.ts`, `template-registry.ts`, `README.md` — new; see Design.
- `app/atoms/template-atoms.ts` — new atoms. `app/atoms/atoms.ts` — re-export them. `app/atoms/README.md` — add a row.
- `app/editor/settings/sections/FilesSettings.tsx` — **Templates Folder** `SettingItem` after New Notes Folder (:47-60): `BareInput` with the same classes, placeholder `atom_templatesFolder.folder`, `normalizeFolderPath` on blur, rejects dot segments (inline `text-fg-muted` hint). Disabled when `atom_vaultKey` is null. Writes `atom_templateFolderSettings[vaultKey]`, and an empty value deletes the key.
- `app/atoms/task-atoms.ts:8,24` — `atom_allTasks` / `atom_visibleTasks` also skip `isTemplatePath(file.path, get(atom_templatesFolder).folder)`.
- `app/editor/components/home-feed/feed-model.ts:68` — `buildFeed` takes an optional `templatesFolder` and drops matching paths. Its caller (`use-home-feed.ts` or `HomeFeed`, wherever `buildFeed` is called) passes `atom_templatesFolder.folder`.

## Phase 2: Dialogs + slash `/template`
- `app/hooks/use-template-dialog.ts` and `app/components/TemplateDialog/` (`TemplateDialogHost.tsx`, `TemplatePicker.tsx`, `TemplatePromptForm.tsx`, an `.md` doc for each, `README.md`) — new. Mount in `app/components/MainPage.tsx:75`, and add the folder to `app/components/README.md`.
- `app/editor/components/constants.ts` — `export const VAULT_TEMPLATE_SENTINEL = "__OPEN_VAULT_TEMPLATE__"` and a `TEMPLATES` entry `{ label: "Template", icon: "📄", description: "Insert a template from your vault", content: VAULT_TEMPLATE_SENTINEL }` after Collapse (:168).
- `app/editor/codemirror/slash-menu.ts`:
  - `SlashMenuCallbacks.onInsertVaultTemplate?: () => void`.
  - In `applyTemplate` (:104), handle the sentinel like `AI_CHAT_SENTINEL` (:132): delete the trigger text, then call the callback.
  - Leave the entry out of `createSlashMenuSource` (:182) when the callback is missing. `AVAILABLE_TEMPLATES` (:26) currently filters only `aiOnly`, so add a `vaultOnly?: boolean` flag to the `Template` type, set it on the new entry, filter it out of `AVAILABLE_TEMPLATES`, and append it at :182-184 only when `onInsertVaultTemplate` is set (the same pattern as the `AI_CHAT_SENTINEL` entry). `fuzzyMatch` (:38) already matches both `tpl` and `template` against the label "Template".
  - Export `insertExpandedTemplate(view: EditorView, text: string, cursor: number | null)`. It replaces the main selection with **no** `SHORTCODES` pass, sets the caret, uses `userEvent: "input.replace.template"`, and calls `view.focus()`.
- `app/editor/hooks/use-codemirror-templates.ts` — new option `onInsertVaultTemplate`, wired into `slashMenuCallbacksRef` like `onOpenAIChat` (:105-113).
- `app/editor/hooks/use-vault-template-insert.ts` — new hook used by `MarkdownEditor`. It takes `viewRef` and `filePath` and returns the callback. The callback:
  1. Calls `pickTemplate({ includeBlank: false })`, then `readTemplate`.
  2. Gets `{{title}}` from `noteDisplayTitle(atom_fileMetadata[filePath])`, or `""` in the draft.
  3. Calls `instantiate(raw, title, "Insert")`.
  4. Inserts the full text if the doc is blank, else `templateBody`. It stops if `viewRef.current` is null or destroyed.

  `MarkdownEditor.tsx` (360 lines) only adds the hook call and passes it through. Keep the logic in the hook so the file stays under 400 lines.
- `readTemplate` / `instantiate` live in `use-template-notes.ts` (Phase 3 file). Create it in this phase with just these two functions.

## Phase 3: Missing-link creation + "New note from template…"
- `app/hooks/file-system/use-template-notes.ts` — add `writeNewNote`, `createNoteFromMissingLink`, `createNoteFromTemplate` (rules in Behavior). Reuse `ensureVaultFolder`, `createUniqueFile`, `withRetry`, `writeFileContent`, and `resolveFileHandleAtPath` for the "already exists" check (it throws `NotFoundError` when the file is missing). After writing: `scanVault(vaultHandle)`, `indexVaultTags()`, `openFile(handle, path, true)`, `set(atom_pendingScrollTarget, { path, ...offsetToLineColumn })` when the cursor is set, then `toast.success`. Errors → `toast.error("Failed to create file")`, plus the Google Drive `InvalidStateError` message from `use-create-item.ts:169`. If this file passes ~250 lines, split it into `use-template-notes.ts` (read/instantiate) and `use-template-create.ts` (link/palette flows).
- `app/hooks/file-system/use-file-crud.ts` / `use-file-system.ts` — expose `createNoteFromMissingLink`, `createNoteFromTemplate` and `readTemplate`/`instantiate`, the same way `createWikiLinkFile` is exposed (`use-file-crud.ts:21,55`).
- `app/hooks/file-system/use-open-or-create-link.ts` — new; see Design.
- `app/editor/components/PaneLeaf.tsx:51,254` — switch from `openFileByName` to `openOrCreateLink`.
- `app/editor/components/editor-commands/document-vault-commands.ts:47-56` — add `{ id: "new-note-from-template", label: "New note from template…", keywords: "create template note", action: () => { void createNoteFromTemplate(); } }` when `vaultHandle` is set. `use-editor-command-context.ts:90,155` — pass `createNoteFromTemplate` through.

## Phase 4: AI chat template skill
- `app/utils/templates/template-lint.ts` — `lintTemplate`, `TEMPLATE_SYNTAX_GUIDE`.
- `app/editor/components/ai-chat/chat-skills.ts` — new file:
  ```ts
  export interface ChatSkill { id: "create-template"; trigger: RegExp; builtin: string; overridePath: string; }
  export const TEMPLATE_SKILL: ChatSkill; // overridePath ".hermes/skills/create-template.md"; builtin embeds TEMPLATE_SYNTAX_GUIDE + block format
  export function isSkillActive(skill: ChatSkill, userTexts: string[]): boolean;
  export function loadSkillInstructions(skill: ChatSkill, vaultHandle: FileSystemDirectoryHandle | null): Promise<string>; // override body or builtin; read errors → builtin
  export interface TemplateBlock { fileName: string; content: string; }
  export function parseTemplateBlocks(reply: string): TemplateBlock[]; // ~~~~hermes-template <name> … ~~~~
  ```
- `app/editor/components/ai-chat/chat-helpers.ts:131` — `buildChatSystemPrompt(documentContent, selectedText, currentFilePath?, skillInstructions: string[] = [])`. Append each one as `\n--- SKILL ---\n…\n--- END SKILL ---`.
- `app/editor/components/ai-chat/use-chat-skills.ts` — new hook returning:
  - `skillInstructionsFor(messages)`, called in `send` before `callAIChat`.
  - `saveTemplate(block)`. It resolves the folder from `atom_templatesFolder` (`ensureVaultFolder`) and writes `<name>.md` with `writeFileContent` (overwrites only on this explicit click). Then it rescans and shows a toast.
  - `templateExists(name)`, from `atom_templates`.
- `app/editor/components/AIChatDialog.tsx` — use `use-chat-skills`, pass the skill text into `buildSystemPrompt` (:94-97), and give each assistant `ChatMessageItem` its `templateBlocks` and `onSaveTemplate`. Keep the additions to about 15 lines. The file must stay under 400.
- `app/editor/components/ai-chat/ChatMessageItem.tsx` — optional props `templateBlocks?: TemplateBlock[]`, `templatesFolder?: string`, `templateExists?: (name) => boolean`, and `onSaveTemplate?: (block) => Promise<boolean>`. Render a `TemplateSaveCard` per block under the actions row (:83).
- `app/editor/components/ai-chat/TemplateSaveCard.tsx` — new: path, warnings (`text-fg-muted`), and a `Button variant="secondary"` with "Save template" or "Replace template", which becomes "Saved" afterwards. Disabled with no vault.

## Tests
All tests are Vitest with `useFileSystem`, `next/navigation` `useRouter`, `navigator.clipboard`, `callAIChat` and file handles mocked, and Jotai wrapped in `<Provider>` or a fresh store.

**Phase 1**
- `app/utils/templates/template-tokens.test.ts`:
  - Every temporal token at a fixed `now` (zero-padding, English names).
  - `{{ date }}` with spaces.
  - Unknown tokens are kept.
  - Single pass: a prompt answer or clipboard text containing `{{date}}` stays literal.
  - Cursor: the first one sets the offset and the others are removed. No cursor gives `null`.
  - `slugify` handles accents, punctuation runs, empty input and `C++ & Go`.
  - `extractPromptLabels` returns labels distinct and in order, trims them, and keeps case.
  - `offsetToLineColumn`.
- `template-frontmatter.test.ts`:
  - Routing keys are taken out.
  - Other keys are kept.
  - An empty block is dropped.
  - Templates without frontmatter pass through.
  - `templateBody`.
- `template-registry.test.ts`:
  - The setting wins.
  - Default order is `templates` > `_templates` > `Templates`.
  - A missing folder gives `exists: false`.
  - Only direct `.md` children are listed, sorted.
  - `isTemplatePath`.
  - `matchTemplateForFolder`: `rfcs`↔`rfc`, `rfc`↔`rfcs`, an exact match wins, no match.
  - `parseMissingLink`: alias, `#heading`, `.md`, folderless, `../` normalized, invalid characters, empty input.
  - `sanitizeNoteName`.
- `app/atoms/task-atoms.test.ts` — tasks under the templates folder are excluded from `atom_allTasks` / `atom_visibleTasks`.
- `feed-model.test.ts` — template paths are excluded.
- `FilesSettings` test (new, or extend an existing one): saves per vault key, normalizes on blur, rejects dot folders.

**Phase 2**
- `TemplatePicker.test.tsx`:
  - Filtering, ↑/↓ + Enter picks, Esc resolves `null`, a click picks.
  - The Blank note row appears only when `includeBlank` is set.
  - The empty state.
- `TemplatePromptForm.test.tsx`: one field per label, Enter submits all values, Cancel/Esc resolves `null`.
- `slash-menu.test.ts`:
  - `/tpl` and `/template` offer **Template** only when `onInsertVaultTemplate` is set.
  - Applying it removes the trigger and calls the callback.
  - `insertExpandedTemplate` doesn't run SHORTCODES (`{{date}}` already expanded; a literal `{date}` in the text stays), places the caret and is one undo step.
- `use-vault-template-insert.test.ts`:
  - A blank doc gets the frontmatter.
  - A non-blank doc gets the body only.
  - Cancel in the picker or prompts inserts nothing.
  - An unmounted view inserts nothing.

**Phase 3**
- `use-template-notes.test.ts` (mocked handles, `openFile`, `scanVault`, dialogs):
  - A folder match asks for confirmation, then creates `rfcs/auth-spec.md` with the template body, ignores `target_folder`/`file_name`, opens the note and sets the scroll target at the cursor.
  - Declining the confirm writes nothing.
  - No match shows the picker with Blank: picking Blank writes `"\n"`, Esc writes nothing.
  - No templates means a picker with only Blank.
  - A folderless link uses `atom_newNoteFolder`.
  - An existing file on disk is opened without being written.
  - An invalid name shows a toast and writes nothing.
  - Cancelled prompts write nothing.
  - "New note from template": `target_folder` + `file_name` tokens give `docs/rfcs/rfc-2026-10-04-auth-spec.md`. Without them the note goes to `atom_newNoteFolder`/title. A name collision gives ` (1)`. An empty title cancels.
- `use-open-or-create-link.test.ts`: a resolved link opens the file, an unresolved one calls the create flow.
- `build-editor-commands.test.ts`: "New note from template…" is listed only with a vault.

**Phase 4**
- `template-lint.test.ts` covers each warning, and a clean template gives `[]`.
- `chat-skills.test.ts`:
  - Activation regex.
  - Block parsing: several blocks, a 4-tilde fence containing ``` blocks, name sanitizing (`../x`, `a/b.md`, empty).
  - The override file wins; a read error falls back to the built-in text.
- `chat-helpers.test.ts`: skill text is appended only when given.
- `ChatMessageItem.test.tsx`:
  - The card renders for a block.
  - "Replace template" shows when the file exists.
  - A click calls `onSaveTemplate`, which then shows "Saved".
  - The button is disabled without a vault.
- An `AIChatDialog` test (new, mocking `callAIChat`) checks that the system prompt includes the skill only after a "template" message.

## Docs
- New: `app/utils/templates/README.md`; `app/components/TemplateDialog/README.md` plus `TemplateDialogHost.md`, `TemplatePicker.md` and `TemplatePromptForm.md`; `ai-chat/TemplateSaveCard.md`.
- Update:
  - `app/atoms/README.md` (template-atoms row)
  - `app/components/README.md`
  - `app/hooks/README.md` / `app/hooks/file-system/README.md` (if present)
  - `app/editor/components/ai-chat/README.md` (chat-skills, use-chat-skills, TemplateSaveCard)
  - `AIChatDialog.md` (Skills section, no new network)
  - `ChatMessageItem.md`, `MarkdownEditor.md`, `PaneLeaf.md` (link click creates notes)
  - `app/editor/components/editor-commands/README.md`
  - `ARCHITECTURE.md`: one line under the CodeMirror and views runtime components.
- In-app docs:
  - `app/documentation/content/editor-writing.tsx`: a **Templates** section covering the folder, the token table, prompts, `/template`, missing links and the palette command.
  - `ai-features.tsx`: the template skill and the `.hermes/skills/create-template.md` override.
  - `settings-mobile.tsx`: the Templates Folder setting.

## Acceptance criteria
- [ ] With `templates/rfc.md` in the vault and no setting, the registry lists `rfc`. Setting Templates Folder to `_tpl` switches the list, and the setting is kept per vault.
- [ ] Adding, renaming or deleting a template file is reflected in the picker after the next rescan, with no reload. Editing a template applies on its next use, even before a rescan.
- [ ] Template files' tasks don't appear on the Tasks page or in the palette `!` scope. Template files don't appear in the home feed. They do appear in the Explorer and palette file search.
- [ ] `/tpl` → Template → pick `rfc` → prompts → the expanded body is inserted at the caret as one undo step, with the caret at `{{cursor}}`. `{{date}}` becomes `2026-10-04`, not `{2026-10-04}`.
- [ ] In an empty note, `/template` inserts the template's non-routing frontmatter. In a non-empty note, it inserts the body only.
- [ ] Ctrl/Cmd+click on missing `[[rfcs/auth-spec]]` with `templates/rfc.md` shows "Create rfcs/auth-spec from template rfc?". Enter creates `rfcs/auth-spec.md` (the folder too) and opens it with the caret at `{{cursor}}`, and the link now resolves. Esc writes nothing.
- [ ] A missing link with no matching template opens the picker with Blank note first. A vault without templates offers only Blank note. `[[idea]]` is created in the New Notes Folder.
- [ ] Created notes never contain `target_folder` / `file_name`, and the link text in the source note is never changed.
- [ ] A missing link whose file exists on disk but isn't indexed yet opens the existing file without changing it.
- [ ] Palette "New note from template…" with `target_folder: docs/rfcs` and `file_name: rfc-{{date}}-{{slug}}`, titled "Auth Spec", creates `docs/rfcs/rfc-<today>-auth-spec.md`. A second run creates `… (1).md`.
- [ ] `{{prompt:Owner}}` used twice gives one field, and both places get the answer. Cancelling the form writes or inserts nothing.
- [ ] `{{clipboard}}` inserts the clipboard text, or `""` when the read is denied. The clipboard isn't read for templates that don't use the token.
- [ ] AI chat: "make me an RFC template that asks for an owner" → the reply shows a save card for `templates/rfc.md`. **Save template** writes it, it appears in `/template`, and an existing file shows **Replace template**. Nothing is written without the click.
- [ ] `.hermes/skills/create-template.md`, when present, replaces the built-in skill instructions.
- [ ] The behavior is the same on a local folder, a browser vault and a GitHub vault, and on mobile (Preview tap and pills for links, palette, slash menu).
- [ ] No raw `<button>`/`<input>` and no hard-coded colors in new UI. Every touched source file stays under 400 lines.
- [ ] No new network calls.

## Decisions
- **Q1 (human):** the Journal / Today trigger is removed from this plan entirely. No Cmd/Ctrl+Shift+D, no `journal/` convention and no default-template setting.
- **Q2 (human, option a):** for missing links, **the link decides** where the note goes. It's created at the link's own path (vault-root relative) and the template supplies only the body. `target_folder` / `file_name` apply only to the new palette command **"New note from template…"**, which asks for a title. Routing for links: folder match (FR-4 rule 2), else the quick-select (rule 3). FR-4 rule 1 only places notes created without a link.
- **Q3 (human, recommended):** clicking a missing link always confirms before writing.
  - A folder match shows a one-line confirm (Enter/Esc).
  - Otherwise the quick-select shows Blank note first, then the templates. With no templates it shows only Blank note.
  - Esc writes nothing.
  - A folderless `[[name]]` goes to `atom_newNoteFolder`.
- Templates folder: a per-vault setting (`hermes_template_folders` keyed by `atom_vaultKey`). When empty, the default order applies. Dot folders aren't allowed because they aren't indexed by default.
- Only direct children of the templates folder count. Subfolders would make the name match for links ambiguous.
- Token formats: listed in the token table. Local time and English names, so the output doesn't depend on the browser locale (the same choice `SHORTCODES` makes).
- Expansion is one pass, so inserted text is never expanded again. Unknown tokens stay literal. There's no escape syntax (deferred).
- Routing keys are removed from created notes, and an empty frontmatter block is dropped. Inline inserts into non-empty notes leave out the template's frontmatter, because a second `---` block mid-note would be wrong.
- A missing-link path is relative to the vault root, not the linking note's folder. That's the resolver's first lookup, so the link resolves straight away.
- Template files are left out of Tasks and the home feed, but stay openable everywhere else.
- `{{cursor}}` caret placement reuses `atom_pendingScrollTarget`. It also flashes the line briefly; that's acceptable and avoids a new mechanism.
- AI skill:
  - No tool calling. The model emits a fenced `~~~~hermes-template` block, and the user saves it from a card. This works with the existing text-only `/api/ai` route for both providers.
  - The skill turns on by keyword, so normal chats don't pay for the extra prompt text.
  - The built-in instructions are generated from `TEMPLATE_SYNTAX_GUIDE`, so they can't drift from the engine.
  - An optional plain-file override lives at `.hermes/skills/create-template.md`. It's hidden from the Explorer by default and GitHub vaults already import it.
  - Save overwrites an existing template only from the explicit **Replace template** click. The card doesn't open a stacked confirm modal over the chat.

## Out of scope / Deferred
- Journal / Today note, Cmd/Ctrl+Shift+D, a default-template setting.
- Scripting, conditionals or loops in templates. Token types beyond the brief's list. Escaping `{{…}}`.
- Templates in subfolders of the templates folder. Templates in dot folders.
- Rewriting link text. Applying `target_folder`/`file_name` to link-created notes.
- Changing `WikiLinkDialog`'s "create" option (`MarkdownEditor.tsx:334` → `createWikiLinkFile`). It keeps creating a blank note through its folder picker.
- Leaving template files out of link resolution, so `[[meeting]]` can still resolve to `templates/meeting.md` by basename.
- A general multi-skill framework or a skills UI. Only the template skill ships. The AI writing any file other than a template.
- Template syncing or a marketplace.

## Open questions
- Should `resolveFileMetaByName`'s basename fallback skip the templates folder, so `[[meeting]]` never opens `templates/meeting.md`? This plan leaves resolution unchanged. It would be a small follow-up.
- Should a click on a missing link create the note relative to the linking note's folder (the resolver's second lookup) instead of the vault root? This plan uses the vault root.
