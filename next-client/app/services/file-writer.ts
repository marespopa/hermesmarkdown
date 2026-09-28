// Single write path for vault files. Uses createWritable() wherever the
// browser has it (Chromium, Firefox, Safari 26+). Older Safari can only write
// Origin Private File System files from a worker, so there the bytes go to
// opfs-writer.worker.ts along with the file's path from the storage root.

export type FileContent = string | Blob | ArrayBuffer | Uint8Array;

type WriteResponse = { id: number; ok: true } | { id: number; ok: false; name: string; message: string };

let writerWorker: Worker | null = null;
let nextRequestId = 1;
const pending = new Map<number, { resolve: () => void; reject: (err: Error) => void }>();

function getWriterWorker(): Worker {
  if (writerWorker) return writerWorker;
  const worker = new Worker(new URL("../workers/opfs-writer.worker.ts", import.meta.url));
  worker.onmessage = (event: MessageEvent<WriteResponse>) => {
    const response = event.data;
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    if (response.ok) {
      request.resolve();
    } else {
      const err = new Error(response.message);
      err.name = response.name;
      request.reject(err);
    }
  };
  worker.onerror = (event) => {
    const err = new Error(event.message || "The file writer stopped unexpectedly.");
    for (const request of pending.values()) request.reject(err);
    pending.clear();
    writerWorker = null;
  };
  writerWorker = worker;
  return worker;
}

async function toBytes(content: FileContent): Promise<Uint8Array> {
  if (typeof content === "string") return new TextEncoder().encode(content);
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  return new Uint8Array(await content.arrayBuffer());
}

async function writeThroughWorker(handle: FileSystemFileHandle, content: FileContent): Promise<void> {
  const root = await navigator.storage?.getDirectory?.();
  const path: string[] | null = root ? await (root as any).resolve(handle) : null;
  if (!path || path.length === 0) {
    throw new Error("This browser cannot write to this file.");
  }
  const bytes = await toBytes(content);
  const worker = getWriterWorker();
  const id = nextRequestId++;
  await new Promise<void>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, path, bytes }, [bytes.buffer as ArrayBuffer]);
  });
}

export function canCreateWritable(handle: FileSystemFileHandle): boolean {
  return typeof (handle as any).createWritable === "function";
}

// Replaces the whole file with `content`.
export async function writeFileContent(handle: FileSystemFileHandle, content: FileContent): Promise<void> {
  if (!canCreateWritable(handle)) {
    // The bytes are transferred to the worker, so copy caller-owned buffers
    // first; strings and blobs already become fresh bytes.
    const owned = content instanceof Uint8Array ? content.slice()
      : content instanceof ArrayBuffer ? content.slice(0) : content;
    return writeThroughWorker(handle, owned);
  }

  let writable: FileSystemWritableFileStream | null = null;
  try {
    writable = await handle.createWritable();
    await writable.write(content as any);
    await writable.close();
    writable = null;
  } finally {
    if (writable) {
      try {
        await writable.close();
      } catch {
        // The failed write already surfaced; ignore cleanup errors.
      }
    }
  }
}
