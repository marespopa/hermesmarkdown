# CompanionThread

Description: The conversation, scrolled to the newest turn. Each message (`CompanionMessage`); under a reply, once its turn settled, a `TurnSummary`; one quiet working line (delayed spinner + the running call's label, else "Working…") for as long as a turn runs, between tool rounds too, or "Summarizing the conversation…" while a summary is written; a note when a turn stopped at `MAX_TOOL_ROUNDS`; the error that ended a turn (`role="alert"`). Empty, it says what to ask.

## Props
| Prop | Type | Description |
|---|---|---|
| messages | `CompanionMessage[]` | The thread |
| activities | `Record<string, string>` | Each tool call's label once it ran |
| status | useChat status | |
| compacting | `boolean` | A summary is being written |
| errorText | `string \| null` | |
| onUndoTurn | `(turnId) => Promise` | Undo for a turn's summary |
