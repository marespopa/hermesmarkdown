# ai-chat

Building blocks of [`AIChatDialog`](../AIChatDialog.md).

| File | Purpose |
|---|---|
| `chat-helpers.ts` | Model fallbacks, attachment limits and `readAttachments`, message/attachment/mention types, @mention index building and resolution (`buildIndex`, `resolveMentionRefs`, `readVaultFile`), the system prompt (includes the table-formula guide) and `buildChatSystemPrompt` (adds the active file and selection), and `buildApiContent`. |
| `use-chat-models.ts` | Model picker state; loads the provider's model list on first open (shared atoms with Settings). |
| `use-chat-mentions.ts` | `@query` detection, vault / folder / note options, and selection that inserts the label and loads its content. |
| [ChatMessageItem](ChatMessageItem.md) | One chat turn; assistant replies can be edited, copied as Markdown, and applied. Exports `ApplyMode`. |
| [MentionMenu](MentionMenu.md) | The @mention dropdown above the input. |
| [ChatContextChips](ChatContextChips.md) | Removable chips for attachments and loaded @mention references. |
