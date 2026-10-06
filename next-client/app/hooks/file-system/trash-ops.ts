import { isTrashSlotExpired, TRASH_DIR, trashSlotName } from "@/app/services/vault-trash";
import { directoryAtPath, emptyDirectory, relocateEntry } from "./directory-ops";

// Moves the item at `path` into a fresh Trash slot and returns its path
// there. `index` keeps slots unique when one action trashes several items.
export async function moveToTrash(
  vault: FileSystemDirectoryHandle,
  path: string,
  now: Date,
  index = 0,
): Promise<string> {
  const name = path.split("/").pop()!;
  const trashPath = `${TRASH_DIR}/${trashSlotName(now, index)}/${name}`;
  await relocateEntry(vault, path, trashPath);
  return trashPath;
}

// Removes the slot folder holding `trashPath` once it is empty (after the
// item was put back).
export async function removeEmptyTrashSlot(vault: FileSystemDirectoryHandle, trashPath: string): Promise<void> {
  const relative = trashPath.slice(TRASH_DIR.length + 1);
  const slot = relative.split("/")[0];
  if (!slot || !trashPath.startsWith(`${TRASH_DIR}/`)) return;
  try {
    const trash = await directoryAtPath(vault, TRASH_DIR);
    const slotDir = await trash.getDirectoryHandle(slot);
    for await (const _entry of (slotDir as any).values()) return;
    await (trash as any).removeEntry(slot);
  } catch (err) {
    console.warn("Failed to tidy the Trash:", err);
  }
}

// Empties Trash slots older than the retention period. Never throws: a
// vault without a Trash (or a read-only one) is left as it is.
export async function purgeExpiredTrash(vault: FileSystemDirectoryHandle, now = new Date()): Promise<number> {
  let purged = 0;
  try {
    const trash = await directoryAtPath(vault, TRASH_DIR);
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
