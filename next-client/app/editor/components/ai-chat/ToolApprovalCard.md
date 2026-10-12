# ToolApprovalCard

Description: AI Chat's question before the `add_to_today` tool writes anything. It shows the lines the AI wants to append to today's sheet, exactly as they'll be written (monospace), with **Add line** / **Add N lines** and **Don't add**. Add appends them to today's sheet (`useTodayAppend`, which creates the sheet when needed); Don't add tells the model nothing was added. While it shows, the chat's turn waits. Closing the chat counts as Don't add (`useChatTools().cancelApproval`). It's a `role="group"` named "Add to today's sheet?".

## Local State & Storage
- State: None (the pending approval lives in `useChatTools`).
- Persistence: None.

## Dependencies
- Core: `Button`, `react-icons/hi`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
{tools.approval && (
  <ToolApprovalCard lines={tools.approval.lines} onApprove={tools.approval.approve} onDecline={tools.approval.decline} />
)}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| lines | `string[]` |  | The lines to add, as written |
| onApprove | `() => void` |  | Add them |
| onDecline | `() => void` |  | Don't add |
