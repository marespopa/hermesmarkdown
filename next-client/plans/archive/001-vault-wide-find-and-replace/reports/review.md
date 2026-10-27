## Review 1

**Verdict:** Approve with nits

**Checks:** Deferred to CI (factory mode). I ran the 13 new and touched test files (replace-search, replace-scan, text-cache, text-grep, replace-client, app/editor/replace, CommandPalette content-search and AppCommands, RouteSkeletons, editor-url, board-format): 140 tests pass. That includes `text-grep.test.ts` untouched.

**PRD coverage**
- **Engine:** done. `replace-search.ts` has one shared `forEachMatch` loop, so ordinals are identical in `findMatches` and `applyReplacements`. `text-cache.ts` is extracted, and `text-grep.ts` behaves the same. `replace-scan.ts` excludes board fences only for markdown, with the cap and invalid handling. The worker has a separate `currentScanId`. `replace-client.ts` has its own worker, a regex-only watchdog, and a `withContent` fallback.
- **Page:** done. `page.tsx` (167 lines) has the states, URL prefill, an apply that ends in toast and banner, and Undo. `use-apply-replace.ts` checks the fingerprint inside `writeThrough`, asks for write permission, and counts skipped and failed files. `use-replace-files.ts` drops private and Trash files, gates code files, and sends dirty tab text. Selection reset is keyed on `scanKey`.
- **Entry points:** done. The palette command is registered and its "Already in …" reason drops the trailing `…`. The Replace… chip is in `CommandPalette.tsx`, which is 386 lines. The route skeleton, `editorReplaceHref` and the `use-open-change` column parameter are in.
- **Docs and tests:** the READMEs, the three component `.md` files and the in-app documentation are updated. The PRD-listed tests exist and pass.
- **Rules:** no raw buttons, and the only raw inputs are checkboxes, which are allowed. No hard-coded colors, no banned names, no new network calls, and every source file is under 400 lines.

**Findings (all minor)**
1. `app/workers/text-cache.ts:58` and `app/editor/replace/page.tsx:101`. The raw-text cache trusts an entry for 2 s without checking the file. Scenario: Replace finishes and re-scans; the user clicks Undo within 2 s; the post-undo `refresh()` re-scan reuses the cached post-replace text. The preview shows "No matches" though the files are restored, and it stays that way until Find changes. Nothing unsafe is written, because the fingerprint check reads disk. Suggested fix: have the replace scan skip the recheck window (for example a `recheckMs` of 0 in the replace `readFileText` call), or clear the replace cache on `refresh`.
2. `app/editor/replace/use-apply-replace.ts:159` has `console.warn`. It matches the precedent in `use-note-buffer.ts`, so I'm only noting it.

**Tests and docs gaps:** none that matter.
