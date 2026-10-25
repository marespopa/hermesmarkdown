# Architect report — 006 Changes page

## Run 1

**PRD:** `next-client/plans/archive/023-changes-page/prd.md`

**Summary** (3 phases):
- A new `git-changes.worker.ts` scans the vault against HEAD. It walks HEAD's tree, reads `.git/index` (v2–4) for a fast stat check, hashes the remaining files as git blob ids (SHA-1), walks the vault with `.gitignore` support (the `ignore` package) and builds unified-diff data per file.
- The pure diff trimming in `codemirror/git-changes.ts` moves to `services/git/git-line-diff.ts` (`lineChanges`, `gitDiff`). The editor's inline diff and the new page share it, and the editor's behavior doesn't change.
- A new `/editor/changes` page:
  - A summary with counts, a jump list and Collapse/Expand All.
  - Collapsible per-file sections with 3-line context and expandable gaps, in the same green/red look as the editor.
  - Clicking a path or line opens the file at that line.
  - Progress appears after a short delay, and the page rescans on focus. The last result is cached so a return visit shows it at once.
- The palette gets **Show Changes**, plus a route skeleton and docs (in-app `vault.tsx` git section, editor workspace Navigate list, READMEs).

**Already exists:**
- The read-only git reader from plan 022: repo, HEAD, objects, packs and tree path lookup.
- The worker/client pattern.
- `@codemirror/merge` with chunk trimming.
- `atom_pendingScrollTarget` plus `resolveFileHandleAtPath` for opening at a line (Tasks page pattern).
- The `ShellPage` frame, the `page()` palette helper, `LoadingBar` and `formatCount`.

**Decisions to look at:**
- **A separate worker**, not the existing `git-read` worker. This keeps the editor's worker lean and stops long scans from delaying blob reads.
- **Untracked, non-ignored files are listed as added.** Dotfiles are included whatever Show Hidden Files says. Disk content is compared, not unsaved tab text.
- **New dependency:** `ignore@7.0.5`, which is already in `yarn.lock` through ESLint.
- **Budgets:** the worker sends 300 diffs or 100k lines at most; files after that are listed with counts and the message "Diff not loaded". A section starts collapsed above 400 rows, and only 3,000 rows are expanded at first.
- **Clicks:** clicking a path opens the file at its first change. Gaps expand whole. Row clicks use event delegation, with no button per line.
- **The label stays "Show Changes"**, as in the brief, although other page commands say "Open …".

**Open questions (non-blocking):** should Changes be pinnable, and should the editor's Git Changes button link to the page?

**Handoff:** Implement next-client/plans/archive/023-changes-page/prd.md, all phases (Factory mode).
