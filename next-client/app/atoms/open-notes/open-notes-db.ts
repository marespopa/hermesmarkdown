import type { Snapshot } from "../file-atoms";
import { timePerf } from "@/app/utils/perf/perf-metrics";

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

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      for (const name of [TEXTS, SNAPSHOTS]) {
        if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Open files database blocked"));
  });
  // A failed open is retried next time rather than cached.
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

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

export const indexedDbBackend: OpenNotesBackend = {
  async load() {
    const db = await openDb();
    const tx = db.transaction([TEXTS, SNAPSHOTS], "readonly");
    const [texts, snapshots] = await Promise.all([
      readAll<NoteTextRecord>(tx.objectStore(TEXTS)),
      readAll<Snapshot[]>(tx.objectStore(SNAPSHOTS)),
    ]);
    return { texts, snapshots };
  },
  async write(changes) {
    const db = await openDb();
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
