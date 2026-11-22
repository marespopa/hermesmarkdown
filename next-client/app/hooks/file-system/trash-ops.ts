import { writeFileContent } from "@/app/services/file-writer";
import { isTrashSlotExpired, TRASH_DIR, TRASH_ORIGIN_FILE, trashDirFor, trashSlotDate, trashSlotName } from "@/app/services/vault-trash";
import { libraryMounts, mountPrefix } from "@/app/services/library-roots";
import { directoryAtPath, emptyDirectory, entryExists, relocateEntry } from "./directory-ops";

// Every Trash in the library: the vault's own, then each readable added
// folder's (a deleted file goes to the Trash of the folder it was in).
function trashDirs(vault: FileSystemDirectoryHandle): string[] {
  return [TRASH_DIR, ...libraryMounts(vault).filter((m) => !m.locked).map((m) => `${m.name}/${TRASH_DIR}`)];
}

// Moves the item at `path` into a fresh Trash slot and returns its path
// there. `index` keeps slots unique when one action trashes several items.
// The slot also records where the item came from (TRASH_ORIGIN_FILE), so
// the Trash page can put it back; an item without one goes back to the root.
export async function moveToTrash(
  vault: FileSystemDirectoryHandle,
  path: string,
  now: Date,
  index = 0,
): Promise<string> {
  const name = path.split("/").pop()!;
  const slot = trashSlotName(now, index);
  const trashDir = trashDirFor(path);
  const trashPath = `${trashDir}/${slot}/${name}`;
  await relocateEntry(vault, path, trashPath);
  try {
    const slotDir = await directoryAtPath(vault, `${trashDir}/${slot}`);
    await writeFileContent(await slotDir.getFileHandle(TRASH_ORIGIN_FILE, { create: true }), path);
  } catch (err) {
    console.warn("Couldn't record where a trashed item came from:", err);
  }
  return trashPath;
}

export interface TrashedItem {
  slot: string;
  name: string;
  kind: FileSystemHandleKind;
  /** Vault path of the item in the Trash. */
  trashPath: string;
  /** Where it was deleted from; null when the slot didn't record it. */
  originalPath: string | null;
  deletedAt: Date | null;
}

// Everything in the Trash, most recently deleted first. Never throws: no
// Trash yet is an empty list.
export async function listTrash(vault: FileSystemDirectoryHandle): Promise<TrashedItem[]> {
  const items: TrashedItem[] = [];
  for (const trashDir of trashDirs(vault)) {
    try {
      items.push(...await listOneTrash(vault, trashDir));
    } catch (err) {
      console.warn(`Failed to list the Trash in ${trashDir}:`, err);
    }
  }
  return items.sort((a, b) => b.slot.localeCompare(a.slot));
}

async function listOneTrash(vault: FileSystemDirectoryHandle, trashDir: string): Promise<TrashedItem[]> {
  const items: TrashedItem[] = [];
  let trash: FileSystemDirectoryHandle;
  try {
    trash = await directoryAtPath(vault, trashDir);
  } catch {
    return items;
  }
  for await (const slot of (trash as any).values() as AsyncIterable<FileSystemHandle>) {
    if (slot.kind !== "directory") continue;
    let originalPath: string | null = null;
    const entries: FileSystemHandle[] = [];
    for await (const entry of (slot as any).values() as AsyncIterable<FileSystemHandle>) {
      if (entry.name === TRASH_ORIGIN_FILE && entry.kind === "file") {
        originalPath = (await (await (entry as FileSystemFileHandle).getFile()).text()).trim() || null;
      } else {
        entries.push(entry);
      }
    }
    for (const entry of entries) {
      items.push({
        slot: slot.name,
        name: entry.name,
        kind: entry.kind,
        trashPath: `${trashDir}/${slot.name}/${entry.name}`,
        originalPath,
        deletedAt: trashSlotDate(slot.name),
      });
    }
  }
  return items;
}

// Puts a trashed item back where it was deleted from (its folders made
// again if need be), or at the vault's root when that wasn't recorded.
// Returns where it went. Throws when something already has that name there.
export async function restoreFromTrash(vault: FileSystemDirectoryHandle, item: TrashedItem): Promise<string> {
  const target = item.originalPath ?? `${mountPrefix(item.trashPath)}${item.name}`;
  const segments = target.split("/");
  const name = segments.pop()!;
  const parent = await directoryAtPath(vault, segments.join("/"), true);
  if (await entryExists(parent, name)) throw new Error(`“${name}” already exists in ${segments.join("/") || "the vault's root"}`);
  await relocateEntry(vault, item.trashPath, target);
  await removeEmptyTrashSlot(vault, item.trashPath);
  return target;
}

// Deletes one slot (an item and its record) for good, from the Trash at
// `trashDir` (the vault's own unless given).
export async function deleteTrashSlot(vault: FileSystemDirectoryHandle, slot: string, trashDir = TRASH_DIR): Promise<void> {
  const trash = await directoryAtPath(vault, trashDir);
  const slotDir = await trash.getDirectoryHandle(slot);
  await emptyDirectory(slotDir);
  await (trash as any).removeEntry(slot);
}

// Removes the slot folder holding `trashPath` once nothing but its record
// is left in it (after the item was put back).
export async function removeEmptyTrashSlot(vault: FileSystemDirectoryHandle, trashPath: string): Promise<void> {
  const trashDir = trashDirFor(trashPath);
  const relative = trashPath.slice(trashDir.length + 1);
  const slot = relative.split("/")[0];
  if (!slot || !trashPath.startsWith(`${trashDir}/`)) return;
  try {
    const trash = await directoryAtPath(vault, trashDir);
    const slotDir = await trash.getDirectoryHandle(slot);
    for await (const entry of (slotDir as any).values()) {
      if (entry.name !== TRASH_ORIGIN_FILE) return;
    }
    await emptyDirectory(slotDir);
    await (trash as any).removeEntry(slot);
  } catch (err) {
    console.warn("Failed to tidy the Trash:", err);
  }
}

// Empties Trash slots older than the retention period. Never throws: a
// vault without a Trash (or a read-only one) is left as it is.
export async function purgeExpiredTrash(vault: FileSystemDirectoryHandle, now = new Date()): Promise<number> {
  let purged = 0;
  for (const trashDir of trashDirs(vault)) purged += await purgeOneTrash(vault, trashDir, now);
  return purged;
}

async function purgeOneTrash(vault: FileSystemDirectoryHandle, trashDir: string, now: Date): Promise<number> {
  let purged = 0;
  try {
    const trash = await directoryAtPath(vault, trashDir);
    const expired: FileSystemDirectoryHandle[] = [];
    for await (const entry of (trash as any).values()) {
      if (entry.kind === "directory" && isTrashSlotExpired(entry.name, now)) expired.push(entry);
    }
    for (const slot of expired) {
      await emptyDirectory(slot);
      await (trash as any).removeEntry(slot.name);
      purged++;
    }
  } catch (err: any) {
    if (err?.name !== "NotFoundError") console.warn("Failed to empty old Trash items:", err);
  }
  return purged;
}
