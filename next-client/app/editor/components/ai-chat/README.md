# ai-chat

Shared AI building blocks, used by the [AI companion](../companion/README.md).

| File | Purpose |
|---|---|
| `chat-helpers.ts` | Model fallbacks, attachment limits and `readAttachments`, attachment/mention types, @mention index building and resolution (`describeFile` — path, title, tags, and for non-private notes aliases and description — `buildIndex`, `resolveMentionRefs`, `readVaultFile`). |
| `chat-skills.ts` | The built-in chat skills, in the app only (`CHAT_SKILLS`: `TEMPLATE_SKILL`, `TASKS_SKILL`, each with its `builtin` instructions, the template one built from `TEMPLATE_SYNTAX_GUIDE`): activation (`isSkillActive`: a user message matching the skill's `trigger`, or starting with its `command`: `/template`, `/tasks`). The template skill has the companion save through `create_template`. |
| `user-skills.ts` | The user's own skills, notes of type `skill` (`noteTypeOf`: `type: skill` or `#type/skill`) anywhere in the vault: `skillCommandFor(path)` (`/` + the file name, lowercased, spaces as hyphens), `userSkillsFrom(metadata, takenCommands)` (built-in commands win), `isUserSkillActive` (a message starting with the command as a word), `readUserSkill(vault, path)` (the text after the frontmatter, read fresh; null when empty or gone). Read only: the app never writes them. |
| `skill-context.ts` | The data the tasks skill sends, pure: `openTasksBlock` (open tasks as task lines with their note, in progress then by due date then priority, capped at 150, private notes' tasks counted), `todayLine`. |
| `chat-tool-runners.ts` | The pure half of the chat tools: `CHAT_TOOL_NAMES`, `searchablePaths` (not private, not templates), `noteDescription` (frontmatter `description`, one line, capped at 160 characters), `searchNotesOutput` (name / title / alias / tag matches, then description matches, then content-index hits; each line ends with the note's description), `readNoteOutput` (capped at 20,000 characters; private notes refused), `taskFilter` (list_open_tasks' views, tag and text), `toolActivity` (the thread's activity line). |
| `use-note-tools.ts` | `useNoteTools()` → `runTool({ toolName, input })`: runs a note tool against the open vault and answers `{ output, activity }`. Reads through `useNoteBuffer` and searches with `searchNoteContent`; no tool writes. Shared by the companion and WebMCP (`hooks/use-webmcp-tools.ts`); the definitions are `services/note-tool-defs.ts`. |
| `use-chat-skills.ts` | `skillInstructionsFor(userTexts)`: each active built-in skill's instructions plus its data (the open tasks from `atom_fileMetadata` for the tasks skill), then each skill note turned on by its `/command` (`user-skills.ts`). |
| `use-chat-models.ts` | Model picker state; loads the provider's model list on first open (shared atoms with Settings). |
| `use-chat-mentions.ts` | `@query` detection, vault / folder / note options, and selection that inserts the label and loads its content. |
| [MentionMenu](MentionMenu.md) | The @mention dropdown above the input. |
| [ChatContextChips](ChatContextChips.md) | One row of removable context chips: the note, the selection, @mention references, attachments. |
