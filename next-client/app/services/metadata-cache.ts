import type { FileMetadata } from "@/app/atoms/metadata";

// Persists each vault's parsed metadata index (tags, links, frontmatter,
// tasks, word count, preview) in IndexedDB, keyed by the vault key
// (atom_vaultKey). On reopen, notes whose modified time still matches are
// taken from here instead of being read and parsed again. A separate
// database from the vault-handle store in idb.ts, so neither needs a version
// bump for the other. Nothing leaves the device.

const DB_NAME = "HermesMDMetadataCache";
const STORE_NAME = "vaults";
// Bump when the worker's output changes shape or meaning (e.g. the preview
// rules), so stale entries are re-parsed instead of trusted.
export const METADATA_CACHE_VERSION = 1;

export type CachedMetadata = Omit<FileMetadata, "handle">;

interface CacheRecord {
  version: number;
  savedAt: number;
  entries: Record<string, CachedMetadata>;
}

const isSupported = () => typeof window !== "undefined" && !!window.indexedDB;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const request = action(tx.objectStore(STORE_NAME));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

/** The vault's cached entries, or null when there are none (or they're from an older version). */
export async function loadMetadataCache(vaultKey: string): Promise<Record<string, CachedMetadata> | null> {
  if (!isSupported()) return null;
  try {
    const record = await run<CacheRecord | undefined>("readonly", (store) => store.get(vaultKey));
    if (!record || record.version !== METADATA_CACHE_VERSION) return null;
    return record.entries;
  } catch (err) {
    console.warn("Failed to load the metadata cache:", err);
    return null;
  }
}

/** Replaces the vault's cached entries (files gone from the vault drop out). */
export async function saveMetadataCache(vaultKey: string, entries: Record<string, CachedMetadata>): Promise<void> {
  if (!isSupported()) return;
  try {
    const record: CacheRecord = { version: METADATA_CACHE_VERSION, savedAt: Date.now(), entries };
    await run("readwrite", (store) => store.put(record, vaultKey));
  } catch (err) {
    console.warn("Failed to save the metadata cache:", err);
  }
}

/** Forgets one vault's cache. */
export async function clearMetadataCache(vaultKey: string): Promise<void> {
  if (!isSupported()) return;
  try {
    await run("readwrite", (store) => store.delete(vaultKey));
  } catch (err) {
    console.warn("Failed to clear the metadata cache:", err);
  }
}
