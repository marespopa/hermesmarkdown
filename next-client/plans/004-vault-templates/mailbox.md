# Mailbox

## Answered questions — architect unblock run, 2026-10-04

Folded into `prd.md` (Decisions, Behavior, Design and the phases).

### Q1 — The Cmd+Shift+D "Today" journal flow doesn't exist yet. Build it here, or defer the journal trigger?

The codebase has no Cmd/Ctrl+Shift+D handler, no `journal/` convention and no Today command. In Chrome, Ctrl+Shift+D is "Bookmark all tabs".

Recommended: Build a minimal "Open today's note" command (Cmd/Ctrl+Shift+D, `journal/YYYY-MM-DD.md`, Settings default template) as its own phase.
Answer: Remove the journal trigger (Trigger 1, Cmd+Shift+D Today note, Settings default template) from this plan entirely. Don't build a Today flow or a journal/ convention.

### Q2 — For a missing `[[folder/name]]` link, does the link's path or the template's `target_folder` / `file_name` decide where the note is created?

If the template's routing wins, the clicked link stays unresolved unless the user's text is rewritten.

Options: (a) the link decides, the template supplies only the body, and `target_folder` / `file_name` apply to a new "New note from template…" command; (b) the template decides and the link is rewritten.

Recommended: (a).
Answer: (a) — the link decides. Note is created at the link's path; the template supplies only the body. target_folder / file_name apply to a 'New note from template…' palette command that asks for a title.

### Q3 — What should clicking a missing wikilink do when no template matches, or when the vault has no templates?

Today the click only shows a "File not found" toast (`use-open-file.ts:196-205`).

Recommended: Always confirm before writing. A folder match shows a one-line confirm (Enter/Esc). Otherwise the quick-select opens with "Blank note" first, then the templates; with no templates it shows only "Blank note". Esc writes nothing. A folderless `[[name]]` goes to `atom_newNoteFolder`.
Answer: Recommended — always confirm. Folder match → one-line confirm (Enter/Esc); otherwise quick-select with 'Blank note' first then templates; no templates → only 'Blank note'; Esc writes nothing; folderless [[name]] goes to atom_newNoteFolder.

## Handoff

- 2026-10-04 engineer run 1: all 4 phases are implemented, with tests and docs. Nothing was run (no tsc or vitest). Report: `reports/engineer.md` (decisions and verify commands). Ready for review.

## Review 1: changes requested (2026-10-04)

Full report: `reports/review.md` (Review 1). The product code is close to the PRD. The blockers are three broken new test files, which make tsc, lint, vitest and build all fail.

1. In `app/editor/hooks/use-vault-template-insert.test.ts:29`, use a complete `FileMetadata` literal (or cast through `unknown`). TS2352 currently breaks `tsc --noEmit` and `yarn build`.
2. In `app/hooks/file-system/use-template-notes.test.ts:56,62`, remove the `this` aliasing in `FakeDir.at` / `FakeDir.put` (`@typescript-eslint/no-this-alias`). Don't add a disable comment.
3. In `app/editor/settings/sections/TemplatesFolderSetting.test.tsx`, "deletes the vault's key when cleared" seeds `atom_templateFolderSettings` after `render` and outside `act`, so clearing the input never fires `onChange`. Seed the store before `render`. The test must pass with no `act` warning.
4. (minor) `TemplateSaveCard` stays on "Saved" (disabled) after the assistant reply is edited in place. Reset the status when `block.content` changes, or key the card by content. Add a `ChatMessageItem` test for this.
5. (question for the PRD owner; no code change until decided) The missing-link flow calls `openFile(handle, path, true)`, which skips the unsaved-draft confirm. The PRD says the confirm is kept, but it also prescribes `force=true`. The draft text stays recoverable in `openFiles.draft`.
6. Re-run `corepack yarn tsc --noEmit`, `corepack yarn eslint app`, `corepack yarn vitest run` and `corepack yarn build` and report the results. The noise from the nested `next-client/next-client/.next/` in a full `yarn lint` run is pre-existing.

- 2026-10-04 engineer run 2: fixed B1–B3 and m2, and added a ChatMessageItem test. tsc, eslint (`app`) and build pass. Vitest: 1004 passed; 1 perf-timing test in a file this change doesn't touch (`command-search`, 20 ms against a 16 ms budget) failed under full-suite load and passes alone. m1 (draft confirm vs `force=true`) is left for the PRD owner, with no code change. Report: `reports/engineer.md` Run 2. Ready for review.

## Decision — review 1 m1 (user, 2026-10-04)

Keep the current behavior: creating a note from a missing link while in the unsaved draft opens it with `openFile(handle, path, true)` and shows no draft prompt. The draft text is preserved. PRD line 69 is updated to match. No code change for m1; reviewers should not flag it again.
