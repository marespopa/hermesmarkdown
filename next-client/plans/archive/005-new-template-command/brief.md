---
state: merged
blocked_from: 
rejections: 1
created: 2026-10-04T07:28:55Z
---

# New template command

## Problem
Plan 004 (vault-native templates) gives two ways to make a template: ask the AI chat, or hand-create a `.md` file in the templates folder. There is no direct in-app way to start a new template, so users must know the folder name and the token syntax by heart.

Depends on plan 004-vault-templates (template engine, registry, templates-folder setting, `use-template-notes` / `use-template-create`). Build on top of it; don't duplicate it.

## Desired behavior
- A palette command **"New template…"** (keywords like "create template", "add template"), available when a vault is open.
- It asks for a template name, then creates `<templates folder>/<name>.md` and opens it in the editor.
  - Templates folder = the one resolved by plan 004 (setting, else first of `templates/`, `_templates/`, `Templates/`); create `templates/` if none exists.
  - Name sanitised like the AI chat skill's file names (base name only, strip slashes and `..`, add `.md`).
  - If the file already exists, open the existing one instead of overwriting (no prompt).
- The new file starts with a short starter body that shows the syntax, e.g. commented-out optional `target_folder` / `file_name` frontmatter, `# {{title}}`, a `{{date}}` line, one `{{prompt:...}}` example and `{{cursor}}`. Keep it minimal and plain-Markdown readable in other editors.
- The registry picks the new template up without a reload (same rescan path as other in-app creates).
- Works on mobile through the palette; no new chrome, buttons or sidebar entries.

## Out of scope
- "Save current note as template".
- A template gallery or built-in template library.
- Editing the starter body in Settings.
