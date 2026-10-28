# Architect report — vault-wide find and replace

## Run 1

**PRD:** `next-client/plans/001-vault-wide-find-and-replace/prd.md`

**Summary** (3 phases)
- Phase 1: a new matcher (`workers/replace-search.ts`) that works on the raw file text. It returns exact match positions, handles Match case, Whole word and Regex, and fills in `$1` / `$<name>` in the replacement. The text-grep worker gets a new `replace:scan` message (`workers/replace-scan.ts`). The worker's file cache moves out into `workers/text-cache.ts`, and a new `services/replace-client.ts` runs the scan in its own worker instance.
- Phase 2: a new **Replace in Files** page (`/editor/replace`) with the palette command `replace-in-files`. It shows every match as before → after, and each match or file can be unchecked. Writes go one file at a time through `useNoteBuffer().writeThrough`, which keeps open tabs in step and lets disk win. A file whose text changed since the preview is skipped. A toast and a page banner offer Undo, and the note-text index and tags are refreshed after the writes.
- Phase 3: a **Replace…** chip in the palette's `/` scope opens the page with the current query filled in.

**Already exists**
- The text-grep worker, its file cache, its stall watchdog and the fallback that sends file text where handles can't be posted (`text-grep.ts`, `text-grep-client.ts`).
- `writeThrough` for writing a note that may be open in a tab, and a multi-file write loop to copy (`use-rewrite-links.ts`).
- The palette's file list with private and hidden filtering (`usePaletteFiles`).
- A page to copy for the layout (`/editor/changes`) and its open-at-line helper (`use-open-change.ts`).
- The note-text index update (`indexNoteContent`) and `indexVaultTags`.
- Replace inside one note already exists in the CodeMirror find panel (`find-replace.ts`). The page copies its options.

**Things the code showed the PRD has to handle**
- The search matchers can't be reused for replace. Text mode needs every search word somewhere in the note and ranks the results. Regex mode trims the query and ignores case. Notes are searched after board drawings are blanked, so match positions don't line up with the file on disk.
- The grep client cancels the previous search every time it's called. If the page shared it, the palette's `/` search would cancel the replace preview, so the page gets its own worker.
- `ui-atoms.ts` is at 395 lines, so the new atoms go in a new `replace-atoms.ts`.

**Decisions / open questions to look at before handoff**
- It's a page, not inside the palette. The palette shows at most 50 results, 3 per note, and a replace preview needs every match.
- Frontmatter is included. Board drawings, private notes and the Trash are never changed. Code files are only included when the user turns that option on.
- There's no confirm dialog: the preview is the confirmation. Undo only lasts for the session, and a file edited after the replace is left alone by Undo.
- The preview stops at 5,000 matches, and Replace is turned off past that.
- No keyboard shortcut, because the obvious keys are taken by the browser or macOS.
- Open questions for you:
  - Should private notes be replaceable when Privacy Mode shows them?
  - Is 5,000 the right cap?
  - Should a folder filter be the first follow-up?

**Handoff:** "Implement next-client/plans/001-vault-wide-find-and-replace/prd.md, phase 1" (then phases 2 and 3; or all three in one run, since phase 1 alone has nothing the user can see).
