# ai-chat

Building blocks of [`AIChatDialog`](../AIChatDialog.md).

| File | Purpose |
|---|---|
| `chat-helpers.ts` | Model fallbacks, attachment limits and `readAttachments`, message/attachment/mention types, @mention index building and resolution (`describeFile` — path, title, tags, and for non-private notes aliases and description — `buildIndex`, `resolveMentionRefs`, `readVaultFile`), the system prompt (includes the HermesMarkdown syntax guide and the table-formula guide) and `buildChatSystemPrompt` (adds the active file, selection and any active skill's instructions as `--- SKILL ---` blocks), and `buildApiContent`. |
| `chat-skills.ts` | Chat skills (`CHAT_SKILLS`: `TEMPLATE_SKILL`, `TASKS_SKILL`): activation (`isSkillActive`: a user message matching the skill's `trigger`, or starting with its `command`: `/template`, `/tasks`), `loadSkillInstructions` (the vault override `.hermesmarkdown/skills/<id>.md`, body after frontmatter, read fresh; else the built-in text, the template one built from `TEMPLATE_SYNTAX_GUIDE`), `loadSkillInstructions` (the vault override `.hermesmarkdown/skills/create-template.md`, body after frontmatter, read fresh; else the built-in text built from `TEMPLATE_SYNTAX_GUIDE`), and `parseTemplateBlocks` (`~~~~hermes-template <name>` … `~~~~` blocks; names sanitized to a base `.md` name by `sanitizeTemplateFileName` from `app/utils/templates/template-registry.ts`). |
| `skill-context.ts` | The data the tasks skill sends, pure: `openTasksBlock` (open tasks as task lines with their note, in progress then by due date then priority, capped at 150, private notes' tasks counted), `todayLine`. |
| `chat-tool-runners.ts` | The pure half of the chat tools: `CHAT_TOOL_NAMES`, `searchablePaths` (not private, not templates), `noteDescription` (frontmatter `description`, one line, capped at 160 characters), `searchNotesOutput` (name / title / alias / tag matches, then description matches, then content-index hits; each line ends with the note's description), `readNoteOutput` (capped at 20,000 characters; private notes refused), `taskFilter` (list_open_tasks' views, tag and text), `toolActivity` (the thread's activity line). |
| `use-chat-tools.ts` | `converse(system, messages, onActivity)`: the tool loop (`callAIChatTurn`, run each call, send `tool` results, at most `MAX_TOOL_ROUNDS`); `available` (a vault is open). Reads through `useNoteBuffer` and searches with `searchNoteContent`; no tool writes. |
| `use-chat-skills.ts` | `skillInstructionsFor(messages)` (each active skill's instructions plus its data: the open tasks from `atom_fileMetadata` for the tasks skill), `saveTemplate(block)` (writes `templates/<name>.md`, creating `templates/` if needed, overwriting only on this explicit click; rescans and toasts), `templateExists(name)`, `templatesFolder`, `hasVault`. |
| [TemplateSaveCard](TemplateSaveCard.md) | Card under a reply per template block: path, lint warnings, Save / Replace template. |
| `use-chat-models.ts` | Model picker state; loads the provider's model list on first open (shared atoms with Settings). |
| `use-chat-mentions.ts` | `@query` detection, vault / folder / note options, and selection that inserts the label and loads its content. |
| [ChatMessageItem](ChatMessageItem.md) | One chat turn; assistant replies can be edited, copied as Markdown, and applied, and show a save card per template block. Exports `ApplyMode`. |
| [MentionMenu](MentionMenu.md) | The @mention dropdown above the input. |
| [ChatContextChips](ChatContextChips.md) | Removable chips for attachments and loaded @mention references. |
