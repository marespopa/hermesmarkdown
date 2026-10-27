# CompanionThread

Description: The conversation, scrolled to the newest turn. Each message (`CompanionMessage`); under a reply, once its turn settled, a `TurnSummary`; three dots while the model hasn't started; a note when a turn stopped at `MAX_TOOL_ROUNDS`; the error that ended a turn (`role="alert"`). Empty, it says what to ask.

## Props
| Prop | Type | Description |
|---|---|---|
| messages | `CompanionMessage[]` | The thread |
| activities | `Record<string, string>` | Each tool call's label once it ran |
| status | useChat status | |
| errorText | `string \| null` | |
| onUndoTurn | `(turnId) => Promise` | Undo for a turn's summary |
