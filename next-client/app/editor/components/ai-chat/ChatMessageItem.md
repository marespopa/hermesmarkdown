# ChatMessageItem

Description: One turn of the AI Chat thread. User messages render as a bubble with @mentions highlighted; assistant replies can be edited in place and applied to the note (replace selection / insert at cursor, or replace all).

## Local State & Storage
- State: None; edit state is owned by `AIChatDialog`.
- Persistence: None - transient UI state.

## Dependencies
- Core: `Button`, `react-icons`.
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
