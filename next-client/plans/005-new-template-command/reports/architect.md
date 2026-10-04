# 005 New template command — architect report

## Run 1

**PRD:** `next-client/plans/005-new-template-command/prd.md`

**Summary** (1 phase):
- A palette command, "New template…" (Vault). It's listed only with a vault open, and mobile reaches it through the same palette. It prompts for a name and creates `<templates folder>/<name>.md` with a short starter body, then opens it. If a template with that name already exists (case-insensitive registry match, or found on disk), it opens that file instead and writes nothing.
- `sanitizeTemplateFileName` moves from `ai-chat/chat-skills.ts` to `utils/templates/template-registry.ts`, so AI chat and the palette command share it. It now also strips leading dots, so a name can't become an unindexed dot-file.
- New `template-starter.ts` (`TEMPLATE_STARTER`). It is written raw, with `target_folder` / `file_name` commented out as YAML `#` lines.
- `splitTemplate` now drops column-0 `#` comment lines from template frontmatter, so the starter's comment-only block never ends up in created notes.
- `useTemplateCreate.createTemplate()` reuses `writeNewNote(..., { unique: false })`, which already creates the folder, writes, rescans, opens, and keeps an existing file. The rescan means the registry picks up the new template without a reload.

**Already exists** (plan 004, in the working tree): templates-folder resolution and the registry atoms, `writeNewNote`'s create-or-open-existing path and rescan, the AI chat file-name sanitiser, `dialog.prompt`, and the palette wiring pattern ("New note from template…").

**Decisions to look at:**
- Commented-out frontmatter needs a small engine change: YAML `#` comment lines are dropped from template frontmatter when a template is used.
- Leading dots are stripped in the shared sanitiser, which also changes the AI save card for dot-prefixed names.
- An empty name cancels. A name that sanitises to nothing becomes `template.md`.
- The existing-template check is case-insensitive.
- The toast for an existing file reads "Opened existing template: <path>".
- Open question: the starter's `{{prompt:Owner}}` makes an unedited starter ask for an Owner every time it's used. It's kept because the brief asks for a prompt example.

**Handoff:** "Implement next-client/plans/005-new-template-command/prd.md, phase 1"
