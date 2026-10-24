// Thin wrapper over Chromium's FileSystemObserver, which pushes change
// records for observed handles instead of making us poll them. The API isn't
// in TypeScript's DOM lib yet, so the minimal shape we use is declared here.

export type FileSystemChangeRecord = {
  type: "appeared" | "disappeared" | "errored" | "modified" | "moved" | "unknown";
  changedHandle: FileSystemHandle | null;
  root: FileSystemHandle;
  /** Path of the changed entry under the observed root. */
  relativePathComponents?: string[];
};

type FileSystemObserverInstance = {
  observe(handle: FileSystemHandle, options?: { recursive?: boolean }): Promise<void>;
  unobserve(handle: FileSystemHandle): void;
  disconnect(): void;
};

type FileSystemObserverConstructor = new (
  callback: (records: FileSystemChangeRecord[], observer: FileSystemObserverInstance) => void,
) => FileSystemObserverInstance;

function getObserverConstructor(): FileSystemObserverConstructor | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { FileSystemObserver?: FileSystemObserverConstructor })
    .FileSystemObserver ?? null;
}

export function isFileObserverSupported(): boolean {
  return getObserverConstructor() !== null;
}

export type FileObserver = {
  /** Observe exactly these handles (keyed by path); unobserves the rest. */
  sync(handles: Map<string, FileSystemFileHandle>): void;
  disconnect(): void;
};

// Calls `onChange` whenever any observed file changes. Returns null when the
// browser has no FileSystemObserver — callers keep polling either way.
export function createFileObserver(onChange: () => void): FileObserver | null {
  const Observer = getObserverConstructor();
  if (!Observer) return null;

  const observed = new Map<string, FileSystemFileHandle>();
  let disconnected = false;

  let observer: FileSystemObserverInstance;
  try {
    observer = new Observer((records) => {
      for (const record of records) {
        // An errored observation is dropped by the browser; forget it so the
        // next sync() re-observes the handle.
        if (record.type === "errored") {
          for (const [path, handle] of observed) {
            if (handle === record.root) observed.delete(path);
          }
        }
      }
      if (records.length > 0) onChange();
    });
  } catch {
    return null;
  }

  return {
    sync(handles) {
      if (disconnected) return;

      for (const [path, handle] of observed) {
        if (handles.get(path) !== handle) {
          observed.delete(path);
          try {
            observer.unobserve(handle);
          } catch {
            // Already gone
          }
        }
      }

      for (const [path, handle] of handles) {
        if (observed.has(path)) continue;
        observed.set(path, handle);
        observer.observe(handle).catch(() => {
          // Permission lost or handle stale — polling still covers this file
          if (observed.get(path) === handle) observed.delete(path);
        });
      }
    },
    disconnect() {
      disconnected = true;
      observed.clear();
      observer.disconnect();
    },
  };
}

// Whether a change under an observed vault changes its file list: a file or
// folder appeared, went away or moved (or the browser can't say what
// happened). Edits to a file's text don't (the open-file watcher and the
// focus re-index cover those), nor does anything in a hidden folder such as
// `.hermesmarkdown/` (the Trash).
export function changesFileList(record: FileSystemChangeRecord): boolean {
  if (record.type === "modified" || record.type === "errored") return false;
  return !(record.relativePathComponents ?? []).some((part) => part.startsWith("."));
}

// Watches a whole vault folder (recursively) and calls `onChange` when its
// file list changes (changesFileList), and `onError` when the browser drops
// the observation (the folder was deleted, moved or became unreadable).
// Returns a stop function, or null when the browser has no
// FileSystemObserver or can't observe this folder.
export async function observeVault(
  root: FileSystemDirectoryHandle,
  onChange: () => void,
  onError?: () => void,
): Promise<(() => void) | null> {
  const Observer = getObserverConstructor();
  if (!Observer) return null;
  try {
    const observer = new Observer((records) => {
      if (records.some(changesFileList)) onChange();
      if (onError && records.some((record) => record.type === "errored")) onError();
    });
    await observer.observe(root, { recursive: true });
    return () => observer.disconnect();
  } catch {
    return null;
  }
}
