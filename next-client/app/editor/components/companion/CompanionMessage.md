# CompanionMessage

Description: One message. A user message shows what they typed (the first text part) and "With …" for the context it carried (`metadata.context`). The summary a compacted thread starts with (`metadata.summary`) shows as a quiet bordered card, "Earlier conversation, summarized", its Markdown rendered. A reply shows its parts in order, text rendered as Markdown (`reply-html.ts`, styled by `.companion-reply` in `editor.scss`; web links open in a new tab) and a `ToolActivityChip` per tool call, with a run of finished calls folded into one "N steps done" line (`foldDoneTools`) and, while `working`, the running call left to the thread's working line (a `trash` call waiting for the user's answer shows its `TrashConfirmCard` instead), then the pages a web search drew on (`source-url` parts, once each, web links only) under "Sources", then Copy (the reply's text as Markdown). Copy always shows on the latest reply; on earlier ones it appears on hover or keyboard focus.

## Props
| Prop | Type | Description |
|---|---|---|
| message | `CompanionMessage` | A UI message |
| activities | `Record<string, string>` | Chip labels by toolCallId |
| working | `boolean` | The thread is busy on this reply: its running call isn't shown as a chip |
| latest | `boolean` | The thread's latest reply: Copy always shows |
| autoModel | `string?` | The model name Auto chose for this reply (from the user turn's `metadata.auto`); shown as "Auto → name" beside Copy |
