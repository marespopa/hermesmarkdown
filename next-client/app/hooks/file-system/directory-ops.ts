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

export async function entryExists(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
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
      // Read the bytes before touching `dest`: a File snapshot can become
      // unreadable once its directory changes (Android-backed storage), which
      // left empty copies behind.
      const bytes = await (await (entry as FileSystemFileHandle).getFile()).arrayBuffer();
      const target = await withRetry(() => dest.getFileHandle(entry.name, { create: true }));
      await withRetry(() => writeFileContent(target, bytes));
    }
  }
}

// Fallback for file rename/move where `FileSystemHandle.move()` is missing or
// fails: copies `src` to `destParent/name`, then removes `src` from
// `destParent`. Refuses to overwrite an existing entry. When the write fails,
// the new file is removed and the source is left intact.
export async function moveFileByCopy(
  src: FileSystemFileHandle,
  destParent: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemFileHandle> {
  if (await entryExists(destParent, name)) {
    throw new Error(`"${name}" already exists in this folder`);
  }
  // Read the bytes before creating the target (see copyInto).
  const bytes = await (await src.getFile()).arrayBuffer();
  const target = await withRetry(() => destParent.getFileHandle(name, { create: true }));
  try {
    await withRetry(() => writeFileContent(target, bytes));
  } catch (err) {
    try {
      await (destParent as any).removeEntry(target.name);
    } catch (cleanupErr) {
      console.warn("Failed to remove partial file copy:", cleanupErr);
    }
    throw err;
  }
  await (destParent as any).removeEntry(src.name);
  return target;
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

// Walks a vault-relative folder path ("" = the vault root), creating missing
// folders when `create` is set.
export async function directoryAtPath(
  vault: FileSystemDirectoryHandle,
  path: string,
  create = false,
): Promise<FileSystemDirectoryHandle> {
  let dir = vault;
  for (const segment of path.split("/").filter(Boolean)) {
    dir = await withRetry(() => dir.getDirectoryHandle(segment, { create }));
  }
  return dir;
}

// The file or folder at a vault-relative path, with its parent folder.
export async function entryAtPath(
  vault: FileSystemDirectoryHandle,
  path: string,
): Promise<{ handle: FileSystemHandle; parent: FileSystemDirectoryHandle }> {
  const segments = path.split("/").filter(Boolean);
  const name = segments.pop();
  if (!name) throw new Error("No item path given");
  const parent = await directoryAtPath(vault, segments.join("/"));
  try {
    return { handle: await parent.getFileHandle(name), parent };
  } catch (err: any) {
    if (err?.name !== "TypeMismatchError" && err?.name !== "NotFoundError") throw err;
    return { handle: await parent.getDirectoryHandle(name), parent };
  }
}

// Moves and/or renames the item at `fromPath` to `toPath` (both vault-relative),
// creating the destination's folders as needed. Never overwrites: throws when
// `toPath` is taken. Native move first, copy-and-remove as the fallback.
export async function relocateEntry(
  vault: FileSystemDirectoryHandle,
  fromPath: string,
  toPath: string,
): Promise<void> {
  if (fromPath === toPath) return;
  if (toPath.startsWith(`${fromPath}/`)) throw new Error("Cannot move a folder into itself");
  const { handle, parent } = await entryAtPath(vault, fromPath);
  const destSegments = toPath.split("/").filter(Boolean);
  const name = destSegments.pop()!;
  const destParent = await directoryAtPath(vault, destSegments.join("/"), true);
  if (await entryExists(destParent, name)) throw new Error(`"${name}" already exists in this folder`);

  if (typeof (handle as any).move === "function") {
    try {
      await (handle as any).move(destParent, name);
      return;
    } catch (err) {
      console.warn("Native move failed, falling back to copy/delete:", err);
    }
  }
  if (handle.kind === "directory") {
    await moveDirectoryByCopy(handle as FileSystemDirectoryHandle, parent, destParent, name);
    return;
  }
  // Read the bytes before creating the target (see copyInto).
  const bytes = await (await (handle as FileSystemFileHandle).getFile()).arrayBuffer();
  const target = await withRetry(() => destParent.getFileHandle(name, { create: true }));
  try {
    await withRetry(() => writeFileContent(target, bytes));
  } catch (err) {
    try {
      await (destParent as any).removeEntry(name);
    } catch (cleanupErr) {
      console.warn("Failed to remove partial file copy:", cleanupErr);
    }
    throw err;
  }
  await (parent as any).removeEntry(handle.name);
}

// A folder name free in `dir`: `name`, else "name 2", "name 3"… (Finder style).
export async function uniqueFolderName(dir: FileSystemDirectoryHandle, name: string): Promise<string> {
  let candidate = name;
  for (let n = 2; await entryExists(dir, candidate); n++) candidate = `${name} ${n}`;
  return candidate;
}
