## Changes page

- New **Show Changes** palette command opens `/editor/changes`: every file of a disk vault that differs from HEAD (added, modified, deleted) with a unified diff in the editor's inline-diff look, a files/+/− summary, collapsible sections, folded unchanged stretches, and click-to-open at a line.
- Read-only: reads `.git` (HEAD tree, index, `.gitignore`, `info/exclude`) and never writes. Ignored files, tool folders, the Trash, `.env*`, symlinks, submodules and nested repos are left out.
- The scan runs in a new `git-changes.worker.ts` (index stat fast path, SHA-1 blob hashing otherwise); the last result is cached in `atom_gitChangesCache` and refreshed on focus.
- `gitDiff` moved to `services/git/git-line-diff.ts` (re-exported from `git-changes.ts`); `ignore@7.0.5` added as a direct dependency; `SKIPPED_DIRS` is now exported.
