# Services

Non-React modules: IndexedDB persistence, browser storage, file writing, vault archives, AI, and GitHub vault sync. Client services run in the browser; `github-api.ts` and `github-auth.ts` are server-only helpers used by the route handlers in `app/api/github/`.

## Storage

Atom persistence uses Jotai `atomWithStorage` (`localStorage`) directly in `app/atoms/*`.

- `metadata-cache.ts` — IndexedDB cache of each vault's parsed metadata (tags, links, frontmatter, tasks, word count, preview), keyed by `atom_vaultKey`. On reopen, notes whose modified time matches are reused instead of re-read. It's a separate database from `idb.ts` and is versioned (`METADATA_CACHE_VERSION`), so parser changes invalidate it. It stays on the device and falls back to "nothing cached" when IndexedDB is missing or fails.
- `idb.ts` — IndexedDB wrapper for the vault `FileSystemDirectoryHandle` (save / load / clear, `verifyPermission`, `queryPermission`), the browser vault descriptor and registry (`renameBrowserVaultDescriptor` updates both, by id), and the GitHub vault descriptor and manifest. Saving one vault kind clears the others. Permission helpers treat handles without a permission API (Safari, Firefox, browser storage) as granted. Separate from atom persistence. `readKey` / `writeKey` read and write one key of its store. No-op if IndexedDB is missing.
- `recent-vaults.ts` — Vaults opened on this device, newest first, at most `MAX_RECENT_VAULTS` (8), for the Home feed's vault switcher and start screen. Disk entries keep their folder handle; browser and GitHub entries keep their descriptor. Pure `addRecentVault` / `removeRecentVault` / `renameRecentBrowserVault` (carries a renamed browser vault's name into its entry, in place), plus `loadRecentVaults` / `saveRecentVaults` on the `idb.ts` store. Forgetting an entry never touches the vault's files.
- `opfs.ts` — Origin Private File System helpers shared by browser and GitHub vaults (`hermes-vaults/…`): browser vault descriptors (`normalizeBrowserVaultName`: trimmed, required, ≤100 characters, for create and rename), workspace lookup / listing / deletion, persistent-storage request, usage estimate, backup-reminder check.

## Files

- `vault-pins-format.ts` — The vault's pins file, `.hermes/pins.yaml` (pure, no I/O): `PINS_PATH`, `PIN_PAGES`, `Pin` / `PinKind`, `pinKey()`; lenient parsing (`parsePins`: entries with one kind key — `note` (a `.md` path), `folder`, `tag` (normalised), `page` — and an optional single-emoji `icon` (`normalizePinIcon`); unrecognised entries, duplicates and unknown keys aren't listed but are kept; `version` above 1 is `newer`; invalid YAML, a non-mapping root or a non-list `pins` is `{ ok: false }`), `serializePins` (a fixed header, `version: 1`, the other top-level keys, one flow mapping per pin per line so GitHub merges stay clean; comments aren't kept) `PINS_MAX` (9: one per Ctrl/Cmd+1–9; `addPins` adds only as many as fit, `pinsOverLimit` says when some don't) and the edits (`addPins`, `removePin`, `setPinIcon`, `movePin` (listed pins are reordered within the places they hold), `remapPinPaths`, `forgetPinPaths`; each returns null when nothing changes and never mutates its input).
- `vault-pins.ts` — Reads and writes `.hermes/pins.yaml` on any vault backend: `readPinsFile` (null without the folder or the file), `updatePinsFile(vault, edit)` (serialised in one promise chain; reads fresh, throws `PinsFileInvalidError` / `PinsFileNewerError` and writes nothing for an invalid or newer file, skips the write when the edit changes nothing, otherwise creates `.hermes/` as needed and writes through `writeFileContent`), `loadYaml` (js-yaml, loaded lazily).
- `file-writer.ts` — `writeFileContent()`, the single write path for vault files. Uses `createWritable()` when the handle has it; otherwise (Safari before 26) sends the bytes to `app/workers/opfs-writer.worker.ts`, which writes through `createSyncAccessHandle()`.
- `content-search-client.ts` — Main-thread side of the note-text index in the metadata worker: `indexNoteContent`, `removeNoteContent`, `remapNoteContent`, `markContentIndexed` / `needsContentIndex` (which notes the worker already has this session, by modified time), and `searchNoteContent` (resolves `null` when superseded or after 5 s). Holds no note text. No-ops without a worker.
- `vault-trash.ts` — The vault Trash's layout: `TRASH_DIR` (`.hermes/trash`), `isTrashPath()`, slot names by deletion time (`trashSlotName` / `trashSlotDate`) and the 30-day expiry (`isTrashSlotExpired`). The Trash is skipped by indexing, export and GitHub sync.
- `vault-archive.ts` — Whole-vault zip export / import (`fflate`; exports wrap entries in a vault-named folder, which import strips), folder copy, path sanitizing (no traversal, skips `.git` / `node_modules` and the Trash; Android storage-URI paths from a folder pick are rebuilt into folder-relative ones), and conflict-free naming (`name (1).md`).

## AI (client)

- `ai.ts` — Calls `/api/ai` for Claude and Gemini: chat (`callAIChat`), one-shot actions (`callAI`), note generation (`generateFileFromPrompt`), frontmatter suggestions, document fixes, model listing, and `testAIConnection`. The user's API key is sent with each request and never stored server-side. Gemini model listing calls Google directly from the browser.
- `ai-status.ts` — Reports AI action progress / success / error to the UI from non-React code.

## GitHub vaults

- `github-vault-workspace.ts` (client) — Mirrors repository files into the Origin Private File System: path validation (Markdown and `.hermes/` only, never the Trash), descriptor / manifest types, read / write / delete, blob SHAs.
- `github-vault-sync.ts` (client) — Computes local changes, commits them through `/api/github/repos/[owner]/[repository]/sync`, and pulls with a three-way merge (conflicts left as markers).
- `github-api.ts` (server) — Authenticated `fetch` to the GitHub API, request schemas, and error mapping (uses `NextRequest`).
- `github-auth.ts` (server) — OAuth state and the encrypted HttpOnly session cookie that holds the access token.
