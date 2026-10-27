---
state: merged
size: small
kind: feature
blocked_from: 
rejections: 0
created: 2026-10-27T10:56:20Z
---

# Ship a built-in example folder template, offered (not auto-installed) on

## Desired behavior
Ship a built-in example folder template, offered (not auto-installed) on the Templates page like the built-in packs. Add a "Project folder" card in the Template packs section (or a small "Folder templates" section right after it, reusing BuiltinPackCard's look: name, description, list of the files it makes, Add to vault / Adding… / Added). Add to vault writes _templates/Project/ into the vault, never replacing files that already exist (same rules as addBuiltinPack); Added when every file is there. Contents (all bodies raw, never expanded on write): README.md with frontmatter `scaffold: true` and a heading `# {{prompt:Project name}}` plus Goal / Scope / Milestones sections; Tasks.md with a few unchecked tasks; Decisions.md with a dated entry using {{date}}; Meetings/Kickoff.md with Agenda / Decisions / Action items. Using it creates a folder named from the Project name prompt (the template folder name or its README must make the created folder be named {{prompt:Project name}}, following whatever naming rule folder-template.ts already uses for the top folder). Define the content next to BUILTIN_PACKS in app/utils/templates (keep files under 400 lines; a new template-folders.ts is fine). Sample data uses products/tasks only, no person names. Optimistic UI as for packs. Tests for the card state and the write (no overwrite). Update the Templates page doc, utils/templates README and the user docs that describe folder templates if any. Out of scope: auto-installing into vaults, daily logs or dated-note generators.

## Out of scope
Anything the request doesn't ask for.
