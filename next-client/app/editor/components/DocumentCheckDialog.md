# DocumentCheckDialog

Description: The dialog behind the palette's **Check document**. It reads the note in the active pane's editor and lists what is wrong with it, each problem with the one edit that fixes it: a `[[wikilink]]` that matches no note (fix: link to the closest note by name, else unlink), a Markdown link to a vault file that isn't there (unlink), an image that can't be found (remove it), and a heading that skips a level (set it one level below the one above, worked out cascading so later headings follow). Links to the web, `mailto:`, `#anchors`, and anything in code or frontmatter are not checked; embeds of media (`![[photo.png]]`) are not judged because they resolve anywhere in a vault.

## Local State & Storage
- State: `atom_documentCheckOpen` (set by the palette command) and the last result (the checked text and its issues) in local `useState`. A ticket ref makes a later check win over an earlier one that finishes after it.
- Persistence: None. Nothing is written except the fixes, which are edits to the open note.

## Logic
- The checker is `checkDocument` in `app/editor/utils/check-document.ts`; vault lookups go through `createVaultFileExists(atom_vaultHandle)`. With no vault open, file lookups read as "present", so only wikilinks (against the indexed notes) and headings are judged.
- **Fix** is one `view.dispatch` (an ordinary edit, so CTRL/CMD+Z takes it back). The list answers at once (the issue is removed), then the note is checked again. **Fix all** sends every non-overlapping fix in one transaction.
- If the note changed since the check, a fix doesn't edit at stale positions; it re-checks instead.
- **Go to line** closes the dialog and puts the caret at the line.

## Dependencies
- Core: `DialogModal`, `Button`, `atom_activeEditorView`, `atom_activeFilePath`, `atom_fileMetadata`, `atom_vaultHandle`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<DocumentCheckDialog /> // mounted once by the editor page; opens when atom_documentCheckOpen is true
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
