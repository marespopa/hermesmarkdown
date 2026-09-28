import { writeFileContent } from "@/app/services/file-writer";
import { withRetry } from "./shared";

// Empties a directory bottom-up, one entry at a time, so every removeEntry
// call targets either a plain file or an already-empty directory — never a
// non-empty subtree. Both `parent.removeEntry(name, {recursive:true})` and
// `handle.remove({recursive:true})` were observed throwing "The path
// supplied exists, but was not an entry of requested type" when deleting a
// non-empty folder, which points at some type-consistency check the browser
// runs across the whole subtree in one recursive call. Doing the recursion
// ourselves with freshly-obtained, definitely-correctly-typed child handles
// avoids that path entirely.
export async function emptyDirectory(dirHandle: FileSystemDirectoryHandle): Promise<void> {
  const children: FileSystemHandle[] = [];
  for await (const entry of (dirHandle as any).values()) {
    children.push(entry as FileSystemHandle);
  }
  for (const child of children) {
    if (child.kind === "directory") {
      await emptyDirectory(child as FileSystemDirectoryHandle);
    }
    await (dirHandle as any).removeEntry(child.name);
  }
}

async function entryExists(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getDirectoryHandle(name);
    return true;
  } catch (err: any) {
    if (err?.name === "TypeMismatchError") return true;
    if (err?.name !== "NotFoundError") throw err;
  }
  return false;
}

async function copyInto(src: FileSystemDirectoryHandle, dest: FileSystemDirectoryHandle): Promise<void> {
  for await (const entry of (src as any).values()) {
    if (entry.kind === "directory") {
      const child = await withRetry(() => dest.getDirectoryHandle(entry.name, { create: true }));
      await copyInto(entry as FileSystemDirectoryHandle, child);
    } else {
      // Copy the File itself so binary attachments keep their bytes.
      const file = await (entry as FileSystemFileHandle).getFile();
      const target = await withRetry(() => dest.getFileHandle(entry.name, { create: true }));
      await withRetry(() => writeFileContent(target, file));
    }
  }
}

// Fallback for folder rename/move where `FileSystemHandle.move()` is missing
// or fails: copies `src` to `destParent/name`, then removes `src`. Refuses to
// merge into an existing entry or to copy a folder into itself. When the copy
// fails partway, the partial copy is removed and the source is left intact.
export async function moveDirectoryByCopy(
  src: FileSystemDirectoryHandle,
  srcParent: FileSystemDirectoryHandle,
  destParent: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  let inside: string[] | null = null;
  try {
    inside = await (src as any).resolve?.(destParent) ?? null;
  } catch {
    // resolve unsupported; the tree's drop guard already blocks self-drops
  }
  if (inside) throw new Error("Cannot move a folder into itself");
  if (await entryExists(destParent, name)) {
    throw new Error(`"${name}" already exists in the destination folder`);
  }

  const dest = await withRetry(() => destParent.getDirectoryHandle(name, { create: true }));
  try {
    await copyInto(src, dest);
  } catch (err) {
    try {
      await emptyDirectory(dest);
      await (destParent as any).removeEntry(name);
    } catch (cleanupErr) {
      console.warn("Failed to remove partial folder copy:", cleanupErr);
    }
    throw err;
  }

  await emptyDirectory(src);
  await (srcParent as any).removeEntry(src.name);
  return dest;
}
