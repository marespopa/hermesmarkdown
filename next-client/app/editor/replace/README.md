# editor/replace

Replace in Files (`/editor/replace`, palette: **Replace in Files…** and the `/` scope's **Replace…** chip): find a text across the vault's notes, preview every match as before → after, opt matches or files out, then write the change with Undo. The scan runs on the text-grep worker through `services/replace-client.ts` (its own worker instance); the matcher is `workers/replace-search.ts`.

| File | Role |
|---|---|
| `page.tsx` | The page in `ShellPage`: states (no vault, a restored vault waiting for access, no worker, no files), the form, summary and one `ReplaceFileSection` per file, sorted by path. Reads `?find` / `?regex=1` once on mount (over the remembered options) and keeps `find` in the URL. Replace turns into "Replacing… K of M" at once (`aria-busy`, `LoadingBar`), included files dim and lock; outcomes show on the sections until the follow-up scan answers |
| `use-replace-files.ts` | `useReplaceFiles(includeCode)`: the palette's file list minus private notes and the Trash (and code files unless `includeCode`) as `GrepFile`s; a tab with unsaved edits is sent as its text. Also `hasPrivate` |
| `use-replace-preview.ts` | `useReplacePreview(query, files, enabled)`: the scan 250 ms after Find, the options or the file set stop changing; keeps the previous rows (with `done: false`, so nothing can be applied from them) until the new scan answers; `refresh()`; terminates the worker on unmount. Rescans on the set of paths or a dirty file's text, not on array identity |
| `use-replace-selection.ts` | Which matches the user unchecked, per file; resets when the search (`scanKey`) changes; the included counts the button shows |
| `use-apply-replace.ts` | `apply(plan, onProgress)` and `undo(last)`: sequential, one file at a time through `useNoteBuffer().writeThrough` (open tabs get the text, disk wins). A file whose text no longer matches the previewed fingerprint is skipped; a failed file never stops the rest. Disk vaults get a `requestPermission` before the first write. Reindexes written notes and tags, sets `atom_lastReplace`, shows the Undo toast |
| `components/ReplaceForm.tsx` | Find and Replace with fields, the option segments, Include code files, the Replace button |
| `components/ReplaceFileSection.tsx` | One file's header and match rows |
| `components/ReplaceSummary.tsx` | Counts, scan status, why Replace is unavailable, the private-notes note, the post-replace banner with Undo |
