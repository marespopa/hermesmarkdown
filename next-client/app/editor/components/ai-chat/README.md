# ai-chat

Building blocks of [`AIChatDialog`](../AIChatDialog.md).

| File | Purpose |
|---|---|
| `chat-helpers.ts` | Model fallbacks, attachment limits and `readAttachments`, message/attachment/mention types, @mention index building and resolution (`buildIndex`, `resolveMentionRefs`, `readVaultFile`), the system prompt (includes the HermesMarkdown syntax guide and the table-formula guide) and `buildChatSystemPrompt` (adds the active file, selection and any active skill's instructions as `--- SKILL ---` blocks), and `buildApiContent`. |
| `chat-skills.ts` | Chat skills (`CHAT_SKILLS`: `TEMPLATE_SKILL`, `WEEKLY_REVIEW_SKILL`, `TASKS_SKILL`): activation (`isSkillActive`: a user message matching the skill's `trigger`, or starting with its `command`: `/template`, `/review`, `/tasks`), `loadSkillInstructions` (the vault override `.hermes/skills/<id>.md`, body after frontmatter, read fresh; else the built-in text, the template one built from `TEMPLATE_SYNTAX_GUIDE`), `loadSkillInstructions` (the vault override `.hermes/skills/create-template.md`, body after frontmatter, read fresh; else the built-in text built from `TEMPLATE_SYNTAX_GUIDE`), and `parseTemplateBlocks` (`~~~~hermes-template <name>` … `~~~~` blocks; names sanitized to a base `.md` name by `sanitizeTemplateFileName` from `app/utils/templates/template-registry.ts`). |
| `skill-context.ts` | The data the review and tasks skills send, pure: `weekDataBlock` (a week's daily sheets, capped at 12,000 characters, private sheets left out and counted), `openTasksBlock` (open tasks as task lines with their note, in progress then by due date then priority, capped at 150, private notes' tasks counted), `reviewWeekOffset`, `todayLine`. |
| `chat-tool-runners.ts` | The pure half of the chat tools: `CHAT_TOOL_NAMES`, `searchablePaths` (not private, not templates), `searchNotesOutput` (name / title / tag matches, then content-index hits), `readNoteOutput` (capped at 20,000 characters; private notes refused), `taskFilter` (list_open_tasks' views, tag and text), `toolActivity` (the thread's activity line). |
| `use-chat-tools.ts` | `converse(system, messages, onActivity)`: the tool loop (`callAIChatTurn`, run each call, send `tool` results, at most `MAX_TOOL_ROUNDS`); `approval` / `cancelApproval` for `add_to_today`; `available` (a vault is open). Reads through `useNoteBuffer`, searches with `searchNoteContent`, adds through `useTodayAppend`. |
| [ToolApprovalCard](ToolApprovalCard.md) | add_to_today's Add / Don't add card, showing the lines as they'll be written. |
| `use-chat-skills.ts` | `skillInstructionsFor(messages)` (each active skill's instructions plus its data: the week's daily sheets via `useDailySheets`, or the open tasks from `atom_fileMetadata`), `saveTemplate(block)` (writes `<templates folder>/<name>.md`, creating `templates/` if needed, overwriting only on this explicit click; rescans and toasts), `templateExists(name)`, `templatesFolder`, `hasVault`. |
| [TemplateSaveCard](TemplateSaveCard.md) | Card under a reply per template block: path, lint warnings, Save / Replace template. |
| `use-chat-models.ts` | Model picker state; loads the provider's model list on first open (shared atoms with Settings). |
| `use-chat-mentions.ts` | `@query` detection, vault / folder / note options, and selection that inserts the label and loads its content. |
| [ChatMessageItem](ChatMessageItem.md) | One chat turn; assistant replies can be edited, copied as Markdown, and applied, and show a save card per template block. Exports `ApplyMode`. |
| [MentionMenu](MentionMenu.md) | The @mention dropdown above the input. |
| [ChatContextChips](ChatContextChips.md) | Removable chips for attachments and loaded @mention references. |
