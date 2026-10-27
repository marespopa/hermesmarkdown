# TurnSummary

Description: Under a turn that changed files: "Changed Roadmap.md" (or "Changed 3 files", every path in the title, moved items at their new place), "· 2 in Trash" when it trashed items, and Undo. The turn's changes are one group on the app's file-undo stack (`atom_fileUndoStack`, matched by `id`), so Undo here, ⌘Z in Files and a toast's Undo all reverse the same thing, newest step first; it works only while the turn is the latest change (a toast says so otherwise). Then it reads "Undone", listing files that changed since (left as is) or couldn't be restored. Nothing shows for a turn that changed nothing, or whose group is gone (after a reload, or pushed off the 20-entry stack).

## Props
| Prop | Type | Description |
|---|---|---|
| turnId | `string` | The id of the user message that started the turn |
| onUndo | `(turnId) => Promise` | `useCompanionWrites().undoTurn` |

## State
- `atom_fileUndoStack` (the turn's group and its `steps`), `atom_undoneFileGroups` (its outcome once undone).
