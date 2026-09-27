# Services

Non-React modules: IndexedDB persistence, AI, and GitHub vault sync. Client services run in the browser; `github-api.ts` and `github-auth.ts` are server-only helpers used by the route handlers in `app/api/github/`.

## Storage

Atom persistence uses Jotai `atomWithStorage` (`localStorage`) directly in `app/atoms/*`.

- `idb.ts` — IndexedDB wrapper for the vault `FileSystemDirectoryHandle` (save / load / clear, `verifyPermission`, `queryPermission`) and for the GitHub vault descriptor and manifest. Separate from atom persistence. No-op if IndexedDB is missing.

## AI (client)

- `ai.ts` — Calls `/api/ai` for Claude and Gemini: chat (`callAIChat`), one-shot actions (`callAI`), note generation (`generateFileFromPrompt`), frontmatter suggestions, document fixes, model listing, and `testAIConnection`. The user's API key is sent with each request and never stored server-side. Gemini model listing calls Google directly from the browser.
- `ai-status.ts` — Reports AI action progress / success / error to the UI from non-React code.

## GitHub vaults

- `github-vault-workspace.ts` (client) — Mirrors repository files into the Origin Private File System: path validation (Markdown and `.hermes/` only), descriptor / manifest types, read / write / delete, blob SHAs.
- `github-vault-sync.ts` (client) — Computes local changes, commits them through `/api/github/repos/[owner]/[repository]/sync`, and pulls with a three-way merge (conflicts left as markers).
- `github-api.ts` (server) — Authenticated `fetch` to the GitHub API, request schemas, and error mapping (uses `NextRequest`).
- `github-auth.ts` (server) — OAuth state and the encrypted HttpOnly session cookie that holds the access token.
