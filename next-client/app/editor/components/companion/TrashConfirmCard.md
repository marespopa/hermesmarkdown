# TrashConfirmCard

Description: Shown in the thread in place of a `trash` tool call's chip while the call waits (`trash-confirm.ts`): "Move “Roadmap.md” to Trash?" (or "N items"), the paths, and two buttons. **Keep** (secondary, focused) answers no, and the tool tells the model the user kept the files; **Move to Trash** (warning) lets the call go on through the app's `trashItems`, in the turn's undo group. Renders nothing once answered. Stop and New chat answer Keep for every waiting card.

## Props
| Prop | Type | Description |
|---|---|---|
| toolCallId | `string` | The waiting call; its paths come from `atom_trashRequests` |
