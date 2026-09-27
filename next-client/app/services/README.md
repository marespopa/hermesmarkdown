# Services

Framework-agnostic utilities: IndexedDB persistence, AI, and GitHub vault sync.

## Storage

Atom persistence uses Jotai `atomWithStorage` (`localStorage`) directly in `app/atoms/*`.

- `idb.ts` — IndexedDB wrapper for the vault `FileSystemDirectoryHandle` (store / retrieve / verify-permission). Separate from atom persistence. No-op if IndexedDB is missing.
