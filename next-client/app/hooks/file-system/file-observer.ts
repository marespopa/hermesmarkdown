// Thin wrapper over Chromium's FileSystemObserver, which pushes change
// records for observed handles instead of making us poll them. The API isn't
// in TypeScript's DOM lib yet, so the minimal shape we use is declared here.

type FileSystemChangeRecord = {
  type: "appeared" | "disappeared" | "errored" | "modified" | "moved" | "unknown";
  changedHandle: FileSystemHandle | null;
  root: FileSystemHandle;
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
