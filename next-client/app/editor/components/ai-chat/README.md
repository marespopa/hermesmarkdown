# ai-chat

Building blocks of [`AIChatDialog`](../AIChatDialog.md).

| File | Purpose |
|---|---|
| `chat-helpers.ts` | Model fallbacks, attachment limits and `readAttachments`, message/attachment/mention types, @mention index building and resolution (`buildIndex`, `resolveMentionRefs`, `readVaultFile`), the system prompt (includes the table-formula guide) and `buildChatSystemPrompt` (adds the active file, selection and any active skill's instructions as `--- SKILL ---` blocks), and `buildApiContent`. |
| `chat-skills.ts` | Chat skills (only `TEMPLATE_SKILL` so far): keyword activation (`isSkillActive`: a user message with "template(s)" or starting with `/template`), `loadSkillInstructions` (the vault override `.hermes/skills/create-template.md`, body after frontmatter, read fresh; else the built-in text built from `TEMPLATE_SYNTAX_GUIDE`), and `parseTemplateBlocks` (`~~~~hermes-template <name>` … `~~~~` blocks; names sanitized to a base `.md` name by `sanitizeTemplateFileName` from `app/utils/templates/template-registry.ts`). |
| `use-chat-skills.ts` | `skillInstructionsFor(messages)` (skill text for the next request), `saveTemplate(block)` (writes `<templates folder>/<name>.md`, creating `templates/` if needed, overwriting only on this explicit click; rescans and toasts), `templateExists(name)`, `templatesFolder`, `hasVault`. |
| [TemplateSaveCard](TemplateSaveCard.md) | Card under a reply per template block: path, lint warnings, Save / Replace template. |
| `use-chat-models.ts` | Model picker state; loads the provider's model list on first open (shared atoms with Settings). |
| `use-chat-mentions.ts` | `@query` detection, vault / folder / note options, and selection that inserts the label and loads its content. |
| [ChatMessageItem](ChatMessageItem.md) | One chat turn; assistant replies can be edited, copied as Markdown, and applied, and show a save card per template block. Exports `ApplyMode`. |
| [MentionMenu](MentionMenu.md) | The @mention dropdown above the input. |
| [ChatContextChips](ChatContextChips.md) | Removable chips for attachments and loaded @mention references. |
