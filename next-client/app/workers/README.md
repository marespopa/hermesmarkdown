# Workers

Web Workers and the pure modules they run. Nothing here touches the DOM, React or Jotai.

| File | Role |
|---|---|
| `metadata.worker.ts` | The metadata worker (created in `app/hooks/file-system/shared.ts`). Parses notes posted by the main thread (frontmatter, tags, wikilinks, word count, tasks, preview) and keeps every parsed note's text in a `ContentIndex` for note-text search |
| `parse-note.ts` | `parseNoteFile`: the pure per-file parse the metadata worker runs (frontmatter, tags, links, word count, tasks, preview), with board JSON stripped first |
| `content-index.ts` | `ContentIndex` (path → text, a same-length lowercased copy, body start past the frontmatter, private flag, modified time), `foldCase`, `REGEX_FRONTMATTER`, size limits (`MAX_NOTE_CHARS` 1M per note, `MAX_TOTAL_CHARS` 32M in total) |
| `content-search.ts` | `parseContentQuery`, `rankText` (one file's ranked lines; shared with the text grep), `searchContent` (AND substring match, ranking, ≤3 hits per note, snippets with highlight offsets), `snippetFromRanges`, `handleContentMessage` (the worker's dispatch for typed messages) |
| `regex-search.ts` | `parseRegexQuery` (flags `gimu`, or `gim` when `u` rejects the pattern; null when invalid) and `rankRegex` (one file's matching lines, ≤200 matches, empty matches skipped, a match spanning lines marked in its first). Used only by the text grep, whose worker can be stopped |
| `content-search-protocol.ts` | Shared message and hit types |
| `tokenizer.worker.ts` + `tokenizer-protocol.ts` | The tokenizer tool's worker (created in `app/tools/tokenizer/use-tokenizer.ts`): loads a `gpt-tokenizer` vocabulary (`o200k_base` or `cl100k_base`) on first use, encodes `{ id, text, encoding }` with special-token markers counted as text, and replies `{ id, ok, tokenCount, segments (first 5,000 tokens, see segment-tokens.ts), truncated }` or `{ id, ok: false, error }` |
| `text-grep.worker.ts` + `text-grep.ts` + `text-grep-protocol.ts` | The text-file grep (created on first use in `app/services/text-grep-client.ts`): `grep:search { searchId, query, files: [{ path, name, handle?, content?, isNote? }], limit, mode? }` reads each file (8 at a time; skips files over 1M characters or with a NUL in the first 8 KB), ranks lines with `rankText` from `content-search.ts` (`mode: "text"`) or `rankRegex` from `regex-search.ts` (`mode: "regex"`), and posts `{ type: "grep:results", searchId, hits, scanned, total, done, invalid? }` at most every 120 ms and at the end. A newer search or `grep:cancel` stops the running one; the search yields every 8 ms so those get through. Read text is cached between searches (bounded at 32M characters, oldest out first): a file is re-read only when its modified time or size changed, and not re-checked within 2 s of the last check. `isNote` files skip their frontmatter and blank board JSON, like the note-text index. Browsers that can't send file handles get `content` instead |
| `opfs-writer.worker.ts` | Writes files through `createSyncAccessHandle()` where `createWritable()` is missing (see `app/services/file-writer.ts`) |

## Boards

A board's ` ```hermes-board ` JSON never counts as note text. `parse-note.ts#parseNoteFile` (the metadata worker's per-file parse, pure and tested) runs `stripBoardFence` before tags, wikilinks, word count and preview, and `ContentIndex.upsert` strips before its size caps, so search and hit line numbers ignore the JSON (fence lines are blanked, not removed). `extractTasks` skips all fenced code.

## Metadata worker protocol

Untyped messages are the original parse request:
- in: `{ files: [{ path, name, content, modifiedAt }], requestId? }`
- out: `{ results, requestId }`. `parseWithWorker` (vault pass) matches `requestId`; `useIndexActiveFile` takes replies without one.

Each successful parse also upserts the note into the note-text index, so the vault pass and the active-file re-indexer feed it without an extra read.

Typed messages (`content-search-protocol.ts`), sent through `app/services/content-search-client.ts`:
- `content:index { files }`: upsert note text (warm-start backfill, file watcher). No reply.
- `content:remove { paths }`: drop notes (delete, vault close / switch). No reply.
- `content:remap { oldPath, newPath }`: follow a renamed or moved file or folder. No reply.
- `content:search { searchId, query, paths, limit }` → `{ type: "content:results", searchId, hits, pending, capped }`. Replies carry no `results` or `requestId`, so the parse listeners ignore them.

Upserts older than the stored copy (by `modifiedAt`) are ignored, so the active tab's unsaved text isn't replaced by a stale disk read. Private notes (frontmatter `private: true` or a `private` tag) are stored but never returned. Memory: about 2 bytes per ASCII character (text plus folded copy), e.g. ≈40 MB for 5,000 notes of 4 KB; past 32M characters, further notes are skipped and `capped` is reported.
