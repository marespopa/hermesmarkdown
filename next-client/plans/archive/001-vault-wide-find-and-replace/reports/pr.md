## Replace in Files

- New **Replace in Files** page (`/editor/replace`, palette command, and a **Replace…** chip in the palette's `/` scope): find and replace across the vault's notes with a live before → after preview, Match case / Whole word / Regex (`$1`, `$<name>`, `$&`), optional code files, per-match and per-file opt-out.
- Replace writes file by file with progress, skips any file that changed since the preview, shows a toast and a page banner with Undo; private notes, the Trash and board drawings are never matched or changed.
- The scan runs in its own instance of the text-grep worker (`replace:scan`), so the palette's `/` search is unaffected; the grep's read cache moved to `workers/text-cache.ts` with no behavior change.
- Writes go through `useNoteBuffer().writeThrough` (open tabs get the new text, disk wins); disk vaults ask for write permission first.
