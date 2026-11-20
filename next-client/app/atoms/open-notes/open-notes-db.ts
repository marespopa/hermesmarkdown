import type { Snapshot } from "../file-atoms";
import { timePerf } from "@/app/utils/perf/perf-metrics";
import { withTimeout } from "@/app/utils/with-timeout";

// The open notes' text in IndexedDB: one record per note in `texts`, its
// snapshots in `snapshots`, both keyed by path. A write touches only the
// notes that changed (open-notes-persister.ts), and IndexedDB copies a
// string without serializing the others, so typing in one large note never
// pays for the rest. A database of its own, like metadata-cache.ts.

const DB_NAME = "HermesMDOpenNotes";
const TEXTS = "texts";
const SNAPSHOTS = "snapshots";

export interface NoteTextRecord {
  content: string;
  /** Only while it differs from `content` (unsaved edits); a clean note keeps one copy. */
  lastSavedContent?: string;
  conflict?: { remoteContent: string };
}

export interface OpenNotesData {
  texts: Record<string, NoteTextRecord>;
  snapshots: Record<string, Snapshot[]>;
}

/** Records to put, or null to delete, by path. */
export interface OpenNotesChanges {
  texts: Record<string, NoteTextRecord | null>;
  snapshots: Record<string, Snapshot[] | null>;
}

export interface OpenNotesBackend {
  load(): Promise<OpenNotesData>;
  /** Resolves once the write is durable; rejects with the transaction's error. */
  write(changes: OpenNotesChanges): Promise<void>;
}

export const isIndexedDbSupported = () => typeof window !== "undefined" && !!window.indexedDB;

let dbPromise: Promise<IDBDatabase> | null = null;

// A browser that never answers an open (a tab thawed after a long time in the
// background) would hold every later read on this one promise.
const OPEN_TIMEOUT_MS = 4000;

function openDb(): Promise<IDBDatabase> {
  const opening = withTimeout(
    new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        for (const name of [TEXTS, SNAPSHOTS]) {
          if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        // Another tab upgrading, or the browser closing the connection: open afresh next time.
        db.onversionchange = () => {
          db.close();
          if (dbPromise === opening) dbPromise = null;
        };
        db.onclose = () => {
          if (dbPromise === opening) dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Open files database blocked"));
    }),
    OPEN_TIMEOUT_MS,
    "Open files database",
  );
  dbPromise = opening;
  // A failed open is retried next time rather than cached.
  opening.catch(() => {
    if (dbPromise === opening) dbPromise = null;
  });
  return opening;
}

const getDb = () => dbPromise ?? openDb();

function readAll<T>(store: IDBObjectStore): Promise<Record<string, T>> {
  return new Promise((resolve, reject) => {
    const result: Record<string, T> = {};
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return resolve(result);
      if (typeof cursor.key === "string") result[cursor.key] = cursor.value as T;
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

// One read of both stores. It settles when the transaction does, so an
// aborted one (which fires no request error) rejects instead of hanging.
async function readOnce(): Promise<OpenNotesData> {
  const db = await getDb();
  const tx = db.transaction([TEXTS, SNAPSHOTS], "readonly");
  const finished = new Promise<never>((_, reject) => {
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Open files read aborted"));
  });
  finished.catch(() => {});
  const read = Promise.all([
    readAll<NoteTextRecord>(tx.objectStore(TEXTS)),
    readAll<Snapshot[]>(tx.objectStore(SNAPSHOTS)),
  ]).then(([texts, snapshots]) => ({ texts, snapshots }));
  return withTimeout(Promise.race([read, finished]), LOAD_TIMEOUT_MS, "Open files read");
}

const LOAD_TIMEOUT_MS = 6000;

export const indexedDbBackend: OpenNotesBackend = {
  async load() {
    try {
      return await readOnce();
    } catch (err) {
      // A fresh connection often works where the first hung or was cut.
      console.warn("Open files: read failed, retrying:", err);
      dbPromise = null;
      return readOnce();
    }
  },
  async write(changes) {
    const db = await getDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction([TEXTS, SNAPSHOTS], "readwrite");
      const texts = tx.objectStore(TEXTS);
      const snapshots = tx.objectStore(SNAPSHOTS);
      // The main-thread part: each put copies its record (PerfReadout).
      timePerf("notes-persist", () => {
        for (const [path, record] of Object.entries(changes.texts)) {
          if (record) texts.put(record, path);
          else texts.delete(path);
        }
        for (const [path, list] of Object.entries(changes.snapshots)) {
          if (list) snapshots.put(list, path);
          else snapshots.delete(path);
        }
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Open files write aborted"));
    });
  },
};
