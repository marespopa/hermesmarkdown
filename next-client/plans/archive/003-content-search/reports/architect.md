# Content search — architect report

## Run 1

**PRD:** `next-client/plans/003-content-search/prd.md`

**Summary** (3 phases):
- **Phase 1: the index lives in the metadata worker.**
  - A pure `ContentIndex` stores each note's text plus a lowercased copy, in the worker heap only. It's filled whenever the worker parses a note, so there's no extra read.
  - `content:search` does a case-insensitive AND match, ranks lines, caps results at 3 per note and builds snippets.
  - The main thread talks to it through `app/services/content-search-client.ts`.
- **Phase 2: keeping the index current.**
  - A warm-start **backfill** reads only the notes the metadata pass skipped because they were cached. Each note is read at most once per session.
  - The active-file re-indexer, the file watcher (open tabs), `atom_remapVaultPaths` (rename/move) and a `useContentIndexSync` subscription (delete, close, vault switch) all update the index.
  - The phase includes a required split of `use-vault-manager.ts`, which is already 426 lines, into a new `use-vault-navigation.ts`.
- **Phase 3: the palette `/` scope ("Note text").**
  - Search is debounced (150 ms) and runs in the worker. Each row shows a highlighted snippet plus `name:line`.
  - Choosing a row opens the note and puts the caret at the first match, through `atom_pendingScrollTarget` with a new optional `column`.
  - Sensitive notes never match. `Ctrl/Cmd+Shift+F` opens the palette in this scope.
  - Row markup moves to `PaletteRow.tsx` so `CommandPalette.tsx` stays under 400 lines.
- **Memory budget:** about 2 bytes per ASCII character (about 40 MB for 5,000 × 4 KB notes), with a hard cap of 32M characters. No atom holds note text.

**Already exists:**
- The worker already receives the full text of every note it parses.
- `atom_pendingScrollTarget` and `useScrollToPendingTarget` already open a note at a line (the Tasks page uses them).
- The palette scope system and `HighlightedText` already exist.
- Privacy is already available through `usePaletteFiles` (`isSensitive`, hidden mode) and the worker-safe `isSensitiveFrontmatter`.
- The rename, delete and watcher paths already exist to hook into.

**Decisions / open questions to look at:**
- **D1 (the important one).** The brief assumes the vault scan reads every file. It doesn't on warm starts: the IndexedDB metadata cache skips unchanged notes, so they're never read. Persisting the index is out of scope, so I added a background backfill of only the skipped notes. I didn't block because this keeps to "no second full vault read": each note is read once per session at most, and cold starts add nothing.
- **D2:** the prefix is `/`.
- **D3:** frontmatter isn't searched; code blocks are.
- **D4:** sensitive notes are **excluded**, not masked, in every mode.
- **D8:** `Ctrl/Cmd+Shift+F` is rebound from plain palette to `/` scope.
- **Open: Tasks page off-by-one.** The Tasks page passes a 0-based task line into the 1-based scroll target. It's probably off by one and is left out of scope.
- **Open: cloud vaults.** Should the backfill be skipped for cloud-synced vaults with on-demand files?

**Handoff:** "Implement next-client/plans/003-content-search/prd.md, phase 1" (then phases 2 and 3; phases 2 and 3 both depend only on phase 1).
