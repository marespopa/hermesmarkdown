---
state: approved
size: normal
kind: feature
blocked_from: 
rejections: 1
created: 2026-10-25T08:49:58Z
---

# Changes page

## Problem
Git Changes (plan 001) shows the diff of the one file you have open. To see everything you've changed across the vault since the last commit, you still have to open each file, or switch to a terminal or a git app.

## Desired behavior
- A **Changes** page, like the "Files changed" tab of a GitHub pull request: every file in the vault that differs from HEAD, with its unified diff.
- Reached from the command palette (**Show Changes**), like the other pages (Tasks, Trash, All Files). Only for a disk vault with a `.git` folder at its root; otherwise the page says there's no repository there.
- A summary at the top: how many files changed, lines added and removed.
- One section per file: its path, a status (added, modified, deleted), +/− counts, and the diff in the same look as the editor's inline diff (green added lines with +, red removed lines with −, both from the theme tokens plan 001 uses). Unchanged stretches collapse to a few lines of context, as on GitHub, with a way to expand them. Sections can be collapsed; a file list or jump links to move between files.
- Clicking a file's path, or a line, opens the file in the editor at that line (a deleted file can't be opened).
- Read-only, like plan 001: the app only reads `.git`, never runs or writes git. Reuse the git reader from plan 001 (`app/services/git/`, the git-read worker) and the diff logic in `codemirror/git-changes.ts` where it fits.
- Finding changed files: compare the vault's files against HEAD's tree. Checking only files whose size or modified time differ from the index (`.git/index`), or hashing file contents as git blob ids, are both fine; it must stay quick on a vault of a few thousand files and never block the UI (worker, progress shown after a moment, per the optimistic UI rule).
- Files git ignores, and the folders the vault scan skips (`.git`, `node_modules`, …), are not listed. Binary and very large files are listed without a diff.
- Updates when the page is opened again and when the window regains focus (like the HEAD check in plan 001).

## Out of scope
- Staging, committing, reverting, or any write to `.git`.
- Comparing against anything but HEAD (other commits, branches, GitHub pull requests).
- Word-level highlights inside lines.
