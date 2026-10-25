// Read-only helpers over a `FileSystemDirectoryHandle` for the git reader.
// Nothing here writes: the app only ever reads `.git`.

/** The file at `path` (slash-separated) under `dir`, or null when any part is missing. */
export async function getFileAt(dir: FileSystemDirectoryHandle, path: string): Promise<File | null> {
  try {
    const parts = path.split("/").filter(Boolean);
    let current = dir;
    for (const part of parts.slice(0, -1)) current = await current.getDirectoryHandle(part);
    const handle = await current.getFileHandle(parts[parts.length - 1]);
    return await handle.getFile();
  } catch {
    return null;
  }
}

export async function readTextAt(dir: FileSystemDirectoryHandle, path: string): Promise<string | null> {
  const file = await getFileAt(dir, path);
  return file ? file.text() : null;
}

export async function readBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

export class GitNotFoundError extends Error {
  constructor(what: string) {
    super("git: not found: " + what);
    this.name = "NotFound";
  }
}
