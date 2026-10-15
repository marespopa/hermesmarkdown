# board

Pure modules behind boards: Markdown notes (`hermes: board` frontmatter, usually `*.board.md`) that hold an Excalidraw scene in one ` ```hermes-board ` fenced JSON block. **Rule: no `@excalidraw/*` imports here.** Workers, the indexer and the AI runners import this folder, so it must stay light. Only `app/editor/components/board/BoardView.tsx` imports Excalidraw (enforced by lint).

| File | Purpose |
|---|---|
| `board-format.ts` | Types (`BoardScene`, `BoardDoc`, `BoardParse`), `NEW_BOARD_MARKDOWN`, `parseBoard` (fence finder, conflict and invalid detection; `head` / `tail` kept verbatim so prose edits round-trip byte for byte), `stripBoardFence` (blanks every board fence line, same line count; returns the same string if there's no fence), `boardTextForReading` (prose plus `(board with N elements)` for AI), `hasConflictMarkers` |
| `board-serialize.ts` | `serializeBoard` / `serializeScene` (deterministic: 4-line header, one element per line, `id` and `type` first then sorted keys, deleted elements dropped, `x/y/width/height/points` rounded to 2 decimals), `normalizeElement`, `pickBoardAppState` and `BOARD_APP_STATE_KEYS` (the only canvas settings saved) |
| `migrate.ts` | `migrateBoard`: validates the fence JSON and is the single upgrade point (version 1 only; anything else is "couldn't be read") |
| `is-board.ts` | `isBoard(path, content)`: `hermes: board` frontmatter, or an empty `.board.md`; never the `draft` |
| `board-flush.ts` | Registry of pending-write flushers (`registerBoardFlush`, `flushBoardWrite`, `flushAllBoardWrites`) so every save path can force a debounced stroke into the content atom first |
