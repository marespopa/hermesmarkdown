# Services

Non-React modules: IndexedDB persistence, browser storage, file writing, vault archives, AI, and GitHub vault sync. Client services run in the browser; `github-api.ts` and `github-auth.ts` are server-only helpers used by the route handlers in `app/api/github/`.

## Storage

Atom persistence uses Jotai `atomWithStorage` (`localStorage`) directly in `app/atoms/*`.

- `idb.ts` — IndexedDB wrapper for the vault `FileSystemDirectoryHandle` (save / load / clear, `verifyPermission`, `queryPermission`), the browser vault descriptor and registry, and the GitHub vault descriptor and manifest. Saving one vault kind clears the others. Permission helpers treat handles without a permission API (Safari, Firefox, browser storage) as granted. Separate from atom persistence. No-op if IndexedDB is missing.
- `opfs.ts` — Origin Private File System helpers shared by browser and GitHub vaults (`hermes-vaults/…`): browser vault descriptors, workspace lookup / listing / deletion, persistent-storage request, usage estimate, backup-reminder check.

## Files

- `file-writer.ts` — `writeFileContent()`, the single write path for vault files. Uses `createWritable()` when the handle has it; otherwise (Safari before 26) sends the bytes to `app/workers/opfs-writer.worker.ts`, which writes through `createSyncAccessHandle()`.
- `vault-archive.ts` — Whole-vault zip export / import (`fflate`; exports wrap entries in a vault-named folder, which import strips), folder copy, path sanitizing (no traversal, skips `.git` / `node_modules`), and conflict-free naming (`name (1).md`).

## AI (client)

- `ai.ts` — Calls `/api/ai` for Claude and Gemini: chat (`callAIChat`), one-shot actions (`callAI`), note generation (`generateFileFromPrompt`), frontmatter suggestions, document fixes, model listing, and `testAIConnection`. The user's API key is sent with each request and never stored server-side. Gemini model listing calls Google directly from the browser.
- `ai-status.ts` — Reports AI action progress / success / error to the UI from non-React code.

## GitHub vaults

- `github-vault-workspace.ts` (client) — Mirrors repository files into the Origin Private File System: path validation (Markdown and `.hermes/` only), descriptor / manifest types, read / write / delete, blob SHAs.
- `github-vault-sync.ts` (client) — Computes local changes, commits them through `/api/github/repos/[owner]/[repository]/sync`, and pulls with a three-way merge (conflicts left as markers).
- `github-api.ts` (server) — Authenticated `fetch` to the GitHub API, request schemas, and error mapping (uses `NextRequest`).
- `github-auth.ts` (server) — OAuth state and the encrypted HttpOnly session cookie that holds the access token.
