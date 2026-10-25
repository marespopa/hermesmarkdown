## Review 1

**Verdict:** Approve with nits

**Checks:** Deferred to CI (factory mode).

### PRD coverage
- Setting `showGitChanges`, off by default, palette and Settings → View: done (`atoms/git-atoms.ts`, `SettingsCommands.tsx`, `EditorSettings.tsx`). `ui-atoms.ts` stays at 395 lines. `MarkdownEditor.tsx` is 374 lines.
- Shown only for: setting on, `kind: "local"`, a vault file (not `draft`): done (`MarkdownEditor.tsx:89`). `.git` directory, sha256 and `.git`-file checks: done (`git-repo.ts`).
- HEAD vs current text, CRLF split on `/\r?\n/`: done (`git-changes.ts:93`).
- Markers (added, changed, deleted, deleted-end), 3px bars using `--moss`, `--link` and `--danger`, no new tokens: done (`git-changes.ts:121-144`).
- Gutter placed after line numbers and fold markers in both extension builders: done (`extensions.ts:117`, `plain-text-extensions.ts:39`).
- New file or no commits marks every non-empty line as added: done (`git-read.ts`, `use-git-baseline.ts:57-64`).
- Binary (NUL in first 8 KB), blobs over 2 MB, documents over 20,000 lines: done.
- 150 ms debounce, with markers mapped through edits in between: done.
- HEAD re-check on focus, on visibility, and every 5 s while focused, refetching the blob only when the stamp changed: done (`use-git-baseline.ts`).
- Silent failure with one `console.warn` per file and commit: done (`git-read.ts`). The palette description is shown when `atom_gitAvailable` is false: done.
- Reader in a worker, with a client and a direct fallback: done. Packs are read through `file.slice` windows only. Delta chains are limited to depth 50. LRU object cache and per-pack idx cache: done.
- `@codemirror/merge` pinned at 6.12.3, with `yarn.lock` updated: done.
- Docs (vault, editor-workspace, landing, component docs, READMEs): done. The hook and codemirror docs are indexed in `editor/README.md`.
- Tests: refs, objects, pack, tree, repo, `computeGitMarkers`, the extension, the hook and the settings toggle are present, and they cover the PRD's listed cases.

### Findings (minor, no blockers)
1. `atom_gitAvailable` goes stale. The hook sets it only while enabled (`use-git-baseline.ts:51`). With the toggle off, switching from a non-repo vault to a repo vault leaves "No .git folder at the vault's root" on the palette command until the toggle is turned on again. Optional fix: reset it to `null` in the effect cleanup or when `vaultHandle` changes.
2. `readHead` maps any exception, such as a permission error, to `available: false` (`git-read.ts:41`). The palette then says "No .git folder" for a repo it simply couldn't read. This is harmless, and the PRD treats silent failure as acceptable.
3. In the worker, each `postMessage` structured-clones the vault handle. The `WeakMap` repo cache therefore misses on every request, and `.git/config` is re-read each time. This is cheap, and the idx and object caches are keyed by name and id, so they still work.
4. `EditorSettings.test.tsx` covers only the toggle. The description-when-unavailable case is covered in `AppCommands.test.tsx`, which is fine.

### Handoff
None. `state: approved`.
