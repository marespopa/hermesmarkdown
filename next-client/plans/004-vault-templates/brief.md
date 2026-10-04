---
state: approved
blocked_from: 
rejections: 1
created: 2026-10-04T06:43:54Z
---

# Vault-Native Template Engine

## Problem
Markdown/PKM editors make users write JavaScript, JSON schemas or install plugins to get note templates. That setup friction breaks a calm workflow and ties templates to app-specific config instead of plain files. HermesMarkdown should offer templates with zero config, stored as ordinary `.md` files in the vault.

Source: product PRD "Vault-Native Template Engine" (approved, 2026-10-03, Mares Popa).

## Desired behavior

### FR-1 Template discovery
- Scan a templates root folder set in vault settings; default to the first of `templates/`, `_templates/`, `Templates/` that exists.
- Every `.md` file in that folder is a registered template.
- Hot reload: adding, editing or deleting a template updates app state live (file-system events or directory polling).

### FR-2 Token expansion (synchronous, at instantiation)
- Temporal: `{{date}}`, `{{time}}`, `{{weekday}}`, `{{year}}`, `{{month}}`, `{{day}}`, `{{monthName}}`
- Context: `{{title}}` (target note title/H1), `{{slug}}` (URL-safe kebab-case from title)
- Workflow: `{{clipboard}}` (current system clipboard text), `{{cursor}}` (caret position after the note opens; the marker is stripped from the text)

### FR-3 Interactive prompts `{{prompt:Label}}`
- If the template contains one or more `{{prompt:...}}` tokens, creation pauses and opens one keyboard-navigable modal with a field per distinct label.
- Submitting replaces every occurrence of each `{{prompt:Label}}` with the entered text before writing the file.

### FR-4 Routing and naming (priority order)
1. Frontmatter in the template: `target_folder` (relative path, parents auto-created) and `file_name` (token-aware, e.g. `rfc-{{date}}-{{slug}}`).
2. Implicit folder match: opening a non-existent wikilink with a folder prefix (`[[rfcs/auth-spec]]`) matches `rfcs/` against template names (`templates/rfc.md` or `templates/rfcs.md`).
3. Fallback: a quick-select modal listing all templates.

### Invocation triggers
1. ~~Journal (Cmd+Shift+D)~~ — removed from this plan by the user (2026-10-04).
2. **Wikilink creation:** clicking/confirming a non-existent `[[link]]` runs the routing rules above to pick and instantiate a template.
3. **Slash command `/template` or `/tpl`:** inline search palette; inserts the chosen template body at the cursor.

### Constraints
- Templates stay plain Markdown on disk — no proprietary wrappers or hidden databases.
- Reads/writes go through the existing vault file layer (File System Access API `FileSystemDirectoryHandle`, plus whatever other backends the app already supports).
- Templates must stay readable/editable in plain text editors, Obsidian and VS Code. Template frontmatter keys (`target_folder`, `file_name`) should not leak into instantiated notes unless the architect decides otherwise.
- Must fit the minimalistic single-sheet worklog direction (no new chrome beyond the modals/palette needed).

### AI chat skill (added by the user, 2026-10-04)
- The AI chat (`AIChatDialog`) must be able to use a **skill** to create templates: the user asks the chat for a template (e.g. "make me an RFC template that asks for an owner"), and the chat produces a valid template file — correct tokens (`{{date}}`, `{{prompt:Label}}`, `{{cursor}}`, …) and optional `target_folder` / `file_name` frontmatter — saved into the templates folder, where hot reload picks it up.
- The chat currently has no skill/tool mechanism (text replies + "apply" only; system prompt in `ai-chat/chat-helpers.ts`). The architect designs the minimal skill mechanism needed, preferably vault-native (a plain `.md` skill file, e.g. under `.hermes/` or an underscore-prefixed folder) consistent with the "plain files, no hidden databases" constraint. Writing a file must be explicit/confirmed by the user, not silent.

## Out of scope
- Scripting/JavaScript in templates, conditionals or loops.
- Templates syncing or a template marketplace.
- Token types beyond those listed above.
- Journal / Today note and the Cmd+Shift+D trigger.
