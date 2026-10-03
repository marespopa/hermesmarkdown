---
state: merged
blocked_from: 
rejections: 1
created: 2026-10-03T12:57:52Z
---

# Search inside notes

## Problem
Nothing searches note contents. The command palette matches file names (default scope), tags (`#`), commands (`>`), tasks (`!`) and headings in the open note (`@`) (`app/components/CommandPalette/palette-model.tsx`, `command-search.ts`). To find a phrase written in some note, users have to remember which file it's in and open it.

The metadata worker (`app/workers/metadata.worker.ts`) already gets every file's full text during the vault scan (`app/hooks/file-system/vault-scan.ts` / `vault-index.ts`; content is read on the main thread and posted to the worker). It only keeps tags, links, frontmatter, tasks, word count and a short preview (`FileMetadata` in `app/atoms/metadata.ts`). It could build a content index in the same pass.

## Desired behavior
- A palette scope for searching note contents across the whole vault, next to the existing prefixed scopes. The architect picks the prefix and checks that it doesn't clash with `#`, `>`, `!`, `@`.
- Each result shows the note's title/path and a snippet of the matching line, with the match highlighted. A note can have several matching lines. Results are ranked sensibly: exact phrase over scattered words, and more than one hit per note is fine as long as no single note floods the list.
- Picking a result opens the note and moves the cursor to the matching line. Reuse how the `@` heading scope jumps to a position.
- Matching ignores case. Multi-word queries match all the words (AND); they don't fuzzy-match single characters across the whole document. Frontmatter is searchable or skipped; the architect decides and says which.
- **The index is built in the metadata worker pass** that already reads each file. Don't add a second full vault read. It stays current when files change, using the same paths that re-index metadata today (the active-file re-indexer and the file watcher, `app/hooks/use-file-watcher.ts` and the new `app/hooks/file-system/file-observer.ts`), plus rename/move/delete (see `remap-vault-paths`).
- **Querying must not block typing.** Run the search off the main thread (in the worker, or a dedicated search worker) or show it's cheap enough at vault scale. Debounce as needed. State the memory budget for the index on large vaults (e.g. 5k notes) and keep full note text out of Jotai atoms that rerender UI.
- **Sensitive notes** (plan 002): content search goes through the same privacy rules as other listings. In `hidden` mode sensitive notes never match. In `show_title` mode they never show a body snippet: either exclude them or list them with a masked snippet, consistent with how the `!` task scope treats masked tasks.
- Works for both File System Access vaults and the OPFS browser vault.
- Tests: indexing (frontmatter/code, case, multi-word), ranking/snippet extraction, incremental update and removal, privacy filtering, and the palette scope (rows, selecting a result jumps to the line).
- Docs: `CommandPalette.md`/`README.md`, `app/hooks/README.md`, `ARCHITECTURE.md` (worker data flow), and the user-facing feature list in the repo `README.md`.

## Out of scope
- Regex search, search-and-replace across files, and saved searches.
- Fuzzy/typo-tolerant or semantic (embedding/AI) search.
- A separate full-page search panel. The palette scope is enough for now.
- Persisting the index across reloads (IndexedDB etc.). Rebuilding on the vault scan is fine unless the architect finds it too slow; if so, raise it in `blocked.md`.
