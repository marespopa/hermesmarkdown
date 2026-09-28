// app/workers/opfs-writer.worker.ts
//
// Fallback writer for Origin Private File System files in browsers whose file
// handles lack createWritable() (Safari before 26). Those browsers only allow
// writes through createSyncAccessHandle(), which exists in dedicated workers
// only. The main thread sends the file's path from the storage root plus the
// bytes; writes to the same path run one at a time because a sync access
// handle holds an exclusive lock on its file.

interface WriteRequest {
  id: number;
  path: string[];
  bytes: Uint8Array;
}

const queues = new Map<string, Promise<void>>();

async function writeFile(path: string[], bytes: Uint8Array): Promise<void> {
  let directory: any = await navigator.storage.getDirectory();
  for (const segment of path.slice(0, -1)) {
    directory = await directory.getDirectoryHandle(segment, { create: true });
  }
  const file = await directory.getFileHandle(path[path.length - 1], { create: true });
  const access = await file.createSyncAccessHandle();
  try {
    // Older Safari returns promises from these methods; awaiting covers both.
    await access.truncate(0);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const written: number = await access.write(bytes.subarray(offset), { at: offset });
      if (!written) throw new Error("The file could not be written.");
      offset += written;
    }
    await access.flush();
  } finally {
    await access.close();
  }
}

self.onmessage = (event: MessageEvent<WriteRequest>) => {
  const { id, path, bytes } = event.data;
  const key = path.join("/");
  const previous = queues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(() => writeFile(path, bytes));
  queues.set(key, next);

  next.then(
    () => self.postMessage({ id, ok: true }),
    (err: unknown) => self.postMessage({
      id,
      ok: false,
      name: err instanceof Error ? err.name : "Error",
      message: err instanceof Error ? err.message : String(err),
    }),
  ).finally(() => {
    if (queues.get(key) === next) queues.delete(key);
  });
};
