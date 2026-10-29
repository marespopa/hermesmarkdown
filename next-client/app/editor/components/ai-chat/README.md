# ai-chat

Shared AI building blocks, used by the [AI companion](../companion/README.md).

| File | Purpose |
|---|---|
| `chat-helpers.ts` | Model fallbacks, attachment limits and `readAttachments`, attachment/mention types, @mention index building and resolution (`describeFile` — path, title, tags, and for non-private notes aliases and description — `buildIndex`, `resolveMentionRefs`, `readVaultFile`). |
| `chat-skills.ts` | The built-in chat skills, in the app only (`CHAT_SKILLS`: `TEMPLATE_SKILL`, `TASKS_SKILL`, `CODE_SKILL`, each with its `builtin` instructions, the template one built from `TEMPLATE_SYNTAX_GUIDE`, and a one-line `description` for the companion's skill list), `skillCommand(name)` (`"tasks"` → `/tasks`) and `startsWithCommand(text, command)` (the command as a word: `/template`, `/tasks`, `/code`). No keyword triggers: the companion loads a skill itself (`load_skill`) or a message's `/command` carries it. The template skill has the companion save through `create_template`; the code skill has it read before editing and use `edit_file` / `edit_code_block`. |
| `user-skills.ts` | Vault skill discovery, slash commands, normalized allowlisted bindings, validation warnings and fresh instruction reads. Built-in and companion commands take precedence. |
| `skill-frontmatter.ts` | Parses and serializes declarative skill metadata; preserves unrelated frontmatter, normalizes fixed tool/check bindings and never evaluates the Markdown body. |
| `use-skill-wizard.ts`, [SkillWizard](SkillWizard.md) | Create/edit state, validation and saves through companion write-through and file-creation paths; a disk change while open blocks saving rather than being overwritten. |
| `skill-context.ts` | The data the tasks skill sends, pure: `openTasksBlock` (open tasks as task lines with their note, in progress then by due date then priority, capped at 150, private notes' tasks counted), `todayLine`. |
| `chat-tool-runners.ts` | The pure half of the chat tools: `CHAT_TOOL_NAMES`, `searchablePaths` (not private, not templates), `noteDescription` (frontmatter `description`, one line, capped at 160 characters), `searchNotesOutput` (name / title / alias / tag matches, then description matches, then content-index hits; each line ends with the note's description), `readNoteOutput` (capped at 20,000 characters; private notes refused), `taskFilter` (list_open_tasks' views, tag and text), `toolActivity` (the thread's activity line). |
| `use-note-tools.ts` | `useNoteTools()` → `runTool({ toolName, input })`: runs a note tool against the open vault and answers `{ output, activity }`. Reads through `useNoteBuffer` and searches with `searchNoteContent`; no tool writes. Shared by the companion and WebMCP (`hooks/use-webmcp-tools.ts`); the definitions are `services/note-tool-defs.ts`. |
| `use-chat-skills.ts` | `skillList()` (built-in skills, then skill notes, as `SkillListing`s for the system prompt), `loadSkill(name)` (a built-in skill's instructions plus its data, the open tasks from `atom_fileMetadata` for the tasks skill, or a skill note read fresh; null for no such skill; the companion's `load_skill` tool) and `commandSkill(text)` (the skill a message's `/command` names, with its text). |
| [auto-model](auto-model.md) | Auto, the default model choice: `pickTier`, `scoreTask`, `resolveAutoModel`. |
| `use-chat-models.ts` | Model picker state; loads the provider's model list on first open (shared atoms with Settings). |
| `use-chat-mentions.ts` | `@query` detection, vault / folder / note options, and selection that inserts the label and loads its content. |
| [MentionMenu](MentionMenu.md) | The @mention dropdown above the input. |
| [ChatContextChips](ChatContextChips.md) | One row of removable context chips: the note, the selection, @mention references, attachments. |
