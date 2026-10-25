# Engineer report — 006 changes page

## Built
- Shared line diff: `services/git/git-line-diff.ts` (`lineChanges`, `gitDiff`, `MAX_GIT_LINES`); `editor/codemirror/git-changes.ts` imports and re-exports.
- Scan: `git-changes-types.ts`, `git-tree.ts#listTreeFiles/parseTreeEntries`, `git-index.ts` (v2–4), `git-hash.ts`, `git-worktree.ts`, `git-file-diff.ts`, `git-classify.ts`, `git-changes-scan.ts`; `git-read.ts` uses `classifyBytes`; `SKIPPED_DIRS` exported.
- Worker: `workers/git-changes-protocol.ts`, `git-changes.worker.ts`, `services/git-changes-client.ts`.
- Page: `editor/changes/{page,use-git-changes,use-open-change,diff-layout,diff-classes}` + `components/{ChangesSummary,FileDiffSection,DiffLines}`; `atom_gitChangesCache`; palette command + `disabledReason` regex; `ChangesSkeleton`.
- Dependency `ignore` 7.0.5 added and installed (yarn.lock updated).

## Tests/docs
Tests: git-line-diff, git-tree (extended), git-index, git-hash, git-worktree, git-file-diff, git-changes-scan, git-changes-client, diff-layout, use-git-changes, page, AppCommands (extended), RouteSkeletons (new). Docs: changes README + 3 component docs, editor/workers/services/atoms/CommandPalette READMEs, RouteSkeletons.md, in-app vault.tsx and editor-workspace.tsx.

## Decisions
- Deviation (Design, git-file-diff): `classifyBytes` lives in new `git-classify.ts` and is re-exported from `git-file-diff.ts`, so `git-read.worker` doesn't pull `@codemirror/merge` in.
- `walkWorktree` also returns `nestedDirs` so HEAD paths under nested repos aren't reported deleted.
- Files over 2 MB / 20,000 lines are "too large"; their +/− are counted only for whole-file adds/deletes, else shown as "—".
- Collapse state is overrides-by-path over `initialCollapsed` (no seeding effect).
- `FileDiffSection` uses `overflow-clip` so the sticky header works.

## Not done / open
- Scan time on a few-thousand-file vault not measured. I ran only `tsc --noEmit` once (clean, before the docs and some tests were finished); no tests were run.

## To verify
`corepack yarn tsc --noEmit`; `corepack yarn vitest run app/services/git app/services/git-changes-client.test.ts app/editor/changes app/components/CommandPalette/AppCommands.test.tsx app/editor/components/RouteSkeletons.test.tsx app/editor/codemirror/git-changes.test.ts`. Manually: Show Changes in a git vault; edit/add/delete files, switch window and back.

## Run 3 (review 2 fixes)
- git-hash.test.ts: corrected empty-blob id to e69de29bb2d1d6434b8b29ae775ad8c2e48c5391.
- git-changes.test.ts: runs fixture now has separated inserts; asserts lines 2-3 and 8.
- Not run: corepack yarn vitest run app/services/git/git-hash.test.ts app/editor/codemirror/git-changes.test.ts
