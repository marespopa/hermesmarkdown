# ExternalChangeReview

Description: A quiet pill at the bottom of the active pane, **Changed outside the editor · 3 changes**, that opens into one card per change made to the open note from outside the editor (an AI tool, a Git pull, a synced folder). Each card names the heading the change sits under ("Top of note" above the first), shows the removed text struck through and the added text, and has **Keep** and **Undo**; **Keep all** and **Undo all** decide the rest. The note already shows the new text (disk wins), so Keep only closes a card; Undo puts the old text back as an ordinary edit (`input.external-undo`), which CTRL/CMD+Z reverses.

## Local State & Storage
- State: `open` (pill or cards) in local `useState`. The reviews live in `atom_externalReviews` (`app/atoms/external-review-atoms.ts`), by note path, for the session only.
- Persistence: None. Private notes are never recorded (`atom_recordExternalChange`).

## Logic
- Reviews are recorded where disk text replaces a note's text: the file watcher (`use-file-watcher.ts`) and reopening a vault with notes changed while the app was closed (`atom_rebindHandles`). Two outside changes in a row are reviewed together against the text from before the first.
- Changes come from `buildExternalReview` (`app/editor/utils/external-review.ts`), which reuses the line diff of `proposalHunks`. Notes over 4,000 lines are not compared.
- Each change is found again in the current text by its position, else by the text just before it plus the text it added (only when that is unique). A change the user's own edits have moved away or overwritten drops out of the list; the review ends when none are left.
- Undo and Undo all answer at once (cards close in the same frame as the edit); undoing a change moves the positions of the changes after it.
- Clicking a card's heading line puts the caret at the change and scrolls to it.

## Dependencies
- Core: `@codemirror/view`, `Button`, `atom_externalReviews`, `atom_setExternalReview`, `external-review.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
{props.isActivePane !== false && <ExternalChangeReview view={editorView} filePath={filePath} text={editorValue} />}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| view | `EditorView \| null` | | The pane's editor; Undo and jumping act on it |
| filePath | `string` | | The note's vault path, the key of its review |
| text | `string` | | The note's current text |
