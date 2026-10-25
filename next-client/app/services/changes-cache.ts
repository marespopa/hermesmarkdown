import type { ChangesResult } from "@/app/services/git/git-changes-types";

// Keeps each vault's last Changes page result in IndexedDB, keyed by the
// vault key (atom_vaultKey), so the page shows it at once after a reload
// while a fresh scan runs. Its own database, like metadata-cache.ts. Nothing
// leaves the device; it can always be rebuilt by scanning again.

const DB_NAME = "HermesMDChangesCache";
const STORE_NAME = "vaults";
// Bump when ChangesResult changes shape.
const VERSION = 1;

interface CacheRecord {
  version: number;
  savedAt: number;
  result: ChangesResult;
}

const isSupported = () => typeof window !== "undefined" && !!window.indexedDB;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
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

/** The vault's last saved result, or null. */
export async function loadChangesCache(vaultKey: string): Promise<ChangesResult | null> {
  if (!isSupported()) return null;
  try {
    const record = await run<CacheRecord | undefined>("readonly", (store) => store.get(vaultKey));
    return record?.version === VERSION ? record.result : null;
  } catch (err) {
    console.warn("Failed to load the Changes cache:", err);
    return null;
  }
}

export async function saveChangesCache(vaultKey: string, result: ChangesResult): Promise<void> {
  if (!isSupported()) return;
  try {
    const record: CacheRecord = { version: VERSION, savedAt: Date.now(), result };
    await run("readwrite", (store) => store.put(record, vaultKey));
  } catch (err) {
    console.warn("Failed to save the Changes cache:", err);
  }
}

/** Forgets every vault's saved result, to free browser storage. */
export async function clearAllChangesCaches(): Promise<void> {
  if (!isSupported()) return;
  try {
    await run("readwrite", (store) => store.clear());
  } catch (err) {
    console.warn("Failed to clear the Changes caches:", err);
  }
}
