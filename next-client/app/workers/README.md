# Workers

Web Workers and the pure modules they run. Nothing here touches the DOM, React or Jotai.

| File | Role |
|---|---|
| `metadata.worker.ts` | The metadata worker (created in `app/hooks/file-system/shared.ts`). Parses notes posted by the main thread (frontmatter, tags, wikilinks, word count, tasks, preview) and keeps every parsed note's text in a `ContentIndex` for note-text search |
| `content-index.ts` | `ContentIndex` (path → text, a same-length lowercased copy, body start past the frontmatter, sensitive flag, modified time), `foldCase`, `REGEX_FRONTMATTER`, size limits (`MAX_NOTE_CHARS` 1M per note, `MAX_TOTAL_CHARS` 32M in total) |
| `content-search.ts` | `parseContentQuery`, `searchContent` (AND substring match, ranking, ≤3 hits per note, snippets with highlight offsets), `handleContentMessage` (the worker's dispatch for typed messages) |
| `content-search-protocol.ts` | Shared message and hit types |
| `opfs-writer.worker.ts` | Writes files through `createSyncAccessHandle()` where `createWritable()` is missing (see `app/services/file-writer.ts`) |

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

Upserts older than the stored copy (by `modifiedAt`) are ignored, so the active tab's unsaved text isn't replaced by a stale disk read. Sensitive notes (frontmatter) are stored but never returned. Memory: about 2 bytes per ASCII character (text plus folded copy), e.g. ≈40 MB for 5,000 notes of 4 KB; past 32M characters, further notes are skipped and `capped` is reported.
