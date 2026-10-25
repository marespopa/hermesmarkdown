# Review 1 — 006 Changes page

> Review 2 (latest) is at the end of this file: **Changes requested**. Two failing new tests remain.

**Verdict: Changes requested**

## Checks
Deferred to CI (factory mode). I ran the new and touched test files to confirm findings (`corepack yarn vitest run editor/changes git-changes-scan git-worktree git-index git-file-diff git-tree git-changes-client RouteSkeletons AppCommands`): 71 pass, **4 fail**, all in new tests (blockers 1–3). A wider run also hit worker-start timeouts, which are environmental and not attributed to the change.

## PRD coverage
- Palette command and "Already in Changes": done (`AppCommands.tsx`, test added, passes).
- States (no vault, browser vault, no-repo, no changes, error + Try Again): done (`page.tsx:49-62`).
- Scan modules (tree, index v2–4, hash, worktree, ignore, budget, CRLF, cancel) and the separate worker, protocol and client: done.
- Layout (context, gaps, delta, initial collapse), summary, sections, open-at-line: done.
- Cache atom, focus/visibility rescan, cancel on unmount: done.
- Docs (component `.md`, READMEs, in-app docs, skeleton): done.
- Empty-file rule ("an empty file has zero lines"): **broken in `buildFileDiff`**, see blocker 3.
- Git Changes in the editor is unchanged: `gitDiff` moved and re-exported. No leftover `MAX_BLOB_BYTES` uses.
- Source files are all under 400 lines.

## Findings

### Blockers (fail CI)
1. `app/services/git/git-changes-scan.test.ts:86-97` — "hashes a file touched in the second the index was written" and "marks a size mismatch modified without hashing" fail with `Cannot set properties of undefined (setting 'bytes')`. `setup()` is called without `{ index }`, so `makeRepoVault` creates no `.git/index` and `vault.fileAt(".git/index")` is undefined. Fix: pass `{ index: buildIndex(...), indexMtimeMs }` through `setup`'s third argument. The ids come from `headObjects`, so build the index after computing them, or let `setup` accept a function.
2. `app/editor/changes/page.test.tsx:113` — "expands a collapsed section from the file list" fails on `expect(Element.prototype.scrollIntoView).toHaveBeenCalled()`. `vitest.setup.ts:43` defines `scrollIntoView` on `HTMLElement.prototype`, which shadows the `Element.prototype` mock. The page code is fine. Fix: mock `HTMLElement.prototype.scrollIntoView` (or spy on it) and assert on that.
3. `app/services/git/git-file-diff.ts:25-29` / `git-file-diff.test.ts:29-32` — emptying a file or filling an empty one gives a wrong diff.
   - Repro: `buildFileDiff("a", "")` returns `newCount: 1`, but it should be 0. `buildFileDiff("", "a")` returns `removed: [""]`, but it should be `[]`.
   - Cause: the empty side is replaced with `Text.of([""])`, so CodeMirror sees a one-empty-line document and reports it as a changed line.
   - Product impact: a file emptied since HEAD counts `+1`, and `layoutDiff` renders an added row for `lines[0]`, which is undefined. A file filled from empty counts `−1` and shows a bogus removed empty row. This contradicts the PRD's "empty file has zero lines".
   - Fix: when exactly one side has no lines, return the add-all or delete-all shape directly: `oldLines.length === 0` gives `{oldStart: 0, removed: [], newStart: 1, newCount: lines.length}`, and `lines.length === 0` gives `{oldStart: 1, removed: oldLines, newStart: 1, newCount: 0}`. The existing test then passes, except its `oldStart: 1` expectation for the filled case. Per the PRD's added shape that case is `oldStart: 0`, so fix the test expectation too.

### Minor (no fix required)
- `app/hooks/file-system/vault-scan.ts:90` has `SKIPPED_DIRS =new Set`, and `AppCommands.tsx` has `page("open-trash","Open Trash"` (missing space). Formatting typos.
- `diff-layout.ts#initialCollapsed`: a later small file can start expanded after a larger one was collapsed for exceeding the 3,000-row budget. The PRD says later sections start collapsed once the running total is exceeded. Debatable.
- `git-changes-scan.ts#describe`: a text file over 20,000 lines that is modified gets `added: null` and `removed: null`. The PRD says text files keep their counts. Acceptable.
- Symlinks: a symlink tracked in the index but absent from HEAD's `files` could show as added if the File System Access API exposes it as a file. This is an edge case the API can't distinguish.

## Tests & docs gaps
- All PRD-listed test files exist. The three failures above are test-fixture or implementation bugs. After the fix, add a case for `buildFileDiff` with an emptied file asserting `lines`, `newCount` and no added row in `layoutDiff`.
- Docs are present for all new components and READMEs.

## Handoff (fix list for hermes-engineer)
1. Fix `git-changes-scan.test.ts` so the index-dependent tests actually create `.git/index`: pass `index` and `indexMtimeMs` via `setup`'s options.
2. In `page.test.tsx`, mock `HTMLElement.prototype.scrollIntoView` (the setup file defines it there) and assert on that mock.
3. Fix `buildFileDiff` for one-sided empty files so an emptied file has `newCount: 0` and no bogus added row, and a filled file has `removed: []`. Correct the test's expected `oldStart` for the filled case to 0. Add a `layoutDiff` or scan assertion that an emptied file shows only removed rows.

## Review 2

**Verdict: Changes requested**

### Checks
Deferred to CI (factory mode). I ran the touched and new test files (`app/editor/changes`, `app/services/git`, `git-changes-client`, `codemirror/git-changes`, `GitChangesToggleButton`, `use-vault-has-git`, `editor-commands`, `AppCommands`, `RouteSkeletons`): 142 pass, **2 fail**, both in new tests (blockers below).

### Review 1 fixes
All three are done and their tests pass: the index placeholder in `git-changes-scan.test.ts`, the `HTMLElement.prototype.scrollIntoView` mock in `page.test.tsx`, and one-sided empty files in `git-file-diff.ts:27-28`.

### Findings
**Blockers (fail CI)**
1. `app/services/git/git-hash.test.ts:10`: "hashes the empty blob" expects `e69de29bb2d1d6484b8b6248b29a6b8b0c0d9a5e`. `blobId` returns `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`, which is git's real empty-blob id. The PRD's value is a typo, so the implementation is right. Fix: change the test's expected value to `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`.
2. `app/editor/codemirror/git-changes.test.ts:128-137`: "keeps runs of added lines for the tint layer" fails. Base `a\nb` and doc `a\nX\nY\nb\nZ` give one added run, `{from: 2, to: 9}`, instead of two. `Chunk.build` merges the two inserts into a single chunk that spans the shared `b` line, so `b` also counts as added. The test fixture is wrong, not `runsOf`. Fix: use a fixture where the two inserts are separated by several unchanged lines, such as base `a\nb\nc\nd\ne` and doc `a\nX\nY\nb\nc\nd\ne\nZ`. Confirm two runs. Also assert that adjacent added lines join into one run.

### PRD coverage
Unchanged from Review 1: done. The follow-ups to plan 001 are consistent:
- `use-vault-has-git` shows the toggle only for a disk vault with a root `.git`.
- The `gitReplacedBlocks` facet is registered in `extensions.ts`.
- The tint layer is wired.
- The new command IDs are listed in `build-editor-commands.test.ts`.

All source files are under 400 lines.

### Tests & docs
- The two failing tests above.
- Docs are present.

### Handoff
1. Fix the expected empty-blob id in `git-hash.test.ts` (see blocker 1).
2. Fix the `addedRuns` fixture in `git-changes.test.ts` (see blocker 2).

## Review 3

**Verdict: Approve**

### Checks
Deferred to CI (factory mode). I ran `app/services/git`, `app/editor/changes` and `app/editor/codemirror/git-changes.test.ts`: all pass (94 tests, then 18 in `git-changes.test.ts` run alone after a worker-start timeout, which is environmental).

### Review 2 fixes
- `git-hash.test.ts` now expects git's real empty-blob id and passes.
- The `git-changes.test.ts` runs fixture now has separated inserts and passes.

### Findings
No blockers or majors. The minors from Review 1 still stand and don't need fixing.
