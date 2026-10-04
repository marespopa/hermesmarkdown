# ChatMessageItem

Description: One turn of the AI Chat thread. User messages render as a bubble with @mentions highlighted; assistant replies can be edited in place, copied to the clipboard as raw Markdown, and applied to the note (replace selection / insert at cursor, or replace all). Under an assistant reply, each `~~~~hermes-template` block (template skill) gets a [`TemplateSaveCard`](TemplateSaveCard.md); nothing is saved without its button.

## Local State & Storage
- State: `copied` flag (reverts after 1.5s) for the Copy action's confirmation; edit state is owned by `AIChatDialog`.
- Persistence: None - transient UI state.

## Dependencies
- Core: `Button`, `TemplateSaveCard`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<ChatMessageItem message={msg} isEditing={false} editDraft="" onEditDraftChange={setDraft}
  onStartEdit={start} onCommitEdit={commit} onApply={(mode) => apply(mode)} hasSelection={false} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| message | `ChatMessage` | | The turn to render |
| isEditing / editDraft / onEditDraftChange | | | Inline edit of an assistant reply |
| onStartEdit / onCommitEdit | `() => void` | | Edit / Done actions |
| onApply | `(mode: ApplyMode) => void` | | `"insert"` or `"replace-all"` |
| hasSelection | `boolean` | | Switches the insert label to "Replace selection" |
| templateBlocks? | `TemplateBlock[]` | `[]` | Template blocks parsed from the reply; one save card each |
| templatesFolder? | `string` | `"templates"` | Folder shown in the card's path |
| templateExists? | `(fileName) => boolean` | | Labels the button "Replace template" |
| onSaveTemplate? | `(block) => Promise<boolean>` | | Saves a block; absent without a vault (button disabled) |
