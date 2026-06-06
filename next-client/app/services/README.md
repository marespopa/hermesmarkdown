# Services

Framework-agnostic utilities: storage and IndexedDB persistence.

## Storage

Composable persistence. `atomStorage` is the entry point — it picks a backend, migration runs once, callers write.

- `storage/atomStorage.ts` — backend factory; delegates to `fsStorage` if OPFS is available, else `localStorage`. Backend selectable via `NEXT_PUBLIC_STORAGE_BACKEND`.
- `storage/fsStorage.ts` — OPFS-backed JSON persistence behind an `AsyncStorage<T>` adapter; degrades gracefully when OPFS is unavailable.
- `storage/migrateLocalToFs.ts` — one-shot localStorage → OPFS migration for `["theme", "files", "selectedFileId"]`. Gated by the `__hermes_fs_migrated_v1__` flag so it runs exactly once.
- `idb.ts` — IndexedDB wrapper for the vault `FileSystemDirectoryHandle` (store / retrieve / verify-permission). Separate from atom persistence. No-op if IndexedDB is missing.
